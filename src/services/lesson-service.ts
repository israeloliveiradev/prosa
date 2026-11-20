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
import { PROFILE_SKILLS, type ProfileSkill } from "./learner-profile.js";
import { missingPhrases, storyCoverage } from "./lexicon.js";
import { castStamp, parseCast, type CastSlot, type MindId } from "./minds.js";
import { workplaceLexicon } from "./org-lexicon.js";
import { mergeDue, sectorPhrases, workplaceInterest } from "./org-sectors.js";
import { lemmaInText, loadUnitBrief, normalizePhrase, shortStamp, type UnitBrief } from "./path-service.js";
import type { UsageMeter } from "./usage-meter.js";

/** O que a lição da unidade precisava trazer e o que ficou de fora (honesto: nada é preenchido à força). */
export interface UnitLessonReport {
  unit_id: string;
  core_lemmas: string[];
  missing_lemmas: string[];
}

export interface GeneratedLesson {
  lesson: LessonPayload;
  cached: boolean;
  anchors: CognateAnchor[];
  unit: UnitLessonReport | null;
}

/** Sinais do aluno que entram no prompt (todos reais; vazios ficam de fora). */
export interface LessonPersonalization {
  interests: string[];
  goal: string;
  goalNote: string;
  weakSkills: ProfileSkill[];
  errorKinds: string[];
  facts: string[];
}

const EMPTY_PERSONALIZATION: LessonPersonalization = {
  interests: [],
  goal: "",
  goalNote: "",
  weakSkills: [],
  errorKinds: [],
  facts: [],
};

const DEFAULT_TOPIC = "everyday life";

const GOAL_TEXT: Record<string, string> = {
  career: "use the language at work and for their career",
  travel: "travel and get around abroad",
  studies: "study (school, university or an exam)",
  culture: "enjoy culture: films, series, music and books",
  family: "talk with family and friends",
  relocation: "move to and live in a country where the language is spoken",
};

const WEAK_SKILL_HINT: Record<ProfileSkill, string> = {
  reading: "reading (keep the story easy to follow, with clear connectors)",
  listening: "listening (short, clear sentences that sound natural read aloud)",
  vocabulary: "vocabulary (reuse each new word at least twice)",
  grammar: "grammar (repeat the grammar focus in simple, clear sentences)",
  pronunciation: "pronunciation (include short phrases that are pleasant to say aloud)",
  fluency: "fluency (include short, ready-to-use chunks)",
  writing: "writing (a concrete journal_prompt that is easy to start)",
};

let goalColumnsCache: { at: number; columns: string[] } | null = null;

function oneLine(value: string, max: number): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Linhas de prompt da unidade: tópico, metas, gramática e lemas-núcleo obrigatórios. */
export function unitPromptLines(brief: UnitBrief, theme?: string): string[] {
  const lines = [`Course unit ${brief.unit.id} (${brief.unit.band}): ${brief.title}.`];
  if (brief.canDo.length > 0) {
    lines.push(`By the end of this unit the learner can: ${brief.canDo.join(" | ")}. Build the story and the journal_prompt around these goals.`);
  }
  if (brief.grammar) {
    lines.push(
      `Grammar focus: ${brief.grammar.name}. ${brief.grammar.summary} Model sentences: ${brief.grammar.examples.join(" | ")}. Use this structure several times in the story.`,
    );
  }
  if (brief.focus.length > 0) {
    const words = brief.focus.map((item) => item.lemma).join(", ");
    lines.push(
      `Core words of this lesson: ${words}. Every one of them must appear in story_text (use the exact dictionary form at least once when the grammar allows). Every one must also be its own vocabulary item whose word is written exactly as listed here. Put these items first in the vocabulary list.`,
    );
  }
  const chosen = theme ? oneLine(theme, 120) : "";
  if (chosen && chosen.toLowerCase() !== DEFAULT_TOPIC) {
    lines.push(`Story theme chosen by the learner: ${chosen}.`);
  }
  return lines;
}

/** Linhas de prompt do perfil: objetivo, habilidades fracas, erros frequentes e fatos lembrados. */
export function personalizationLines(personal: LessonPersonalization): string[] {
  const lines: string[] = [];
  const goal = GOAL_TEXT[personal.goal] ?? (personal.goal ? oneLine(personal.goal, 80) : "");
  if (goal || personal.goalNote) {
    const note = personal.goalNote ? ` In their own words: "${oneLine(personal.goalNote, 200)}".` : "";
    lines.push(`Learner goal: ${goal || "see their note"}.${note} Set the story in a situation useful for that goal.`);
  }
  if (personal.weakSkills.length > 0) {
    lines.push(`Weakest skills right now: ${personal.weakSkills.map((skill) => WEAK_SKILL_HINT[skill]).join("; ")}.`);
  }
  if (personal.errorKinds.length > 0) {
    lines.push(`Mistakes this learner often makes: ${personal.errorKinds.join(", ")}. Show the correct forms naturally in the story.`);
  }
  if (personal.facts.length > 0) {
    lines.push(
      `Things the learner told us about themselves (use one or two only where they fit; never invent new facts about the learner): ${personal.facts.join(" | ")}.`,
    );
  }
  return lines;
}

/** Carimbo do perfil para a chave de cache: vazio quando não há nada pessoal. */
export function personalizationStamp(personal: LessonPersonalization): string {
  const parts = {
    goal: personal.goal,
    note: personal.goalNote,
    weak: personal.weakSkills,
    errors: personal.errorKinds,
    facts: personal.facts,
  };
  const empty = !parts.goal && !parts.note && parts.weak.length === 0 && parts.errors.length === 0 && parts.facts.length === 0;
  return empty ? "" : shortStamp(parts);
}

/** Lemas da lição que não apareceram no texto ou não viraram item de vocabulário com o lema exato. */
export function missingUnitLemmas(lesson: LessonPayload, focus: readonly string[], lang: string): string[] {
  const words = new Set(lesson.vocabulary.map((item) => normalizePhrase(item.word)));
  return focus.filter((lemma) => !lemmaInText(lesson.story_text, lemma, lang) || !words.has(normalizePhrase(lemma)));
}

export function unitCacheSuffix(unitId: string | null, focus: readonly string[], stamp: string): string {
  const unit = unitId ? `:u:${unitId}:f:${shortStamp(focus)}` : "";
  return `${unit}${stamp ? `:p:${stamp}` : ""}`;
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
    const personal = user ? await this.loadPersonalization(user.id, user.target_lang.toLowerCase()) : EMPTY_PERSONALIZATION;
    let profile = user
      ? {
          target_lang: user.target_lang.toLowerCase(),
          native_lang: user.native_lang.toLowerCase(),
          level: user.level,
          topic: input.topic,
          interests: input.interests ?? personal.interests,
          minds: await this.loadMinds(user.id, input),
        }
      : await this.resolveProfile(input);
    const brief = input.unit_id ? await loadUnitBrief(this.pool, user?.id ?? null, profile.target_lang, input.unit_id) : null;
    if (input.unit_id && !brief) {
      throw new AppError(404, "Unit was not found");
    }
    if (brief) {
      profile = { ...profile, topic: brief.unit.topic };
    }
    const workplace = user ? await workplaceLexicon(this.pool, user.id, profile.target_lang) : null;
    if (workplace) {
      profile = {
        ...profile,
        interests: [...profile.interests, workplaceInterest(workplace.sector)],
      };
    }
    const extra = [...(brief ? unitPromptLines(brief, input.topic) : []), ...personalizationLines(personal)];
    const promptProfile: LessonProfile = extra.length > 0 ? { ...profile, topic: [profile.topic, ...extra].join("\n") } : profile;
    const focus = brief?.focus.map((item) => item.lemma) ?? [];
    const unitId = brief?.unit.id ?? null;

    // Lição de unidade não vira lição de cognatos: os lemas-núcleo mandam no vocabulário.
    const used = user && !brief ? await this.cognateCount(user.id) : 0;
    const requested = brief
      ? false
      : user
        ? cognateLessonOpen(profile.level, used)
        : input.cognate === true && profile.level === "A1";
    const anchors = requested ? await listCognates(this.pool, profile.native_lang, profile.target_lang) : [];
    const trueCognates = anchors.filter((item) => item.kind === "true");
    const cognate = trueCognates.length >= 8;
    const lexicon = user && !cognate ? await this.learnerLexicon(user.id, profile.target_lang, workplace) : null;
    if (user && lexicon && (lexicon.known.length >= 12 || lexicon.due.length > 0)) {
      return this.generateForDeck(user.id, profile, promptProfile, lexicon, brief);
    }
    const hash =
      lessonCacheHash(
        profile.target_lang,
        profile.level,
        // Na lição da unidade o tema escolhido pelo aluno também muda o texto.
        brief ? `${profile.topic} | theme: ${input.topic}` : profile.topic,
        profile.interests,
        profile.native_lang,
        cognate,
        castStamp(profile.minds),
      ) + unitCacheSuffix(unitId, focus, personalizationStamp(personal));
    const report = (lesson: LessonPayload): UnitLessonReport | null =>
      brief ? { unit_id: brief.unit.id, core_lemmas: focus, missing_lemmas: missingUnitLemmas(lesson, focus, profile.target_lang) } : null;
    const existing = await this.cache.get(hash);
    if (existing) {
      this.noteLessonCache();
      await this.persistDailyLesson(user?.id, existing, profile, unitId);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      return { lesson: existing, cached: true, anchors: cognate ? anchors : [], unit: report(existing) };
    }

    const lockKey = `prosa:lesson-lock:${hash}`;
    const acquired = await this.redis.set(lockKey, "1", "EX", 45, "NX");
    if (acquired !== "OK") {
      const waited = await this.waitForCache(hash);
      if (!waited) {
        throw new AppError(503, "Lesson generation is already in progress");
      }
      this.noteLessonCache();
      await this.persistDailyLesson(user?.id, waited, profile, unitId);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      return { lesson: waited, cached: true, anchors: cognate ? anchors : [], unit: report(waited) };
    }

    try {
      const again = await this.cache.get(hash);
      if (again) {
        this.noteLessonCache();
        await this.persistDailyLesson(user?.id, again, profile, unitId);
        if (user && cognate) {
          await this.noteCognateLesson(user.id);
        }
        return { lesson: again, cached: true, anchors: cognate ? anchors : [], unit: report(again) };
      }
      if (this.ops && (await this.ops.isGenerationPaused())) {
        await this.ops.record("lesson", "paused", "Lesson generation is paused");
        throw new AppError(503, "Lesson generation is paused");
      }
      let created = await this.gemini.generateLesson(promptProfile, cognate ? anchors : []);
      if (brief) {
        created = await this.coverUnit(created, promptProfile, focus);
      }
      const stored = await this.cache.put(hash, created);
      await this.persistDailyLesson(user?.id, stored, profile, unitId);
      if (user && cognate) {
        await this.noteCognateLesson(user.id);
      }
      await this.ops?.record("lesson", "ok", `Generated ${profile.target_lang}:${profile.level}${unitId ? `:${unitId}` : ""}`);
      return { lesson: stored, cached: false, anchors: cognate ? anchors : [], unit: report(stored) };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** Uma reescrita quando faltam lemas-núcleo no texto ou no vocabulário; fica com a melhor versão. */
  private async coverUnit(
    lesson: LessonPayload,
    promptProfile: LessonProfile,
    focus: readonly string[],
    lexicon?: { known: string[]; due: string[]; avoid?: string[] },
  ): Promise<LessonPayload> {
    const missing = missingUnitLemmas(lesson, focus, promptProfile.target_lang);
    if (missing.length === 0) {
      return lesson;
    }
    try {
      const retry = await this.gemini.generateLesson(
        {
          ...promptProfile,
          topic: `${promptProfile.topic}\nThe previous draft missed these core words in story_text or in the vocabulary list: ${missing.join(", ")}. Include every core word in story_text and as its own vocabulary item, with word written exactly as listed.`,
        },
        [],
        lexicon,
      );
      const after = missingUnitLemmas(retry, focus, promptProfile.target_lang);
      return after.length < missing.length ? retry : lesson;
    } catch {
      return lesson;
    }
  }

  private async generateForDeck(
    userId: string,
    profile: LessonProfile,
    promptProfile: LessonProfile,
    lexicon: { known: string[]; due: string[] },
    brief: UnitBrief | null,
  ): Promise<GeneratedLesson> {
    if (this.ops && (await this.ops.isGenerationPaused())) {
      await this.ops.record("lesson", "paused", "Lesson generation is paused");
      throw new AppError(503, "Lesson generation is paused");
    }
    const focus = brief?.focus.map((item) => item.lemma) ?? [];
    const focusKeys = new Set(focus.map(normalizePhrase));
    let lesson = await this.gemini.generateLesson(promptProfile, [], lexicon);
    const covered = storyCoverage(
      lesson.story_text,
      [...lexicon.known, ...focus],
      lesson.vocabulary.map((item) => item.word),
      profile.target_lang,
    );
    const missing = missingPhrases(lesson.story_text, lexicon.due);
    if ((lexicon.known.length >= 40 && covered.ratio < 0.95) || missing.length > 0) {
      try {
        lesson = await this.gemini.generateLesson(promptProfile, [], {
          known: lexicon.known,
          due: [...missing, ...lexicon.due].slice(0, 6),
          avoid: covered.stray.filter((word) => !focusKeys.has(normalizePhrase(word))),
        });
      } catch {
        // The first draft still opens the lesson when the rewrite does not return.
      }
    }
    if (brief) {
      lesson = await this.coverUnit(lesson, promptProfile, focus, lexicon);
    }
    await this.persistDailyLesson(userId, lesson, profile, brief?.unit.id ?? null);
    await this.ops?.record("lesson", "ok", `Generated ${profile.target_lang}:${profile.level}${brief ? `:${brief.unit.id}` : ""}`);
    return {
      lesson,
      cached: false,
      anchors: [],
      unit: brief
        ? { unit_id: brief.unit.id, core_lemmas: focus, missing_lemmas: missingUnitLemmas(lesson, focus, profile.target_lang) }
        : null,
    };
  }

  /**
   * Personalização real do aluno: temas (users.interests), objetivo (users.goal/goal_note,
   * migração 032, lido só se a coluna existir; senão learner_profile.goal), habilidades mais
   * fracas e tipos de erro (learner_profile) e até 5 fatos lembrados (learner_memory).
   */
  async loadPersonalization(userId: string, targetLang: string): Promise<LessonPersonalization> {
    const goalColumns = await this.userGoalColumns();
    const [userRow, profileRow, memoryRow] = await Promise.all([
      this.pool.query<{ interests: string[] | null; goal?: string | null; goal_note?: string | null }>(
        `SELECT ${["interests", ...goalColumns].join(", ")} FROM users WHERE id = $1`,
        [userId],
      ),
      this.pool.query<Record<ProfileSkill, number> & { error_kinds: unknown; goal: string | null }>(
        `SELECT reading, listening, vocabulary, grammar, pronunciation, fluency, writing, error_kinds, goal
         FROM learner_profile WHERE user_id = $1 AND target_lang = $2`,
        [userId, targetLang],
      ),
      this.pool.query<{ facts: unknown; errors: unknown }>(
        "SELECT facts, errors FROM learner_memory WHERE user_id = $1 AND target_lang = $2",
        [userId, targetLang],
      ),
    ]);
    const user = userRow.rows[0];
    const profile = profileRow.rows[0];
    const memory = memoryRow.rows[0];
    const weakSkills = profile
      ? PROFILE_SKILLS.filter((skill) => Number(profile[skill]) > 0 && Number(profile[skill]) < 70)
          .sort((left, right) => Number(profile[left]) - Number(profile[right]))
          .slice(0, 2)
      : [];
    const profileErrors = Array.isArray(profile?.error_kinds)
      ? profile.error_kinds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const memoryErrors = Array.isArray(memory?.errors)
      ? memory.errors
          .flatMap((item) => {
            const note = item && typeof item === "object" && "note" in item && typeof item.note === "string" ? item.note : "";
            const count = item && typeof item === "object" && "count" in item && typeof item.count === "number" ? item.count : 0;
            return note.trim() ? [{ note: note.trim(), count }] : [];
          })
          .sort((left, right) => right.count - left.count)
          .map((item) => item.note)
      : [];
    const facts = Array.isArray(memory?.facts)
      ? memory.facts
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => oneLine(item, 80))
          .slice(-5)
      : [];
    return {
      interests: (user?.interests ?? []).filter((item) => item.trim().length > 0).slice(0, 12),
      goal: oneLine(user?.goal ?? profile?.goal ?? "", 80),
      goalNote: oneLine(user?.goal_note ?? "", 200),
      weakSkills,
      errorKinds: (profileErrors.length > 0 ? profileErrors : memoryErrors).map((item) => oneLine(item, 60)).slice(0, 3),
      facts,
    };
  }

  /** users.goal/goal_note chegam na migração 032; até lá a lição segue sem eles. */
  private async userGoalColumns(): Promise<string[]> {
    const now = Date.now();
    if (goalColumnsCache && now - goalColumnsCache.at < 5 * 60 * 1000) {
      return goalColumnsCache.columns;
    }
    try {
      const found = await this.pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'users' AND column_name IN ('goal', 'goal_note')`,
      );
      const columns = ["goal", "goal_note"].filter((name) => found.rows.some((row) => row.column_name === name));
      goalColumnsCache = { at: now, columns };
      return columns;
    } catch {
      return [];
    }
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

  private async persistDailyLesson(
    userId: string | undefined,
    lesson: LessonPayload,
    profile: LessonProfile,
    unitId: string | null = null,
  ): Promise<void> {
    if (!userId) {
      return;
    }
    const category = profile.topic.trim().slice(0, 80) || "everyday";
    await this.pool.query(
      `INSERT INTO daily_lessons (user_id, lesson_date, title, story_text, vocabulary_data, status, target_lang, topic_category, unit_id)
       SELECT $1::uuid, CURRENT_DATE, $2, $3, $4::jsonb, 'in_progress', $5, $6, $7
       WHERE NOT EXISTS (
         SELECT 1 FROM daily_lessons
         WHERE user_id = $1::uuid AND lesson_date = CURRENT_DATE AND target_lang = $5
       )`,
      [userId, lesson.title, lesson.story_text, JSON.stringify(lesson.vocabulary), profile.target_lang, category, unitId],
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
