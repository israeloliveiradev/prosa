/**
 * Trilha híbrida (M2), lado do servidor. Contrato: docs/12-trilha-contrato.md.
 *
 * - O caminho de cada (aluno, idioma-alvo) nasce no primeiro GET /path a partir do nível.
 * - Domínio da unidade: 3 sessões, 80% dos lemas-núcleo com cartão FSRS estável (≥ 3 dias),
 *   um diário com a escada fechada (journal_closures, gravado pelo servidor) e ≥ 70% no teste.
 * - Unidades `mastered`/`validated` nunca voltam a `locked`.
 */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AuthUser } from "../auth/session.js";
import {
  getCurriculum,
  isUiLocale,
  languageUnitOf,
  pathBandFor,
  PATH_BANDS,
  syllabusEntryOf,
  unitById,
  unitCanDo,
  UNITS,
  unitTitle,
  type CoreLemma,
  type Curriculum,
  type GrammarFocus,
  type LanguageUnit,
  type PathBand,
  type SkillFocus,
  type UiLocale,
  type UnitSkeleton,
} from "../curriculum/index.js";
import { AppError } from "../http/errors.js";
import {
  storedUnitTestItemSchema,
  type PathFinishBody,
  type PublicUnitTestItem,
  type SessionCompleteBody,
  type StoredUnitTestItem,
} from "../schemas/path.js";
import { storedPlacementItemSchema, type StoredPlacementItem } from "../schemas/placement.js";
import { CEFR_LEVELS, type CefrLevel } from "../types/database.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import type { PlacementService } from "./placement-service.js";

export const LESSONS_REQUIRED = 3;
export const LEMMA_RATIO = 0.8;
export const LEMMA_STABILITY_DAYS = 3;
export const TEST_PASS = 70;
export const TEST_ITEMS = 8;
export const CHECKPOINT_ITEMS = 8;
export const CHECKPOINT_MIN_ITEMS = 6;
export const CHECKPOINT_PASS = 70;
/** Lemas-núcleo que cada lição da unidade traz no texto e no vocabulário. */
export const LESSON_FOCUS_LEMMAS = 6;

const OPEN_ATTEMPT_MS = 2 * 60 * 60 * 1000;
const FINISH_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_TEST_TIMEOUT_MS = 25_000;

export type UnitStatus = "locked" | "active" | "mastered" | "validated";

export interface UnitMastery {
  lessons: { done: number; required: number; met: boolean };
  lemmas: { known: number; total: number; required: number; met: boolean };
  journal: { met: boolean };
  test: { best: number | null; required: number; available: boolean; met: boolean };
}

export interface PathUnitView {
  id: string;
  band: PathBand;
  order: number;
  status: UnitStatus;
  title: string;
  can_do: string[];
  focus: SkillFocus[];
  grammar: { name: string; examples: string[] };
  mastery: UnitMastery;
  unlocked_at: string | null;
  completed_at: string | null;
}

export interface PathView {
  target_lang: string;
  level: CefrLevel;
  current_unit_id: string | null;
  units: PathUnitView[];
  checkpoint: { band: PathBand; available: boolean; passed: boolean };
}

export interface StatusChange {
  unit_id: string;
  from: UnitStatus | null;
  to: UnitStatus;
}

type Db = Pick<PoolClient, "query">;

const ORDERED_UNITS: readonly UnitSkeleton[] = [...UNITS].sort((left, right) => left.order - right.order);

// ---------------------------------------------------------------------------
// Regras puras (testadas em test/path.test.ts)
// ---------------------------------------------------------------------------

export function bandIndex(band: string): number {
  return (PATH_BANDS as readonly string[]).indexOf(band);
}

/** Estado inicial: bandas abaixo do nível validadas, 1ª unidade da banda ativa, resto bloqueado. */
export function initialStatuses(level: string): Map<string, UnitStatus> {
  const levelIndex = bandIndex(pathBandFor(level));
  const result = new Map<string, UnitStatus>();
  let activated = false;
  for (const unit of ORDERED_UNITS) {
    if (bandIndex(unit.band) < levelIndex) {
      result.set(unit.id, "validated");
    } else if (!activated) {
      result.set(unit.id, "active");
      activated = true;
    } else {
      result.set(unit.id, "locked");
    }
  }
  return result;
}

/**
 * Sobe a trilha até o nível: bandas abaixo dele viram `validated` (o que já estava
 * `mastered` continua) e, se não sobrar ativa, a primeira unidade bloqueada da banda do
 * nível em diante vira `active`. Nunca rebaixa nada.
 */
export function raiseToLevel(current: ReadonlyMap<string, UnitStatus>, level: string): StatusChange[] {
  const levelIndex = bandIndex(pathBandFor(level));
  const next = new Map<string, UnitStatus>();
  for (const unit of ORDERED_UNITS) {
    next.set(unit.id, current.get(unit.id) ?? "locked");
  }
  for (const unit of ORDERED_UNITS) {
    const status = next.get(unit.id);
    if (bandIndex(unit.band) < levelIndex && (status === "locked" || status === "active")) {
      next.set(unit.id, "validated");
    }
  }
  if (![...next.values()].includes("active")) {
    const candidate = ORDERED_UNITS.find(
      (unit) => bandIndex(unit.band) >= levelIndex && next.get(unit.id) === "locked",
    );
    if (candidate) {
      next.set(candidate.id, "active");
    }
  }
  return diffStatuses(current, next);
}

/** Depois de dominar `unitId`, ela vira `mastered` e a próxima bloqueada (na ordem) vira `active`. */
export function masterUnit(
  current: ReadonlyMap<string, UnitStatus>,
  unitId: string,
): { changes: StatusChange[]; nextUnitId: string | null } {
  const unit = unitById(unitId);
  if (!unit || current.get(unitId) !== "active") {
    return { changes: [], nextUnitId: null };
  }
  const next = new Map<string, UnitStatus>();
  for (const item of ORDERED_UNITS) {
    next.set(item.id, current.get(item.id) ?? "locked");
  }
  next.set(unitId, "mastered");
  const after = ORDERED_UNITS.find((item) => item.order > unit.order && next.get(item.id) === "locked");
  const fallback = after ?? ORDERED_UNITS.find((item) => next.get(item.id) === "locked");
  if (fallback) {
    next.set(fallback.id, "active");
  }
  return { changes: diffStatuses(current, next), nextUnitId: fallback?.id ?? null };
}

function diffStatuses(current: ReadonlyMap<string, UnitStatus>, next: ReadonlyMap<string, UnitStatus>): StatusChange[] {
  const changes: StatusChange[] = [];
  for (const unit of ORDERED_UNITS) {
    const before = current.get(unit.id) ?? null;
    const after = next.get(unit.id);
    if (after && before !== after) {
      changes.push({ unit_id: unit.id, from: before, to: after });
    }
  }
  // Quem deixa de ser ativa vem antes de quem passa a ser (índice único de ativa).
  return changes.sort((left, right) => Number(right.from === "active") - Number(left.from === "active"));
}

export function masteryOf(input: {
  status: UnitStatus;
  lessonsDone: number;
  lemmasKnown: number;
  lemmasTotal: number;
  journalMet: boolean;
  bestTest: number | null;
}): UnitMastery {
  const lemmaRequired = Math.ceil(input.lemmasTotal * LEMMA_RATIO);
  const lessonsMet = input.lessonsDone >= LESSONS_REQUIRED;
  const lemmasMet = input.lemmasTotal > 0 && input.lemmasKnown >= lemmaRequired;
  return {
    lessons: { done: input.lessonsDone, required: LESSONS_REQUIRED, met: lessonsMet },
    lemmas: { known: input.lemmasKnown, total: input.lemmasTotal, required: lemmaRequired, met: lemmasMet },
    journal: { met: input.journalMet },
    test: {
      best: input.bestTest,
      required: TEST_PASS,
      available: input.status === "active" && lessonsMet && lemmasMet && input.journalMet,
      met: input.bestTest !== null && input.bestTest >= TEST_PASS,
    },
  };
}

const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
const SINGLE_TOKEN = /^[\p{L}\p{M}\p{N}]+$/u;

/** NFKC, minúsculas, sem acento tônico do russo (ё vira е), apóstrofos tipográficos viram ', espaços colapsados e sem pontuação nas pontas. */
export function normalizePhrase(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/́/g, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[\s　]+/g, " ")
    .trim()
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "");
}

export function tokensOf(normalized: string): string[] {
  return normalized.split(/[^\p{L}\p{M}\p{N}]+/u).filter((token) => token.length > 0);
}

export function containsWholeWord(haystack: string, needle: string): boolean {
  if (!needle) {
    return false;
  }
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) {
      return false;
    }
    const before = at === 0 ? "" : (haystack[at - 1] ?? "");
    const after = haystack[at + needle.length] ?? "";
    if ((!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after))) {
      return true;
    }
    from = at + 1;
  }
}

/** O cartão casa com o lema: front_phrase normalizado igual ou contendo o lema como palavra inteira (ja: basta conter). */
export function cardMatchesLemma(frontPhrase: string, lemma: string, lang: string): boolean {
  const phrase = normalizePhrase(frontPhrase);
  const target = normalizePhrase(lemma);
  if (!phrase || !target) {
    return false;
  }
  if (phrase === target) {
    return true;
  }
  if (lang === "ja") {
    return !isShortJa(target) && phrase.includes(target);
  }
  return containsWholeWord(phrase, target);
}

/** Lema japonês curto demais para casar por substring: 1 caractere, ou 2 só de kana. */
function isShortJa(normalized: string): boolean {
  const chars = [...normalized];
  return chars.length <= 1 || (chars.length === 2 && /^[぀-ヿ]+$/u.test(normalized));
}

/** Índice de cartões para casar muitos lemas de uma vez. */
export class CardIndex {
  private readonly phrases: string[];
  private readonly tokens = new Set<string>();

  constructor(
    frontPhrases: readonly string[],
    private readonly lang: string,
  ) {
    this.phrases = frontPhrases.map(normalizePhrase).filter((phrase) => phrase.length > 0);
    for (const phrase of this.phrases) {
      for (const token of tokensOf(phrase)) {
        this.tokens.add(token);
      }
    }
  }

  /** `reading` (só ja): o cartão escrito em kana também conta, por igualdade exata. */
  has(lemma: string, reading?: string): boolean {
    const target = normalizePhrase(lemma);
    if (!target) {
      return false;
    }
    if (this.lang === "ja") {
      const kana = reading ? normalizePhrase(reading) : "";
      if (kana && this.phrases.includes(kana)) {
        return true;
      }
      // Lemas curtos (人, 家, もし, はず) casariam com 家族, 人口…: exigem igualdade exata.
      if (isShortJa(target)) {
        return this.phrases.includes(target);
      }
      return this.phrases.some((phrase) => phrase.includes(target));
    }
    if (SINGLE_TOKEN.test(target)) {
      return this.tokens.has(target);
    }
    return this.phrases.some((phrase) => phrase === target || containsWholeWord(phrase, target));
  }
}

/** O lema aparece no texto: forma de dicionário ou (heurística) uma forma flexionada do radical. */
export function lemmaInText(text: string, lemma: string, lang: string): boolean {
  const haystack = normalizePhrase(text);
  const target = normalizePhrase(lemma);
  if (!haystack || !target) {
    return false;
  }
  if (lang === "ja") {
    if (haystack.includes(target)) {
      return true;
    }
    return target.length >= 2 && /[぀-ゟ]$/u.test(target) && haystack.includes(target.slice(0, -1));
  }
  if (containsWholeWord(haystack, target)) {
    return true;
  }
  if (!SINGLE_TOKEN.test(target) || target.length < 4) {
    return false;
  }
  const stem = target.slice(0, target.length - (target.length >= 6 ? 2 : 1));
  return tokensOf(haystack).some((token) => token.startsWith(stem));
}

/**
 * Lemas que a próxima lição da unidade traz: primeiro os que ainda não têm cartão, depois os
 * que têm cartão instável; gira pelos já vistos conforme as lições feitas.
 */
export function lessonFocusLemmas(
  lemmas: readonly CoreLemma[],
  carded: CardIndex,
  stable: CardIndex,
  lessonsDone: number,
  size = LESSON_FOCUS_LEMMAS,
): CoreLemma[] {
  const fresh = lemmas.filter((item) => !carded.has(item.lemma, item.reading));
  const shaky = lemmas.filter((item) => carded.has(item.lemma, item.reading) && !stable.has(item.lemma, item.reading));
  const known = lemmas.filter((item) => stable.has(item.lemma, item.reading));
  const rotate = <T>(items: T[], by: number): T[] => {
    if (items.length === 0) {
      return items;
    }
    const offset = ((by % items.length) + items.length) % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)];
  };
  const ordered = [...rotate(fresh, lessonsDone * size), ...shaky, ...rotate(known, lessonsDone * size)];
  return ordered.slice(0, Math.min(size, ordered.length));
}

export function utcDay(now = new Date(), offsetDays = 0): string {
  const shifted = new Date(now.getTime() + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** A data local do aluno só pode ser ontem, hoje ou amanhã em UTC (diferença de fuso). */
export function sessionDateAccepted(date: string, now = new Date()): boolean {
  return date >= utcDay(now, -1) && date <= utcDay(now, 1);
}

/** Ofensiva honesta: dias seguidos terminando na data mais recente com sessão. Sem congelamento. */
export function streakFrom(dates: readonly string[]): number {
  const unique = [...new Set(dates)].sort().reverse();
  const first = unique[0];
  if (!first) {
    return 0;
  }
  let count = 1;
  let expected = addDays(first, -1);
  for (const date of unique.slice(1)) {
    if (date !== expected) {
      break;
    }
    count += 1;
    expected = addDays(date, -1);
  }
  return count;
}

/**
 * A ofensiva pode estar viva enquanto a última sessão for de anteontem (UTC) ou mais recente:
 * o dia local do aluno pode estar um dia atrás do UTC. Antes disso ela certamente acabou.
 */
export function streakBroken(lastDate: string | null, now = new Date()): boolean {
  return lastDate === null || lastDate < utcDay(now, -2);
}

export function scoreAnswers(
  items: ReadonlyArray<{ id: string; answer: number }>,
  answers: ReadonlyArray<{ item_id: string; choice: number }>,
): { correct: number; total: number; score: number; picked: Record<string, number> } {
  const picked: Record<string, number> = {};
  for (const answer of answers) {
    if (picked[answer.item_id] === undefined && items.some((item) => item.id === answer.item_id)) {
      picked[answer.item_id] = answer.choice;
    }
  }
  const correct = items.filter((item) => picked[item.id] === item.answer).length;
  const total = items.length;
  return { correct, total, score: total === 0 ? 0 : Math.round((100 * correct) / total), picked };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) {
      continue;
    }
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lacuna no exemplo: troca a 1ª ocorrência do lema por ____ (null se o lema não aparece inteiro). */
export function blankLemma(sentence: string, lemma: string, lang: string): string | null {
  const target = lemma.trim();
  if (!target) {
    return null;
  }
  if (lang === "ja") {
    const at = sentence.indexOf(target);
    return at < 0 ? null : `${sentence.slice(0, at)}____${sentence.slice(at + target.length)}`;
  }
  const pattern = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])(${escapeRegExp(target)})(?=$|[^\\p{L}\\p{M}\\p{N}])`, "iu");
  if (!pattern.test(sentence)) {
    return null;
  }
  return sentence.replace(pattern, (_match, before: string) => `${before}____`);
}

function optionsWith(
  answer: string,
  pool: readonly CoreLemma[],
  random: () => number,
  avoidGloss?: string,
): { options: string[]; answer: number } | null {
  const answerKey = normalizePhrase(answer);
  const seen = new Set<string>([answerKey]);
  const distractors: string[] = [];
  for (const item of shuffled(pool, random)) {
    const key = normalizePhrase(item.lemma);
    if (seen.has(key)) {
      continue;
    }
    if (avoidGloss && normalizePhrase(item.gloss) === normalizePhrase(avoidGloss)) {
      continue;
    }
    seen.add(key);
    distractors.push(item.lemma);
    if (distractors.length === 3) {
      break;
    }
  }
  if (distractors.length < 3) {
    return null;
  }
  const options = shuffled([answer, ...distractors], random);
  return { options, answer: options.indexOf(answer) };
}

/**
 * Teste determinístico (quando a IA não responde): lacunas nos exemplos de gramática e
 * escolha do lema pela glosa. Nunca nota inventada: o aluno responde de verdade.
 */
export function fallbackTestItems(
  unit: LanguageUnit,
  lang: string,
  count = TEST_ITEMS,
  random: () => number = Math.random,
): StoredUnitTestItem[] {
  const items: StoredUnitTestItem[] = [];
  const usedLemmas = new Set<string>();
  for (const example of unit.grammar.examples) {
    if (items.length >= count) {
      break;
    }
    const lemma = unit.lemmas.find((item) => !usedLemmas.has(item.lemma) && blankLemma(example, item.lemma, lang));
    if (!lemma) {
      continue;
    }
    const prompt = blankLemma(example, lemma.lemma, lang);
    const built = optionsWith(lemma.lemma, unit.lemmas, random);
    if (!prompt || !built) {
      continue;
    }
    usedLemmas.add(lemma.lemma);
    items.push({
      id: `q${items.length + 1}`,
      skill: "grammar",
      format: "cloze",
      prompt,
      options: built.options,
      answer: built.answer,
      source: "fallback",
    });
  }
  for (const lemma of shuffled(unit.lemmas, random)) {
    if (items.length >= count) {
      break;
    }
    // Glosa que já contém o lema ("ago": "two days ago") entregaria a resposta.
    if (usedLemmas.has(lemma.lemma) || cardMatchesLemma(lemma.gloss, lemma.lemma, lang)) {
      continue;
    }
    const built = optionsWith(lemma.lemma, unit.lemmas, random, lemma.gloss);
    if (!built) {
      continue;
    }
    usedLemmas.add(lemma.lemma);
    items.push({
      id: `q${items.length + 1}`,
      skill: "vocab",
      format: "meaning",
      prompt: `“${lemma.gloss.trim()}”`,
      options: built.options,
      answer: built.answer,
      source: "fallback",
    });
  }
  return items;
}

/** Filtra as lacunas da IA: 4 opções distintas, uma lacuna, resposta válida. Marca as que testam lemas. */
export function acceptAiDrills(
  drills: ReadonlyArray<{ prompt: string; options: string[]; answer: number }>,
  unit: LanguageUnit,
  lang: string,
  random: () => number = Math.random,
): StoredUnitTestItem[] {
  const accepted: StoredUnitTestItem[] = [];
  const prompts = new Set<string>();
  for (const drill of drills) {
    const prompt = drill.prompt.trim().replace(/_{3,}/g, "____");
    const options = drill.options.map((option) => option.trim());
    if (!prompt.includes("____") || prompt.length > 400 || prompts.has(normalizePhrase(prompt))) {
      continue;
    }
    if (!Number.isInteger(drill.answer) || drill.answer < 0 || drill.answer > 3 || options.length !== 4) {
      continue;
    }
    if (options.some((option) => !option || option.length > 160)) {
      continue;
    }
    if (new Set(options.map(normalizePhrase)).size !== 4) {
      continue;
    }
    const answerText = options[drill.answer] ?? "";
    const testsLemma = unit.lemmas.some((item) => cardMatchesLemma(answerText, item.lemma, lang));
    const order = shuffled([0, 1, 2, 3], random);
    prompts.add(normalizePhrase(prompt));
    accepted.push({
      id: "",
      skill: testsLemma ? "vocab" : "grammar",
      format: "cloze",
      prompt,
      options: order.map((index) => options[index] ?? ""),
      answer: order.indexOf(drill.answer),
      source: "ai",
    });
  }
  return accepted;
}

/** Monta os 8 itens: metade (até 4) testando lemas, o resto gramática; completa com o determinístico. */
export function composeUnitTest(
  aiItems: readonly StoredUnitTestItem[],
  fallback: readonly StoredUnitTestItem[],
  count = TEST_ITEMS,
): { items: StoredUnitTestItem[]; source: "ai" | "fallback" | "mixed" } {
  const lemmaItems = aiItems.filter((item) => item.skill === "vocab");
  const grammarItems = aiItems.filter((item) => item.skill === "grammar");
  const chosen: StoredUnitTestItem[] = [...lemmaItems.slice(0, Math.ceil(count / 2))];
  for (const item of grammarItems) {
    if (chosen.length >= count) {
      break;
    }
    chosen.push(item);
  }
  for (const item of lemmaItems.slice(Math.ceil(count / 2))) {
    if (chosen.length >= count) {
      break;
    }
    chosen.push(item);
  }
  const fromAi = chosen.length;
  const promptsTaken = new Set(chosen.map((item) => normalizePhrase(item.prompt)));
  for (const item of fallback) {
    if (chosen.length >= count) {
      break;
    }
    if (promptsTaken.has(normalizePhrase(item.prompt))) {
      continue;
    }
    chosen.push(item);
  }
  const items = chosen.map((item, index) => ({ ...item, id: `q${index + 1}` }));
  const source = fromAi === 0 ? "fallback" : fromAi >= items.length ? "ai" : "mixed";
  return { items, source };
}

export function publicUnitItems(items: readonly StoredUnitTestItem[]): PublicUnitTestItem[] {
  return items.map(({ answer: _answer, source: _source, ...item }) => item);
}

export function nextLevel(band: PathBand): CefrLevel {
  const index = CEFR_LEVELS.indexOf(band);
  return CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, index + 1)] ?? band;
}

// ---------------------------------------------------------------------------
// Acesso a dados
// ---------------------------------------------------------------------------

interface ProgressRow {
  unit_id: string;
  status: UnitStatus;
  lessons_done: number;
  unlocked_at: Date | null;
  completed_at: Date | null;
}

interface Course {
  userId: string;
  targetLang: string;
  throughLang: string;
  level: CefrLevel;
  displayLocale: string;
  usersTarget: string;
}

async function inPathTx<T>(pool: Pool, userId: string, targetLang: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`prosa-path:${userId}:${targetLang}`]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readStatuses(db: Db, userId: string, targetLang: string): Promise<Map<string, UnitStatus>> {
  const result = await db.query<{ unit_id: string; status: UnitStatus }>(
    "SELECT unit_id, status FROM path_progress WHERE user_id = $1 AND target_lang = $2",
    [userId, targetLang],
  );
  return new Map(result.rows.map((row) => [row.unit_id, row.status]));
}

async function applyChanges(db: Db, userId: string, targetLang: string, changes: readonly StatusChange[]): Promise<void> {
  for (const change of changes) {
    if (change.from === null) {
      await db.query(
        `INSERT INTO path_progress (user_id, target_lang, unit_id, status, unlocked_at, completed_at)
         VALUES ($1, $2, $3, $4,
                 CASE WHEN $4 = 'active' THEN now() END,
                 CASE WHEN $4 IN ('validated', 'mastered') THEN now() END)
         ON CONFLICT (user_id, target_lang, unit_id) DO NOTHING`,
        [userId, targetLang, change.unit_id, change.to],
      );
      continue;
    }
    await db.query(
      `UPDATE path_progress
       SET status = $4,
           unlocked_at = CASE WHEN $4 = 'active' THEN coalesce(unlocked_at, now()) ELSE unlocked_at END,
           completed_at = CASE WHEN $4 IN ('validated', 'mastered') THEN coalesce(completed_at, now()) ELSE completed_at END,
           updated_at = now()
       WHERE user_id = $1 AND target_lang = $2 AND unit_id = $3 AND status = $5`,
      [userId, targetLang, change.unit_id, change.to, change.from],
    );
  }
}

/** Cria o caminho (se faltar) e o sobe até o nível. Chamar dentro de inPathTx. */
async function ensurePathRows(db: Db, userId: string, targetLang: string, level: CefrLevel): Promise<void> {
  const current = await readStatuses(db, userId, targetLang);
  if (current.size === 0) {
    const initial = initialStatuses(level);
    await applyChanges(
      db,
      userId,
      targetLang,
      ORDERED_UNITS.map((unit) => ({ unit_id: unit.id, from: null, to: initial.get(unit.id) ?? "locked" })),
    );
    return;
  }
  await applyChanges(db, userId, targetLang, raiseToLevel(current, level));
}

/**
 * Depois de um nivelamento ou checkpoint: bandas abaixo do nível viram `validated` e a ativa
 * avança. Não cria caminho que ainda não existe (o primeiro GET /path cria a partir do nível).
 */
export async function syncPathToLevel(pool: Pool, userId: string, targetLang: string, level: CefrLevel): Promise<StatusChange[]> {
  return inPathTx(pool, userId, targetLang, async (client) => {
    const current = await readStatuses(client, userId, targetLang);
    if (current.size === 0) {
      return [];
    }
    const changes = raiseToLevel(current, level);
    await applyChanges(client, userId, targetLang, changes);
    return changes;
  });
}

/**
 * Registra que a escada de correção de um diário fechou hoje (chamado por /journal/evaluate).
 * A unidade vem do servidor: a lição de hoje com unidade ou a unidade ativa do curso.
 */
export async function recordJournalClosure(
  pool: Pool,
  input: { userId: string; targetLang: string; attempt: number; score: number },
): Promise<void> {
  await pool.query(
    `INSERT INTO journal_closures (user_id, target_lang, closed_on, unit_id, attempt, score)
     VALUES (
       $1, $2, CURRENT_DATE,
       coalesce(
         (SELECT unit_id FROM daily_lessons
          WHERE user_id = $1 AND target_lang = $2 AND lesson_date = CURRENT_DATE AND unit_id IS NOT NULL
          LIMIT 1),
         (SELECT unit_id FROM path_progress WHERE user_id = $1 AND target_lang = $2 AND status = 'active' LIMIT 1)
       ),
       $3, $4
     )
     ON CONFLICT (user_id, target_lang, closed_on, (coalesce(unit_id, ''))) DO NOTHING`,
    [input.userId, input.targetLang, Math.max(1, Math.min(4, Math.round(input.attempt))), Math.max(0, Math.min(100, Math.round(input.score)))],
  );
}

export interface UnitBrief {
  unit: UnitSkeleton;
  /** Título e metas "eu consigo…" em inglês (para o prompt). */
  title: string;
  canDo: string[];
  grammar: GrammarFocus | null;
  lemmas: CoreLemma[];
  /** Lemas que esta lição precisa trazer no texto e no vocabulário. */
  focus: CoreLemma[];
}

/** O que a lição da unidade pratica. `userId` escolhe os lemas que o aluno ainda não fixou. */
export async function loadUnitBrief(
  pool: Pool,
  userId: string | null,
  targetLang: string,
  unitId: string,
): Promise<UnitBrief | null> {
  const unit = unitById(unitId);
  if (!unit) {
    return null;
  }
  const curriculum = await getCurriculum();
  const entry = syllabusEntryOf(curriculum, unitId);
  const language = languageUnitOf(curriculum, targetLang, unitId);
  const lemmas = language?.lemmas ?? [];
  let focus = lemmas.slice(0, LESSON_FOCUS_LEMMAS);
  if (userId && lemmas.length > 0) {
    const cards = await pool.query<{ front_phrase: string; stability: number }>(
      "SELECT front_phrase, stability FROM srs_cards WHERE user_id = $1 AND target_lang = $2",
      [userId, targetLang],
    );
    const sessions = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM session_completions WHERE user_id = $1 AND target_lang = $2 AND unit_id = $3",
      [userId, targetLang, unitId],
    );
    const carded = new CardIndex(cards.rows.map((row) => row.front_phrase), targetLang);
    const stable = new CardIndex(
      cards.rows.filter((row) => Number(row.stability) >= LEMMA_STABILITY_DAYS).map((row) => row.front_phrase),
      targetLang,
    );
    focus = lessonFocusLemmas(lemmas, carded, stable, sessions.rows[0]?.count ?? 0);
  }
  return {
    unit,
    title: unitTitle(entry, unit, "en"),
    canDo: unitCanDo(entry, "en"),
    grammar: language?.grammar ?? null,
    lemmas,
    focus,
  };
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

interface TestRow {
  id: string;
  kind: "unit" | "checkpoint";
  unit_id: string | null;
  band: PathBand | null;
  items: unknown;
  status: "started" | "finished" | "abandoned";
  started_at: Date;
}

function unitItemsOf(value: unknown): StoredUnitTestItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const parsed = storedUnitTestItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function checkpointItemsOf(value: unknown): StoredPlacementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const parsed = storedPlacementItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function publicCheckpointItems(items: readonly StoredPlacementItem[]) {
  return items.map(({ answer: _answer, difficulty: _difficulty, ...item }) => ({ ...item, skill: item.kind }));
}

export class PathService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
    private readonly placement: PlacementService,
  ) {}

  async view(user: AuthUser, options: { locale?: string; targetLang?: string } = {}): Promise<PathView> {
    const course = await this.course(user, options.targetLang);
    await inPathTx(this.pool, course.userId, course.targetLang, (client) =>
      ensurePathRows(client, course.userId, course.targetLang, course.level),
    );
    await this.settleStreak(course.userId);
    const locale = this.localeFor(options.locale, course.displayLocale);
    return this.build(course, locale);
  }

  async completeSession(user: AuthUser, body: SessionCompleteBody): Promise<{ streak_count: number; unit: PathUnitView | null }> {
    if (!sessionDateAccepted(body.date)) {
      throw new AppError(400, "date must be the learner's current day");
    }
    const course = await this.course(user, body.target_lang);
    const recorded = await inPathTx(this.pool, course.userId, course.targetLang, async (client) => {
      await ensurePathRows(client, course.userId, course.targetLang, course.level);
      let unitId: string | null = null;
      if (body.unit_id) {
        const status = await client.query<{ status: UnitStatus }>(
          "SELECT status FROM path_progress WHERE user_id = $1 AND target_lang = $2 AND unit_id = $3",
          [course.userId, course.targetLang, body.unit_id],
        );
        const found = status.rows[0]?.status;
        unitId = found && found !== "locked" ? body.unit_id : null;
      }
      const inserted = await client.query<{ unit_id: string | null }>(
        `INSERT INTO session_completions (user_id, target_lang, date, unit_id, elapsed_seconds)
         VALUES ($1, $2, $3::date, $4, $5)
         ON CONFLICT (user_id, target_lang, date) DO NOTHING
         RETURNING unit_id`,
        [course.userId, course.targetLang, body.date, unitId, body.elapsed_seconds ?? 0],
      );
      let storedUnit: string | null;
      if (inserted.rows.length > 0) {
        storedUnit = unitId;
        if (unitId) {
          await client.query(
            `UPDATE path_progress SET lessons_done = lessons_done + 1, updated_at = now()
             WHERE user_id = $1 AND target_lang = $2 AND unit_id = $3`,
            [course.userId, course.targetLang, unitId],
          );
        }
        await client.query(
          `UPDATE daily_lessons SET status = 'completed'
           WHERE user_id = $1 AND target_lang = $2 AND status = 'in_progress'
             AND lesson_date BETWEEN $3::date - 1 AND $3::date + 1`,
          [course.userId, course.targetLang, body.date],
        );
      } else {
        const existing = await client.query<{ unit_id: string | null }>(
          "SELECT unit_id FROM session_completions WHERE user_id = $1 AND target_lang = $2 AND date = $3::date",
          [course.userId, course.targetLang, body.date],
        );
        storedUnit = existing.rows[0]?.unit_id ?? null;
      }
      const dates = await client.query<{ day: string }>(
        `SELECT DISTINCT to_char(date, 'YYYY-MM-DD') AS day
         FROM session_completions WHERE user_id = $1
         ORDER BY day DESC LIMIT 1000`,
        [course.userId],
      );
      const streak = streakFrom(dates.rows.map((row) => row.day));
      await client.query("UPDATE users SET streak_count = $2, last_lesson_at = now() WHERE id = $1", [course.userId, streak]);
      return { streak, unitId: storedUnit };
    });
    const shownUnit = recorded.unitId ?? body.unit_id ?? null;
    let unit: PathUnitView | null = null;
    if (shownUnit) {
      const view = await this.build(course, this.localeFor(undefined, course.displayLocale));
      unit = view.units.find((item) => item.id === shownUnit) ?? null;
    }
    return { streak_count: recorded.streak, unit };
  }

  async startUnitTest(user: AuthUser, unitId: string): Promise<{ attempt_id: string; items: PublicUnitTestItem[] }> {
    const unit = unitById(unitId);
    if (!unit) {
      throw new AppError(404, "Unit was not found");
    }
    const course = await this.course(user);
    await inPathTx(this.pool, course.userId, course.targetLang, (client) =>
      ensurePathRows(client, course.userId, course.targetLang, course.level),
    );
    const view = await this.build(course, "en");
    const current = view.units.find((item) => item.id === unitId);
    if (!current || current.status !== "active") {
      throw new AppError(409, "This unit is not active");
    }
    if (!current.mastery.test.available) {
      throw new AppError(409, "The unit test opens after the lessons, the core words and the journal");
    }
    const open = await this.pool.query<TestRow>(
      `SELECT id, kind, unit_id, band, items, status, started_at
       FROM path_unit_tests
       WHERE user_id = $1 AND target_lang = $2 AND kind = 'unit' AND unit_id = $3 AND status = 'started'
         AND started_at > now() - interval '2 hours'
       ORDER BY started_at DESC LIMIT 1`,
      [course.userId, course.targetLang, unitId],
    );
    const existing = open.rows[0];
    if (existing) {
      const items = unitItemsOf(existing.items);
      if (items.length === TEST_ITEMS) {
        return { attempt_id: existing.id, items: publicUnitItems(items) };
      }
    }
    const built = await this.buildUnitTest(course, unit);
    if (built.items.length < TEST_ITEMS) {
      throw new AppError(503, "Unit test questions are not ready yet");
    }
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO path_unit_tests (id, user_id, target_lang, kind, unit_id, source, items)
       VALUES ($1, $2, $3, 'unit', $4, $5, $6::jsonb)
       RETURNING id`,
      [randomUUID(), course.userId, course.targetLang, unitId, built.source, JSON.stringify(built.items)],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new AppError(500, "Unit test could not start");
    }
    return { attempt_id: id, items: publicUnitItems(built.items) };
  }

  async finishUnitTest(
    user: AuthUser,
    unitId: string,
    body: PathFinishBody,
  ): Promise<{ score: number; passed: boolean; correct: number; total: number; unit: PathUnitView | null; next_unit_id: string | null }> {
    const course = await this.course(user);
    const row = await this.claimAttempt(course, body.attempt_id, "unit", unitId);
    const items = unitItemsOf(row.items);
    const result = scoreAnswers(items, body.answers);
    const passed = items.length > 0 && result.score >= TEST_PASS;
    await this.pool.query(
      `UPDATE path_unit_tests
       SET answers = $2::jsonb, correct_count = $3, item_count = $4, score = $5, passed = $6, finished_at = now()
       WHERE id = $1`,
      [row.id, JSON.stringify(result.picked), result.correct, result.total, result.score, passed],
    );
    let nextUnitId: string | null = null;
    if (passed) {
      nextUnitId = await inPathTx(this.pool, course.userId, course.targetLang, async (client) => {
        const statuses = await readStatuses(client, course.userId, course.targetLang);
        const mastered = masterUnit(statuses, unitId);
        await applyChanges(client, course.userId, course.targetLang, mastered.changes);
        return mastered.nextUnitId;
      });
    }
    const view = await this.build(course, this.localeFor(undefined, course.displayLocale));
    return {
      score: result.score,
      passed,
      correct: result.correct,
      total: result.total,
      unit: view.units.find((item) => item.id === unitId) ?? null,
      next_unit_id: nextUnitId,
    };
  }

  async startCheckpoint(user: AuthUser, targetLang?: string) {
    const course = await this.course(user, targetLang);
    await inPathTx(this.pool, course.userId, course.targetLang, (client) =>
      ensurePathRows(client, course.userId, course.targetLang, course.level),
    );
    const view = await this.build(course, "en");
    const band = view.checkpoint.band;
    if (!view.checkpoint.available) {
      throw new AppError(409, "The checkpoint opens when every unit of the band is mastered or validated");
    }
    const open = await this.pool.query<TestRow>(
      `SELECT id, kind, unit_id, band, items, status, started_at
       FROM path_unit_tests
       WHERE user_id = $1 AND target_lang = $2 AND kind = 'checkpoint' AND band = $3 AND status = 'started'
         AND started_at > now() - interval '2 hours'
       ORDER BY started_at DESC LIMIT 1`,
      [course.userId, course.targetLang, band],
    );
    const existing = open.rows[0];
    if (existing) {
      const items = checkpointItemsOf(existing.items);
      if (items.length >= CHECKPOINT_MIN_ITEMS) {
        return { attempt_id: existing.id, band, items: publicCheckpointItems(items) };
      }
    }
    const items = await this.placement.checkpointItems(user, course.targetLang, course.throughLang, band, CHECKPOINT_ITEMS);
    if (items.length < CHECKPOINT_MIN_ITEMS) {
      throw new AppError(503, "Checkpoint questions are not ready yet");
    }
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO path_unit_tests (id, user_id, target_lang, kind, band, source, items)
       VALUES ($1, $2, $3, 'checkpoint', $4, 'bank', $5::jsonb)
       RETURNING id`,
      [randomUUID(), course.userId, course.targetLang, band, JSON.stringify(items)],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new AppError(500, "Checkpoint could not start");
    }
    return { attempt_id: id, band, items: publicCheckpointItems(items) };
  }

  async finishCheckpoint(user: AuthUser, body: PathFinishBody): Promise<{ score: number; passed: boolean; level: CefrLevel }> {
    const found = await this.pool.query<{ target_lang: string }>(
      "SELECT target_lang FROM path_unit_tests WHERE id = $1 AND user_id = $2 AND kind = 'checkpoint'",
      [body.attempt_id, user.id],
    );
    const target = found.rows[0]?.target_lang;
    if (!target) {
      throw new AppError(404, "Checkpoint was not found");
    }
    const course = await this.course(user, target);
    const row = await this.claimAttempt(course, body.attempt_id, "checkpoint");
    const items = checkpointItemsOf(row.items);
    const result = scoreAnswers(items, body.answers);
    const passed = items.length > 0 && result.score >= CHECKPOINT_PASS;
    await this.pool.query(
      `UPDATE path_unit_tests
       SET answers = $2::jsonb, correct_count = $3, item_count = $4, score = $5, passed = $6, finished_at = now()
       WHERE id = $1`,
      [row.id, JSON.stringify(result.picked), result.correct, result.total, result.score, passed],
    );
    let level = course.level;
    const band = row.band ?? pathBandFor(course.level);
    if (passed) {
      const raised = nextLevel(band);
      if (CEFR_LEVELS.indexOf(raised) > CEFR_LEVELS.indexOf(level)) {
        level = raised;
        await this.applyLevel(course, level);
        await syncPathToLevel(this.pool, course.userId, course.targetLang, level);
      }
    }
    return { score: result.score, passed, level };
  }

  // -------------------------------------------------------------------------

  private async course(user: AuthUser, targetLang?: string): Promise<Course> {
    const found = await this.pool.query<{
      target_lang: string;
      native_lang: string;
      level: CefrLevel;
      display_locale: string | null;
      track_level: CefrLevel | null;
      track_through: string | null;
    }>(
      `SELECT u.target_lang, u.native_lang, u.level, u.display_locale,
              st.level AS track_level, st.through_lang AS track_through
       FROM users u
       LEFT JOIN study_tracks st ON st.user_id = u.id AND st.target_lang = coalesce($2, u.target_lang)
       WHERE u.id = $1`,
      [user.id, targetLang ?? null],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(401, "Authentication required");
    }
    const target = (targetLang ?? row.target_lang).toLowerCase();
    const isMain = target === row.target_lang.toLowerCase();
    return {
      userId: user.id,
      targetLang: target,
      throughLang: isMain ? row.native_lang : (row.track_through ?? row.native_lang),
      level: isMain ? row.level : (row.track_level ?? "A1"),
      displayLocale: row.display_locale ?? "en",
      usersTarget: row.target_lang,
    };
  }

  private localeFor(requested: string | undefined, display: string): UiLocale {
    if (requested && isUiLocale(requested)) {
      return requested;
    }
    return isUiLocale(display) ? display : "en";
  }

  /** Ofensiva que certamente acabou volta a 0 (honesto também para quem só lê o número). */
  private async settleStreak(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET streak_count = 0
       WHERE id = $1 AND streak_count > 0
         AND NOT EXISTS (
           SELECT 1 FROM session_completions WHERE user_id = $1 AND date >= $2::date
         )`,
      [userId, utcDay(new Date(), -2)],
    );
  }

  private async claimAttempt(course: Course, attemptId: string, kind: "unit" | "checkpoint", unitId?: string): Promise<TestRow> {
    const found = await this.pool.query<TestRow>(
      `SELECT id, kind, unit_id, band, items, status, started_at
       FROM path_unit_tests
       WHERE id = $1 AND user_id = $2 AND target_lang = $3 AND kind = $4`,
      [attemptId, course.userId, course.targetLang, kind],
    );
    const row = found.rows[0];
    if (!row || (unitId && row.unit_id !== unitId)) {
      throw new AppError(404, kind === "unit" ? "Unit test was not found" : "Checkpoint was not found");
    }
    if (row.status !== "started") {
      throw new AppError(409, "This attempt is already closed");
    }
    if (Date.now() - row.started_at.getTime() > FINISH_WINDOW_MS) {
      await this.pool.query("UPDATE path_unit_tests SET status = 'abandoned' WHERE id = $1 AND status = 'started'", [row.id]);
      throw new AppError(409, "This attempt expired");
    }
    const claimed = await this.pool.query(
      "UPDATE path_unit_tests SET status = 'finished' WHERE id = $1 AND status = 'started' RETURNING id",
      [row.id],
    );
    if ((claimed.rowCount ?? 0) === 0) {
      throw new AppError(409, "This attempt is already closed");
    }
    return row;
  }

  private async applyLevel(course: Course, level: CefrLevel): Promise<void> {
    await inPathTx(this.pool, course.userId, `level:${course.targetLang}`, async (client) => {
      await client.query(
        `INSERT INTO study_tracks (user_id, target_lang, through_lang, level, active)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (user_id, target_lang) DO UPDATE SET level = EXCLUDED.level`,
        [course.userId, course.targetLang, course.throughLang, level],
      );
      await client.query("UPDATE users SET level = $2 WHERE id = $1 AND target_lang = $3", [
        course.userId,
        level,
        course.targetLang,
      ]);
    });
  }

  private async buildUnitTest(course: Course, unit: UnitSkeleton): Promise<{ items: StoredUnitTestItem[]; source: "ai" | "fallback" | "mixed" }> {
    const curriculum = await getCurriculum();
    const language = languageUnitOf(curriculum, course.targetLang, unit.id);
    if (!language) {
      throw new AppError(503, "Unit test questions are not ready yet");
    }
    let aiItems: StoredUnitTestItem[] = [];
    try {
      const drills = await withTimeout(
        this.gemini.duelDrills({
          targetLang: course.targetLang,
          throughLang: course.throughLang,
          level: unit.band,
          interests: [unit.topic],
          focus: [
            `grammar: ${language.grammar.name}. ${language.grammar.summary}`,
            `blank one of these unit words in about half of the drills: ${language.lemmas.map((item) => item.lemma).join(", ")}`,
          ],
        }),
        AI_TEST_TIMEOUT_MS,
      );
      aiItems = acceptAiDrills(drills.drills, language, course.targetLang);
    } catch {
      // A IA ocupada não derruba o teste: os itens determinísticos cobrem o que faltar.
      aiItems = [];
    }
    return composeUnitTest(aiItems, fallbackTestItems(language, course.targetLang));
  }

  private async build(course: Course, locale: UiLocale): Promise<PathView> {
    const { userId, targetLang } = course;
    const [progress, sessions, journals, tests, cards, checkpoints, curriculum] = await Promise.all([
      this.pool.query<ProgressRow>(
        `SELECT unit_id, status, lessons_done, unlocked_at, completed_at
         FROM path_progress WHERE user_id = $1 AND target_lang = $2`,
        [userId, targetLang],
      ),
      this.pool.query<{ unit_id: string; count: number }>(
        `SELECT unit_id, count(*)::int AS count
         FROM session_completions
         WHERE user_id = $1 AND target_lang = $2 AND unit_id IS NOT NULL
         GROUP BY unit_id`,
        [userId, targetLang],
      ),
      this.pool.query<{ unit_id: string }>(
        `SELECT DISTINCT unit_id FROM journal_closures
         WHERE user_id = $1 AND target_lang = $2 AND unit_id IS NOT NULL
         UNION
         SELECT DISTINCT s.unit_id
         FROM journal_closures j
         JOIN session_completions s
           ON s.user_id = j.user_id AND s.target_lang = j.target_lang
          AND s.date BETWEEN j.closed_on - 1 AND j.closed_on + 1
         WHERE j.user_id = $1 AND j.target_lang = $2 AND j.unit_id IS NULL AND s.unit_id IS NOT NULL`,
        [userId, targetLang],
      ),
      this.pool.query<{ unit_id: string; best: number }>(
        `SELECT unit_id, max(score)::int AS best
         FROM path_unit_tests
         WHERE user_id = $1 AND target_lang = $2 AND kind = 'unit' AND status = 'finished' AND score IS NOT NULL
         GROUP BY unit_id`,
        [userId, targetLang],
      ),
      this.pool.query<{ front_phrase: string }>(
        "SELECT front_phrase FROM srs_cards WHERE user_id = $1 AND target_lang = $2 AND stability >= $3",
        [userId, targetLang, LEMMA_STABILITY_DAYS],
      ),
      this.pool.query<{ band: string }>(
        `SELECT DISTINCT band FROM path_unit_tests
         WHERE user_id = $1 AND target_lang = $2 AND kind = 'checkpoint' AND passed`,
        [userId, targetLang],
      ),
      getCurriculum(),
    ]);
    const rows = new Map(progress.rows.map((row) => [row.unit_id, row]));
    const sessionCount = new Map(sessions.rows.map((row) => [row.unit_id, row.count]));
    const journalUnits = new Set(journals.rows.map((row) => row.unit_id));
    const bestTest = new Map(tests.rows.map((row) => [row.unit_id, row.best]));
    const stable = new CardIndex(cards.rows.map((row) => row.front_phrase), targetLang);
    const units = ORDERED_UNITS.map((unit) =>
      this.unitView(unit, rows.get(unit.id), curriculum, targetLang, locale, {
        lessonsDone: sessionCount.get(unit.id) ?? 0,
        journalMet: journalUnits.has(unit.id),
        bestTest: bestTest.get(unit.id) ?? null,
        stable,
      }),
    );
    const band = pathBandFor(course.level);
    const bandDone = units.filter((unit) => unit.band === band).every((unit) => unit.status === "mastered" || unit.status === "validated");
    const passed =
      CEFR_LEVELS.indexOf(course.level) > CEFR_LEVELS.indexOf(band) || checkpoints.rows.some((row) => row.band === band);
    return {
      target_lang: targetLang,
      level: course.level,
      current_unit_id: units.find((unit) => unit.status === "active")?.id ?? null,
      units,
      checkpoint: { band, available: bandDone && !passed, passed },
    };
  }

  private unitView(
    unit: UnitSkeleton,
    row: ProgressRow | undefined,
    curriculum: Curriculum,
    targetLang: string,
    locale: UiLocale,
    facts: { lessonsDone: number; journalMet: boolean; bestTest: number | null; stable: CardIndex },
  ): PathUnitView {
    const status: UnitStatus = row?.status ?? "locked";
    const entry = syllabusEntryOf(curriculum, unit.id);
    const language = languageUnitOf(curriculum, targetLang, unit.id);
    const lemmas = language?.lemmas ?? [];
    const known = lemmas.filter((item) => facts.stable.has(item.lemma, item.reading)).length;
    return {
      id: unit.id,
      band: unit.band,
      order: unit.order,
      status,
      title: unitTitle(entry, unit, locale),
      can_do: unitCanDo(entry, locale),
      focus: unit.focus,
      grammar: { name: language?.grammar.name ?? "", examples: language?.grammar.examples ?? [] },
      mastery: masteryOf({
        status,
        lessonsDone: facts.lessonsDone,
        lemmasKnown: known,
        lemmasTotal: lemmas.length,
        journalMet: facts.journalMet,
        bestTest: facts.bestTest,
      }),
      unlocked_at: row?.unlocked_at?.toISOString() ?? null,
      completed_at: row?.completed_at?.toISOString() ?? null,
    };
  }
}

/** Carimbo curto e estável para chaves de cache. */
export function shortStamp(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}
