export const PROFILE_SKILLS = [
  "reading",
  "listening",
  "vocabulary",
  "grammar",
  "pronunciation",
  "fluency",
  "writing",
] as const;

export type ProfileSkill = (typeof PROFILE_SKILLS)[number];

export interface LearnerProfile {
  reading: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  fluency: number;
  writing: number;
  hearing: number;
  lexicon_size: number;
  coverage: number;
  error_kinds: string[];
  weak_sounds: string[];
  goal: string;
  weekly_aim: string;
  minutes_per_day: number;
  exam_track: string;
  fluency_wpm: number;
}

export interface ProfileNote {
  force: "listen" | "reading" | "none";
  gap: number;
  weak: ProfileSkill | null;
}

export function emptyProfile(): LearnerProfile {
  return {
    reading: 0,
    listening: 0,
    vocabulary: 0,
    grammar: 0,
    pronunciation: 0,
    fluency: 0,
    writing: 0,
    hearing: 0,
    lexicon_size: 0,
    coverage: 0,
    error_kinds: [],
    weak_sounds: [],
    goal: "",
    weekly_aim: "",
    minutes_per_day: 20,
    exam_track: "",
    fluency_wpm: 0,
  };
}

export function profileNote(profile: LearnerProfile): ProfileNote {
  const gap = profile.reading - profile.listening;
  const weak = weakestSkill(profile);
  if (profile.hearing > 0 && profile.hearing < 50) {
    return { force: "listen", gap, weak };
  }
  if (gap >= 18) {
    return { force: "listen", gap, weak };
  }
  if (gap <= -18) {
    return { force: "reading", gap, weak };
  }
  return { force: "none", gap, weak };
}

export function clockHint(profile: LearnerProfile): { listeningGap: number; slowStart: boolean } {
  const note = profileNote(profile);
  return {
    listeningGap: note.force === "listen" ? Math.max(note.gap, 20) : note.gap,
    slowStart: profile.hearing > 0 && profile.hearing < 50,
  };
}

function weakestSkill(profile: LearnerProfile): ProfileSkill | null {
  let pick: ProfileSkill | null = null;
  let low = 101;
  for (const skill of PROFILE_SKILLS) {
    const value = profile[skill];
    if (value <= 0) {
      continue;
    }
    if (value < low) {
      low = value;
      pick = skill;
    }
  }
  return pick;
}
