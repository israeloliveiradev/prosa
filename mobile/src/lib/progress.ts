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
}

export const BADGES = [
  { code: "first_flame", name: "Primeira fogueira", description: "Conclua uma prosa de 20 minutos." },
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

const serverProgress = emptyProgress();
let state = serverProgress;
const listeners = new Set<() => void>();

function emit(): void {
  kv.set(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

function update(recipe: (current: ProgressState) => ProgressState): void {
  state = recipe(state);
  emit();
}

export function hydrateProgress(): void {
  const raw = kv.getString(STORAGE_KEY);
  if (raw) {
    state = parseProgress(raw);
  }
}

export function getProgress(): ProgressState {
  return state;
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

export type SyncPhase = "device" | "queued" | "sent" | "paused";

type SyncSnapshot = { phase: SyncPhase; pending: number };

let syncSnapshot: SyncSnapshot = { phase: "device", pending: 0 };
const syncListeners = new Set<() => void>();

function publishSync(phase: SyncPhase): void {
  syncSnapshot = { phase, pending: state.pendingReviews.length };
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
  if (state.pendingReviews.length === 0) {
    publishSync("sent");
    return;
  }
  if (flushing) {
    publishSync("queued");
    return;
  }
  flushing = true;
  publishSync("queued");
  const batch = state.pendingReviews.slice(0, 50);
  try {
    const synced = await syncReviews(session.token, session.user.id, batch);
    const done = new Set(synced);
    update((current) => ({
      ...current,
      pendingReviews: current.pendingReviews.filter((review) => !done.has(review.client_id)),
    }));
    publishSync(state.pendingReviews.length === 0 ? "sent" : "queued");
  } catch {
    publishSync("paused");
  } finally {
    flushing = false;
  }
}
