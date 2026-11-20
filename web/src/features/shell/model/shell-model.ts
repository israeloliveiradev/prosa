/**
 * Lógica pura do shell (sem React, sem armazenamento), testável em tests/unit/shell-model.test.ts.
 */

export type ShellLayout = "phone" | "rail" | "wide";

/** < 768: abas embaixo; 768–1023: trilho estreito; ≥ 1024: barra lateral completa. */
export function shellLayoutFor(width: number): ShellLayout {
  if (width >= 1024) {
    return "wide";
  }
  if (width >= 768) {
    return "rail";
  }
  return "phone";
}

/** Destino ativo: "/" só casa com a raiz; os outros casam com o prefixo de segmento. */
export function isActivePath(pathname: string, itemPath: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (itemPath === "/") {
    return clean === "/" || clean === "/index";
  }
  return clean === itemPath || clean.startsWith(`${itemPath}/`);
}

/**
 * Nome do idioma no idioma da interface (Intl.DisplayNames), com a inicial maiúscula
 * para caber num rótulo. Sem Intl.DisplayNames, devolve o código em maiúsculas.
 */
export function languageLabel(code: string, bcp47: string): string {
  const normalized = (code || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: typeof Intl.DisplayNames }).DisplayNames;
    if (!DisplayNames) {
      return normalized.toUpperCase();
    }
    const name = new DisplayNames([bcp47], { type: "language" }).of(normalized);
    if (!name || name.toLowerCase() === normalized) {
      return normalized.toUpperCase();
    }
    return name.charAt(0).toLocaleUpperCase(bcp47) + name.slice(1);
  } catch {
    return normalized.toUpperCase();
  }
}

export interface TrackLike {
  target_lang: string;
  through_lang: string;
  level: string;
  active: boolean;
}

/**
 * Cursos para o seletor: sem português como alvo (é só idioma de apoio), sem duplicatas,
 * o curso da sessão primeiro. Se a API não listar o curso atual, ele entra a partir da sessão.
 */
export function orderTracks<T extends TrackLike>(
  tracks: readonly T[],
  current: { target_lang: string; native_lang: string; level: string },
): TrackLike[] {
  const seen = new Set<string>();
  const list: TrackLike[] = [];
  for (const track of tracks) {
    const target = track.target_lang.toLowerCase();
    if (target === "pt" || seen.has(target)) {
      continue;
    }
    seen.add(target);
    list.push({
      target_lang: target,
      through_lang: track.through_lang.toLowerCase(),
      level: track.level,
      active: target === current.target_lang.toLowerCase(),
    });
  }
  const currentTarget = current.target_lang.toLowerCase();
  if (currentTarget && currentTarget !== "pt" && !seen.has(currentTarget)) {
    list.push({ target_lang: currentTarget, through_lang: current.native_lang.toLowerCase(), level: current.level, active: true });
  }
  return list.sort((a, b) => Number(b.active) - Number(a.active));
}

/** Inicial do avatar: nome de exibição, senão a parte local do e-mail. */
export function initialFor(displayName: string | null | undefined, email: string): string {
  const source = displayName?.trim() || email.split("@")[0] || "";
  const first = Array.from(source)[0] ?? "";
  return first.toLocaleUpperCase();
}
