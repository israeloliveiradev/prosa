import { useEffect, useMemo, useState } from "react";
import { isDue, isNewCard } from "@/lib/fsrs";
import { isoDate, streakSummary, studySecondsOn, useProgress, type ProgressState } from "@/lib/progress";
import { getXpState, useXp } from "@/lib/xp";
import { todayXp, type XpState } from "@/lib/xp-rules";

/**
 * Resumo do dia para a tela Hoje, todo derivado do estado real do curso ativo
 * (progresso local por idioma + XP do mesmo curso). Nenhum número é inventado:
 * sem dado, o valor é 0, `false` ou ausente.
 */
export interface TodaySnapshot {
  /** Data de hoje (YYYY-MM-DD, calendário local). */
  today: string;
  /** Cartões FSRS vencidos agora. */
  dueCount: number;
  /** Cartões guardados que nunca foram revisados. */
  newCount: number;
  /** Total de cartões do curso. */
  cardCount: number;
  /** A sessão de hoje foi concluída (conta para a ofensiva). */
  sessionDoneToday: boolean;
  /** Minutos de estudo registrados hoje (arredondados para baixo). */
  minutesToday: number;
  /** Ofensiva atual em dias. */
  streak: number;
  /** Melhor ofensiva deste curso. */
  bestStreak: number;
  /** Últimos 7 dias, do mais antigo (índice 0) para hoje (índice 6): houve sessão completa. */
  week: boolean[];
  /** As datas de `week`, na mesma ordem (para rotular com Intl). */
  weekDays: string[];
  /** XP ganho hoje neste curso. */
  xpToday: number;
  /** Meta diária de XP. */
  xpGoal: number;
  /** Revisões que ainda não subiram para o servidor. */
  pendingSync: number;
  /** Título e data da lição mais recente gerada neste curso. */
  lastLessonTitle?: string;
  lastLessonDate?: string;
  /** Último dia com sessão completa. */
  lastSessionDate?: string;
}

function latestLesson(progress: ProgressState): { title: string; date: string } | null {
  let latest: { title: string; date: string } | null = null;
  for (const item of progress.history) {
    if (!latest || item.date > latest.date) {
      latest = { title: item.lesson.title || item.title, date: item.date };
    }
  }
  if (progress.cachedLesson && progress.lessonDate && (!latest || progress.lessonDate > latest.date)) {
    latest = { title: progress.cachedLesson.title, date: progress.lessonDate };
  }
  return latest;
}

/** Função pura por trás de `useToday` (testável com datas fixas). */
export function computeToday(progress: ProgressState, xp: XpState, now: Date = new Date()): TodaySnapshot {
  const today = isoDate(now);
  const at = now.getTime();
  const streak = streakSummary(progress.sessionDays, today, progress.bestStreak);
  const lesson = latestLesson(progress);
  const snapshot: TodaySnapshot = {
    today,
    dueCount: progress.cards.filter((card) => isDue(card, at)).length,
    newCount: progress.cards.filter((card) => isNewCard(card)).length,
    cardCount: progress.cards.length,
    sessionDoneToday: streak.doneToday,
    minutesToday: Math.floor(studySecondsOn(progress.studyLog, today) / 60),
    streak: streak.current,
    bestStreak: streak.best,
    week: streak.week,
    weekDays: streak.weekDays,
    xpToday: todayXp(xp, today),
    xpGoal: xp.goal,
    pendingSync: progress.pendingReviews.length,
  };
  if (lesson) {
    snapshot.lastLessonTitle = lesson.title;
    snapshot.lastLessonDate = lesson.date;
  }
  if (streak.lastDay) {
    snapshot.lastSessionDate = streak.lastDay;
  }
  return snapshot;
}

/** Relógio que avança a cada minuto, para vencimentos e a virada do dia aparecerem sozinhos. */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Resumo do dia do curso ativo; recalcula quando o progresso, o XP ou o minuto mudam. */
export function useToday(): TodaySnapshot {
  const progress = useProgress();
  const xp = useXp().state;
  const minute = useMinuteClock();
  return useMemo(() => computeToday(progress, xp, new Date(Math.max(minute, Date.now()))), [progress, xp, minute]);
}

/** Leitura sem React (para código fora de componentes). */
export function readToday(progress: ProgressState, now: Date = new Date()): TodaySnapshot {
  return computeToday(progress, getXpState(), now);
}
