import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { kv } from "@/lib/kv";

export interface Mentor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  level: number;
  quote: string;
}

export interface CourseTrack {
  targetLang: string;
  level: string;
  xp: number;
  streak: number;
  currentCardIndex: number;
  activeMentor: Mentor;
}

export interface ProsaContextValue {
  xp: number;
  gems: number;
  streak: number;
  targetLang: string;
  throughLang: string;
  interfaceLang: string;
  activeMentor: Mentor;
  currentLevel: string;
  currentCardIndex: number;
  courseTracks: Record<string, CourseTrack>;
  isPro: boolean;
  addXp: (amount: number) => void;
  setXp: (xp: number) => void;
  addGems: (amount: number) => void;
  setGems: (gems: number) => void;
  setTargetLang: (lang: string) => void;
  setThroughLang: (lang: string) => void;
  setInterfaceLang: (lang: string) => void;
  setActiveMentor: (mentor: Mentor) => void;
  setCurrentLevel: (level: string) => void;
  setCurrentCardIndex: (index: number) => void;
  setIsPro: (pro: boolean) => void;
  resetProgress: () => void;
}

export const DEFAULT_MENTORS_BY_LANG: Record<string, Mentor> = {
  en: {
    id: "feynman",
    name: "Richard Feynman",
    title: "Mentor de Ritmo & Foco",
    avatar: "/cast/feynman.png",
    level: 1,
    quote: "“Aprender inglês é descomplicar a física da fala. Menos decoreba, mais conexões reais.”",
  },
  de: {
    id: "einstein",
    name: "Albert Einstein",
    title: "Mentor Polímata",
    avatar: "/cast/einstein.png",
    level: 1,
    quote: "“A língua alemã é como a relatividade: complexa à primeira vista, mas com lógica pura e perfeita.”",
  },
  fr: {
    id: "curie",
    name: "Marie Curie",
    title: "Mentora de Fonética & Retenção",
    avatar: "/cast/curie.png",
    level: 1,
    quote: "“Na vida e na língua francesa, nada deve ser temido, apenas compreendido.”",
  },
  es: {
    id: "cicero",
    name: "Cícero",
    title: "Mentor de Eloquência",
    avatar: "/cast/cicero.png",
    level: 1,
    quote: "“A clareza do espanhol reside no vigor do ritmo articulatório.”",
  },
  it: {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Mentor de Sintaxe & Estrutura",
    avatar: "/cast/davinci.png",
    level: 1,
    quote: "“A simplicidade é o grau máximo de sofisticação da sintaxe italiana.”",
  },
  ja: {
    id: "confucius",
    name: "Confúcio",
    title: "Mentor de Sabedoria Linguística",
    avatar: "/cast/confucius.png",
    level: 1,
    quote: "“Uma jornada de mil milhas no japonês começa com uma única palavra bem pronunciada.”",
  },
};

const DEFAULT_MENTOR: Mentor = DEFAULT_MENTORS_BY_LANG.en;

const STATS_STORAGE_KEY = "prosa.user_stats.v2";
const TRACKS_STORAGE_KEY = "prosa.course_tracks.v3";

const ProsaContext = createContext<ProsaContextValue | null>(null);

const defaultTrackForLang = (lang: string): CourseTrack => ({
  targetLang: lang,
  level: "A1",
  xp: 0,
  streak: 1,
  currentCardIndex: 0,
  activeMentor: DEFAULT_MENTORS_BY_LANG[lang] || DEFAULT_MENTORS_BY_LANG.en,
});

export function ProsaProvider({ children }: { children: ReactNode }) {
  const [targetLang, setTargetLangState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_target_lang");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.target_lang.v1");
      if (explicit) return explicit;
      const journey = kv.getString("prosa.journey.v1");
      if (journey) {
        const parsed = JSON.parse(journey);
        if (parsed.target_lang) return parsed.target_lang;
      }
    } catch { }
    return "en";
  });

  const [throughLang, setThroughLangState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_through_lang");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.through_lang.v1");
      if (explicit) return explicit;
      const journey = kv.getString("prosa.journey.v1");
      if (journey) {
        const parsed = JSON.parse(journey);
        if (parsed.through_lang) return parsed.through_lang;
      }
    } catch { }
    return "pt";
  });

  const [courseTracks, setCourseTracks] = useState<Record<string, CourseTrack>>(() => {
    try {
      const saved = kv.getString(TRACKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch { }
    return {
      en: {
        targetLang: "en",
        level: "B1",
        xp: 240,
        streak: 1,
        currentCardIndex: 0,
        activeMentor: DEFAULT_MENTORS_BY_LANG.en,
      },
    };
  });

  const activeTrack = courseTracks[targetLang] || defaultTrackForLang(targetLang);

  const [xp, setXpState] = useState<number>(activeTrack.xp);
  const [gems, setGemsState] = useState<number>(() => {
    try {
      const saved = kv.getString(STATS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.gems === "number") return parsed.gems;
      }
    } catch { }
    return 50;
  });
  const [streak, setStreakState] = useState<number>(activeTrack.streak);
  const [currentLevel, setCurrentLevelState] = useState<string>(activeTrack.level);
  const [currentCardIndex, setCurrentCardIndexState] = useState<number>(activeTrack.currentCardIndex);
  const [activeMentor, setActiveMentorState] = useState<Mentor>(activeTrack.activeMentor);
  const [interfaceLang, setInterfaceLang] = useState("pt-BR");
  const [isPro, setIsPro] = useState(false);

  // Sync track when changing target language (isolated sub-course per language)
  const setTargetLang = (nextLang: string) => {
    if (nextLang === targetLang) return;

    // 1. Snapshot current track state
    const currentTrackSnapshot: CourseTrack = {
      targetLang,
      level: currentLevel,
      xp,
      streak,
      currentCardIndex,
      activeMentor,
    };

    // 2. Fetch or initialize next track
    const nextTrack = courseTracks[nextLang] || defaultTrackForLang(nextLang);

    const updatedTracks: Record<string, CourseTrack> = {
      ...courseTracks,
      [targetLang]: currentTrackSnapshot,
      [nextLang]: nextTrack,
    };

    setCourseTracks(updatedTracks);
    try {
      kv.set(TRACKS_STORAGE_KEY, JSON.stringify(updatedTracks));
      kv.set("prosa.target_lang.v1", nextLang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_target_lang", nextLang);
      }
    } catch { }

    // 3. Switch active runtime state to next track
    setTargetLangState(nextLang);
    setXpState(nextTrack.xp);
    setStreakState(nextTrack.streak);
    setCurrentLevelState(nextTrack.level);
    setCurrentCardIndexState(nextTrack.currentCardIndex);
    setActiveMentorState(nextTrack.activeMentor);
  };

  const setThroughLang = (lang: string) => {
    setThroughLangState(lang);
    try {
      kv.set("prosa.through_lang.v1", lang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_through_lang", lang);
      }
    } catch { }
  };

  const persistCurrentTrack = (trackUpdate: Partial<CourseTrack>) => {
    setCourseTracks((prev) => {
      const current = prev[targetLang] || defaultTrackForLang(targetLang);
      const updated: CourseTrack = { ...current, ...trackUpdate };
      const nextTracks = { ...prev, [targetLang]: updated };
      try {
        kv.set(TRACKS_STORAGE_KEY, JSON.stringify(nextTracks));
      } catch { }
      return nextTracks;
    });
  };

  const setXp = (val: number) => {
    setXpState(val);
    persistCurrentTrack({ xp: val });
  };

  const addXp = (amount: number) => {
    setXpState((prev) => {
      const next = prev + amount;
      persistCurrentTrack({ xp: next });
      return next;
    });
  };

  const setGems = (val: number) => {
    setGemsState(val);
    try {
      kv.set(STATS_STORAGE_KEY, JSON.stringify({ xp, gems: val, streak }));
    } catch { }
  };

  const addGems = (amount: number) => {
    setGemsState((prev) => {
      const next = prev + amount;
      try {
        kv.set(STATS_STORAGE_KEY, JSON.stringify({ xp, gems: next, streak }));
      } catch { }
      return next;
    });
  };

  const setCurrentLevel = (level: string) => {
    setCurrentLevelState(level);
    persistCurrentTrack({ level });
  };

  const setCurrentCardIndex = (index: number) => {
    setCurrentCardIndexState(index);
    persistCurrentTrack({ currentCardIndex: index });
  };

  const setActiveMentor = (mentor: Mentor) => {
    setActiveMentorState(mentor);
    persistCurrentTrack({ activeMentor: mentor });
  };

  const resetProgress = () => {
    const cleanTrack = defaultTrackForLang(targetLang);
    setXpState(0);
    setGemsState(50);
    setStreakState(1);
    setCurrentLevelState(cleanTrack.level);
    setCurrentCardIndexState(0);
    setActiveMentorState(cleanTrack.activeMentor);
    persistCurrentTrack(cleanTrack);
  };

  return (
    <ProsaContext.Provider
      value={{
        xp,
        gems,
        streak,
        targetLang,
        throughLang,
        interfaceLang,
        activeMentor,
        currentLevel,
        currentCardIndex,
        courseTracks,
        isPro,
        addXp,
        setXp,
        addGems,
        setGems,
        setTargetLang,
        setThroughLang,
        setInterfaceLang,
        setActiveMentor,
        setCurrentLevel,
        setCurrentCardIndex,
        setIsPro,
        resetProgress,
      }}
    >
      {children}
    </ProsaContext.Provider>
  );
}

export function useProsa(): ProsaContextValue {
  const ctx = useContext(ProsaContext);
  if (!ctx) {
    throw new Error("useProsa must be used within a ProsaProvider");
  }
  return ctx;
}
