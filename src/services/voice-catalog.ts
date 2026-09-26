import { AppError } from "../http/errors.js";

export interface NarrationVoice {
  id: string;
  name: string;
  detail: string;
  lang: string;
}

const VOICES: readonly NarrationVoice[] = [
  { id: "en-US-AvaNeural", name: "Ava", detail: "feminina", lang: "en" },
  { id: "en-US-AndrewNeural", name: "Andrew", detail: "masculina", lang: "en" },
  { id: "en-US-EmmaNeural", name: "Emma", detail: "feminina", lang: "en" },
  { id: "en-US-BrianNeural", name: "Brian", detail: "masculina", lang: "en" },
  { id: "es-ES-ElviraNeural", name: "Elvira", detail: "feminina", lang: "es" },
  { id: "es-ES-AlvaroNeural", name: "Álvaro", detail: "masculina", lang: "es" },
  { id: "es-MX-DaliaNeural", name: "Dalia", detail: "feminina", lang: "es" },
  { id: "es-MX-JorgeNeural", name: "Jorge", detail: "masculina", lang: "es" },
  { id: "de-DE-KatjaNeural", name: "Katja", detail: "feminina", lang: "de" },
  { id: "de-DE-ConradNeural", name: "Conrad", detail: "masculina", lang: "de" },
  { id: "fr-FR-DeniseNeural", name: "Denise", detail: "feminina", lang: "fr" },
  { id: "fr-FR-HenriNeural", name: "Henri", detail: "masculina", lang: "fr" },
  { id: "it-IT-ElsaNeural", name: "Elsa", detail: "feminina", lang: "it" },
  { id: "it-IT-DiegoNeural", name: "Diego", detail: "masculina", lang: "it" },
  { id: "ru-RU-SvetlanaNeural", name: "Svetlana", detail: "feminina", lang: "ru" },
  { id: "ru-RU-DmitryNeural", name: "Dmitry", detail: "masculina", lang: "ru" },
  { id: "ja-JP-NanamiNeural", name: "Nanami", detail: "feminina", lang: "ja" },
  { id: "ja-JP-KeitaNeural", name: "Keita", detail: "masculina", lang: "ja" },
  { id: "pt-BR-FranciscaNeural", name: "Francisca", detail: "feminina", lang: "pt" },
  { id: "pt-BR-AntonioNeural", name: "Antonio", detail: "masculina", lang: "pt" },
];

export function voicesFor(lang: string): NarrationVoice[] {
  const code = lang.trim().toLowerCase().slice(0, 2);
  return VOICES.filter((voice) => voice.lang === code);
}

export function resolveNarrationVoice(lang: string, requested?: string): NarrationVoice {
  const options = voicesFor(lang);
  const fallback = options[0];
  if (!fallback) {
    throw new AppError(400, "Unsupported language");
  }
  if (!requested) {
    return fallback;
  }
  const match = options.find((voice) => voice.id === requested);
  if (!match) {
    throw new AppError(400, "Unsupported voice");
  }
  return match;
}
