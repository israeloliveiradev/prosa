import { currentAccount } from "@/api/auth";
import type { AccountUser } from "@/lib/api";
import { resetGuide } from "@/lib/guide";
import {
  getJourney,
  journeyFinished,
  markJourneyDone,
  markJourneyDoneFromAccount,
  openJourney,
  reopenFirstDay,
} from "@/lib/journey";
import { bindProgressLang, clearLocalProgress, getProgress, setPro } from "@/lib/progress";

/**
 * A conta já passou pelo primeiro dia quando o servidor guardou os temas:
 * POST /api/v1/onboarding/quiz exige pelo menos um, e uma conta nova nasce sem
 * nenhum. As respostas de login não trazem `interests`; nesse caso pergunta a
 * /auth/me.
 */
async function onboardedAccount(token: string, user: AccountUser): Promise<AccountUser | null> {
  const account = Array.isArray(user.interests) ? user : await currentAccount(token);
  return Array.isArray(account.interests) && account.interests.length > 0 ? account : null;
}

/**
 * Decide se o aluno ainda precisa da jornada do primeiro dia (/start).
 *
 * - Jornada concluída neste aparelho pelo mesmo aluno: vale.
 * - Servidor com os temas guardados (outro aparelho, cache limpo): conclui.
 * - Senão, abre (ou retoma) a jornada; se o aparelho guardava o estudo de
 *   outra conta, limpa antes.
 */
export async function syncFirstDay(token: string, user: AccountUser): Promise<void> {
  setPro(user.plan === "pro");
  bindProgressLang(user.target_lang);
  if (token === "prosa_demo_token") {
    markJourneyDone(user.id, user.level || "B2");
    return;
  }
  if (journeyFinished(user.id)) {
    return;
  }
  try {
    const account = await onboardedAccount(token, user);
    if (account) {
      markJourneyDoneFromAccount(account);
      return;
    }
  } catch {
    openJourney(user.id);
    return;
  }
  if (getJourney().userId !== user.id) {
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
}

export function firstDayHref(userId: string): "/start" | "/" {
  return journeyFinished(userId) ? "/" : "/start";
}
