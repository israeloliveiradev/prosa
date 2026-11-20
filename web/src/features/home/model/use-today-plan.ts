import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { dailyRunKey, loadDailyRun } from "@/components/session/daily-run-store";
import { useProgress } from "@/lib/progress";
import { SESSION_PHASES, SESSION_SECONDS, listeningGap, sessionPhases, type DailyRun, type SessionPhase } from "@/lib/session-clock";
import { useSession } from "@/lib/session";
import { useToday, type TodaySnapshot } from "@/lib/today";
import { completedToday, rulerSeconds, sessionStatus, type SessionStatus } from "./home-model";

export interface TodayPlan {
  snapshot: TodaySnapshot;
  status: SessionStatus;
  phases: SessionPhase[];
  /** Etapas concluídas hoje, na ordem da sessão. */
  completed: string[];
  totalPhases: number;
  /** Posição da régua (segundos), a partir das etapas concluídas. */
  rulerAt: number;
  minutes: number;
}

/**
 * Plano real de hoje: o resumo do curso ativo (useToday), o progresso salvo da sessão
 * (relido a cada vez que a tela ganha foco) e as fases que o relógio monta para as revisões de hoje.
 */
export function useTodayPlan(): TodayPlan {
  const session = useSession();
  const snapshot = useToday();
  const progress = useProgress();
  const [run, setRun] = useState<DailyRun | null>(null);

  const userId = session?.user.id;
  const target = session?.user.target_lang;

  useFocusEffect(
    useCallback(() => {
      setRun(userId && target ? loadDailyRun(dailyRunKey(userId, target)) : null);
    }, [userId, target]),
  );

  return useMemo(() => {
    const phases = sessionPhases({ dueCount: snapshot.dueCount, listeningGap: listeningGap(progress.skills) });
    const status = sessionStatus({
      today: snapshot.today,
      sessionDoneToday: snapshot.sessionDoneToday,
      run,
      lessonDate: progress.lessonDate,
    });
    const completed = completedToday(run, snapshot.today);
    return {
      snapshot,
      status,
      phases,
      completed,
      totalPhases: SESSION_PHASES.length,
      rulerAt: rulerSeconds(phases, completed, status),
      minutes: Math.round(SESSION_SECONDS / 60),
    };
  }, [snapshot, progress.skills, progress.lessonDate, run]);
}
