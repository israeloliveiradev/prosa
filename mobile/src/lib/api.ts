import { Platform } from "react-native";
import { audioCacheKey, bytesToBase64, readAudioCache, writeAudioCache } from "@/lib/audio-cache";
import { getCast } from "@/lib/cast";
import type { CognateAnchor, JournalEvaluation, LessonPayload, LessonRequest, ReconstructionReport, ShadowingResult, VocabularyEntry } from "@/lib/types";

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
    throw new Error("A API não abriu. Confira se o servidor está em :3000.");
  }
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  const message = payload?.error ?? "A API do Prosa não respondeu.";
  if (message.includes("Body cannot be empty") || message.includes("content-type")) {
    return "O pedido não saiu completo. Tente de novo.";
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

export async function fetchCognates(through: string, target: string): Promise<CognateAnchor[]> {
  const response = await fetch(`${apiUrl()}/api/v1/cognates?through=${encodeURIComponent(through)}&target=${encodeURIComponent(target)}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { anchors?: unknown };
  return readAnchors(body.anchors);
}

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
  return { ...report, bars };
}

export async function evaluateJournal(input: {
  text: string;
  journal_prompt: string;
  target_lang: string;
  native_lang: string;
  level: LessonRequest["level"];
}): Promise<JournalEvaluation> {
  const response = await fetch(`${apiUrl()}/api/v1/journal/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as JournalEvaluation;
}

export async function reconstructStory(input: {
  attempt: string;
  story_text: string;
  translation: string;
  target_lang: string;
  through_lang: string;
  level: LessonRequest["level"];
}): Promise<ReconstructionReport> {
  const response = await fetch(`${apiUrl()}/api/v1/journal/reconstruct`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const report = (await response.json()) as ReconstructionReport;
  return {
    score: typeof report.score === "number" ? report.score : 0,
    grammar: Array.isArray(report.grammar) ? report.grammar : [],
    literals: Array.isArray(report.literals) ? report.literals : [],
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

export async function fetchDuelRound(token: string): Promise<DuelDrill[]> {
  const response = await fetch(`${apiUrl()}/api/v1/duel/round`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { drills?: DuelDrill[] };
  const drills = Array.isArray(body.drills) ? body.drills.filter((drill) => Array.isArray(drill.options) && drill.options.length === 4 && typeof drill.answer === "number") : [];
  if (drills.length < 8) {
    throw new Error("O duelo não trouxe frases suficientes.");
  }
  return drills;
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

export interface AccountUser {
  id: string;
  email: string;
  native_lang: string;
  target_lang: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  plan: "free" | "pro";
  role?: "learner" | "admin";
  interests?: string[];
  streak_count?: number;
  streak_freeze_count?: number;
  last_lesson_at?: string | null;
  display_name?: string | null;
  display_locale?: "pt" | "en";
  reminder_enabled?: boolean;
  reminder_hour?: number;
  totp_enabled?: boolean;
  email_2fa?: boolean;
  mind_reading?: string;
  mind_memory?: string;
  mind_speech?: string;
  mind_journal?: string;
}

export interface AccountSettings {
  display_name: string | null;
  display_locale: "pt" | "en";
  reminder_enabled: boolean;
  reminder_hour: number;
  totp_enabled: boolean;
  email_2fa: boolean;
  mind_reading: string;
  mind_memory: string;
  mind_speech: string;
  mind_journal: string;
  mail_configured: boolean;
  mail_inbox_url: string | null;
}

export type LoginChallenge = {
  requires_2fa: true;
  ticket: string;
  methods: Array<"totp" | "email">;
};

export type VerifyChallenge = {
  requires_verify: true;
  email: string;
};

function isVerifyChallenge(value: unknown): value is VerifyChallenge {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Partial<VerifyChallenge>;
  return body.requires_verify === true && typeof body.email === "string";
}

function isLoginChallenge(value: unknown): value is LoginChallenge {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Partial<LoginChallenge>;
  return body.requires_2fa === true && typeof body.ticket === "string";
}

export async function registerAccount(input: {
  email: string;
  password: string;
  native_lang: string;
  target_lang: string;
  level: AccountUser["level"];
}): Promise<{ token: string; user: AccountUser } | VerifyChallenge> {
  const response = await apiFetch("/api/v1/auth/register", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body: unknown = await response.json();
  if (isVerifyChallenge(body)) {
    return body;
  }
  return body as { token: string; user: AccountUser };
}

export async function loginAccount(email: string, password: string): Promise<{ token: string; user: AccountUser } | LoginChallenge | VerifyChallenge> {
  const response = await apiFetch("/api/v1/auth/login", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body: unknown = await response.json();
  if (isVerifyChallenge(body) || isLoginChallenge(body)) {
    return body;
  }
  return body as { token: string; user: AccountUser };
}

export async function confirmAccountEmail(email: string, code: string): Promise<{ token: string; user: AccountUser }> {
  const response = await apiFetch("/api/v1/auth/verify", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { token: string; user: AccountUser };
}

export async function resendAccountEmail(email: string): Promise<void> {
  const response = await apiFetch("/api/v1/auth/verify/resend", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function verifySecondFactor(ticket: string, code: string): Promise<{ token: string; user: AccountUser }> {
  const response = await apiFetch("/api/v1/auth/2fa", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ticket, code }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { token: string; user: AccountUser };
}

export async function logoutAccount(token: string): Promise<void> {
  await fetch(`${apiUrl()}/api/v1/auth/logout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
}

export async function currentAccount(token: string): Promise<AccountUser> {
  const response = await apiFetch("/api/v1/auth/me", {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { user?: AccountUser };
  if (!body.user) {
    throw new Error("A conta não voltou da API.");
  }
  return body.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await apiFetch("/api/v1/auth/forgot", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function confirmPasswordReset(email: string, code: string, password: string): Promise<void> {
  const response = await apiFetch("/api/v1/auth/reset", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, code, password }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

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

export interface AdminDashboard {
  users: number;
  pro: number;
  free: number;
  lessons_today: number;
  duels_today: number;
  audio_today: number;
  gemini_errors_today: number;
  generation_paused: boolean;
  stripe_configured: boolean;
  gemini_configured: boolean;
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

export async function submitOnboarding(
  token: string,
  input: {
    interests: string[];
    goal?: string;
    tracks: Array<{ target_lang: string; through_lang: string; active: boolean }>;
    level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  },
): Promise<{ interests: string[]; topics: string[]; target_lang: string; native_lang: string; level?: string }> {
  const response = await fetch(`${apiUrl()}/api/v1/onboarding/quiz`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as {
    interests: string[];
    topics: string[];
    target_lang: string;
    native_lang: string;
    level?: string;
  };
}

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
  active: boolean;
}

export async function listStudyTracks(token: string): Promise<StudyTrackChoice[]> {
  const response = await fetch(`${apiUrl()}/api/v1/study/tracks`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { tracks?: StudyTrackChoice[] };
  return body.tracks ?? [];
}

export async function activateStudyTrack(token: string, track: { target_lang: string; through_lang: string }): Promise<void> {
  const response = await fetch(`${apiUrl()}/api/v1/study/activate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(track),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

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
