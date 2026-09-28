import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { z } from "zod";
import { AppError } from "../http/errors.js";
import { CEFR_LEVELS } from "../types/database.js";
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
import { castStamp, parseCast, type CastSlot, type MindId } from "./minds.js";

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
  ) {}

  async generate(input: GenerateLessonBody, user?: AuthUser): Promise<GeneratedLesson> {
    const profile = user
      ? {
          target_lang: user.target_lang.toLowerCase(),
          native_lang: user.native_lang.toLowerCase(),
          level: user.level,
          topic: input.topic,
          interests: input.interests ?? [],
          minds: await this.loadMinds(user.id, input),
        }
      : await this.resolveProfile(input);
    const used = user ? await this.cognateCount(user.id) : 0;
    const requested = user ? cognateLessonOpen(profile.level, used) : input.cognate === true && profile.level === "A1";
    const anchors = requested ? await listCognates(this.pool, profile.native_lang, profile.target_lang) : [];
    const trueCognates = anchors.filter((item) => item.kind === "true");
    const cognate = trueCognates.length >= 8;
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
      await this.persistDailyLesson(user?.id ?? input.user_id, existing, profile);
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
      await this.persistDailyLesson(user?.id ?? input.user_id, waited, profile);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      return { lesson: waited, cached: true, anchors: cognate ? anchors : [] };
    }

    try {
      const again = await this.cache.get(hash);
      if (again) {
        await this.persistDailyLesson(user?.id ?? input.user_id, again, profile);
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
      await this.persistDailyLesson(user?.id ?? input.user_id, stored, profile);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      await this.ops?.record("lesson", "ok", `Generated ${profile.target_lang}:${profile.level}`);
      return { lesson: stored, cached: false, anchors: cognate ? anchors : [] };
    } finally {
      await this.redis.del(lockKey);
    }
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
    if (!input.user_id) {
      if (!input.target_lang || !input.native_lang || !input.level) {
        throw new AppError(400, "target_lang, native_lang and level are required when user_id is absent");
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

    const result = await this.pool.query<{ native_lang: string; target_lang: string; level: string }>(
      "SELECT native_lang, target_lang, level FROM users WHERE id = $1",
      [input.user_id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new AppError(404, "User not found");
    }
    return {
      target_lang: row.target_lang.toLowerCase(),
      native_lang: row.native_lang.toLowerCase(),
      level: z.enum(CEFR_LEVELS).parse(row.level),
      topic: input.topic,
      interests: input.interests ?? [],
      minds: await this.loadMinds(input.user_id, input),
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
         SELECT 1 FROM daily_lessons WHERE user_id = $1::uuid AND lesson_date = CURRENT_DATE
       )`,
      [userId, lesson.title, lesson.story_text, JSON.stringify(lesson.vocabulary), profile.target_lang, category],
    );
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
