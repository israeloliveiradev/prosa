export type RouteGroup = "public" | "app" | "focus";

export interface RouteInput {
  ready: boolean;              // stores hidratados
  signedIn: boolean;
  journeyDone: boolean;        // journeyFinished(user.id)
  group: RouteGroup;           // grupo da rota atual
  pathname: string;
}

const ACCOUNT_PATH = "/account";

/**
 * Devolve para onde ir, ou null para ficar (Tabela 9.2 do plano de refatoração).
 *
 * - Sem sessão: só o grupo público é acessível; o resto vai para /account.
 * - Com sessão e sem a jornada do primeiro dia: o grupo app manda para /start;
 *   o grupo focus (start, placement, daily) fica livre para completar a jornada.
 * - Com sessão: /account devolve para / (ou /start se a jornada não terminou).
 */
export function resolveRoute(input: RouteInput): "/account" | "/start" | "/" | null {
  if (!input.ready) {
    return null;
  }

  if (!input.signedIn) {
    return input.group === "public" ? null : ACCOUNT_PATH;
  }

  if (input.group === "public") {
    if (input.pathname === ACCOUNT_PATH) {
      return input.journeyDone ? "/" : "/start";
    }
    return null;
  }

  if (!input.journeyDone && input.group === "app") {
    return "/start";
  }

  return null;
}
