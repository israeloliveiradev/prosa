import { Platform } from "react-native";
import { audioCacheKey, bytesToBase64, readAudioCache, writeAudioCache } from "@/lib/audio-cache";
import type { CognateAnchor, JournalEvaluation, LessonPayload, LessonRequest, ReconstructionReport, ShadowingResult, VocabularyEntry } from "@/lib/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "A API do Prosa não respondeu.";
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
  const response = await fetch(`${API_URL}/api/v1/lessons/generate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as LessonPayload;
  return { ...body, anchors: readAnchors(body.anchors) };
}

export async function fetchCognates(through: string, target: string): Promise<CognateAnchor[]> {
  const response = await fetch(`${API_URL}/api/v1/cognates?through=${encodeURIComponent(through)}&target=${encodeURIComponent(target)}`);
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

  const response = await fetch(`${API_URL}/api/v1/audio/analyze-shadowing-phonetic`, {
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
  const response = await fetch(`${API_URL}/api/v1/journal/evaluate`, {
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
  const response = await fetch(`${API_URL}/api/v1/journal/reconstruct`, {
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
  const response = await fetch(`${API_URL}/api/v1/duel/round`, {
    method: "POST",
    headers: authHeaders(token),
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
  const response = await fetch(`${API_URL}/api/v1/duel/score`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(score),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function fetchDuelBoard(token: string): Promise<DuelBoardEntry[]> {
  const response = await fetch(`${API_URL}/api/v1/duel/leaderboard`, {
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
  const response = await fetch(`${API_URL}/api/v1/persona/scenes`, { headers: authHeaders(token) });
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
  const response = await fetch(`${API_URL}/api/v1/persona/turn`, {
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
  const response = await fetch(`${API_URL}/api/v1/audio/transcribe`, { method: "POST", body });
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
  const response = await fetch(`${API_URL}/api/v1/srs/retention`, {
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
  const response = await fetch(`${API_URL}/api/v1/srs/sync`, {
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
  const response = await fetch(`${API_URL}/api/v1/billing/checkout`, {
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
  const response = await fetch(`${API_URL}/api/v1/grammar/deconstruct`, {
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
  const response = await fetch(`${API_URL}/api/v1/grammar/vary`, {
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
    audioUrl: body.audio_url.startsWith("http") ? body.audio_url : `${API_URL}${body.audio_url}`,
  };
}

export async function fetchMnemonic(
  token: string,
  card: { front_phrase: string; back_translation: string; context_sentence: string },
): Promise<{ eligible: boolean; association_text?: string }> {
  const response = await fetch(`${API_URL}/api/v1/srs/mnemonic`, {
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
  interests?: string[];
}

export async function registerAccount(input: {
  email: string;
  password: string;
  native_lang: string;
  target_lang: string;
  level: AccountUser["level"];
}): Promise<{ token: string; user: AccountUser }> {
  const response = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { token: string; user: AccountUser };
}

export async function loginAccount(email: string, password: string): Promise<{ token: string; user: AccountUser }> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as { token: string; user: AccountUser };
}

export async function logoutAccount(token: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function currentAccount(token: string): Promise<AccountUser> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
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

export async function confirmCheckout(sessionId: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/v1/billing/sessions/${encodeURIComponent(sessionId)}`);
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
  const response = await fetch(`${API_URL}/api/v1/onboarding/quiz`, {
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
  const response = await fetch(`${API_URL}/api/v1/lessons/generate-personalized`, {
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
  const response = await fetch(`${API_URL}/api/v1/study/tracks`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { tracks?: StudyTrackChoice[] };
  return body.tracks ?? [];
}

export async function activateStudyTrack(token: string, track: { target_lang: string; through_lang: string }): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/study/activate`, {
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
  const response = await fetch(`${API_URL}/api/v1/news/fetch-adapted`, {
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
    audioUrl: body.audio_url.startsWith("http") ? body.audio_url : `${API_URL}${body.audio_url}`,
    words,
    ...(voice ? { voiceId: voice } : {}),
  };
}

export async function speakStory(text: string, lang: string, voice?: string): Promise<SpokenStory> {
  const language = lang.slice(0, 2).toLowerCase();
  const key = audioCacheKey(text, language, voice ?? "");
  try {
    const response = await fetch(`${API_URL}/api/v1/audio/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        lang: language,
        ...(voice ? { voice } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const body = (await response.json()) as {
      audio_url?: string;
      words?: Array<{ text: string; offset_ms: number }>;
    };
    if (!body.audio_url) {
      throw new Error("A narração não voltou da API.");
    }
    const remote = `${API_URL}${body.audio_url}`;
    const words = (body.words ?? []).map((word) => ({ text: word.text, offsetMs: word.offset_ms }));
    const file = await fetch(remote);
    if (!file.ok) {
      return { audioUrl: remote, words };
    }
    const spoken = {
      audioUrl: `data:audio/mpeg;base64,${bytesToBase64(new Uint8Array(await file.arrayBuffer()))}`,
      words,
    };
    writeAudioCache(key, spoken);
    return spoken;
  } catch (caught) {
    const cached = readAudioCache(key);
    if (cached) {
      return cached;
    }
    throw caught instanceof Error ? caught : new Error("A narração não voltou da API.");
  }
}
