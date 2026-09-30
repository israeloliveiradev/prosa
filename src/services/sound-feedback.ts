import { alignWords, normalizeSpeech } from "./levenshtein.js";
import { contrastById, type PronunciationContrast } from "./pronunciation-contrasts.js";

export interface SoundNote {
  word: string;
  sound: { pt: string; en: string };
  held: boolean;
  heard: string;
  hint: { pt: string; en: string };
}

interface SoundHit {
  held: boolean;
  heard: string;
}

interface SoundRule {
  id: string;
  apply: (reference: string, spoken: string | null) => SoundHit | null;
}

export function soundNotes(reference: string, hypothesis: string, target: string): SoundNote[] {
  const rules = rulesFor(target);
  if (rules.length === 0) {
    return [];
  }
  const aligned = alignWords(normalizeSpeech(reference), normalizeSpeech(hypothesis));
  const notes: SoundNote[] = [];
  const heldSounds = new Set<string>();
  for (const item of aligned) {
    for (const rule of rules) {
      const hit = rule.apply(item.reference, item.spoken);
      if (!hit) {
        continue;
      }
      if (hit.held && heldSounds.has(rule.id)) {
        break;
      }
      const contrast = contrastById(rule.id);
      if (!contrast) {
        break;
      }
      if (hit.held) {
        heldSounds.add(rule.id);
      }
      notes.push({
        word: item.reference,
        sound: contrast.name,
        held: hit.held,
        heard: hit.heard,
        hint: contrast.hint,
      });
      break;
    }
  }
  return cap(notes);
}

function rulesFor(target: string): SoundRule[] {
  const code = target.trim().toLowerCase().slice(0, 2);
  if (code === "en") {
    return [swap("en-th", thHit), pair("en-vowel")];
  }
  if (code === "es") {
    return [pair("es-rr")];
  }
  if (code === "fr") {
    return [pair("fr-u"), pair("fr-nasal")];
  }
  if (code === "de") {
    return [pair("de-umlaut"), pair("de-ch"), swap("de-ch", chHit)];
  }
  if (code === "it") {
    return [pair("it-double")];
  }
  if (code === "ru") {
    return [pair("ru-soft")];
  }
  if (code === "ja") {
    return [pair("ja-length")];
  }
  return [];
}

function pair(id: string): SoundRule {
  return {
    id,
    apply(reference, spoken) {
      const contrast = contrastById(id);
      if (!contrast || spoken === null) {
        return null;
      }
      return pairHit(contrast, reference, spoken);
    },
  };
}

function swap(id: string, hit: (reference: string, spoken: string | null) => SoundHit | null): SoundRule {
  return { id, apply: hit };
}

function pairHit(contrast: PronunciationContrast, reference: string, spoken: string): SoundHit | null {
  for (const item of contrast.pairs) {
    const left = normalizeSpeech(item.a);
    const right = normalizeSpeech(item.b);
    if (reference !== left && reference !== right) {
      continue;
    }
    if (spoken === reference) {
      return { held: true, heard: "" };
    }
    if (spoken === left || spoken === right) {
      return { held: false, heard: spoken };
    }
  }
  return null;
}

function thHit(reference: string, spoken: string | null): SoundHit | null {
  if (spoken === null || !reference.includes("th")) {
    return null;
  }
  if (spoken === reference) {
    return { held: true, heard: "" };
  }
  return replaced(reference, spoken, "th", [
    ["f", "f"],
    ["s", "s"],
    ["t", "t"],
    ["d", "d"],
    ["z", "z"],
  ]);
}

function chHit(reference: string, spoken: string | null): SoundHit | null {
  if (spoken === null || !reference.includes("ch")) {
    return null;
  }
  if (spoken === reference) {
    return { held: true, heard: "" };
  }
  return replaced(reference, spoken, "ch", [
    ["k", "k"],
    ["sch", "sch"],
    ["sh", "sh"],
  ]);
}

function replaced(reference: string, spoken: string, token: string, options: Array<[string, string]>): SoundHit | null {
  for (const [heard, replacement] of options) {
    const form = reference.replaceAll(token, replacement);
    if (form !== reference && spoken === form) {
      return { held: false, heard };
    }
  }
  return null;
}

function cap(notes: SoundNote[]): SoundNote[] {
  const slips = notes.filter((note) => !note.held);
  const holds = notes.filter((note) => note.held);
  const picked = new Set([...slips, ...holds].slice(0, 4));
  return notes.filter((note) => picked.has(note));
}
