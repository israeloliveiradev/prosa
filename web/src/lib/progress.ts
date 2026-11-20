import { useSyncExternalStore } from "react";
import { syncReviews } from "@/lib/api";
import { BADGE_CODES, PROGRESS_COPY } from "@/lib/copy/progress";
import { applyFsrs, dueCards, isDue, isNewCard, isReviewQuality, seedFromSm2, type ReviewQuality } from "@/lib/fsrs";
import { kv } from "@/lib/kv";
import {
  finishReconstruction,
  scheduleReconstruction,
  type ReconstructionAnchor,
} from "@/lib/reconstruction";
import { getSession } from "@/lib/session";
import { cardsForThrough } from "@/lib/through-lang";
import type { LessonPayload, LessonRequest, SessionCard } from "@/lib/types";
import { awardXp, bindXpLang, hydrateXp, resetXp } from "@/lib/xp";
import { isIsoDate, lastIsoDates, shiftIsoDate } from "@/lib/xp-rules";

/**
 * Progresso local, isolado por idioma-alvo (uma "faixa" por curso), persistido no kv e
 * sobrevivendo ao F5. Cartões agendados com FSRS (`@/lib/fsrs`), revisões sincronizadas
 * com `POST /api/v1/srs/sync`, ofensiva honesta derivada dos dias com sessão completa.
 */
const STORAGE_KEY = "prosa.progress.v1";
const PENDING_LANE = "pending";
/** Dias de sessão guardados por curso (a melhor ofensiva fica gravada à parte). */
const MAX_SESSION_DAYS = 400;
/** Dias de tempo de estudo guardados por curso. */
const STUDY_RETENTION_DAYS = 60;
/** No máximo 4 horas contadas por dia: um relógio esquecido aberto não vira estudo. */
const MAX_STUDY_SECONDS_PER_DAY = 4 * 60 * 60;
/** Cartões vencidos que entram antes da lição. */
const DUE_IN_QUEUE = 12;
/** Cartões nunca revisados (de lições antigas ou salvos da leitura) que entram por sessão. */
const NEW_IN_QUEUE = 4;
const MAX_PENDING_REVIEWS = 200;
/** Janela em que uma nota já gravada pelo chamador é reconhecida como a mesma nota. */
const ALREADY_GRADED_MS = 5_000;
const SYNC_BATCH = 50;
const SYNC_ROUNDS = 4;

export interface LessonHistoryItem {
  date: string;
  title: string;
  topic: string;
  lesson: LessonPayload;
}

export interface PendingReview {
  client_id: string;
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
  quality: ReviewQuality;
  /** Quando a nota foi dada (ISO). Opcional: filas antigas não têm. */
  reviewed_at?: string;
}

export interface ProgressState {
  /** Ofensiva atual do curso ativo: dias seguidos com sessão completa, terminando hoje ou ontem. */
  streakCount: number;
  /** Último dia (calendário local) com sessão completa neste curso. */
  lastLessonDate: string | null;
  /** @deprecated Não existe economia de congelamento; sempre 0. */
  streakFreezeCount: number;
  badges: string[];
  cards: SessionCard[];
  pendingReviews: PendingReview[];
  lessonDate: string | null;
  topic: string | null;
  cachedLesson: LessonPayload | null;
  history: LessonHistoryItem[];
  pro: boolean;
  speakingBest: number;
  journalCount: number;
  reconstruction: ReconstructionAnchor | null;
  reconstructionNext: ReconstructionAnchor | null;
  cognateKeys: string[];
  skills: { reading: number; listening: number } | null;
  /** Dias (YYYY-MM-DD, calendário local) com sessão completa, em ordem crescente. */
  sessionDays: string[];
  /** Maior ofensiva já feita neste curso. */
  bestStreak: number;
  /** Segundos de estudo por dia: data -> chave da atividade -> segundos. */
  studyLog: Record<string, Record<string, number>>;
}

export const BADGES = BADGE_CODES.map((code) => ({
  code,
  name: PROGRESS_COPY.pt.badges[code].name,
  description: PROGRESS_COPY.pt.badges[code].description,
}));

function emptyProgress(): ProgressState {
  return {
    streakCount: 0,
    lastLessonDate: null,
    streakFreezeCount: 0,
    badges: [],
    cards: [],
    pendingReviews: [],
    lessonDate: null,
    topic: null,
    cachedLesson: null,
    history: [],
    pro: false,
    speakingBest: 0,
    journalCount: 0,
    reconstruction: null,
    reconstructionNext: null,
    cognateKeys: [],
    skills: null,
    sessionDays: [],
    bestStreak: 0,
    studyLog: {},
  };
}

// ---------------------------------------------------------------------------
// Datas e ofensiva (funções puras)
// ---------------------------------------------------------------------------

export function isoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
}

/** Datas válidas, sem repetição, em ordem crescente. */
export function normalizeDays(days: readonly unknown[]): string[] {
  return [...new Set(days.filter(isIsoDate))].sort();
}

/**
 * Ofensiva atual: dias seguidos com sessão completa terminando hoje, ou ontem se a sessão
 * de hoje ainda não aconteceu. Um dia sem sessão zera a contagem, sem outra penalidade.
 */
export function streakFromDays(days: readonly string[], today: string): number {
  const done = new Set(days);
  let cursor = done.has(today) ? today : shiftIsoDate(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = shiftIsoDate(cursor, -1);
  }
  return count;
}

/** Maior sequência de dias seguidos dentro da lista. */
export function bestStreakFromDays(days: readonly string[]): number {
  const sorted = normalizeDays(days);
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

/** Os últimos 7 dias (do mais antigo para hoje): houve sessão completa naquele dia. */
export function weekFromDays(days: readonly string[], today: string): boolean[] {
  const done = new Set(days);
  return lastIsoDates(today, 7).map((day) => done.has(day));
}

export interface StreakSummary {
  current: number;
  best: number;
  doneToday: boolean;
  /** Últimos 7 dias, do mais antigo para hoje. */
  week: boolean[];
  /** As datas de `week`, na mesma ordem. */
  weekDays: string[];
  lastDay: string | null;
}

export function streakSummary(days: readonly string[], today: string, storedBest = 0): StreakSummary {
  const clean = normalizeDays(days);
  const current = streakFromDays(clean, today);
  return {
    current,
    best: Math.max(storedBest, current, bestStreakFromDays(clean)),
    doneToday: clean.includes(today),
    week: weekFromDays(clean, today),
    weekDays: lastIsoDates(today, 7),
    lastDay: clean.length > 0 ? clean[clean.length - 1]! : null,
  };
}

/**
 * @deprecated Mantida por compatibilidade; a ofensiva agora vem de `sessionDays`.
 * Sem congelamento: dia seguido soma 1, mesmo dia mantém, qualquer falta recomeça em 1.
 */
export function nextStreak(
  state: Pick<ProgressState, "streakCount" | "lastLessonDate" | "streakFreezeCount">,
  today: string,
): Pick<ProgressState, "streakCount" | "lastLessonDate" | "streakFreezeCount"> {
  if (state.lastLessonDate === today) {
    return { streakCount: state.streakCount, lastLessonDate: today, streakFreezeCount: 0 };
  }
  if (state.lastLessonDate && daysBetween(state.lastLessonDate, today) === 1) {
    return { streakCount: state.streakCount + 1, lastLessonDate: today, streakFreezeCount: 0 };
  }
  return { streakCount: 1, lastLessonDate: today, streakFreezeCount: 0 };
}

/** Segundos de estudo registrados no dia. */
export function studySecondsOn(studyLog: ProgressState["studyLog"], date: string): number {
  const day = studyLog[date];
  if (!day) {
    return 0;
  }
  const total = Object.values(day).reduce((sum, value) => sum + value, 0);
  return Math.min(MAX_STUDY_SECONDS_PER_DAY, total);
}

// ---------------------------------------------------------------------------
// Leitura do armazenamento
// ---------------------------------------------------------------------------

function skillPercent(item: { correct: number; total: number } | undefined): number | null {
  if (!item || item.total <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round((item.correct / item.total) * 100)));
}

function readSkills(value: unknown): { reading: number; listening: number } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as { reading?: unknown; listening?: unknown };
  if (typeof row.reading !== "number" || typeof row.listening !== "number") {
    return null;
  }
  return {
    reading: Math.max(0, Math.min(100, Math.round(row.reading))),
    listening: Math.max(0, Math.min(100, Math.round(row.listening))),
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isCard(value: unknown): value is SessionCard {
  if (!value || typeof value !== "object") {
    return false;
  }
  const card = value as SessionCard;
  return (
    typeof card.id === "string" &&
    typeof card.front_phrase === "string" &&
    typeof card.back_translation === "string" &&
    typeof card.context_sentence === "string" &&
    (card.status === "learning" || card.status === "reviewing" || card.status === "mastered")
  );
}

function validTime(value: unknown): string | undefined {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined;
}

/** Normaliza os campos de agendamento e leva cartões do tempo do SM-2 para o FSRS. */
function readCard(card: SessionCard): SessionCard {
  const { stability, difficulty, due, reviewed_at, ...rest } = card;
  const clean: SessionCard = {
    ...rest,
    repetition_count: Math.max(0, Math.round(numberOr(card.repetition_count, 0))),
    interval_days: Math.max(0, Math.round(numberOr(card.interval_days, 0))),
    ease_factor: numberOr(card.ease_factor, 2.5),
  };
  if (typeof stability === "number" && Number.isFinite(stability) && stability > 0) {
    clean.stability = stability;
  }
  if (typeof difficulty === "number" && Number.isFinite(difficulty) && difficulty > 0) {
    clean.difficulty = difficulty;
  }
  const dueAt = validTime(due);
  if (dueAt) {
    clean.due = dueAt;
  }
  const reviewedAt = validTime(reviewed_at);
  if (reviewedAt) {
    clean.reviewed_at = reviewedAt;
  }
  return seedFromSm2(clean);
}

function isPending(value: unknown): value is PendingReview {
  if (!value || typeof value !== "object") {
    return false;
  }
  const review = value as PendingReview;
  return (
    typeof review.client_id === "string" &&
    typeof review.front_phrase === "string" &&
    typeof review.back_translation === "string" &&
    typeof review.context_sentence === "string" &&
    isReviewQuality(review.quality)
  );
}

function isAnchor(value: unknown): value is ReconstructionAnchor {
  if (!value || typeof value !== "object") {
    return false;
  }
  const anchor = value as ReconstructionAnchor;
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return (
    typeof anchor.date === "string" &&
    typeof anchor.topic === "string" &&
    typeof anchor.targetLang === "string" &&
    typeof anchor.throughLang === "string" &&
    levels.includes(anchor.level) &&
    typeof anchor.storyText === "string" &&
    anchor.storyText.trim().length > 0 &&
    typeof anchor.translation === "string" &&
    anchor.translation.trim().length > 0 &&
    (anchor.completedOn === null || typeof anchor.completedOn === "string")
  );
}

function isHistory(value: unknown): value is LessonHistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as LessonHistoryItem;
  return typeof item.date === "string" && typeof item.title === "string" && typeof item.topic === "string" && isLesson(item.lesson);
}

function isLesson(value: unknown): value is LessonPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const lesson = value as LessonPayload;
  return typeof lesson.title === "string" && typeof lesson.story_text === "string" && Array.isArray(lesson.vocabulary);
}

function readStudyLog(value: unknown): ProgressState["studyLog"] {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: ProgressState["studyLog"] = {};
  for (const [date, day] of Object.entries(value as Record<string, unknown>)) {
    if (!isIsoDate(date) || !day || typeof day !== "object") {
      continue;
    }
    const entries = Object.entries(day as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
    );
    if (entries.length > 0) {
      result[date] = Object.fromEntries(entries.map(([key, seconds]) => [key, Math.min(MAX_STUDY_SECONDS_PER_DAY, Math.round(seconds))]));
    }
  }
  return result;
}

type LaneState = Omit<ProgressState, "pro" | "streakCount" | "lastLessonDate" | "streakFreezeCount">;

function readLane(input: unknown): LaneState {
  const value = (input && typeof input === "object" ? input : {}) as Partial<ProgressState>;
  const sessionDays = normalizeDays(Array.isArray(value.sessionDays) ? value.sessionDays : []).slice(-MAX_SESSION_DAYS);
  return {
    badges: Array.isArray(value.badges) ? value.badges.filter((item) => typeof item === "string") : [],
    cards: Array.isArray(value.cards) ? value.cards.filter(isCard).map(readCard) : [],
    pendingReviews: Array.isArray(value.pendingReviews) ? value.pendingReviews.filter(isPending) : [],
    lessonDate: typeof value.lessonDate === "string" ? value.lessonDate : null,
    topic: typeof value.topic === "string" ? value.topic : null,
    cachedLesson: isLesson(value.cachedLesson) ? value.cachedLesson : null,
    history: Array.isArray(value.history) ? value.history.filter(isHistory) : [],
    speakingBest: Math.max(0, Math.min(100, numberOr(value.speakingBest, 0))),
    journalCount: Math.max(0, numberOr(value.journalCount, 0)),
    reconstruction: isAnchor(value.reconstruction) ? value.reconstruction : null,
    reconstructionNext: isAnchor(value.reconstructionNext) ? value.reconstructionNext : null,
    cognateKeys: Array.isArray(value.cognateKeys) ? value.cognateKeys.filter((item) => typeof item === "string").slice(0, 5) : [],
    skills: readSkills(value.skills),
    sessionDays,
    bestStreak: Math.max(0, Math.round(numberOr(value.bestStreak, 0)), bestStreakFromDays(sessionDays)),
    studyLog: readStudyLog(value.studyLog),
  };
}

function takeLane(state: ProgressState): LaneState {
  const { pro: _pro, streakCount: _streak, lastLessonDate: _last, streakFreezeCount: _freeze, ...lane } = state;
  return lane;
}

function emptyLane(): LaneState {
  return takeLane(emptyProgress());
}

interface ProgressBag {
  version: 3;
  pro: boolean;
  activeLang: string;
  lanes: Record<string, LaneState>;
}

function emptyBag(): ProgressBag {
  return { version: 3, pro: false, activeLang: PENDING_LANE, lanes: { [PENDING_LANE]: emptyLane() } };
}

/**
 * Formatos antigos guardavam a ofensiva fora das faixas (com congelamento). Só o último dia
 * com sessão é um fato conhecido: ele vira o primeiro dia da faixa ativa, e a contagem antiga
 * fica como melhor ofensiva.
 */
function adoptLegacyStreak(lane: LaneState, legacy: { streakCount?: unknown; lastLessonDate?: unknown }): LaneState {
  const last = isIsoDate(legacy.lastLessonDate) ? legacy.lastLessonDate : null;
  const count = Math.max(0, Math.round(numberOr(legacy.streakCount, 0)));
  if (!last && count === 0) {
    return lane;
  }
  const sessionDays = last ? normalizeDays([...lane.sessionDays, last]) : lane.sessionDays;
  return { ...lane, sessionDays, bestStreak: Math.max(lane.bestStreak, count, bestStreakFromDays(sessionDays)) };
}

export function parseProgressBag(raw: string): ProgressBag {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return emptyBag();
  }
  if (!value || typeof value !== "object") {
    return emptyBag();
  }
  if ((value.version === 2 || value.version === 3) && value.lanes && typeof value.lanes === "object") {
    const lanes: Record<string, LaneState> = {};
    for (const [lang, lane] of Object.entries(value.lanes as Record<string, unknown>)) {
      lanes[lang] = readLane(lane);
    }
    const activeLang = typeof value.activeLang === "string" && value.activeLang ? value.activeLang : PENDING_LANE;
    if (!lanes[activeLang]) {
      lanes[activeLang] = emptyLane();
    }
    if (value.version === 2) {
      lanes[activeLang] = adoptLegacyStreak(lanes[activeLang]!, value);
    }
    return { version: 3, pro: value.pro === true, activeLang, lanes };
  }
  // v1: um único estado sem faixas.
  return {
    version: 3,
    pro: value.pro === true,
    activeLang: PENDING_LANE,
    lanes: { [PENDING_LANE]: adoptLegacyStreak(readLane(value), value) },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const serverProgress = emptyProgress();
let bag = emptyBag();
let snapshot = composeView(bag);
const listeners = new Set<() => void>();

function composeView(next: ProgressBag, today = isoDate()): ProgressState {
  const lane = next.lanes[next.activeLang] ?? emptyLane();
  const streak = streakSummary(lane.sessionDays, today, lane.bestStreak);
  return {
    ...lane,
    pro: next.pro,
    streakCount: streak.current,
    lastLessonDate: streak.lastDay,
    streakFreezeCount: 0,
    bestStreak: streak.best,
  };
}

function view(): ProgressState {
  return snapshot;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function flushProgressDebounce(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    kv.set(STORAGE_KEY, JSON.stringify(bag));
  }
}

function emit(): void {
  snapshot = composeView(bag);
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    kv.set(STORAGE_KEY, JSON.stringify(bag));
  }, 250);
  notify();
}

function update(recipe: (current: ProgressState) => ProgressState): void {
  const current = view();
  const next = recipe(current);
  if (next === current) {
    return;
  }
  bag = {
    ...bag,
    pro: next.pro,
    lanes: { ...bag.lanes, [bag.activeLang]: takeLane(next) },
  };
  emit();
}

function updateLane(lang: string, recipe: (lane: LaneState) => LaneState): void {
  const lane = bag.lanes[lang];
  if (!lane) {
    return;
  }
  const next = recipe(lane);
  if (next === lane) {
    return;
  }
  bag = { ...bag, lanes: { ...bag.lanes, [lang]: next } };
  emit();
}

export function hydrateProgress(): void {
  // Nada escrito em memória pode se perder ao reler o disco.
  flushProgressDebounce();
  const raw = kv.getString(STORAGE_KEY);
  bag = raw ? parseProgressBag(raw) : emptyBag();
  snapshot = composeView(bag);
  hydrateXp();
  bindXpLang(bag.activeLang);
  notify();
}

export function getProgress(): ProgressState {
  return snapshot;
}

/** Curso (idioma-alvo) ao qual o progresso está apontado. */
export function activeProgressLang(): string {
  return bag.activeLang;
}

export function switchProgressLang(lang: string): void {
  const key = lang.trim().toLowerCase();
  if (!key) {
    return;
  }
  if (key === bag.activeLang) {
    bindXpLang(key);
    return;
  }
  const lanes = { ...bag.lanes };
  if (!lanes[key]) {
    lanes[key] = emptyLane();
  }
  bag = { ...bag, activeLang: key, lanes };
  bindXpLang(key);
  emit();
}

export function bindProgressLang(lang: string): void {
  const key = lang.trim().toLowerCase();
  if (!key) {
    return;
  }
  const lanes = { ...bag.lanes };
  let changed = false;
  if (lanes[PENDING_LANE] && key !== PENDING_LANE && !lanes[key]) {
    lanes[key] = lanes[PENDING_LANE]!;
    delete lanes[PENDING_LANE];
    changed = true;
  }
  if (!lanes[key]) {
    lanes[key] = emptyLane();
    changed = true;
  }
  bindXpLang(key);
  if (bag.activeLang === key && !changed) {
    return;
  }
  bag = { ...bag, activeLang: key, lanes };
  emit();
}

export function laneStats(lang: string): { learning: number; mastered: number; words: number; due: number } {
  const lane = bag.lanes[lang.trim().toLowerCase()];
  if (!lane) {
    return { learning: 0, mastered: 0, words: 0, due: 0 };
  }
  const mastered = lane.cards.filter((card) => card.status === "mastered").length;
  const learning = lane.cards.filter((card) => card.status !== "mastered").length;
  const now = Date.now();
  const due = lane.cards.filter((card) => isDue(card, now)).length;
  return { learning, mastered, words: lane.cards.length, due };
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribeProgress, getProgress, () => serverProgress);
}

// ---------------------------------------------------------------------------
// Cartões e FSRS
// ---------------------------------------------------------------------------

function phraseKey(card: Pick<SessionCard, "front_phrase">): string {
  return card.front_phrase.trim().toLowerCase();
}

function reviewedTime(card: SessionCard): number {
  const at = card.reviewed_at ? Date.parse(card.reviewed_at) : Number.NaN;
  return Number.isFinite(at) ? at : Number.NEGATIVE_INFINITY;
}

/** Campos de agendamento de um cartão (o que o FSRS mexe). */
function schedulingOf(card: SessionCard): Partial<SessionCard> {
  const fields: Partial<SessionCard> = {
    repetition_count: card.repetition_count,
    interval_days: card.interval_days,
    ease_factor: card.ease_factor,
    status: card.status,
  };
  if (card.stability !== undefined) fields.stability = card.stability;
  if (card.difficulty !== undefined) fields.difficulty = card.difficulty;
  if (card.due !== undefined) fields.due = card.due;
  if (card.reviewed_at !== undefined) fields.reviewed_at = card.reviewed_at;
  return fields;
}

/** Insere ou substitui pelo texto da frase, sem deixar uma cópia antiga apagar uma revisão mais nova. */
function upsertCards(existing: SessionCard[], incoming: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(existing.map((card) => [phraseKey(card), card]));
  for (const card of incoming) {
    const key = phraseKey(card);
    const stored = byPhrase.get(key);
    if (stored && reviewedTime(stored) > reviewedTime(card)) {
      byPhrase.set(key, { ...card, ...schedulingOf(stored) });
    } else {
      byPhrase.set(key, card);
    }
  }
  return [...byPhrase.values()];
}

function mergeCards(existing: SessionCard[], incoming: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(existing.map((card) => [phraseKey(card), card]));
  for (const card of incoming) {
    const key = phraseKey(card);
    if (!byPhrase.has(key)) {
      byPhrase.set(key, card);
    }
  }
  return [...byPhrase.values()];
}

export function cardsForLesson(lessonCards: SessionCard[], stored: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(stored.map((card) => [phraseKey(card), card]));
  return lessonCards.map((card) => byPhrase.get(phraseKey(card)) ?? card);
}

/**
 * Junta os cartões do servidor (`GET /srs/cards`) com os locais. O servidor é a referência,
 * exceto quando o cartão local tem revisões que ainda não subiram (mais repetições): aí o
 * agendamento local fica, para a fila não voltar no tempo.
 */
export function mergeServerCards(local: SessionCard[], remote: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(local.map((card) => [phraseKey(card), card]));
  for (const card of remote) {
    const key = phraseKey(card);
    const existing = byPhrase.get(key);
    if (!existing) {
      byPhrase.set(key, card);
    } else if (existing.repetition_count > card.repetition_count) {
      byPhrase.set(key, { ...existing, ...card, ...schedulingOf(existing), id: card.id || existing.id });
    } else {
      byPhrase.set(key, { ...existing, ...card, id: card.id || existing.id });
    }
  }
  return [...byPhrase.values()];
}

/** Quantos cartões estão vencidos agora. */
export function dueCount(cards: readonly SessionCard[], now = Date.now()): number {
  return cards.filter((card) => isDue(card, now)).length;
}

/** Fila de revisão do curso ativo: vencidos, o mais atrasado primeiro. */
export function dueQueue(now = Date.now()): SessionCard[] {
  return dueCards(view().cards, now);
}

/**
 * Fila da etapa de revisão: até 12 cartões vencidos (ordenados pelo vencimento, o mais
 * atrasado primeiro), alguns cartões nunca revisados de antes, e o vocabulário da lição.
 */
export function reviewQueue(
  lessonCards: SessionCard[],
  stored: SessionCard[],
  now = Date.now(),
  throughLang?: string,
): SessionCard[] {
  const held = throughLang ? cardsForThrough(stored, throughLang) : stored;
  const incoming = throughLang ? cardsForThrough(lessonCards, throughLang) : lessonCards;
  const lesson = cardsForLesson(incoming, held);
  const keys = new Set(lesson.map(phraseKey));
  const outside = held.filter((card) => !keys.has(phraseKey(card)));
  const due = dueCards(outside, now).slice(0, DUE_IN_QUEUE);
  const room = Math.max(0, Math.min(NEW_IN_QUEUE, DUE_IN_QUEUE - due.length));
  const fresh = outside.filter(isNewCard).slice(0, room);
  return [...due, ...fresh, ...lesson];
}

export function dropForeignGlosses(throughLang: string): void {
  update((current) => {
    const cards = cardsForThrough(current.cards, throughLang);
    if (cards.length === current.cards.length) {
      return current;
    }
    return { ...current, cards };
  });
}

export function rememberLesson(
  date: string,
  topic: string,
  lesson: LessonPayload,
  lessonCards: SessionCard[],
  languages?: { targetLang: string; throughLang: string; level: LessonRequest["level"] },
): void {
  update((current) => {
    const item = { date, title: lesson.title, topic, lesson };
    const today = isoDate();
    const history = current.pro
      ? [item, ...current.history.filter((entry) => !(entry.date === date && entry.topic === topic))].slice(0, 90)
      : [item];
    const active = date === today;
    const scheduled =
      active && languages && lesson.story_text.trim() && lesson.translation.trim()
        ? scheduleReconstruction(current.reconstruction, current.reconstructionNext, {
            date,
            topic,
            targetLang: languages.targetLang,
            throughLang: languages.throughLang,
            level: languages.level,
            storyText: lesson.story_text,
            translation: lesson.translation,
            completedOn: null,
          })
        : { pending: current.reconstruction, next: current.reconstructionNext };
    return {
      ...current,
      lessonDate: active ? date : current.lessonDate,
      topic: active ? topic : current.topic,
      cachedLesson: active ? lesson : current.cachedLesson,
      cards: mergeCards(current.cards, lessonCards),
      history,
      reconstruction: scheduled.pending,
      reconstructionNext: scheduled.next,
    };
  });
}

export function persistDeck(lessonCards: SessionCard[]): void {
  update((current) => withBadges({ ...current, cards: upsertCards(current.cards, lessonCards) }));
}

const SYNC_LIMITS = { front: 240, back: 240, context: 500 } as const;
const CLIENT_ID = /^[a-zA-Z0-9_-]{8,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function newClientId(): string {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12) ?? Math.random().toString(36).slice(2, 10);
  return `rev_${Date.now().toString(36)}${random}`;
}

/** A revisão no formato aceito por `/srs/sync`, ou `null` se não há como enviá-la. */
function wireReview(review: PendingReview): PendingReview | null {
  const front = review.front_phrase.trim().slice(0, SYNC_LIMITS.front);
  const back = review.back_translation.trim().slice(0, SYNC_LIMITS.back);
  const context = (review.context_sentence.trim() || front).slice(0, SYNC_LIMITS.context);
  if (!front || !back || !CLIENT_ID.test(review.client_id) || !isReviewQuality(review.quality)) {
    return null;
  }
  return {
    client_id: review.client_id,
    front_phrase: front,
    back_translation: back,
    context_sentence: context,
    quality: review.quality,
    ...(review.reviewed_at ? { reviewed_at: review.reviewed_at } : {}),
  };
}

/** Chave do XP de revisão: 1 XP por cartão por dia (`awardXp("card", cardXpKey(...))`). */
export function cardXpKey(card: Pick<SessionCard, "front_phrase">, date = isoDate()): string {
  return `${date}:${phraseKey(card)}`;
}

/**
 * Registra uma nota já aplicada ao cartão (o chamador agendou com `applyFsrs` e gravou com
 * `persistDeck`) na fila de sincronização com `/srs/sync`. Não paga XP: quem usa este caminho
 * paga com `awardXp("card", cardXpKey(card))`. `reviewCard` faz tudo de uma vez.
 */
export function enqueueReview(card: SessionCard, quality: ReviewQuality, now = Date.now()): void {
  if (!isReviewQuality(quality) || !card.front_phrase.trim()) {
    return;
  }
  const review = wireReview({
    client_id: newClientId(),
    front_phrase: card.front_phrase,
    back_translation: card.back_translation,
    context_sentence: card.context_sentence,
    quality,
    reviewed_at: new Date(now).toISOString(),
  });
  if (!review) {
    return;
  }
  update((current) => ({
    ...current,
    pendingReviews: [...current.pendingReviews, review].slice(-MAX_PENDING_REVIEWS),
  }));
  publishSync("queued");
  void flushReviews();
}

/**
 * Revisão FSRS completa de um cartão do curso ativo: agenda (estabilidade, dificuldade,
 * vencimento), grava, põe na fila de sincronização e paga o XP do cartão. Retorna o cartão
 * agendado. Se o cartão gravado tem uma revisão mais nova que a cópia recebida, parte dele.
 */
export function reviewCard(card: SessionCard, quality: ReviewQuality, now = Date.now()): SessionCard {
  const stored = view().cards.find((item) => phraseKey(item) === phraseKey(card));
  // O chamador já gravou esta mesma nota (ex.: `persistDeck` com o resultado do SrsStage)
  // há instantes: o cartão gravado tem exatamente uma revisão a mais. Não agenda de novo.
  const alreadyGraded =
    stored !== undefined &&
    stored.repetition_count === card.repetition_count + 1 &&
    reviewedTime(stored) > reviewedTime(card) &&
    now - reviewedTime(stored) >= 0 &&
    now - reviewedTime(stored) < ALREADY_GRADED_MS;
  const base = stored && reviewedTime(stored) >= reviewedTime(card) ? { ...card, ...schedulingOf(stored) } : card;
  const graded = alreadyGraded && stored ? stored : applyFsrs(base, quality, now);
  if (!alreadyGraded) {
    update((current) => withBadges({ ...current, cards: upsertCards(current.cards, [graded]) }));
  }
  const day = isoDate(new Date(now));
  awardXp("card", cardXpKey(graded, day), day);
  enqueueReview(graded, quality, now);
  return graded;
}

// ---------------------------------------------------------------------------
// Sessão, ofensiva, tempo de estudo e marcas
// ---------------------------------------------------------------------------

function withBadges(state: ProgressState): ProgressState {
  const badges = new Set(state.badges);
  const best = Math.max(state.bestStreak, bestStreakFromDays(state.sessionDays));
  if (state.sessionDays.length > 0) {
    badges.add("first_flame");
  }
  if (best >= 3) {
    badges.add("streak_3");
  }
  if (best >= 7) {
    badges.add("streak_7");
  }
  if (state.cards.filter((card) => card.status === "mastered").length >= 10) {
    badges.add("words_10");
  }
  if (state.speakingBest >= 90) {
    badges.add("clear_voice");
  }
  if (state.journalCount > 0) {
    badges.add("journal_kept");
  }
  return { ...state, badges: [...badges] };
}

/** Marca o dia como sessão completa neste curso; é isso que conta para a ofensiva. */
export function markSessionComplete(today = isoDate()): void {
  if (!isIsoDate(today)) {
    return;
  }
  update((current) => {
    if (current.sessionDays.includes(today)) {
      return current;
    }
    const sessionDays = normalizeDays([...current.sessionDays, today]).slice(-MAX_SESSION_DAYS);
    const bestStreak = Math.max(current.bestStreak, bestStreakFromDays(sessionDays));
    return withBadges({ ...current, sessionDays, bestStreak });
  });
}

/**
 * Soma tempo de estudo real ao dia. Com `key`, guarda o MAIOR valor visto para aquela
 * atividade (passe o tempo decorrido total da sessão quantas vezes quiser, sem contar em
 * dobro); sem `key`, soma `seconds` ao dia.
 */
export function recordStudyTime(seconds: number, options: { date?: string; key?: string } = {}): void {
  const date = options.date ?? isoDate();
  if (!isIsoDate(date) || !Number.isFinite(seconds) || seconds <= 0) {
    return;
  }
  const amount = Math.min(MAX_STUDY_SECONDS_PER_DAY, Math.round(seconds));
  const key = options.key?.trim() || "_";
  update((current) => {
    const day = current.studyLog[date] ?? {};
    const previous = day[key] ?? 0;
    const value = options.key ? Math.max(previous, amount) : Math.min(MAX_STUDY_SECONDS_PER_DAY, previous + amount);
    if (value === previous) {
      return current;
    }
    const oldest = shiftIsoDate(date, -STUDY_RETENTION_DAYS);
    const studyLog = Object.fromEntries(
      Object.entries({ ...current.studyLog, [date]: { ...day, [key]: value } }).filter(([logged]) => logged >= oldest),
    );
    return { ...current, studyLog };
  });
}

export function recordSpeaking(score: number): void {
  update((current) => withBadges({ ...current, speakingBest: Math.max(current.speakingBest, Math.round(score)) }));
}

export function recordJournal(): void {
  update((current) => withBadges({ ...current, journalCount: current.journalCount + 1 }));
}

export function rememberSkills(skills: Array<{ skill: string; correct: number; total: number }>): void {
  const reading = skillPercent(skills.find((item) => item.skill === "reading"));
  const listening = skillPercent(skills.find((item) => item.skill === "listening"));
  if (reading === null || listening === null) {
    return;
  }
  update((current) => ({
    ...current,
    skills: { reading, listening },
  }));
}

export function noteCognateLesson(date: string, topic: string): void {
  const key = `${date}:${topic}`;
  update((current) => {
    if (current.cognateKeys.includes(key) || current.cognateKeys.length >= 5) {
      return current;
    }
    return { ...current, cognateKeys: [...current.cognateKeys, key] };
  });
}

export function completeReconstruction(today = isoDate()): void {
  update((current) => {
    const scheduled = finishReconstruction(current.reconstruction, current.reconstructionNext, today);
    return { ...current, reconstruction: scheduled.pending, reconstructionNext: scheduled.next };
  });
}

export function setPro(pro: boolean): void {
  update((current) => (current.pro === pro ? current : { ...current, pro }));
}

export function clearLocalProgress(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  bag = emptyBag();
  resetXp();
  snapshot = composeView(bag);
  kv.set(STORAGE_KEY, JSON.stringify(bag));
  publishSync("device");
  notify();
}

/** @deprecated Não existe congelamento de ofensiva; mantida só para quem ainda chama. */
export function applyRemoteFreeze(_count: number): void {
  // Ofensiva honesta: nada a aplicar.
}

// ---------------------------------------------------------------------------
// Sincronização das revisões
// ---------------------------------------------------------------------------

export type SyncPhase = "device" | "queued" | "sent" | "paused";

type SyncSnapshot = { phase: SyncPhase; pending: number };

let syncSnapshot: SyncSnapshot = { phase: "device", pending: 0 };
const syncListeners = new Set<() => void>();

function publishSync(phase: SyncPhase): void {
  syncSnapshot = { phase, pending: view().pendingReviews.length };
  syncListeners.forEach((listener) => listener());
}

export function useSyncPhase(): SyncSnapshot {
  return useSyncExternalStore(
    (listener) => {
      syncListeners.add(listener);
      return () => syncListeners.delete(listener);
    },
    () => syncSnapshot,
    () => syncSnapshot,
  );
}

let flushing = false;

/**
 * Envia as revisões pendentes do curso ativo para `/srs/sync`. O servidor aplica no
 * idioma-alvo atual da conta, então só envia quando a faixa ativa é esse idioma.
 */
export async function flushReviews(): Promise<void> {
  const session = getSession();
  if (!session || !UUID.test(session.user.id)) {
    publishSync("device");
    return;
  }
  const lane = bag.activeLang;
  if ((bag.lanes[lane]?.pendingReviews.length ?? 0) === 0) {
    publishSync("sent");
    return;
  }
  if (flushing || lane !== (session.user.target_lang ?? "").trim().toLowerCase()) {
    publishSync("queued");
    return;
  }
  flushing = true;
  publishSync("queued");
  try {
    for (let round = 0; round < SYNC_ROUNDS; round += 1) {
      const pending = bag.lanes[lane]?.pendingReviews ?? [];
      const unsendable = new Set(pending.filter((review) => wireReview(review) === null).map((review) => review.client_id));
      const batch = pending
        .map(wireReview)
        .filter((review): review is PendingReview => review !== null)
        .slice(0, SYNC_BATCH);
      if (batch.length === 0) {
        if (unsendable.size > 0) {
          updateLane(lane, (current) => ({
            ...current,
            pendingReviews: current.pendingReviews.filter((review) => !unsendable.has(review.client_id)),
          }));
        }
        break;
      }
      const synced = await syncReviews(session.token, session.user.id, batch);
      const done = new Set([...synced, ...unsendable]);
      updateLane(lane, (current) => {
        const pendingReviews = current.pendingReviews.filter((review) => !done.has(review.client_id));
        return pendingReviews.length === current.pendingReviews.length ? current : { ...current, pendingReviews };
      });
      if (synced.length === 0) {
        break;
      }
    }
    publishSync(view().pendingReviews.length === 0 ? "sent" : "queued");
  } catch {
    publishSync("paused");
  } finally {
    flushing = false;
  }
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

hydrateProgress();

// F5 / fechar a aba dentro dos 250 ms do debounce não pode perder a última nota.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("pagehide", flushProgressDebounce);
  window.addEventListener("beforeunload", flushProgressDebounce);
}
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushProgressDebounce();
    }
  });
}
