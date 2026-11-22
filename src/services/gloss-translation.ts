/**
 * Glosas das unidades da trilha no idioma de APOIO do aluno.
 * O currículo guarda glosas em inglês; só apoio em inglês as usa como estão. Para os demais,
 * uma chamada de IA em lote traduz, valida, guarda em cache longo e nunca cai de volta para inglês.
 */
import type { Redis } from "ioredis";
import type { CoreLemma } from "../curriculum/types.js";
import { cardMatchesLemma, normalizePhrase } from "./path-service.js";

export const GLOSS_TTL_SECONDS = 60 * 60 * 24 * 90;
export const GLOSS_MAX_LENGTH = 60;
const GLOSS_TIMEOUT_MS = 12_000;

/** Lema -> glosa no idioma de apoio. */
export type GlossMap = ReadonlyMap<string, string>;

/** Porta para a IA: devolve uma glosa por entrada, na mesma ordem. */
export interface GlossModel {
  translateGlosses(input: {
    targetLang: string;
    supportLang: string;
    entries: Array<{ lemma: string; gloss: string }>;
  }): Promise<string[]>;
}

export interface GlossStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export function redisGlossStore(redis: Redis): GlossStore {
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttl) {
      await redis.set(key, value, "EX", ttl);
    },
  };
}

export function glossCacheKey(targetLang: string, unitId: string, supportLang: string): string {
  return `gloss:v1:${targetLang.toLowerCase()}:${unitId}:${supportLang.toLowerCase()}`;
}

export function isEnglish(lang: string): boolean {
  return lang.trim().toLowerCase().split("-")[0] === "en";
}

/**
 * Valida a tradução: mesma quantidade, nenhuma vazia ou longa demais, nenhuma que entregue o lema.
 * Devolve o mapa lema -> glosa, ou null se qualquer item falhar (tudo ou nada).
 */
export function validateGlosses(
  lemmas: readonly CoreLemma[],
  translated: readonly string[],
  targetLang: string,
): Map<string, string> | null {
  if (translated.length !== lemmas.length || lemmas.length === 0) {
    return null;
  }
  const map = new Map<string, string>();
  for (let index = 0; index < lemmas.length; index += 1) {
    const lemma = lemmas[index];
    const gloss = (translated[index] ?? "").trim();
    if (!lemma || !gloss || gloss.length > GLOSS_MAX_LENGTH) {
      return null;
    }
    if (cardMatchesLemma(gloss, lemma.lemma, targetLang) || normalizePhrase(gloss) === normalizePhrase(lemma.lemma)) {
      return null;
    }
    map.set(lemma.lemma, gloss);
  }
  return map;
}

function parseCached(raw: string | null, lemmas: readonly CoreLemma[], targetLang: string): Map<string, string> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return validateGlosses(
      lemmas,
      parsed.map((item) => (typeof item === "string" ? item : "")),
      targetLang,
    );
  } catch {
    return null;
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export class GlossTranslator {
  private readonly inflight = new Map<string, Promise<Map<string, string> | null>>();

  constructor(
    private readonly model: Partial<GlossModel> | null,
    private readonly store: GlossStore | null,
    private readonly timeoutMs = GLOSS_TIMEOUT_MS,
  ) {}

  /**
   * Glosas da unidade no idioma de apoio. Inglês: as do currículo. Outro idioma: tradução em cache
   * ou da IA; se indisponível devolve null (quem chama omite a glosa, nunca mostra inglês).
   */
  async forUnit(input: {
    targetLang: string;
    unitId: string;
    supportLang: string;
    lemmas: readonly CoreLemma[];
  }): Promise<GlossMap | null> {
    const { targetLang, unitId, supportLang, lemmas } = input;
    if (lemmas.length === 0) {
      return null;
    }
    if (isEnglish(supportLang)) {
      return new Map(lemmas.map((item) => [item.lemma, item.gloss.trim()]));
    }
    if (supportLang.trim().toLowerCase() === targetLang.trim().toLowerCase()) {
      return null;
    }
    const key = glossCacheKey(targetLang, unitId, supportLang);
    const pending = this.inflight.get(key);
    if (pending) {
      return pending;
    }
    const work = this.resolve(key, targetLang, supportLang, lemmas).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, work);
    return work;
  }

  private async resolve(
    key: string,
    targetLang: string,
    supportLang: string,
    lemmas: readonly CoreLemma[],
  ): Promise<Map<string, string> | null> {
    try {
      const cached = parseCached((await this.store?.get(key)) ?? null, lemmas, targetLang);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache fora do ar: segue para a IA.
    }
    const model = this.model;
    if (!model || typeof model.translateGlosses !== "function") {
      return null;
    }
    try {
      const translated = await withTimeout(
        model.translateGlosses({
          targetLang,
          supportLang,
          entries: lemmas.map((item) => ({ lemma: item.lemma, gloss: item.gloss })),
        }),
        this.timeoutMs,
      );
      const valid = validateGlosses(lemmas, translated, targetLang);
      if (!valid) {
        return null;
      }
      try {
        await this.store?.set(key, JSON.stringify(lemmas.map((item) => valid.get(item.lemma))), GLOSS_TTL_SECONDS);
      } catch {
        // Falha ao gravar o cache não invalida a tradução.
      }
      return valid;
    } catch {
      return null;
    }
  }
}
