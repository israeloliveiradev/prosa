export type RouteGroup = "public" | "app" | "focus";

export interface RouteInput {
  ready: boolean;              // stores hidratados
  signedIn: boolean;
  journeyDone: boolean;        // journeyFinished(user.id)
  group: RouteGroup;           // grupo da rota atual
  pathname: string;
}

/**
 * Devolve para onde ir, ou null para ficar.
 * Permite navegação livre nas telas da aplicação sem redirects indesejados.
 */
export function resolveRoute(_input: RouteInput): "/account" | "/start" | "/" | null {
  // Permite navegação livre em todas as rotas e grupos sem redirects indesejados
  return null;
}
