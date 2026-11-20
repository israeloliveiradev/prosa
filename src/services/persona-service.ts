import type { Redis } from "ioredis";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { getCurriculum, isUiLocale, pathBandFor, syllabusEntryOf, unitById, unitCanDo, unitsOfBand, unitTitle } from "../curriculum/index.js";
import type { UiLocale } from "../curriculum/types.js";
import { AppError } from "../http/errors.js";
import { sceneSchema, type PersonaTurnBody, type Scene } from "../schemas/persona.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { loadUnitBrief, utcDay } from "./path-service.js";
import { findPersonaScene } from "./persona-scenes.js";
import { assembleScenes, fallbackScenes, sceneCacheKey } from "./scene-plan.js";

const AI_SCENES_TTL_SECONDS = 36 * 60 * 60;
/** Cenas fixas ficam pouco no cache: a próxima visita tenta a IA de novo. */
const FALLBACK_SCENES_TTL_SECONDS = 10 * 60;

export interface ScenesResult {
  scenes: Scene[];
  source: "ai" | "fallback";
}

interface Account {
  goal: string | null;
  goal_note: string | null;
  interests: string[];
  display_locale: string | null;
}

export class PersonaService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
    private readonly redis?: Redis,
  ) {}

  /** As 3 cenas do dia (objetivo, unidade ativa, tema), no idioma de interface da conta. */
  async scenes(user: AuthUser, targetLang?: string, now = new Date()): Promise<ScenesResult> {
    const lang = targetLang ?? user.target_lang;
    const account = await this.account(user.id);
    const locale: UiLocale = account.display_locale && isUiLocale(account.display_locale) ? account.display_locale : "en";
    const date = utcDay(now);
    const key = sceneCacheKey(user.id, lang, locale, date);
    const cached = await this.readCache(key);
    if (cached) {
      return cached;
    }
    const level = await this.levelFor(user, lang);
    const unitId = await this.activeUnit(user.id, lang, level);
    const curriculum = await getCurriculum();
    const skeleton = unitById(unitId);
    const entry = syllabusEntryOf(curriculum, unitId);
    const fallback = (): ScenesResult => ({
      source: "fallback",
      scenes: fallbackScenes({
        goal: account.goal,
        locale,
        unit: {
          id: unitId,
          title: skeleton ? unitTitle(entry, skeleton, locale) : unitId,
          canDo: unitCanDo(entry, locale),
        },
        interest: account.interests[0] ?? null,
      }),
    });

    let result: ScenesResult;
    try {
      const brief = await loadUnitBrief(this.pool, null, lang, unitId);
      const generated = await this.gemini.conversationScenes({
        targetLang: lang,
        interfaceLang: locale,
        level,
        goal: account.goal,
        goalNote: account.goal_note,
        unit: {
          title: brief?.title ?? unitId,
          topic: brief?.unit.topic ?? "",
          canDo: brief?.canDo ?? [],
          grammar: brief?.grammar?.name ?? null,
        },
        interests: account.interests,
      });
      const scenes = assembleScenes(generated.scenes, unitId, date);
      const valid = scenes?.every((scene) => sceneSchema.safeParse(scene).success) ? scenes : null;
      result = valid ? { scenes: valid, source: "ai" } : fallback();
    } catch {
      result = fallback();
    }
    await this.writeCache(key, result);
    return result;
  }

  async turn(user: AuthUser, body: PersonaTurnBody & { target_lang?: string }) {
    if (body.scene) {
      const lang = body.target_lang ?? user.target_lang;
      const reply = await this.gemini.sceneReply({
        targetLang: lang,
        throughLang: user.native_lang,
        level: await this.levelFor(user, lang),
        scene: body.scene,
        history: body.history,
        userLine: body.user_line,
      });
      return { ...reply, register: null };
    }
    const interests = await this.interests(user.id);
    const scene = findPersonaScene(user.target_lang, interests, body.scene_id ?? "");
    if (!scene) {
      throw new AppError(404, "Scene not found");
    }
    const reply = await this.gemini.personaReply({
      targetLang: user.target_lang,
      throughLang: user.native_lang,
      level: user.level,
      role: scene.role,
      place: scene.place,
      register: scene.register,
      opener: scene.opener,
      hitch: scene.hitch,
      history: body.history,
      userLine: body.user_line,
    });
    return { ...reply, register: scene.register };
  }

  private async readCache(key: string): Promise<ScenesResult | null> {
    if (!this.redis) {
      return null;
    }
    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { scenes?: unknown; source?: unknown };
      const scenes = Array.isArray(parsed.scenes) ? parsed.scenes.map((scene) => sceneSchema.parse(scene)) : [];
      if (scenes.length !== 3 || (parsed.source !== "ai" && parsed.source !== "fallback")) {
        return null;
      }
      return { scenes, source: parsed.source };
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, result: ScenesResult): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.set(key, JSON.stringify(result), "EX", result.source === "ai" ? AI_SCENES_TTL_SECONDS : FALLBACK_SCENES_TTL_SECONDS);
    } catch {
      // Sem cache a próxima visita só gera de novo.
    }
  }

  private async account(userId: string): Promise<Account> {
    const result = await this.pool.query<{
      goal: string | null;
      goal_note: string | null;
      interests: string[] | null;
      display_locale: string | null;
    }>("SELECT goal, goal_note, interests, display_locale FROM users WHERE id = $1", [userId]);
    const row = result.rows[0];
    return {
      goal: row?.goal ?? null,
      goal_note: row?.goal_note?.trim() || null,
      interests: row?.interests?.filter((item) => item.trim().length > 0) ?? [],
      display_locale: row?.display_locale ?? null,
    };
  }

  private async levelFor(user: AuthUser, targetLang: string): Promise<string> {
    if (targetLang === user.target_lang) {
      return user.level;
    }
    const found = await this.pool.query<{ level: string }>(
      "SELECT level FROM study_tracks WHERE user_id = $1 AND target_lang = $2 LIMIT 1",
      [user.id, targetLang],
    );
    return found.rows[0]?.level ?? user.level;
  }

  /** Unidade ativa da trilha nesse idioma; sem trilha ainda, a primeira unidade da banda do nível. */
  private async activeUnit(userId: string, targetLang: string, level: string): Promise<string> {
    const found = await this.pool.query<{ unit_id: string }>(
      `SELECT unit_id FROM path_progress
       WHERE user_id = $1 AND target_lang = $2 AND status = 'active'
       ORDER BY unit_id
       LIMIT 1`,
      [userId, targetLang],
    );
    const active = found.rows[0]?.unit_id;
    if (active && unitById(active)) {
      return active;
    }
    return unitsOfBand(pathBandFor(level))[0]?.id ?? "a1-01";
  }

  private async interests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [];
  }
}
