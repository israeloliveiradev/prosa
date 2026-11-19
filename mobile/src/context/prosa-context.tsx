import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { kv } from "@/lib/kv";

export interface Mentor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  level: number;
  quote: string;
  affinity?: number;
  bonus?: string;
  field?: string;
}

export interface FSRSCardProgress {
  id: string | number;
  difficulty: number;
  stability: number;
  interval: number;
  reps: number;
  lastReviewed?: string;
  retention: number;
}

export interface CourseData {
  started: boolean;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  xp: number;
  completedNodeIds: string[];
  activeNodeId: string;
  fsrsCards: FSRSCardProgress[];
  prosaScore: number;
  pronunciationScores: number[];
  sessionsCount: number;
  currentCardIndex: number;
}

export interface ProsaContextValue {
  // Global User State
  userName: string;
  setUserName: (name: string) => void;
  gems: number;
  streak: number;
  bestStreak: number;
  isPro: boolean;
  activeMentor: Mentor;
  totalXp: number;

  // Language Matrix State
  targetLang: string;
  supportLang: string;
  throughLang: string; // backwards compatibility alias
  uiLang: string;
  interfaceLang: string; // backwards compatibility alias

  // Isolated Course State
  courses: Record<string, CourseData>;
  activeCourse: CourseData;
  currentLevel: string;
  currentCardIndex: number;
  xp: number; // active course xp

  // Actions
  setTargetLang: (lang: string) => void;
  setSupportLang: (lang: string) => void;
  setThroughLang: (lang: string) => void;
  setUiLang: (lang: string) => void;
  setInterfaceLang: (lang: string) => void;
  setActiveMentor: (mentor: Mentor) => void;
  setIsPro: (pro: boolean) => void;
  addXp: (amount: number) => void;
  setXp: (amount: number) => void;
  addGems: (amount: number) => void;
  setGems: (amount: number) => void;

  startCourseFromScratch: (lang: string) => void;
  startCourseWithPlacement: (lang: string, level: "A1" | "A2" | "B1" | "B2" | "C1") => void;
  completeTrailNode: (nodeId: string, earnedXp: number) => void;
  rateFSRSCard: (cardId: string | number, rating: "again" | "hard" | "good" | "easy") => void;
  recordPhoneticScore: (score: number) => void;
  resetCourse: (lang: string) => void;
  syncSupportWithUi: () => void;
  resetProgress: () => void;
}

export const DEFAULT_MENTORS_BY_LANG: Record<string, Mentor> = {
  en: {
    id: "feynman",
    name: "Richard Feynman",
    title: "Física & Simplificação Intuitiva",
    avatar: "/cast/feynman.png",
    level: 7,
    affinity: 98,
    bonus: "+25% Combos no Duelo",
    field: "Física Quântica",
    quote: "“Aprender inglês é descomplicar a física da fala. Menos decoreba, mais conexões reais.”",
  },
  de: {
    id: "einstein",
    name: "Albert Einstein",
    title: "Física Teórica & Causalidade",
    avatar: "/cast/einstein.png",
    level: 7,
    affinity: 98,
    bonus: "+20% Velocidade em Diálogo",
    field: "Física Teórica",
    quote: "“A língua alemã é como a relatividade: complexa à primeira vista, mas com lógica pura e perfeita.”",
  },
  fr: {
    id: "curie",
    name: "Marie Curie",
    title: "Mnemônica Molecular & Fonética",
    avatar: "/cast/curie.png",
    level: 8,
    affinity: 96,
    bonus: "+18% Retenção FSRS",
    field: "Física & Química",
    quote: "“Na vida e na língua francesa, nada deve ser temido, apenas compreendido.”",
  },
  es: {
    id: "cicero",
    name: "Marco Túlio Cícero",
    title: "Oratória & Eloquência Clássica",
    avatar: "/cast/cicero.png",
    level: 7,
    affinity: 95,
    bonus: "+15% Cadência Vocálica",
    field: "Retórica Clássica",
    quote: "“A clareza do espanhol reside no vigor do ritmo articulatório.”",
  },
  it: {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Sintaxe & Anatomia Estrutural",
    avatar: "/cast/davinci.png",
    level: 9,
    affinity: 97,
    bonus: "+15% Precisão Nebensatz",
    field: "Polímata Universal",
    quote: "“A simplicidade é o grau máximo de sofisticação da sintaxe italiana.”",
  },
  ja: {
    id: "confucius",
    name: "Confúcio",
    title: "Sabedoria & Filosofia Linguística",
    avatar: "/cast/confucius.png",
    level: 10,
    affinity: 99,
    bonus: "+20% Retenção de Kanji",
    field: "Filosofia Oriental",
    quote: "“Uma jornada de mil milhas no japonês começa com uma única palavra bem pronunciada.”",
  },
};

const DEFAULT_COURSES: Record<string, CourseData> = {
  en: {
    started: true,
    level: "B1",
    xp: 240,
    completedNodeIds: ["en-node-1"],
    activeNodeId: "en-node-2",
    fsrsCards: [
      { id: "en-card-1", difficulty: 0.3, stability: 2.5, interval: 3, reps: 2, retention: 92 },
      { id: "en-card-2", difficulty: 0.4, stability: 1.8, interval: 1, reps: 1, retention: 88 },
    ],
    prosaScore: 780,
    pronunciationScores: [94, 96, 92],
    sessionsCount: 14,
    currentCardIndex: 0,
  },
  de: {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: "de-node-1",
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  },
  fr: {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: "fr-node-1",
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  },
  ja: {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: "ja-node-1",
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  },
  es: {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: "es-node-1",
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  },
  it: {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: "it-node-1",
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  },
};

const COURSES_STORAGE_KEY = "prosa.courses_matrix.v4";
const USER_STORAGE_KEY = "prosa.user_global.v4";

const ProsaContext = createContext<ProsaContextValue | null>(null);

export function ProsaProvider({ children }: { children: ReactNode }) {
  // 1. Global User Info
  const [userName, setUserNameState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_user_name");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.user_name.v1");
      if (explicit) return explicit;
    } catch { }
    return "Aprendiz Polímata";
  });

  const [gems, setGemsState] = useState<number>(() => {
    try {
      const saved = kv.getString(USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.gems === "number") return parsed.gems;
      }
    } catch { }
    return 50;
  });

  const [streak, setStreakState] = useState<number>(() => {
    try {
      const saved = kv.getString(USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.streak === "number") return parsed.streak;
      }
    } catch { }
    return 1;
  });

  const [bestStreak, setBestStreakState] = useState<number>(14);
  const [isPro, setIsPro] = useState(false);

  // 2. Language Matrix
  const [targetLang, setTargetLangState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_target_lang");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.target_lang.v1");
      if (explicit) return explicit;
    } catch { }
    return "en";
  });

  const [supportLang, setSupportLangState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_support_lang");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.support_lang.v1");
      if (explicit) return explicit;
    } catch { }
    return "pt-BR";
  });

  const [uiLang, setUiLangState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_ui_lang");
        if (local) return local;
      }
      const explicit = kv.getString("prosa.ui_lang.v1");
      if (explicit) return explicit;
    } catch { }
    return "pt-BR";
  });

  // 3. Isolated Courses by Language
  const [courses, setCourses] = useState<Record<string, CourseData>>(() => {
    try {
      const saved = kv.getString(COURSES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_COURSES, ...parsed };
        }
      }
    } catch { }
    return DEFAULT_COURSES;
  });

  // User Selected Mentors per targetLang
  const [selectedMentors, setSelectedMentors] = useState<Record<string, Mentor>>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage?.getItem("prosa_selected_mentors");
        if (local) return JSON.parse(local);
      }
      const kvVal = kv.getString("prosa.selected_mentors.v1");
      if (kvVal) return JSON.parse(kvVal);
    } catch { }
    return {};
  });

  const activeMentor: Mentor =
    selectedMentors[targetLang] ||
    DEFAULT_MENTORS_BY_LANG[targetLang] ||
    DEFAULT_MENTORS_BY_LANG.en;

  const setActiveMentor = (mentor: Mentor) => {
    setSelectedMentors((prev) => {
      const next = { ...prev, [targetLang]: mentor };
      try {
        if (typeof window !== "undefined") {
          window.localStorage?.setItem("prosa_selected_mentors", JSON.stringify(next));
        }
        kv.set("prosa.selected_mentors.v1", JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const activeCourse = courses[targetLang] || {
    started: false,
    level: "A1",
    xp: 0,
    completedNodeIds: [],
    activeNodeId: `${targetLang}-node-1`,
    fsrsCards: [],
    prosaScore: 0,
    pronunciationScores: [],
    sessionsCount: 0,
    currentCardIndex: 0,
  };

  // Total XP across all started courses
  const totalXp = Object.values(courses).reduce((acc, c) => acc + (c.started ? c.xp : 0), 0);

  // Persistence helpers
  const persistUserGlobal = (updated: { gems?: number; streak?: number; bestStreak?: number }) => {
    try {
      const next = { gems: updated.gems ?? gems, streak: updated.streak ?? streak, bestStreak: updated.bestStreak ?? bestStreak };
      kv.set(USER_STORAGE_KEY, JSON.stringify(next));
    } catch { }
  };

  const persistCourses = (updated: Record<string, CourseData>) => {
    try {
      kv.set(COURSES_STORAGE_KEY, JSON.stringify(updated));
    } catch { }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    try {
      kv.set("prosa.user_name.v1", name);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_user_name", name);
      }
    } catch { }
  };

  const setTargetLang = (lang: string) => {
    setTargetLangState(lang);
    try {
      kv.set("prosa.target_lang.v1", lang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_target_lang", lang);
      }
    } catch { }
  };

  const setSupportLang = (lang: string) => {
    setSupportLangState(lang);
    try {
      kv.set("prosa.support_lang.v1", lang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_support_lang", lang);
      }
    } catch { }
  };

  const setUiLang = (lang: string) => {
    setUiLangState(lang);
    try {
      kv.set("prosa.ui_lang.v1", lang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_ui_lang", lang);
      }
    } catch { }
  };

  const syncSupportWithUi = () => {
    setSupportLang(uiLang);
  };

  const addGems = (amount: number) => {
    setGemsState((prev) => {
      const next = prev + amount;
      persistUserGlobal({ gems: next });
      return next;
    });
  };

  const setGems = (val: number) => {
    setGemsState(val);
    persistUserGlobal({ gems: val });
  };

  const startCourseFromScratch = (lang: string) => {
    setCourses((prev) => {
      const updatedCourse: CourseData = {
        started: true,
        level: "A1",
        xp: 0,
        completedNodeIds: [],
        activeNodeId: `${lang}-node-1`,
        fsrsCards: [],
        prosaScore: 100,
        pronunciationScores: [],
        sessionsCount: 0,
        currentCardIndex: 0,
      };
      const next = { ...prev, [lang]: updatedCourse };
      persistCourses(next);
      return next;
    });
    setTargetLang(lang);
  };

  const startCourseWithPlacement = (lang: string, level: "A1" | "A2" | "B1" | "B2" | "C1") => {
    const levelXpMap = { A1: 50, A2: 120, B1: 240, B2: 450, C1: 750 };
    const levelScoreMap = { A1: 250, A2: 480, B1: 780, B2: 890, C1: 960 };
    const unlockedMap = {
      A1: [],
      A2: [`${lang}-node-1`],
      B1: [`${lang}-node-1`, `${lang}-node-2`],
      B2: [`${lang}-node-1`, `${lang}-node-2`, `${lang}-node-3`],
      C1: [`${lang}-node-1`, `${lang}-node-2`, `${lang}-node-3`, `${lang}-node-4`],
    };

    setCourses((prev) => {
      const updatedCourse: CourseData = {
        started: true,
        level,
        xp: levelXpMap[level] || 50,
        completedNodeIds: unlockedMap[level] || [],
        activeNodeId: `${lang}-node-${(unlockedMap[level]?.length || 0) + 1}`,
        fsrsCards: [],
        prosaScore: levelScoreMap[level] || 500,
        pronunciationScores: [92, 95],
        sessionsCount: 3,
        currentCardIndex: 0,
      };
      const next = { ...prev, [lang]: updatedCourse };
      persistCourses(next);
      return next;
    });
    setTargetLang(lang);
  };

  const addXp = (amount: number) => {
    setCourses((prev) => {
      const curr = prev[targetLang] || activeCourse;
      const updatedCourse: CourseData = {
        ...curr,
        started: true,
        xp: curr.xp + amount,
      };
      const next = { ...prev, [targetLang]: updatedCourse };
      persistCourses(next);
      return next;
    });
  };

  const setXp = (amount: number) => {
    setCourses((prev) => {
      const curr = prev[targetLang] || activeCourse;
      const updatedCourse: CourseData = { ...curr, xp: amount };
      const next = { ...prev, [targetLang]: updatedCourse };
      persistCourses(next);
      return next;
    });
  };

  const completeTrailNode = (nodeId: string, earnedXp: number) => {
    setCourses((prev) => {
      const curr = prev[targetLang] || activeCourse;
      const completed = Array.from(new Set([...curr.completedNodeIds, nodeId]));
      const updatedCourse: CourseData = {
        ...curr,
        started: true,
        completedNodeIds: completed,
        xp: curr.xp + earnedXp,
      };
      const next = { ...prev, [targetLang]: updatedCourse };
      persistCourses(next);
      return next;
    });
    addGems(5);
  };

  const rateFSRSCard = (cardId: string | number, rating: "again" | "hard" | "good" | "easy") => {
    const xpBonus = { again: 10, hard: 15, good: 30, easy: 50 }[rating];
    addXp(xpBonus);
    addGems(1);

    setCourses((prev) => {
      const curr = prev[targetLang] || activeCourse;
      const existingCards = [...curr.fsrsCards];
      const cardIdx = existingCards.findIndex((c) => String(c.id) === String(cardId));

      let card: FSRSCardProgress;
      if (cardIdx >= 0) {
        const c = existingCards[cardIdx];
        const mult = { again: 0.8, hard: 1.1, good: 1.3, easy: 1.6 }[rating];
        const nextInt = rating === "again" ? 1 : Math.max(1, Math.round(c.interval * mult));
        card = {
          ...c,
          stability: Number((c.stability * mult).toFixed(2)),
          interval: nextInt,
          reps: rating === "again" ? 0 : c.reps + 1,
          retention: Math.min(99, Math.round(c.retention + (rating === "good" || rating === "easy" ? 2 : -5))),
          lastReviewed: new Date().toISOString(),
        };
        existingCards[cardIdx] = card;
      } else {
        card = {
          id: cardId,
          difficulty: rating === "again" ? 0.7 : 0.3,
          stability: rating === "again" ? 0.8 : 2.0,
          interval: rating === "again" ? 1 : 3,
          reps: rating === "again" ? 0 : 1,
          retention: rating === "again" ? 75 : 90,
          lastReviewed: new Date().toISOString(),
        };
        existingCards.push(card);
      }

      const nextCards = {
        ...curr,
        fsrsCards: existingCards,
        currentCardIndex: curr.currentCardIndex + 1,
      };
      const next = { ...prev, [targetLang]: nextCards };
      persistCourses(next);
      return next;
    });
  };

  const recordPhoneticScore = (score: number) => {
    setCourses((prev) => {
      const curr = prev[targetLang] || activeCourse;
      const scores = [...curr.pronunciationScores, score];
      const updated: CourseData = {
        ...curr,
        pronunciationScores: scores,
        sessionsCount: curr.sessionsCount + 1,
      };
      const next = { ...prev, [targetLang]: updated };
      persistCourses(next);
      return next;
    });
  };

  const resetCourse = (lang: string) => {
    setCourses((prev) => {
      const cleanCourse: CourseData = {
        started: false,
        level: "A1",
        xp: 0,
        completedNodeIds: [],
        activeNodeId: `${lang}-node-1`,
        fsrsCards: [],
        prosaScore: 0,
        pronunciationScores: [],
        sessionsCount: 0,
        currentCardIndex: 0,
      };
      const next = { ...prev, [lang]: cleanCourse };
      persistCourses(next);
      return next;
    });
  };

  const resetProgress = () => {
    resetCourse(targetLang);
  };

  return (
    <ProsaContext.Provider
      value={{
        userName,
        setUserName,
        gems,
        streak,
        bestStreak,
        isPro,
        activeMentor,
        totalXp,
        targetLang,
        supportLang,
        throughLang: supportLang,
        uiLang,
        interfaceLang: uiLang,
        courses,
        activeCourse,
        currentLevel: activeCourse.level,
        currentCardIndex: activeCourse.currentCardIndex,
        xp: activeCourse.xp,
        setTargetLang,
        setSupportLang,
        setThroughLang: setSupportLang,
        setUiLang,
        setInterfaceLang: setUiLang,
        setActiveMentor,
        setIsPro,
        addXp,
        setXp,
        addGems,
        setGems,
        startCourseFromScratch,
        startCourseWithPlacement,
        completeTrailNode,
        rateFSRSCard,
        recordPhoneticScore,
        resetCourse,
        syncSupportWithUi,
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
