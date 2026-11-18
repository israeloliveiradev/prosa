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

export interface ProsaContextValue {
  xp: number;
  gems: number;
  streak: number;
  targetLang: string;
  throughLang: string;
  interfaceLang: string;
  activeMentor: Mentor;
  isPro: boolean;
  addXp: (amount: number) => void;
  setXp: (xp: number) => void;
  addGems: (amount: number) => void;
  setGems: (gems: number) => void;
  setTargetLang: (lang: string) => void;
  setThroughLang: (lang: string) => void;
  setInterfaceLang: (lang: string) => void;
  setActiveMentor: (mentor: Mentor) => void;
  setIsPro: (pro: boolean) => void;
  resetProgress: () => void;
}

const DEFAULT_MENTOR: Mentor = {
  id: "einstein",
  name: "Albert Einstein",
  title: "Mentor Polímata",
  avatar: "/cast/einstein.png",
  level: 1,
  quote: "“Pronto para o ritual de hoje? O tempo é relativo, mas 20 minutos dobram suas sinapses!”",
};

const STATS_STORAGE_KEY = "prosa.user_stats.v2";

const ProsaContext = createContext<ProsaContextValue | null>(null);

export function ProsaProvider({ children }: { children: ReactNode }) {
  const [xp, setXpState] = useState<number>(() => {
    try {
      const saved = kv.getString(STATS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.xp === "number") return parsed.xp;
      }
    } catch { }
    return 0;
  });

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

  const [streak, setStreakState] = useState<number>(() => {
    try {
      const saved = kv.getString(STATS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.streak === "number") return parsed.streak;
      }
    } catch { }
    return 1;
  });

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

  const setTargetLang = (lang: string) => {
    setTargetLangState(lang);
    try {
      kv.set("prosa.target_lang.v1", lang);
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("prosa_target_lang", lang);
      }
    } catch { }
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
  const [interfaceLang, setInterfaceLang] = useState("pt-BR");
  const [activeMentor, setActiveMentor] = useState<Mentor>(DEFAULT_MENTOR);
  const [isPro, setIsPro] = useState(false);

  // Persist stats changes
  const persistStats = (newXp: number, newGems: number, newStreak: number) => {
    try {
      kv.set(STATS_STORAGE_KEY, JSON.stringify({ xp: newXp, gems: newGems, streak: newStreak }));
    } catch { }
  };

  const setXp = (val: number) => {
    setXpState(val);
    persistStats(val, gems, streak);
  };

  const addXp = (amount: number) => {
    setXpState((prev) => {
      const next = prev + amount;
      persistStats(next, gems, streak);
      return next;
    });
  };

  const setGems = (val: number) => {
    setGemsState(val);
    persistStats(xp, val, streak);
  };

  const addGems = (amount: number) => {
    setGemsState((prev) => {
      const next = prev + amount;
      persistStats(xp, next, streak);
      return next;
    });
  };

  const resetProgress = () => {
    setXpState(0);
    setGemsState(50);
    setStreakState(1);
    persistStats(0, 50, 1);
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
        isPro,
        addXp,
        setXp,
        addGems,
        setGems,
        setTargetLang,
        setThroughLang,
        setInterfaceLang,
        setActiveMentor,
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
