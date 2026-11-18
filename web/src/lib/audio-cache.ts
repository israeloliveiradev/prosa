import { kv } from "@/lib/kv";
import type { SpokenStory } from "@/lib/api";

const INDEX_KEY = "prosa.audio.index.v1";
const PREFIX = "prosa.audio.v1.";
const MAX_CLIPS = 8;

export function audioCacheKey(text: string, lang: string, voice: string): string {
  let hash = 5381;
  const value = `${lang}\n${voice}\n${text}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 33) ^ value.charCodeAt(index);
  }
  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

export function readAudioCache(key: string): SpokenStory | null {
  const raw = kv.getString(PREFIX + key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SpokenStory>;
    if (typeof parsed.audioUrl !== "string" || !Array.isArray(parsed.words)) {
      return null;
    }
    return {
      audioUrl: parsed.audioUrl,
      words: parsed.words.filter((word) => typeof word?.text === "string" && typeof word.offsetMs === "number"),
    };
  } catch {
    return null;
  }
}

export function writeAudioCache(key: string, clip: SpokenStory): void {
  const index = readIndex().filter((item) => item !== key);
  index.unshift(key);
  for (const expired of index.splice(MAX_CLIPS)) {
    kv.delete(PREFIX + expired);
  }
  kv.set(PREFIX + key, JSON.stringify(clip));
  kv.set(INDEX_KEY, JSON.stringify(index));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readIndex(): string[] {
  const raw = kv.getString(INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
