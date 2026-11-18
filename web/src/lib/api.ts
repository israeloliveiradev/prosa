const isWeb = typeof window !== "undefined" && typeof document !== "undefined";
const Platform = { OS: isWeb ? ("web" as const) : ("ios" as const) };
import { audioCacheKey, base64ToBytes, bytesToBase64, readAudioCache, writeAudioCache } from "@/lib/audio-cache";
import { getCast } from "@/lib/cast";
import { copy } from "@/lib/i18n";
import { readSse } from "@/lib/sse";
import type { CognateAnchor, CourseProfile, JournalEvaluation, LessonPayload, LessonRequest, ReconstructionReport, RepairCard, SessionCard, ShadowingResult, SoundNote, VocabularyEntry } from "@/lib/types";
import type { AccountUser, AccountSettings, LoginChallenge, VerifyChallenge } from "@/api/schemas/auth";
import type { PlacementHistoryEntry, PlacementStatus } from "@/api/schemas/placement";

function apiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:3000`;
  }
  return "http://127.0.0.1:3000";
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiUrl()}${path}`, init);
  } catch {
    throw new Error(copy().apiDown);
  }
}

async function readError(response: Response): Promise<string> {
  const ui = copy();
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  const message = payload?.error ?? ui.apiSilent;
  if (message.includes("Body cannot be empty") || message.includes("content-type")) {
    return ui.requestIncomplete;
  }
  if (message.includes("The model is busy") || message.includes("busy") || message.includes("high demand") || message.includes("UNAVAILABLE")) {
    return ui.modelBusy;
  }
  if (message.includes("Model request failed") || message.includes("empty structured") || message.includes("not valid JSON")) {
    return ui.lessonFailed;
  }
  if (message.includes("Lesson generation is unavailable")) {
    return ui.generationOff;
  }
  return message;
}

function readAnchors(value: unknown): CognateAnchor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is CognateAnchor =>
      !!item &&
      typeof item === "object" &&
      typeof item.word === "string" &&
      typeof item.familiar === "string" &&
      typeof item.gloss === "string" &&
      (item.kind === "true" || item.kind === "false"),
  );
}

export async function generateLesson(input: LessonRequest & { cognate?: boolean }, token?: string): Promise<LessonPayload> {
  const picks = getCast();
  const response = await fetch(`${apiUrl()}/api/v1/lessons/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      ...input,
      mind_reading: picks.reading,
      mind_memory: picks.memory,
      mind_speech: picks.speech,
      mind_journal: picks.journal,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as LessonPayload;
  return { ...body, anchors: readAnchors(body.anchors) };
}

export { fetchCognates } from "@/api/lessons";

export async function analyzeShadowing(uri: string, referenceText: string, language: string): Promise<ShadowingResult> {
  const body = new FormData();
  if (Platform.OS === "web") {
    const file = await fetch(uri);
    const blob = await file.blob();
    const type = blob.type || "audio/webm";
    const name = type.includes("wav") ? "speech.wav" : type.includes("mp4") ? "speech.m4a" : "speech.webm";
    body.append("audio", blob, name);
  } else {
    const lower = uri.toLowerCase();
    const name = lower.includes(".wav") ? "speech.wav" : lower.includes(".webm") ? "speech.webm" : "speech.m4a";
    const type = name.endsWith(".wav") ? "audio/wav" : name.endsWith(".webm") ? "audio/webm" : "audio/m4a";
    body.append("audio", { uri, name, type } as unknown as Blob);
  }
  body.append("reference_text", referenceText);
  body.append("language", language);

  const response = await fetch(`${apiUrl()}/api/v1/audio/analyze-shadowing-phonetic`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const report = (await response.json()) as ShadowingResult;
  const bars = Array.isArray(report.bars)
    ? report.bars.filter(
        (bar) =>
          typeof bar?.reference === "number" &&
          typeof bar.spoken === "number" &&
          typeof bar.drift === "boolean" &&
          (bar.note === "apressou" || bar.note === "alongou" || bar.note === "no tempo"),
      )
    : [];
  return { ...report, bars, sounds: readSounds(report.sounds) };
}

function readSounds(value: unknown): SoundNote[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const note = item as SoundNote;
    if (!note.word?.trim() || !note.sound?.pt || !note.sound?.en || typeof note.held !== "boolean" || !note.hint?.pt || !note.hint?.en) {
      return [];
    }
    return [{ ...note, heard: note.heard ?? "" }];
  }).slice(0, 4);
}

function readCards(value: unknown): RepairCard[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const card = item as RepairCard;
    if (!card.front_phrase?.trim() || !card.back_translation?.trim() || !card.context_sentence?.trim()) {
      return [];
    }
    return [
      {
        front_phrase: card.front_phrase.trim(),
        back_translation: card.back_translation.trim(),
        context_sentence: card.context_sentence.trim(),
      },
    ];
  });
}

export async function evaluateJournal(input: {
  text: string;
  journal_prompt: string;
  target_lang: string;
  native_lang: string;
  level: LessonRequest["level"];
  attempt: number;
  token?: string;
}): Promise<JournalEvaluation> {
  const { token, ...body } = input;
  const response = await fetch(`${apiUrl()}/api/v1/journal/evaluate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const evaluation = (await response.json()) as JournalEvaluation;
  return { ...evaluation, cards: readCards(evaluation.cards) };
}

export async function reconstructStory(input: {
  attempt: string;
  story_text: string;
  translation: string;
  target_lang: string;
  through_lang: string;
  level: LessonRequest["level"];
  try_index: number;
  token?: string;
}): Promise<ReconstructionReport> {
  const { token, ...body } = input;
  const response = await fetch(`${apiUrl()}/api/v1/journal/reconstruct`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const report = (await response.json()) as ReconstructionReport;
  return {
    score: typeof report.score === "number" ? report.score : 0,
    grammar: Array.isArray(report.grammar) ? report.grammar : [],
    literals: Array.isArray(report.literals) ? report.literals : [],
    step: report.step,
    cards: readCards(report.cards),
  };
}

export interface DuelDrill {
  prompt: string;
  options: string[];
  answer: number;
}

export interface DuelBoardEntry {
  label: string;
  score: number;
  best_combo: number;
  you: boolean;
}

export async function fetchDuelRound(token: string): Promise<{ drills: DuelDrill[]; focus: string[] }> {
  const response = await fetch(`${apiUrl()}/api/v1/duel/round`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { drills?: DuelDrill[]; focus?: string[] };
  const drills = Array.isArray(body.drills) ? body.drills.filter((drill) => Array.isArray(drill.options) && drill.options.length === 4 && typeof drill.answer === "number") : [];
  if (drills.length < 8) {
    throw new Error("O duelo não trouxe frases suficientes.");
  }
  const focus = Array.isArray(body.focus) ? body.focus.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
  return { drills, focus };
}

export async function saveDuelScore(token: string, score: { score: number; best_combo: number; correct_count: number }): Promise<void> {
  const response = await fetch(`${apiUrl()}/api/v1/duel/score`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(score),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function fetchDuelBoard(token: string): Promise<DuelBoardEntry[]> {
  const response = await fetch(`${apiUrl()}/api/v1/duel/leaderboard`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { entries?: DuelBoardEntry[] };
  return Array.isArray(body.entries) ? body.entries : [];
}

export interface PersonaScene {
  id: string;
  register: "formal" | "informal";
  title: string;
  place: string;
  role: string;
  brief: string;
  opener: string;
  hitch?: string;
}

export interface PersonaTurnResult {
  reply: string;
  tone: "adequate" | "direct" | "informal" | "inadequate";
  cultural_note: string;
  register: "formal" | "informal";
}

export async function fetchPersonaScenes(token: string): Promise<PersonaScene[]> {
  const response = await fetch(`${apiUrl()}/api/v1/persona/scenes`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { scenes?: PersonaScene[] };
  return Array.isArray(body.scenes) ? body.scenes : [];
}

export async function sendPersonaTurn(
  token: string,
  sceneId: string,
  userLine: string,
  history: Array<{ role: "persona" | "learner"; text: string }>,
): Promise<PersonaTurnResult> {
  const response = await fetch(`${apiUrl()}/api/v1/persona/turn`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ scene_id: sceneId, user_line: userLine, history }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as Partial<PersonaTurnResult>;
  if (!body.reply || !body.cultural_note || !body.tone) {
    throw new Error("A cena não devolveu a fala.");
  }
  return {
    reply: body.reply,
    tone: body.tone,
    cultural_note: body.cultural_note,
    register: body.register === "informal" ? "informal" : "formal",
  };
}

export interface ProseTurnResult {
  reply: string;
  through_note: string;
  move?: "clarify" | "rephrase" | "continue";
  repair?: { step: "none" | "prompt" | "hint" | "correction"; mark: string; fix: string };
  memory?: { facts: string[]; goals: string[]; thread: string };
}

export async function fetchProseMemory(token: string): Promise<{ facts: string[]; goals: string[]; thread: string }> {
  const response = await fetch(`${apiUrl()}/api/v1/prose/memory`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { facts?: string[]; goals?: string[]; thread?: string };
  return {
    facts: Array.isArray(body.facts) ? body.facts.filter((item) => typeof item === "string") : [],
    goals: Array.isArray(body.goals) ? body.goals.filter((item) => typeof item === "string") : [],
    thread: typeof body.thread === "string" ? body.thread : "",
  };
}

export async function sendProseTurn(
  token: string,
  input: {
    userLine: string;
    topic: string;
    story?: string;
    mind?: string;
    history: Array<{ role: "mind" | "learner"; text: string }>;
  },
): Promise<ProseTurnResult> {
  const response = await fetch(`${apiUrl()}/api/v1/prose/turn`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      user_line: input.userLine,
      topic: input.topic,
      story: input.story,
      mind: input.mind,
      history: input.history,
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as Partial<ProseTurnResult>;
  if (!body.reply) {
    throw new Error("A conversa não devolveu a fala.");
  }
  return {
    reply: body.reply,
    through_note: typeof body.through_note === "string" ? body.through_note : "",
    move: body.move === "clarify" || body.move === "rephrase" || body.move === "continue" ? body.move : "continue",
    repair: body.repair,
    memory: body.memory,
  };
}

export async function transcribeSpeech(uri: string, language: string): Promise<string> {
  const body = new FormData();
  if (Platform.OS === "web") {
    const file = await fetch(uri);
    const blob = await file.blob();
    const type = blob.type || "audio/webm";
    const name = type.includes("wav") ? "speech.wav" : type.includes("mp4") ? "speech.m4a" : "speech.webm";
    body.append("audio", blob, name);
  } else {
    const lower = uri.toLowerCase();
    const name = lower.includes(".wav") ? "speech.wav" : lower.includes(".webm") ? "speech.webm" : "speech.m4a";
    const type = name.endsWith(".wav") ? "audio/wav" : name.endsWith(".webm") ? "audio/webm" : "audio/m4a";
    body.append("audio", { uri, name, type } as unknown as Blob);
  }
  body.append("language", language);
  const response = await fetch(`${apiUrl()}/api/v1/audio/transcribe`, { method: "POST", body });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const payload = (await response.json()) as { transcription?: string };
  return payload.transcription?.trim() ?? "";
}

export async function fetchCourseProfile(token: string, targetLang: string): Promise<CourseProfile> {
  const response = await fetch(`${apiUrl()}/api/v1/profile?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as CourseProfile;
}

export async function postProfileSignals(
  token: string,
  targetLang: string,
  signals: Record<string, number | string>,
): Promise<CourseProfile> {
  const response = await fetch(`${apiUrl()}/api/v1/profile/signals`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang, ...signals }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as CourseProfile;
}

export interface PairItem {
  id: string;
  target_lang: string;
  prompt: string;
  body: string;
  understood: string;
  correction: string;
  question: string;
  status: "offered" | "taken" | "done";
  matched: boolean;
  created_at: string;
}

export interface PairInbox {
  inbox: PairItem[];
  sent: PairItem[];
}

export async function fetchPairs(token: string): Promise<PairInbox> {
  const response = await fetch(`${apiUrl()}/api/v1/pairs`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as PairInbox;
}

export async function offerPair(token: string, body: { target_lang: string; prompt: string; body: string }): Promise<{ pair: PairItem; matched: boolean }> {
  const response = await fetch(`${apiUrl()}/api/v1/pairs/offer`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { pair: PairItem; matched: boolean };
}

export async function reviewPair(
  token: string,
  id: string,
  body: { understood: string; correction: string; question: string },
): Promise<PairItem> {
  const response = await fetch(`${apiUrl()}/api/v1/pairs/${id}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as PairItem;
}

export interface MeasurePanel {
  cefr: Array<{ level: string; score: number; finished_at: string }>;
  retention: number | null;
  retention_aim: number;
  lexicon: number;
  fluency_wpm: number;
  errors: string[];
  listening: number;
  reading: number;
}

export async function fetchMeasure(token: string, targetLang: string): Promise<MeasurePanel> {
  const response = await fetch(`${apiUrl()}/api/v1/measure?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as MeasurePanel;
}

export interface OwnlifeNote {
  id: string;
  calibrated: string;
  through_note: string;
  mission_prompt: string;
  mission_hold: string;
  mission_done: boolean;
  created_at: string;
  vocabulary?: Array<{ word: string; translation: string; example_sentence: string }>;
}

export async function fetchOwnlife(token: string, targetLang: string): Promise<OwnlifeNote | null> {
  const response = await fetch(`${apiUrl()}/api/v1/ownlife?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { note?: OwnlifeNote | null };
  return body.note ?? null;
}

export async function calibrateOwnlife(token: string, targetLang: string, source: string): Promise<OwnlifeNote> {
  const response = await fetch(`${apiUrl()}/api/v1/ownlife`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang, source }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OwnlifeNote;
}

export async function checkOwnlifeMission(
  token: string,
  targetLang: string,
  spoken: string,
): Promise<{ held: boolean; hold: string; prompt: string }> {
  const response = await fetch(`${apiUrl()}/api/v1/ownlife/mission`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang, spoken }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { held: boolean; hold: string; prompt: string };
}

export interface ExamTrackInfo {
  id: string;
  title: string;
  scale: { min: number; max: number; step: number };
}

export interface ExamForecast {
  exam_id: string;
  predicted: number;
  band: string;
  display: string;
  attempts: number;
}

export interface ExamHistoryEntry {
  predicted: number;
  raw: number;
  band: string;
  exam_id: string;
  finished_at: string;
  display: string;
}

export interface ExamStatus {
  exams: ExamTrackInfo[];
  track: string;
  forecast: ExamForecast | null;
  history: ExamHistoryEntry[];
  seed: number;
}

export interface ExamChoiceItem {
  id: string;
  section: "reading" | "listening" | "use";
  prompt: string;
  passage?: string;
  audio?: string;
  options: string[];
}

export interface ExamMock {
  exam_id: string;
  seconds: number;
  items: ExamChoiceItem[];
  writing: string;
  speaking: string;
}

export interface ExamFinish {
  predicted: number;
  previous: number | null;
  band: string;
  raw: number;
  display: string;
  sections: { reading: number; listening: number; writing: number; speaking: number };
  seconds: number;
}

export async function fetchExamStatus(token: string, targetLang: string): Promise<ExamStatus> {
  const response = await fetch(`${apiUrl()}/api/v1/exams?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ExamStatus;
}

export async function chooseExam(token: string, targetLang: string, examId: string): Promise<ExamStatus> {
  const response = await fetch(`${apiUrl()}/api/v1/exams/choose`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang, exam_id: examId }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ExamStatus;
}

export async function fetchExamMock(token: string, targetLang: string, examId: string): Promise<ExamMock> {
  const response = await fetch(`${apiUrl()}/api/v1/exams/mock?target_lang=${encodeURIComponent(targetLang)}&exam_id=${encodeURIComponent(examId)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as ExamMock;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("O simulado não trouxe itens.");
  }
  return body;
}

export async function finishExam(
  token: string,
  body: {
    target_lang: string;
    exam_id: string;
    answers: Record<string, number>;
    writing: string;
    speaking: string;
    seconds: number;
  },
): Promise<ExamFinish> {
  const response = await fetch(`${apiUrl()}/api/v1/exams/finish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ExamFinish;
}

export interface ScoreLatest {
  score: number;
  band: string;
  share_token: string | null;
  finished_at: string | null;
  held: boolean;
}

export interface ScoreStatus {
  due: boolean;
  reason: string;
  days_until: number | null;
  open_attempt_id: string | null;
  latest: ScoreLatest | null;
}

export interface ScoreAttempt {
  attempt_id: string;
  target_lang: string;
  through_lang: string;
  items: PlacementItem[];
  answered: Record<string, number>;
  index: number;
  adaptive: boolean;
  cap: number;
  produce: boolean;
  prompts: { writing: string; speaking: string } | null;
}

export interface ScoreStep {
  saved: boolean;
  done: boolean;
  asked: number;
  cap: number;
  next: PlacementItem | null;
  prompts: { writing: string; speaking: string } | null;
}

export interface ScoreFinish {
  attempt_id: string;
  score: number;
  band: string;
  previous: number | null;
  sections: { reading: number; listening: number; writing: number; speaking: number };
  flags: string[];
  held: boolean;
  share_token: string | null;
  target_lang: string;
}

export interface ScoreCertificate {
  score: number;
  band: string;
  target_lang: string;
  finished_at: string;
  sections: { reading: number; listening: number; writing: number; speaking: number };
}

export async function fetchScoreStatus(token: string, targetLang: string): Promise<ScoreStatus> {
  const response = await fetch(`${apiUrl()}/api/v1/score?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ScoreStatus;
}

export async function startScore(token: string, track?: { target_lang?: string; through_lang?: string }): Promise<ScoreAttempt> {
  const response = await fetch(`${apiUrl()}/api/v1/score/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(track ?? {}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ScoreAttempt;
}

export async function answerScore(
  token: string,
  attemptId: string,
  itemId: string,
  choice: number,
  elapsedMs: number,
): Promise<ScoreStep> {
  const response = await fetch(`${apiUrl()}/api/v1/score/answer`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ attempt_id: attemptId, item_id: itemId, choice, elapsed_ms: elapsedMs }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ScoreStep;
}

export async function finishScore(
  token: string,
  attemptId: string,
  writing: string,
  speaking: string,
): Promise<ScoreFinish> {
  const response = await fetch(`${apiUrl()}/api/v1/score/finish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ attempt_id: attemptId, writing, speaking }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ScoreFinish;
}

export async function fetchScoreCertificate(token: string): Promise<ScoreCertificate> {
  const response = await fetch(`${apiUrl()}/api/v1/score/cert/${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as ScoreCertificate;
}

export interface DossierCheckpoint {
  id: string;
  focus: string;
  note: string;
  due_on: string | null;
  done: boolean;
}

export interface DossierView {
  target_lang: string;
  level: string;
  practice: string;
  errors: string[];
  sounds: string[];
  lexicon: number;
  fluency_wpm: number;
  listening: number;
  reading: number;
  last_placement: { level: string; score: number; finished_at: string } | null;
  prosa_score: { score: number; band: string } | null;
  checkpoints: DossierCheckpoint[];
}

export interface DossierMine extends DossierView {
  share_token: string | null;
}

export async function fetchDossier(token: string, targetLang: string): Promise<DossierMine> {
  const response = await fetch(`${apiUrl()}/api/v1/dossier?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as DossierMine;
}

export async function publishDossier(token: string, targetLang: string): Promise<DossierMine> {
  const response = await fetch(`${apiUrl()}/api/v1/dossier/publish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as DossierMine;
}

export async function addDossierCheckpoint(
  token: string,
  body: { target_lang: string; focus: string; note?: string; due_on?: string },
): Promise<DossierMine> {
  const response = await fetch(`${apiUrl()}/api/v1/dossier/checkpoint`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as DossierMine;
}

export async function closeDossierCheckpoint(token: string, id: string): Promise<DossierMine> {
  const response = await fetch(`${apiUrl()}/api/v1/dossier/checkpoint/${encodeURIComponent(id)}/done`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as DossierMine;
}

export async function fetchPublicDossier(token: string): Promise<DossierView> {
  const response = await fetch(`${apiUrl()}/api/v1/dossier/view/${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as DossierView;
}

export interface OrgTerm {
  phrase: string;
  gloss: string;
  source: "org" | "catalog";
}

export interface OrgRosterRow {
  name: string | null;
  level: string;
  target_lang: string;
  prosa_score: { score: number; band: string } | null;
  lexicon: number | null;
}

export interface OrgPack {
  org: { name: string; sector: "technology" | "health" | "sales"; invite_code: string | null } | null;
  role: "owner" | "hr" | "member" | null;
  terms: OrgTerm[];
  roster: OrgRosterRow[];
}

export async function fetchOrg(token: string): Promise<OrgPack> {
  const response = await fetch(`${apiUrl()}/api/v1/org`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OrgPack;
}

export async function createOrg(token: string, name: string, sector: "technology" | "health" | "sales"): Promise<OrgPack> {
  const response = await fetch(`${apiUrl()}/api/v1/org`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name, sector }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OrgPack;
}

export async function joinOrg(token: string, code: string): Promise<OrgPack> {
  const response = await fetch(`${apiUrl()}/api/v1/org/join`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OrgPack;
}

export async function addOrgTerm(
  token: string,
  body: { target_lang: string; phrase: string; gloss?: string },
): Promise<OrgPack> {
  const response = await fetch(`${apiUrl()}/api/v1/org/term`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OrgPack;
}

export async function leaveOrg(token: string): Promise<OrgPack> {
  const response = await fetch(`${apiUrl()}/api/v1/org/leave`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as OrgPack;
}

export async function fetchSrsCards(token: string): Promise<SessionCard[]> {
  const response = await fetch(`${apiUrl()}/api/v1/srs/cards`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { cards?: SessionCard[] };
  return (body.cards ?? []).filter(
    (card) =>
      typeof card?.front_phrase === "string" &&
      typeof card.back_translation === "string" &&
      typeof card.context_sentence === "string" &&
      (card.status === "learning" || card.status === "reviewing" || card.status === "mastered"),
  );
}

export async function recordRetention(
  token: string,
  cards: Array<{ interval_days: number; status: "learning" | "reviewing" | "mastered"; phrase: string }>,
): Promise<void> {
  const response = await fetch(`${apiUrl()}/api/v1/srs/retention`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ cards }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function syncReviews(
  token: string,
  userId: string,
  reviews: Array<{
    client_id: string;
    front_phrase: string;
    back_translation: string;
    context_sentence: string;
    quality: 0 | 3 | 4 | 5;
  }>,
): Promise<string[]> {
  const response = await fetch(`${apiUrl()}/api/v1/srs/sync`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ user_id: userId, reviews }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { synced_ids?: string[] };
  return body.synced_ids ?? [];
}

export async function startCheckout(token: string, successUrl: string, cancelUrl: string): Promise<string> {
  const response = await fetch(`${apiUrl()}/api/v1/billing/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { url?: string };
  if (!body.url) {
    throw new Error("O checkout não devolveu um endereço.");
  }
  return body.url;
}

function authHeaders(token?: string): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export interface GrammarBlock {
  role: "subject" | "connector" | "verb" | "object";
  text: string;
  options: string[];
}

export async function deconstructGrammar(token: string, sentence: string): Promise<{ sentence: string; blocks: GrammarBlock[] }> {
  const response = await fetch(`${apiUrl()}/api/v1/grammar/deconstruct`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ sentence }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { sentence?: string; blocks?: GrammarBlock[] };
  if (!body.sentence || !Array.isArray(body.blocks) || body.blocks.length !== 4) {
    throw new Error("A frase não voltou desmontada.");
  }
  return { sentence: body.sentence, blocks: body.blocks };
}

export async function varyGrammar(
  token: string,
  blocks: GrammarBlock[],
  voice?: string,
): Promise<{ sentence: string; blocks: GrammarBlock[]; audioUrl: string }> {
  const response = await fetch(`${apiUrl()}/api/v1/grammar/vary`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ blocks, ...(voice ? { voice } : {}) }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { sentence?: string; blocks?: GrammarBlock[]; audio_url?: string };
  if (!body.sentence || !Array.isArray(body.blocks) || !body.audio_url) {
    throw new Error("A variação não voltou completa.");
  }
  return {
    sentence: body.sentence,
    blocks: body.blocks,
    audioUrl: body.audio_url.startsWith("http") ? body.audio_url : `${apiUrl()}${body.audio_url}`,
  };
}

export async function fetchMnemonic(
  token: string,
  card: { front_phrase: string; back_translation: string; context_sentence: string },
): Promise<{ eligible: boolean; association_text?: string }> {
  const response = await fetch(`${apiUrl()}/api/v1/srs/mnemonic`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(card),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { eligible?: boolean; association_text?: string };
  if (typeof body.eligible !== "boolean") {
    throw new Error("O palácio não voltou completo.");
  }
  return { eligible: body.eligible, association_text: body.association_text };
}

export { pingApi } from "@/api/health";
export {
  registerAccount,
  loginAccount,
  confirmAccountEmail,
  resendAccountEmail,
  verifySecondFactor,
  logoutAccount,
  currentAccount,
  fetchMailInbox,
  requestPasswordReset,
  confirmPasswordReset,
} from "@/api/auth";
export type {
  AccountUser,
  AccountSettings,
  LoginChallenge,
  VerifyChallenge,
};

export async function fetchAccountSettings(token: string): Promise<AccountSettings> {
  const response = await apiFetch("/api/v1/account/settings", {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AccountSettings;
}

export async function saveAccountSettings(
  token: string,
  patch: Partial<
    Pick<
      AccountSettings,
      "display_name" | "display_locale" | "reminder_enabled" | "reminder_hour" | "mind_reading" | "mind_memory" | "mind_speech" | "mind_journal"
    >
  >,
): Promise<AccountSettings> {
  const response = await apiFetch("/api/v1/account/settings", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AccountSettings;
}

export async function changeAccountPassword(token: string, currentPassword: string, password: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/password", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ current_password: currentPassword, password }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function requestEmailChange(token: string, password: string, email: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/email/request", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ password, email }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function confirmEmailChange(token: string, code: string): Promise<string> {
  const response = await apiFetch("/api/v1/account/email/confirm", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { email?: string };
  if (!body.email) {
    throw new Error("O e-mail não confirmou.");
  }
  return body.email;
}

export async function startTotp(token: string): Promise<{ secret: string; otpauth_url: string }> {
  const response = await apiFetch("/api/v1/account/2fa/totp/start", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { secret: string; otpauth_url: string };
}

export async function confirmTotp(token: string, code: string): Promise<string[]> {
  const response = await apiFetch("/api/v1/account/2fa/totp/confirm", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { recovery_codes?: string[] };
  return body.recovery_codes ?? [];
}

export async function disableTotp(token: string, password: string, code: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/2fa/totp/disable", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ password, code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function startEmailFactor(token: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/2fa/email/start", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function confirmEmailFactor(token: string, code: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/2fa/email/confirm", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function disableEmailFactor(token: string, password: string): Promise<void> {
  const response = await apiFetch("/api/v1/account/2fa/email/disable", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export interface AdminDay {
  date: string;
  users: number;
  lessons: number;
  duels: number;
}

export interface AdminEvent {
  id: string;
  kind: "gemini" | "lesson" | "audio" | "news" | "billing";
  status: "ok" | "error" | "paused";
  message: string;
  detail: string | null;
  created_at: string;
}

export interface AdminCost {
  calls: number;
  cache_hits: number;
  cache_misses: number;
  cost_micros: number;
  per_session_micros: number | null;
}

export interface AdminDashboard {
  users: number;
  pro: number;
  free: number;
  lessons_today: number;
  duels_today: number;
  audio_today: number;
  gemini_errors_today: number;
  cost: AdminCost;
  generation_paused: boolean;
  stripe_configured: boolean;
  gemini_configured: boolean;
  groq_configured: boolean;
  openrouter_configured: boolean;
  series: AdminDay[];
  events: AdminEvent[];
}

export interface AdminAccount {
  id: string;
  email: string;
  native_lang: string;
  target_lang: string;
  level: string;
  plan: "free" | "pro";
  role: "learner" | "admin";
  streak_count: number;
  streak_freeze_count: number;
  last_lesson_at: string | null;
  created_at: string;
  lesson_count: number;
}

export interface AdminUserDetail {
  user: AdminAccount;
  lessons: Array<{ lesson_date: string; title: string; target_lang: string }>;
  duels: { total: number; best: number };
}

function adminDenied(status: number): void {
  if (status === 403) {
    throw new Error("Esta conta não administra o Prosa.");
  }
}

export async function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  const response = await fetch(`${apiUrl()}/api/v1/admin/dashboard`, { headers: authHeaders(token) });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AdminDashboard;
}

export async function fetchAdminEvents(
  token: string,
  filters?: { kind?: AdminEvent["kind"]; limit?: number },
): Promise<AdminEvent[]> {
  const params = new URLSearchParams();
  if (filters?.kind) {
    params.set("kind", filters.kind);
  }
  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${apiUrl()}/api/v1/admin/events${suffix}`, { headers: authHeaders(token) });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { events?: AdminEvent[] };
  return Array.isArray(body.events) ? body.events : [];
}

export async function fetchAdminUsers(
  token: string,
  query?: string,
  filters?: { plan?: "free" | "pro"; role?: "learner" | "admin" },
): Promise<AdminAccount[]> {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set("q", query.trim());
  }
  if (filters?.plan) {
    params.set("plan", filters.plan);
  }
  if (filters?.role) {
    params.set("role", filters.role);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${apiUrl()}/api/v1/admin/users${suffix}`, { headers: authHeaders(token) });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { users?: AdminAccount[] };
  return Array.isArray(body.users) ? body.users : [];
}

export async function fetchAdminUser(token: string, id: string): Promise<AdminUserDetail> {
  const response = await fetch(`${apiUrl()}/api/v1/admin/users/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as AdminUserDetail;
}

export async function setAdminUserPlan(token: string, id: string, plan: "free" | "pro"): Promise<AdminAccount> {
  const response = await fetch(`${apiUrl()}/api/v1/admin/users/${encodeURIComponent(id)}/plan`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ plan }),
  });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { user?: AdminAccount };
  if (!body.user) {
    throw new Error("A conta não voltou da API.");
  }
  return body.user;
}

export async function setAdminUserFreeze(token: string, id: string, delta: 1 | -1): Promise<AdminAccount> {
  const response = await fetch(`${apiUrl()}/api/v1/admin/users/${encodeURIComponent(id)}/freeze`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ delta }),
  });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { user?: AdminAccount };
  if (!body.user) {
    throw new Error("A conta não voltou da API.");
  }
  return body.user;
}

export async function setGenerationPaused(token: string, paused: boolean): Promise<boolean> {
  const response = await fetch(`${apiUrl()}/api/v1/admin/generation`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ paused }),
  });
  adminDenied(response.status);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { generation_paused?: boolean };
  return body.generation_paused === true;
}

export async function fetchBillingStatus(): Promise<boolean> {
  const response = await fetch(`${apiUrl()}/api/v1/billing/status`);
  if (!response.ok) {
    return false;
  }
  const body = (await response.json()) as { configured?: boolean };
  return body.configured === true;
}

export async function confirmCheckout(token: string, sessionId: string): Promise<boolean> {
  const response = await fetch(`${apiUrl()}/api/v1/billing/sessions/${encodeURIComponent(sessionId)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { active?: boolean };
  return body.active === true;
}

export interface SpokenStory {
  audioUrl: string;
  words: Array<{ text: string; offsetMs: number }>;
}

export { submitOnboarding } from "@/api/onboarding";

export async function generatePersonalized(token: string, selectedTopic: string): Promise<LessonPayload> {
  const response = await fetch(`${apiUrl()}/api/v1/lessons/generate-personalized`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ selected_topic: selectedTopic }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as LessonPayload;
  return {
    title: body.title,
    story_text: body.story_text,
    translation: body.translation,
    vocabulary: body.vocabulary,
    journal_prompt: body.journal_prompt,
    anchors: readAnchors(body.anchors),
  };
}

export interface StudyTrackChoice {
  target_lang: string;
  through_lang: string;
  level: string;
  active: boolean;
}

export { listStudyTracks } from "@/api/study";

export interface PlacementItem {
  id: string;
  band: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  kind: "vocab" | "grammar" | "reading" | "listening";
  prompt: string;
  hint: string;
  options: string[];
  passage?: string;
  audio_text?: string;
}

export type { PlacementHistoryEntry, PlacementStatus };

export interface PlacementAttempt {
  attempt_id: string;
  target_lang: string;
  through_lang: string;
  kind: "placement" | "progress";
  items: PlacementItem[];
  answered: Record<string, number>;
  index: number;
  adaptive?: boolean;
  cap?: number;
}

export interface PlacementStep {
  saved: boolean;
  done: boolean;
  asked: number;
  cap: number;
  next: PlacementItem | null;
}

export interface PlacementFinish {
  attempt_id: string;
  target_lang: string;
  through_lang: string;
  kind: "placement" | "progress";
  level: string;
  previous_level: string;
  score: number;
  correct: number;
  total: number;
  bands: Array<{ band: string; correct: number; total: number }>;
  skills?: Array<{ skill: "vocab" | "grammar" | "reading" | "listening"; correct: number; total: number }>;
  history: PlacementHistoryEntry[];
}

export { fetchPlacementStatus, startPlacement, answerPlacement, finishPlacement } from "@/api/placement";
export { activateStudyTrack } from "@/api/study";

export interface AdaptedNews {
  title: string;
  story_text: string;
  translation: string;
  vocabulary: VocabularyEntry[];
  journal_prompt: string;
  source_url: string;
  source_title: string;
  published?: string;
  audioUrl: string;
  words: Array<{ text: string; offsetMs: number }>;
  voiceId?: string;
}

export async function fetchAdaptedNews(
  token: string,
  interest?: string,
  voice?: string,
  index = 0,
  level?: string,
): Promise<AdaptedNews> {
  const response = await fetch(`${apiUrl()}/api/v1/news/fetch-adapted`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      ...(interest ? { interest } : {}),
      ...(voice ? { voice } : {}),
      ...(index > 0 ? { index } : {}),
      ...(level ? { level } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as {
    title?: string;
    story_text?: string;
    translation?: string;
    vocabulary?: VocabularyEntry[];
    journal_prompt?: string;
    source_url?: string;
    source_title?: string;
    published?: string | null;
    audio_url?: string;
    words?: Array<{ text?: string; offset_ms?: number }>;
  };
  if (!body.title || !body.story_text || !body.translation || !body.source_url || !body.source_title || !body.audio_url) {
    throw new Error("A notícia não voltou completa.");
  }
  const vocabulary = Array.isArray(body.vocabulary)
    ? body.vocabulary.filter((entry) => typeof entry?.word === "string" && typeof entry.translation === "string" && typeof entry.example_sentence === "string")
    : [];
  const words = Array.isArray(body.words)
    ? body.words.flatMap((word) => (typeof word?.text === "string" && typeof word.offset_ms === "number" ? [{ text: word.text, offsetMs: word.offset_ms }] : []))
    : [];
  return {
    title: body.title,
    story_text: body.story_text,
    translation: body.translation,
    vocabulary,
    journal_prompt: body.journal_prompt?.trim() || "O que esta notícia muda no seu dia?",
    source_url: body.source_url,
    source_title: body.source_title,
    ...(body.published ? { published: body.published } : {}),
    audioUrl: body.audio_url.startsWith("http") ? body.audio_url : `${apiUrl()}${body.audio_url}`,
    words,
    ...(voice ? { voiceId: voice } : {}),
  };
}

export function audioUrl(path: string): string {
  return path.startsWith("http") ? path : `${apiUrl()}${path}`;
}

function readSpokenWords(words: Array<{ text?: string; offset_ms?: number }> | undefined): SpokenStory["words"] {
  return (words ?? []).flatMap((word) =>
    typeof word?.text === "string" && typeof word.offset_ms === "number" ? [{ text: word.text, offsetMs: word.offset_ms }] : [],
  );
}

function warmAudioCache(key: string, remote: string, words: SpokenStory["words"]): void {
  void fetch(remote)
    .then(async (file) => {
      if (!file.ok) {
        return;
      }
      writeAudioCache(key, {
        audioUrl: `data:audio/mpeg;base64,${bytesToBase64(new Uint8Array(await file.arrayBuffer()))}`,
        words,
      });
    })
    .catch(() => undefined);
}

export async function speakStory(text: string, lang: string, voice?: string): Promise<SpokenStory> {
  const clips = await speakStories([text], lang, voice);
  const spoken = clips[0];
  if (!spoken) {
    throw new Error("A narração não voltou da API.");
  }
  return spoken;
}

export async function speakStories(texts: string[], lang: string, voice?: string): Promise<SpokenStory[]> {
  const language = lang.slice(0, 2).toLowerCase();
  const results = new Array<SpokenStory>(texts.length);
  const missing: number[] = [];
  texts.forEach((text, index) => {
    const cached = readAudioCache(audioCacheKey(text, language, voice ?? ""));
    if (cached) {
      results[index] = cached;
    } else {
      missing.push(index);
    }
  });
  if (missing.length === 0) {
    return results;
  }
  try {
    const response = await fetch(`${apiUrl()}/api/v1/audio/speak-batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        texts: missing.map((index) => texts[index]),
        lang: language,
        ...(voice ? { voice } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const body = (await response.json()) as {
      clips?: Array<{ audio_url?: string; words?: Array<{ text?: string; offset_ms?: number }> }>;
    };
    const clips = body.clips ?? [];
    missing.forEach((index, cursor) => {
      const clip = clips[cursor];
      if (!clip?.audio_url) {
        throw new Error("A narração não voltou da API.");
      }
      const words = readSpokenWords(clip.words);
      const remote = audioUrl(clip.audio_url);
      results[index] = { audioUrl: remote, words };
      warmAudioCache(audioCacheKey(texts[index] ?? "", language, voice ?? ""), remote, words);
    });
    return results;
  } catch (caught) {
    missing.forEach((index) => {
      const cached = readAudioCache(audioCacheKey(texts[index] ?? "", language, voice ?? ""));
      if (cached) {
        results[index] = cached;
      }
    });
    if (missing.every((index) => results[index])) {
      return results;
    }
    throw caught instanceof Error ? caught : new Error("A narração não voltou da API.");
  }
}

export function prefetchSpeech(texts: string[], lang: string, voice?: string): void {
  void speakStories(texts.filter((text) => text.trim().length > 0), lang, voice).catch(() => undefined);
}

export async function speakStoryStream(
  text: string,
  lang: string,
  voice: string | undefined,
  handlers: {
    onAudio: (bytes: Uint8Array) => void;
    onWord: (word: { text: string; offsetMs: number }) => void;
    onDone: () => void;
  },
  signal?: AbortSignal,
): Promise<SpokenStory> {
  const language = lang.slice(0, 2).toLowerCase();
  const key = audioCacheKey(text, language, voice ?? "");
  const cached = readAudioCache(key);
  if (cached) {
    const bytes = await audioBytes(cached.audioUrl, signal);
    if (bytes.length > 0) {
      handlers.onAudio(bytes);
    }
    for (const word of cached.words) {
      handlers.onWord(word);
    }
    handlers.onDone();
    return cached;
  }
  const response = await fetch(`${apiUrl()}/api/v1/audio/speak-stream`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      text,
      lang: language,
      ...(voice ? { voice } : {}),
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(await readError(response));
  }
  const words: SpokenStory["words"] = [];
  const chunks: Uint8Array[] = [];
  let remote = "";
  let failed = "";
  for await (const frame of readSse(response.body)) {
    if (signal?.aborted) {
      return { audioUrl: "", words: [] };
    }
    if (frame.event === "audio") {
      const bytes = base64ToBytes(frame.data);
      if (bytes.length > 0) {
        chunks.push(bytes);
        handlers.onAudio(bytes);
      }
      continue;
    }
    if (frame.event === "word") {
      try {
        const parsed = JSON.parse(frame.data) as { text?: string; offset_ms?: number };
        if (typeof parsed.text === "string" && typeof parsed.offset_ms === "number") {
          const word = { text: parsed.text, offsetMs: parsed.offset_ms };
          words.push(word);
          handlers.onWord(word);
        }
      } catch {
        continue;
      }
      continue;
    }
    if (frame.event === "done") {
      try {
        const parsed = JSON.parse(frame.data) as { audio_url?: string };
        if (typeof parsed.audio_url === "string") {
          remote = audioUrl(parsed.audio_url);
        }
      } catch {
        remote = "";
      }
      continue;
    }
    if (frame.event === "error") {
      failed = copy().neuralVoiceFailed;
    }
  }
  if (failed) {
    throw new Error(failed);
  }
  if (chunks.length === 0) {
    throw new Error(copy().neuralVoiceFailed);
  }
  handlers.onDone();
  const spoken: SpokenStory = remote
    ? { audioUrl: remote, words }
    : { audioUrl: `data:audio/mpeg;base64,${bytesToBase64(concatBytes(chunks))}`, words };
  if (remote) {
    warmAudioCache(key, remote, words);
  } else {
    writeAudioCache(key, spoken);
  }
  return spoken;
}

async function audioBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  if (url.startsWith("data:audio/mpeg;base64,")) {
    return base64ToBytes(url.slice("data:audio/mpeg;base64,".length));
  }
  const file = await fetch(url, { signal });
  if (!file.ok) {
    return new Uint8Array();
  }
  return new Uint8Array(await file.arrayBuffer());
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export interface Fluency360Response {
  status: any;
  milestones: any[];
  session_duration_mode: "lite_20" | "pro_40" | "sprint_60";
  paused_session_state: Record<string, unknown> | null;
}

export async function fetchFluency360(token: string, targetLang: string): Promise<Fluency360Response> {
  const response = await fetch(`${apiUrl()}/api/v1/fluency/360-meter?target_lang=${encodeURIComponent(targetLang)}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as Fluency360Response;
}

export async function postSessionDurationMode(token: string, targetLang: string, mode: "lite_20" | "pro_40" | "sprint_60"): Promise<void> {
  const response = await fetch(`${apiUrl()}/api/v1/profile/signals`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_lang: targetLang, session_duration_mode: mode }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}
