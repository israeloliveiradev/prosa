export const STUDY_LANGUAGES = [
  { id: "en", name: "Inglês" },
  { id: "es", name: "Espanhol" },
  { id: "de", name: "Alemão" },
  { id: "ru", name: "Russo" },
  { id: "fr", name: "Francês" },
  { id: "it", name: "Italiano" },
  { id: "ja", name: "Japonês" },
] as const;

export const THROUGH_LANGUAGES = [{ id: "pt", name: "Português" }, ...STUDY_LANGUAGES] as const;

export type StudyLang = (typeof STUDY_LANGUAGES)[number]["id"];
export type ThroughLang = (typeof THROUGH_LANGUAGES)[number]["id"];

export interface StudyTrack {
  target_lang: StudyLang;
  through_lang: ThroughLang;
  active: boolean;
}

export function languageName(code: string): string {
  return THROUGH_LANGUAGES.find((item) => item.id === code)?.name ?? code;
}

export function trackLabel(track: { target_lang: string; through_lang: string }): string {
  return `${languageName(track.target_lang)} através do ${languageName(track.through_lang).toLowerCase()}`;
}
