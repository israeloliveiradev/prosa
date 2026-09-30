import type { ProfileNote } from "./learner-profile.js";

export function practiceFocus(note: ProfileNote, errors: string[], sounds: string[]): string {
  if (note.force === "listen") {
    return "listening";
  }
  if (note.force === "reading") {
    return "reading";
  }
  const error = errors.find((item) => item.trim().length > 0);
  if (error) {
    return error;
  }
  const sound = sounds.find((item) => item.trim().length > 0);
  if (sound) {
    return sound;
  }
  return note.weak ?? "";
}
