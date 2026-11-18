import type { AccountUser } from "@/lib/api";
import { fetchPlacementStatus } from "@/lib/api";
import { resetGuide } from "@/lib/guide";
import { getJourney, journeyFinished, markJourneyDone, openJourney, reopenFirstDay } from "@/lib/journey";
import { bindProgressLang, clearLocalProgress, getProgress, setPro } from "@/lib/progress";

export async function syncFirstDay(token: string, user: AccountUser): Promise<void> {
  setPro(user.plan === "pro");
  bindProgressLang(user.target_lang);
  if (token === "prosa_demo_token") {
    markJourneyDone(user.id, user.level || "b2");
    return;
  }
  try {
    const status = await fetchPlacementStatus(token, user.target_lang);
    if (status.last) {
      markJourneyDone(user.id, status.last.result_level ?? user.level);
      return;
    }
    const stale = journeyFinished(user.id) || getJourney().userId !== user.id;
    if (stale) {
      const stored = getProgress();
      if (stored.lessonDate || stored.cards.length > 0 || stored.history.length > 0) {
        clearLocalProgress();
        resetGuide();
        bindProgressLang(user.target_lang);
      }
      reopenFirstDay(user.id);
      return;
    }
    openJourney(user.id);
  } catch {
    openJourney(user.id);
  }
}

export function firstDayHref(userId: string): "/start" | "/" {
  return journeyFinished(userId) ? "/" : "/start";
}
