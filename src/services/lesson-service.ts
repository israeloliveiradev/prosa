import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { AppError } from "../http/errors.js";
import {
  type GenerateLessonBody,
  type LessonPayload,
  type LessonProfile,
} from "../schemas/lesson.js";
import { lessonCacheHash } from "./cache-key.js";
import { cognateLessonOpen, listCognates, type CognateAnchor } from "./cognates.js";
import type { LessonCache } from "./lesson-cache.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import type { AuthUser } from "../auth/session.js";
import type { OpsService } from "./ops.js";
import { missingPhrases, storyCoverage } from "./lexicon.js";
import { castStamp, parseCast, type CastSlot, type MindId } from "./minds.js";
import { workplaceLexicon } from "./org-lexicon.js";
import { mergeDue, sectorPhrases, workplaceInterest } from "./org-sectors.js";
import type { UsageMeter } from "./usage-meter.js";

export interface GeneratedLesson {
  lesson: LessonPayload;
  cached: boolean;
  anchors: CognateAnchor[];
}

export class LessonService {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly cache: LessonCache,
    private readonly gemini: GeminiGateway,
    private readonly ops?: OpsService,
    private readonly usage?: UsageMeter,
  ) {}

  async generate(input: GenerateLessonBody, user?: AuthUser): Promise<GeneratedLesson> {
    let profile = user
      ? {
          target_lang: user.target_lang.toLowerCase(),
          native_lang: user.native_lang.toLowerCase(),
          level: user.level,
          topic: input.topic,
          interests: input.interests ?? [],
          minds: await this.loadMinds(user.id, input),
        }
      : await this.resolveProfile(input);
    const workplace = user ? await workplaceLexicon(this.pool, user.id, profile.target_lang) : null;
    if (workplace) {
      profile = {
        ...profile,
        interests: [...profile.interests, workplaceInterest(workplace.sector)],
      };
    }
    const used = user ? await this.cognateCount(user.id) : 0;
    const requested = user ? cognateLessonOpen(profile.level, used) : input.cognate === true && profile.level === "A1";
    const anchors = requested ? await listCognates(this.pool, profile.native_lang, profile.target_lang) : [];
    const trueCognates = anchors.filter((item) => item.kind === "true");
    const cognate = trueCognates.length >= 8;
    const lexicon = user && !cognate ? await this.learnerLexicon(user.id, profile.target_lang, workplace) : null;
    if (user && lexicon && (lexicon.known.length >= 12 || lexicon.due.length > 0)) {
      return this.generateForDeck(user.id, profile, lexicon);
    }
    const hash = lessonCacheHash(
      profile.target_lang,
      profile.level,
      profile.topic,
      profile.interests,
      profile.native_lang,
      cognate,
      castStamp(profile.minds),
    );
    const existing = await this.cache.get(hash);
    if (existing) {
      this.noteLessonCache();
      await this.persistDailyLesson(user?.id, existing, profile);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      return { lesson: existing, cached: true, anchors: cognate ? anchors : [] };
    }

    const lockKey = `prosa:lesson-lock:${hash}`;
    const acquired = await this.redis.set(lockKey, "1", "EX", 45, "NX");
    if (acquired !== "OK") {
      const waited = await this.waitForCache(hash);
      if (!waited) {
        throw new AppError(503, "Lesson generation is already in progress");
      }
      this.noteLessonCache();
      await this.persistDailyLesson(user?.id, waited, profile);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      return { lesson: waited, cached: true, anchors: cognate ? anchors : [] };
    }

    try {
      const again = await this.cache.get(hash);
      if (again) {
        this.noteLessonCache();
        await this.persistDailyLesson(user?.id, again, profile);
        if (user && cognate) {
          await this.noteCognateLesson(user.id);
        }
        return { lesson: again, cached: true, anchors: cognate ? anchors : [] };
      }
      if (this.ops && (await this.ops.isGenerationPaused())) {
        await this.ops.record("lesson", "paused", "Lesson generation is paused");
        throw new AppError(503, "Lesson generation is paused");
      }
      const created = await this.gemini.generateLesson(profile, cognate ? anchors : []);
      const stored = await this.cache.put(hash, created);
      await this.persistDailyLesson(user?.id, stored, profile);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      await this.ops?.record("lesson", "ok", `Generated ${profile.target_lang}:${profile.level}`);
      return { lesson: stored, cached: false, anchors: cognate ? anchors : [] };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async generateForDeck(
    userId: string,
    profile: LessonProfile,
    lexicon: { known: string[]; due: string[] },
  ): Promise<GeneratedLesson> {
    if (this.ops && (await this.ops.isGenerationPaused())) {
      await this.ops.record("lesson", "paused", "Lesson generation is paused");
      throw new AppError(503, "Lesson generation is paused");
    }
    let lesson = await this.gemini.generateLesson(profile, [], lexicon);
    const covered = storyCoverage(
      lesson.story_text,
      lexicon.known,
      lesson.vocabulary.map((item) => item.word),
      profile.target_lang,
    );
    const missing = missingPhrases(lesson.story_text, lexicon.due);
    if ((lexicon.known.length >= 40 && covered.ratio < 0.95) || missing.length > 0) {
      try {
        lesson = await this.gemini.generateLesson(profile, [], {
          known: lexicon.known,
          due: [...missing, ...lexicon.due].slice(0, 6),
          avoid: covered.stray,
        });
      } catch {
        // The first draft still opens the lesson when the rewrite does not return.
      }
    }
    await this.persistDailyLesson(userId, lesson, profile);
    await this.ops?.record("lesson", "ok", `Generated ${profile.target_lang}:${profile.level}`);
    return { lesson, cached: false, anchors: [] };
  }

  private async learnerLexicon(
    userId: string,
    targetLang: string,
    workplace: { sector: "technology" | "health" | "sales"; extras: string[] } | null,
  ): Promise<{ known: string[]; due: string[] }> {
    const result = await this.pool.query<{ front_phrase: string; status: string; next_review_at: Date }>(
      `SELECT front_phrase, status, next_review_at
       FROM srs_cards
       WHERE user_id = $1 AND target_lang = $2 AND repetition_count > 0
       ORDER BY repetition_count DESC, next_review_at ASC
       LIMIT 200`,
      [userId, targetLang],
    );
    const now = Date.now();
    const known = result.rows
      .filter((row) => row.status === "reviewing" || row.status === "mastered")
      .map((row) => row.front_phrase.trim())
      .filter((phrase) => phrase.length > 0)
      .slice(0, 100);
    const due = result.rows
      .filter((row) => row.next_review_at.getTime() <= now)
      .map((row) => row.front_phrase.trim())
      .filter((phrase) => phrase.length > 0)
      .slice(0, 6);
    const sector = workplace ? sectorPhrases(workplace.sector, targetLang) : [];
    const extras = workplace?.extras ?? [];
    return { known, due: mergeDue(extras, sector, due) };
  }

  private async cognateCount(userId: string): Promise<number> {
    const result = await this.pool.query<{ cognate_lesson_count: number }>(
      "SELECT cognate_lesson_count FROM users WHERE id = $1",
      [userId],
    );
    return result.rows[0]?.cognate_lesson_count ?? 0;
  }

  private async noteCognateLesson(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET cognate_lesson_count = cognate_lesson_count + 1
       WHERE id = $1 AND cognate_lesson_count < 5`,
      [userId],
    );
  }

  private async resolveProfile(input: GenerateLessonBody): Promise<LessonProfile> {
    if (!input.target_lang || !input.native_lang || !input.level) {
      throw new AppError(400, "target_lang, native_lang and level are required");
    }
    return {
      target_lang: input.target_lang.toLowerCase(),
      native_lang: input.native_lang.toLowerCase(),
      level: input.level,
      topic: input.topic,
      interests: input.interests ?? [],
      minds: parseCast({
        reading: input.mind_reading,
        memory: input.mind_memory,
        speech: input.mind_speech,
        journal: input.mind_journal,
      }),
    };
  }

  private async loadMinds(userId: string, input: GenerateLessonBody): Promise<Record<CastSlot, MindId>> {
    const found = await this.pool.query<{
      mind_reading: string;
      mind_memory: string;
      mind_speech: string;
      mind_journal: string;
    }>("SELECT mind_reading, mind_memory, mind_speech, mind_journal FROM users WHERE id = $1", [userId]);
    const row = found.rows[0];
    return parseCast({
      reading: input.mind_reading ?? row?.mind_reading,
      memory: input.mind_memory ?? row?.mind_memory,
      speech: input.mind_speech ?? row?.mind_speech,
      journal: input.mind_journal ?? row?.mind_journal,
    });
  }

  private async persistDailyLesson(userId: string | undefined, lesson: LessonPayload, profile: LessonProfile): Promise<void> {
    if (!userId) {
      return;
    }
    const category = profile.topic.trim().slice(0, 80) || "everyday";
    await this.pool.query(
      `INSERT INTO daily_lessons (user_id, lesson_date, title, story_text, vocabulary_data, status, target_lang, topic_category)
       SELECT $1::uuid, CURRENT_DATE, $2, $3, $4::jsonb, 'in_progress', $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM daily_lessons
         WHERE user_id = $1::uuid AND lesson_date = CURRENT_DATE AND target_lang = $5
       )`,
      [userId, lesson.title, lesson.story_text, JSON.stringify(lesson.vocabulary), profile.target_lang, category],
    );
    await this.pool.query("UPDATE users SET last_lesson_at = NOW() WHERE id = $1", [userId]);
  }

  private noteLessonCache(): void {
    void this.usage?.record({ task: "lesson", provider: "cache", lane: "full", cached: true });
  }

  private async waitForCache(hash: string): Promise<LessonPayload | null> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 300);
      });
      const cached = await this.cache.get(hash);
      if (cached) {
        return cached;
      }
    }
    return null;
  }
}
