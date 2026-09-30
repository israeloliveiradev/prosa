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

export interface ClockHint {
  listeningGap: number;
  slowStart: boolean;
}

export const emptyProfile = (): LearnerProfile => ({
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
});

export function scoreOf(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function blendScore(current: number, sample: number, weight = 0.35): number {
  if (current === 0) {
    return scoreOf(sample);
  }
  return scoreOf(current * (1 - weight) + sample * weight);
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

export function clockHint(profile: LearnerProfile): ClockHint {
  const note = profileNote(profile);
  return {
    listeningGap: note.force === "listen" ? Math.max(note.gap, 20) : note.gap,
    slowStart: profile.hearing > 0 && profile.hearing < 50,
  };
}

export function weakestSkill(profile: LearnerProfile): ProfileSkill | null {
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

export function applySignals(
  profile: LearnerProfile,
  signals: {
    reading?: number;
    listening?: number;
    vocabulary?: number;
    grammar?: number;
    pronunciation?: number;
    fluency?: number;
    writing?: number;
    hearing?: number;
    lexicon_size?: number;
    coverage?: number;
    error?: string;
    sound?: string;
    goal?: string;
    weekly_aim?: string;
    minutes_per_day?: number;
    fluency_wpm?: number;
  },
): LearnerProfile {
  const next = { ...profile, error_kinds: [...profile.error_kinds], weak_sounds: [...profile.weak_sounds] };
  for (const skill of PROFILE_SKILLS) {
    const sample = signals[skill];
    if (typeof sample === "number") {
      next[skill] = blendScore(next[skill], sample);
    }
  }
  if (typeof signals.hearing === "number") {
    next.hearing = blendScore(next.hearing, signals.hearing);
  }
  if (typeof signals.lexicon_size === "number") {
    next.lexicon_size = Math.max(0, Math.round(signals.lexicon_size));
  }
  if (typeof signals.coverage === "number") {
    next.coverage = scoreOf(signals.coverage);
  }
  if (signals.error?.trim()) {
    next.error_kinds = remember(next.error_kinds, signals.error.trim());
  }
  if (signals.sound?.trim()) {
    next.weak_sounds = remember(next.weak_sounds, signals.sound.trim());
  }
  if (signals.goal?.trim()) {
    next.goal = signals.goal.trim().slice(0, 80);
  }
  if (signals.weekly_aim?.trim()) {
    next.weekly_aim = signals.weekly_aim.trim().slice(0, 80);
  }
  if (typeof signals.minutes_per_day === "number") {
    next.minutes_per_day = Math.max(5, Math.min(120, Math.round(signals.minutes_per_day)));
  }
  if (typeof signals.fluency_wpm === "number") {
    next.fluency_wpm = Math.max(0, Math.min(400, Math.round(signals.fluency_wpm)));
  }
  return next;
}

function remember(list: string[], item: string): string[] {
  const key = item.toLowerCase();
  return [item, ...list.filter((entry) => entry.toLowerCase() !== key)].slice(0, 6);
}
