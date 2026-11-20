import type { Redis } from "ioredis";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { fetchHeadlines, type NewsHeadline } from "./news-feed.js";
import type { OpsService } from "./ops.js";
import { utcDay } from "./path-service.js";

/** Teto de gerações de IA por tick (o tick roda a cada 15 min). */
export const PRELOAD_MAX_GENERATIONS = 20;
/** Quantos grupos (idioma, idioma de apoio, nível, tema) entram em cada tick. */
export const PRELOAD_MAX_GROUPS = 30;
/** As 3 matérias que o app mostra por tema (índices 0..2 de /news/fetch-adapted). */
export const PRELOAD_STORIES = 3;

export interface PreloadGroup {
  target_lang: string;
  native_lang: string;
  level: AuthUser["level"];
  interest: string | null;
}

export interface PreloadAdapter {
  adaptedNews(input: {
    targetLang: string;
    nativeLang: string;
    level: AuthUser["level"];
    headline: NewsHeadline;
  }): Promise<{ cached: boolean }>;
}

export interface PreloadDeps {
  headlines?: (targetLang: string, interest?: string) => Promise<NewsHeadline[]>;
  isPaused?: () => Promise<boolean>;
}

function groupKey(group: PreloadGroup): string {
  return [group.target_lang, group.native_lang, group.level, (group.interest ?? "").toLowerCase()].join(":");
}

/**
 * Planeja a pré-carga: primeiro a matéria 0 de todos os grupos, depois a 1, depois a 2,
 * para que o teto de gerações cubra o máximo de alunos.
 */
export function preloadOrder(groups: readonly PreloadGroup[], stories = PRELOAD_STORIES): Array<{ group: PreloadGroup; index: number }> {
  const order: Array<{ group: PreloadGroup; index: number }> = [];
  for (let index = 0; index < stories; index += 1) {
    for (const group of groups) {
      order.push({ group, index });
    }
  }
  return order;
}

/**
 * Pré-carga diária das notícias adaptadas (M3) para quem estudou nos últimos 7 dias, por
 * (idioma-alvo, idioma de apoio, nível, tema principal). Pula o que já está no cache, gera
 * no máximo 20 por tick e marca o grupo como pronto no dia. Desligada sem
 * NEWS_PRELOAD_ENABLED=true (o dev não gasta cota de IA).
 */
export class NewsPreload {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly news: PreloadAdapter,
    private readonly options: { enabled: boolean; maxGenerations?: number; maxGroups?: number },
    private readonly ops?: OpsService,
    private readonly deps: PreloadDeps = {},
  ) {}

  async tick(now = new Date()): Promise<{ generated: number; groups: number; skipped: boolean }> {
    if (!this.options.enabled) {
      return { generated: 0, groups: 0, skipped: true };
    }
    if (this.deps.isPaused && (await this.deps.isPaused())) {
      return { generated: 0, groups: 0, skipped: true };
    }
    const lock = await this.redis.set("prosa:news-preload:lock", "1", "EX", 600, "NX");
    if (lock !== "OK") {
      return { generated: 0, groups: 0, skipped: true };
    }
    try {
      return await this.run(now);
    } finally {
      await this.redis.del("prosa:news-preload:lock").catch(() => 0);
    }
  }

  async activeGroups(): Promise<PreloadGroup[]> {
    const found = await this.pool.query<PreloadGroup>(
      `SELECT u.target_lang, u.native_lang, u.level,
              NULLIF(btrim(u.interests[1]), '') AS interest,
              count(*)::int AS learners
       FROM users u
       WHERE u.last_lesson_at > now() - interval '7 days'
          OR EXISTS (
            SELECT 1 FROM session_completions s
            WHERE s.user_id = u.id AND s.date >= current_date - 7
          )
       GROUP BY 1, 2, 3, 4
       ORDER BY learners DESC, 1, 2, 3, 4
       LIMIT $1`,
      [this.options.maxGroups ?? PRELOAD_MAX_GROUPS],
    );
    return found.rows.map((row) => ({
      target_lang: row.target_lang,
      native_lang: row.native_lang,
      level: row.level,
      interest: row.interest ?? null,
    }));
  }

  private async run(now: Date): Promise<{ generated: number; groups: number; skipped: boolean }> {
    const day = utcDay(now);
    const budget = this.options.maxGenerations ?? PRELOAD_MAX_GENERATIONS;
    const groups: PreloadGroup[] = [];
    for (const group of await this.activeGroups()) {
      const done = await this.redis.get(this.doneKey(day, group));
      if (!done) {
        groups.push(group);
      }
    }
    const headlines = new Map<string, NewsHeadline[] | null>();
    const ready = new Map<string, number>();
    let generated = 0;
    for (const { group, index } of preloadOrder(groups)) {
      if (generated >= budget) {
        break;
      }
      const key = groupKey(group);
      if (!headlines.has(key)) {
        headlines.set(key, await this.headlinesOf(group));
      }
      const headline = headlines.get(key)?.[index];
      if (!headline) {
        continue;
      }
      try {
        const result = await this.news.adaptedNews({
          targetLang: group.target_lang,
          nativeLang: group.native_lang,
          level: group.level,
          headline,
        });
        if (!result.cached) {
          generated += 1;
        }
        ready.set(key, (ready.get(key) ?? 0) + 1);
      } catch (error) {
        await this.ops?.record("news", "error", "News preload failed", error instanceof Error ? error.message : undefined);
      }
    }
    for (const group of groups) {
      const key = groupKey(group);
      const stories = headlines.get(key);
      if (stories && stories.length > 0 && (ready.get(key) ?? 0) >= Math.min(PRELOAD_STORIES, stories.length)) {
        await this.redis.set(this.doneKey(day, group), "1", "EX", 36 * 60 * 60);
      }
    }
    return { generated, groups: groups.length, skipped: false };
  }

  private async headlinesOf(group: PreloadGroup): Promise<NewsHeadline[] | null> {
    const read = this.deps.headlines ?? fetchHeadlines;
    try {
      return await read(group.target_lang.toLowerCase(), group.interest ?? undefined);
    } catch {
      return null;
    }
  }

  private doneKey(day: string, group: PreloadGroup): string {
    return `prosa:news-preload:done:${day}:${groupKey(group)}`;
  }
}
