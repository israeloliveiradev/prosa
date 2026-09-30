import { useSyncExternalStore } from "react";
import { syncReviews } from "@/lib/api";
import { kv } from "@/lib/kv";
import {
  finishReconstruction,
  scheduleReconstruction,
  type ReconstructionAnchor,
} from "@/lib/reconstruction";
import { getSession } from "@/lib/session";
import type { ReviewQuality } from "@/lib/sm2";
import { cardsForThrough } from "@/lib/through-lang";
import type { LessonPayload, LessonRequest, SessionCard } from "@/lib/types";

const STORAGE_KEY = "prosa.progress.v1";

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
}

export interface ProgressState {
  streakCount: number;
  lastLessonDate: string | null;
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
}

export const BADGES = [
  { code: "first_flame", name: "Primeira fogueira", description: "Conclua uma lição de 20 minutos." },
  { code: "streak_3", name: "Três dias", description: "Mantenha a ofensiva por 3 dias." },
  { code: "streak_7", name: "Semana inteira", description: "Mantenha a ofensiva por 7 dias." },
  { code: "words_10", name: "Dez palavras", description: "Domine 10 palavras no SM-2." },
  { code: "clear_voice", name: "Voz clara", description: "Acerte 90% ou mais numa frase falada." },
  { code: "journal_kept", name: "Diário aberto", description: "Envie o diário do dia." },
] as const;

function emptyProgress(): ProgressState {
  return {
    streakCount: 0,
    lastLessonDate: null,
    streakFreezeCount: 1,
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
  };
}

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

function parseProgress(raw: string): ProgressState {
  try {
    const value = JSON.parse(raw) as Partial<ProgressState>;
    const base = emptyProgress();
    return {
      ...base,
      streakCount: Math.max(0, numberOr(value.streakCount, 0)),
      lastLessonDate: typeof value.lastLessonDate === "string" ? value.lastLessonDate : null,
      streakFreezeCount: Math.max(0, numberOr(value.streakFreezeCount, 1)),
      badges: Array.isArray(value.badges) ? value.badges.filter((item) => typeof item === "string") : [],
      cards: Array.isArray(value.cards) ? value.cards.filter(isCard) : [],
      pendingReviews: Array.isArray(value.pendingReviews) ? value.pendingReviews.filter(isPending) : [],
      lessonDate: typeof value.lessonDate === "string" ? value.lessonDate : null,
      topic: typeof value.topic === "string" ? value.topic : null,
      cachedLesson: isLesson(value.cachedLesson) ? value.cachedLesson : null,
      history: Array.isArray(value.history) ? value.history.filter(isHistory) : [],
      pro: value.pro === true,
      speakingBest: Math.max(0, Math.min(100, numberOr(value.speakingBest, 0))),
      journalCount: Math.max(0, numberOr(value.journalCount, 0)),
      reconstruction: isAnchor(value.reconstruction) ? value.reconstruction : null,
      reconstructionNext: isAnchor(value.reconstructionNext) ? value.reconstructionNext : null,
      cognateKeys: Array.isArray(value.cognateKeys) ? value.cognateKeys.filter((item) => typeof item === "string").slice(0, 5) : [],
      skills: readSkills(value.skills),
    };
  } catch {
    return emptyProgress();
  }
}

function isPending(value: unknown): value is PendingReview {
  if (!value || typeof value !== "object") {
    return false;
  }
  const review = value as PendingReview;
  return (
    typeof review.client_id === "string" &&
    typeof review.front_phrase === "string" &&
    (review.quality === 0 || review.quality === 3 || review.quality === 4 || review.quality === 5)
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

export function nextStreak(
  state: Pick<ProgressState, "streakCount" | "lastLessonDate" | "streakFreezeCount">,
  today: string,
): Pick<ProgressState, "streakCount" | "lastLessonDate" | "streakFreezeCount"> {
  if (state.lastLessonDate === today) {
    return {
      streakCount: state.streakCount,
      lastLessonDate: today,
      streakFreezeCount: state.streakFreezeCount,
    };
  }
  if (!state.lastLessonDate) {
    return { streakCount: 1, lastLessonDate: today, streakFreezeCount: state.streakFreezeCount };
  }
  const gap = daysBetween(state.lastLessonDate, today);
  if (gap === 1) {
    return { streakCount: state.streakCount + 1, lastLessonDate: today, streakFreezeCount: state.streakFreezeCount };
  }
  if (gap === 2 && state.streakFreezeCount > 0) {
    return { streakCount: state.streakCount + 1, lastLessonDate: today, streakFreezeCount: state.streakFreezeCount - 1 };
  }
  return { streakCount: 1, lastLessonDate: today, streakFreezeCount: state.streakFreezeCount };
}

function withBadges(state: ProgressState): ProgressState {
  const badges = new Set(state.badges);
  if (state.lastLessonDate) {
    badges.add("first_flame");
  }
  if (state.streakCount >= 3) {
    badges.add("streak_3");
  }
  if (state.streakCount >= 7) {
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

function mergeCards(existing: SessionCard[], incoming: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(existing.map((card) => [card.front_phrase.toLowerCase(), card]));
  for (const card of incoming) {
    const key = card.front_phrase.toLowerCase();
    if (!byPhrase.has(key)) {
      byPhrase.set(key, card);
    }
  }
  return [...byPhrase.values()];
}

type LaneState = Omit<ProgressState, "pro" | "streakCount" | "lastLessonDate" | "streakFreezeCount">;

interface ProgressBag {
  version: 2;
  pro: boolean;
  streakCount: number;
  lastLessonDate: string | null;
  streakFreezeCount: number;
  activeLang: string;
  lanes: Record<string, LaneState>;
}

function takeLane(state: ProgressState): LaneState {
  const { pro: _pro, streakCount: _streak, lastLessonDate: _last, streakFreezeCount: _freeze, ...lane } = state;
  return lane;
}

function emptyLane(): LaneState {
  return takeLane(emptyProgress());
}

function emptyBag(): ProgressBag {
  return {
    version: 2,
    pro: false,
    streakCount: 0,
    lastLessonDate: null,
    streakFreezeCount: 1,
    activeLang: "pending",
    lanes: { pending: emptyLane() },
  };
}

function parseLane(value: unknown): LaneState {
  return takeLane(parseProgress(JSON.stringify({ ...emptyProgress(), ...(value && typeof value === "object" ? value : {}) })));
}

function parseBag(raw: string): ProgressBag {
  try {
    const value = JSON.parse(raw) as Partial<ProgressBag> & Partial<ProgressState>;
    if (value && value.version === 2 && value.lanes && typeof value.lanes === "object") {
      const lanes: Record<string, LaneState> = {};
      for (const [lang, lane] of Object.entries(value.lanes)) {
        lanes[lang] = parseLane(lane);
      }
      if (Object.keys(lanes).length === 0) {
        lanes.pending = emptyLane();
      }
      return {
        version: 2,
        pro: value.pro === true,
        streakCount: Math.max(0, numberOr(value.streakCount, 0)),
        lastLessonDate: typeof value.lastLessonDate === "string" ? value.lastLessonDate : null,
        streakFreezeCount: Math.max(0, numberOr(value.streakFreezeCount, 1)),
        activeLang: typeof value.activeLang === "string" && value.activeLang ? value.activeLang : "pending",
        lanes,
      };
    }
  } catch {
    return emptyBag();
  }
  const legacy = parseProgress(raw);
  return {
    version: 2,
    pro: legacy.pro,
    streakCount: legacy.streakCount,
    lastLessonDate: legacy.lastLessonDate,
    streakFreezeCount: legacy.streakFreezeCount,
    activeLang: "pending",
    lanes: { pending: takeLane(legacy) },
  };
}

const serverProgress = emptyProgress();
let bag = emptyBag();
let snapshot = composeView(bag);
const listeners = new Set<() => void>();

function composeView(next: ProgressBag): ProgressState {
  const lane = next.lanes[next.activeLang] ?? emptyLane();
  return {
    ...lane,
    pro: next.pro,
    streakCount: next.streakCount,
    lastLessonDate: next.lastLessonDate,
    streakFreezeCount: next.streakFreezeCount,
  };
}

function view(): ProgressState {
  return snapshot;
}

function emit(): void {
  snapshot = composeView(bag);
  kv.set(STORAGE_KEY, JSON.stringify(bag));
  listeners.forEach((listener) => listener());
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
    streakCount: next.streakCount,
    lastLessonDate: next.lastLessonDate,
    streakFreezeCount: next.streakFreezeCount,
    lanes: { ...bag.lanes, [bag.activeLang]: takeLane(next) },
  };
  emit();
}

export function hydrateProgress(): void {
  const raw = kv.getString(STORAGE_KEY);
  if (raw) {
    bag = parseBag(raw);
  }
  snapshot = composeView(bag);
}

export function getProgress(): ProgressState {
  return snapshot;
}

export function switchProgressLang(lang: string): void {
  const key = lang.trim().toLowerCase();
  if (!key || key === bag.activeLang) {
    if (!bag.lanes[key]) {
      bag = { ...bag, lanes: { ...bag.lanes, [key]: emptyLane() } };
      emit();
    }
    return;
  }
  const lanes = { ...bag.lanes };
  if (!lanes[key]) {
    lanes[key] = emptyLane();
  }
  bag = { ...bag, activeLang: key, lanes };
  emit();
}

export function bindProgressLang(lang: string): void {
  const key = lang.trim().toLowerCase();
  if (!key) {
    return;
  }
  const lanes = { ...bag.lanes };
  let changed = false;
  if (lanes.pending && key !== "pending" && !lanes[key]) {
    lanes[key] = lanes.pending;
    delete lanes.pending;
    changed = true;
  }
  if (!lanes[key]) {
    lanes[key] = emptyLane();
    changed = true;
  }
  if (bag.activeLang === key && !changed) {
    return;
  }
  bag = { ...bag, activeLang: key, lanes };
  emit();
}

export function laneStats(lang: string): { learning: number; mastered: number; words: number } {
  const lane = bag.lanes[lang.trim().toLowerCase()];
  if (!lane) {
    return { learning: 0, mastered: 0, words: 0 };
  }
  const mastered = lane.cards.filter((card) => card.status === "mastered").length;
  const learning = lane.cards.filter((card) => card.status !== "mastered").length;
  return { learning, mastered, words: lane.cards.length };
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribeProgress, getProgress, () => serverProgress);
}

export function cardsForLesson(lessonCards: SessionCard[], stored: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(stored.map((card) => [card.front_phrase.toLowerCase(), card]));
  return lessonCards.map((card) => byPhrase.get(card.front_phrase.toLowerCase()) ?? card);
}

export function mergeServerCards(local: SessionCard[], remote: SessionCard[]): SessionCard[] {
  const byPhrase = new Map(local.map((card) => [card.front_phrase.toLowerCase(), card]));
  for (const card of remote) {
    const key = card.front_phrase.toLowerCase();
    const existing = byPhrase.get(key);
    byPhrase.set(key, existing ? { ...existing, ...card, id: card.id || existing.id } : card);
  }
  return [...byPhrase.values()];
}

export function reviewQueue(
  lessonCards: SessionCard[],
  stored: SessionCard[],
  now = Date.now(),
  throughLang?: string,
): SessionCard[] {
  const held = throughLang ? cardsForThrough(stored, throughLang) : stored;
  const incoming = throughLang ? cardsForThrough(lessonCards, throughLang) : lessonCards;
  const lesson = cardsForLesson(incoming, held);
  const keys = new Set(lesson.map((card) => card.front_phrase.toLowerCase()));
  const due = held.filter((card) => {
    if (keys.has(card.front_phrase.toLowerCase()) || !card.due) {
      return false;
    }
    const at = Date.parse(card.due);
    return Number.isFinite(at) && at <= now;
  });
  return [...due.slice(0, 12), ...lesson];
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
  update((current) => {
    const byPhrase = new Map(current.cards.map((card) => [card.front_phrase.toLowerCase(), card]));
    for (const card of lessonCards) {
      byPhrase.set(card.front_phrase.toLowerCase(), card);
    }
    return withBadges({ ...current, cards: [...byPhrase.values()] });
  });
}

export function enqueueReview(card: SessionCard, quality: ReviewQuality): void {
  const clientId = `rev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  update((current) => ({
    ...current,
    pendingReviews: [
      ...current.pendingReviews,
      {
        client_id: clientId,
        front_phrase: card.front_phrase,
        back_translation: card.back_translation,
        context_sentence: card.context_sentence,
        quality,
      },
    ].slice(-200),
  }));
  publishSync("queued");
  void flushReviews();
}

export function markSessionComplete(today = isoDate()): void {
  update((current) => withBadges({ ...current, ...nextStreak(current, today) }));
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
  update((current) => ({ ...current, pro }));
}

export function clearLocalProgress(): void {
  bag = emptyBag();
  emit();
}

export function applyRemoteFreeze(count: number): void {
  const next = Math.max(0, Math.floor(count));
  update((current) => (current.streakFreezeCount === next ? current : { ...current, streakFreezeCount: next }));
}

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

export async function flushReviews(): Promise<void> {
  const session = getSession();
  if (!session) {
    publishSync("device");
    return;
  }
  if (view().pendingReviews.length === 0) {
    publishSync("sent");
    return;
  }
  if (flushing) {
    publishSync("queued");
    return;
  }
  flushing = true;
  publishSync("queued");
  const batch = view().pendingReviews.slice(0, 50);
  try {
    const synced = await syncReviews(session.token, session.user.id, batch);
    const done = new Set(synced);
    update((current) => ({
      ...current,
      pendingReviews: current.pendingReviews.filter((review) => !done.has(review.client_id)),
    }));
    publishSync(view().pendingReviews.length === 0 ? "sent" : "queued");
  } catch {
    publishSync("paused");
  } finally {
    flushing = false;
  }
}
