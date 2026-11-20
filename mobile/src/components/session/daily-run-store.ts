import { kv } from "@/lib/kv";
import { parseDailyRun, type DailyRun } from "@/lib/session-clock";

const PREFIX = "prosa.daily-run.v1";

/** Uma sessão salva por aluno e idioma; sobrevive ao F5. */
export function dailyRunKey(userId: string, targetLang: string): string {
  return `${PREFIX}:${userId}:${targetLang}`;
}

export function loadDailyRun(key: string): DailyRun | null {
  try {
    return parseDailyRun(kv.getString(key));
  } catch {
    return null;
  }
}

export function saveDailyRun(key: string, run: DailyRun): void {
  try {
    kv.set(key, JSON.stringify(run));
  } catch {
    // Armazenamento indisponível (aba privada): a sessão segue só em memória.
  }
}
