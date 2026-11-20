import { ApiError } from "@/api/errors";
import { PATH_BAND_VALUES, UNIT_ID_PATTERN, type PathBand, type PathResponse, type PathUnit, type UnitStatus } from "@/api/schemas/path";

/**
 * Regras puras da Trilha, de Hoje e da sessão por unidade (testadas em tests/unit/path-model.test.ts).
 * Nada aqui inventa progresso: tudo sai do que GET /path devolveu.
 */

export type TestState = "passed" | "available" | "locked";

export interface UnitView {
  unit: PathUnit;
  status: UnitStatus;
  /** Unidades bloqueadas não abrem nada; as outras abrem/fecham os detalhes. */
  clickable: boolean;
  /** Começa aberta (só a unidade em curso). */
  expanded: boolean;
  /** Para bloqueadas: a unidade que precisa ser dominada antes. */
  lockedBy: { id: string; title: string } | null;
  /** "Estudar esta unidade" (só a unidade em curso). */
  canStudy: boolean;
  /** "Fazer o teste" (só a unidade em curso com o teste liberado pelo servidor). */
  canTest: boolean;
  testState: TestState;
  /** Fração das palavras-núcleo já sabidas (0–1) e a marca do mínimo exigido (0–1). */
  lemmaShare: number;
  lemmaTarget: number;
}

export type BandKind = "validated" | "current" | "done" | "future" | "open";

export type CheckpointState = "available" | "passed" | "locked";

export interface BandView {
  band: PathBand;
  kind: BandKind;
  units: UnitView[];
  /** Unidades dominadas ou validadas. */
  doneCount: number;
  total: number;
  defaultOpen: boolean;
  /** Banda toda bloqueada: a unidade a dominar antes da primeira dela. */
  lockedBy: { id: string; title: string } | null;
  checkpoint: CheckpointState | null;
}

export interface PathView {
  bands: BandView[];
  current: UnitView | null;
  doneCount: number;
  total: number;
}

function ratio(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0 || part <= 0) {
    return 0;
  }
  return Math.min(1, part / whole);
}

export function testState(unit: Pick<PathUnit, "mastery">): TestState {
  if (unit.mastery.test.met) {
    return "passed";
  }
  return unit.mastery.test.available ? "available" : "locked";
}

export function isDone(status: UnitStatus): boolean {
  return status === "mastered" || status === "validated";
}

/** Ordena pela posição global e monta o que cada unidade mostra e permite. */
export function unitViews(units: readonly PathUnit[]): UnitView[] {
  const sorted = [...units].sort((a, b) => a.order - b.order);
  return sorted.map((unit, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    const locked = unit.status === "locked";
    const active = unit.status === "active";
    const state = testState(unit);
    return {
      unit,
      status: unit.status,
      clickable: !locked,
      expanded: active,
      lockedBy: locked && previous ? { id: previous.id, title: previous.title } : null,
      canStudy: active,
      canTest: active && unit.mastery.test.available,
      testState: state,
      lemmaShare: ratio(unit.mastery.lemmas.known, unit.mastery.lemmas.total),
      lemmaTarget: ratio(unit.mastery.lemmas.required, unit.mastery.lemmas.total),
    };
  });
}

function bandKind(units: readonly UnitView[]): BandKind {
  if (units.length > 0 && units.every((view) => view.status === "validated")) {
    return "validated";
  }
  if (units.some((view) => view.status === "active")) {
    return "current";
  }
  if (units.length > 0 && units.every((view) => isDone(view.status))) {
    return "done";
  }
  if (units.length > 0 && units.every((view) => view.status === "locked")) {
    return "future";
  }
  return "open";
}

function checkpointState(path: Pick<PathResponse, "checkpoint">, band: PathBand, kind: BandKind): CheckpointState | null {
  const checkpoint = path.checkpoint;
  if (!checkpoint || checkpoint.band !== band || kind === "validated") {
    return null;
  }
  if (checkpoint.passed) {
    return "passed";
  }
  return checkpoint.available ? "available" : "locked";
}

/** A trilha agrupada por banda, na ordem A1 → C1, com a unidade em curso destacada. */
export function buildPathView(path: Pick<PathResponse, "units" | "checkpoint" | "current_unit_id">): PathView {
  const views = unitViews(path.units);
  const bands: BandView[] = [];
  for (const band of PATH_BAND_VALUES) {
    const units = views.filter((view) => view.unit.band === band);
    if (units.length === 0) {
      continue;
    }
    const kind = bandKind(units);
    const first = units[0];
    bands.push({
      band,
      kind,
      units,
      doneCount: units.filter((view) => isDone(view.status)).length,
      total: units.length,
      defaultOpen: kind === "current" || kind === "open",
      lockedBy: kind === "future" ? first.lockedBy : null,
      checkpoint: checkpointState(path, band, kind),
    });
  }
  const current =
    views.find((view) => view.unit.id === path.current_unit_id) ?? views.find((view) => view.status === "active") ?? null;
  return {
    bands,
    current,
    doneCount: views.filter((view) => isDone(view.status)).length,
    total: views.length,
  };
}

/** Resumo curto da unidade para o cartão de Hoje. */
export interface UnitSummary {
  lessons: { done: number; required: number; met: boolean };
  lemmas: { known: number; total: number; met: boolean };
  journal: boolean;
  test: TestState;
  best: number | null;
}

export function unitSummary(unit: Pick<PathUnit, "mastery">): UnitSummary {
  const { lessons, lemmas, journal, test } = unit.mastery;
  return {
    lessons: { done: lessons.done, required: lessons.required, met: lessons.met },
    lemmas: { known: lemmas.known, total: lemmas.total, met: lemmas.met },
    journal: journal.met,
    test: testState(unit),
    best: test.best,
  };
}

export function isUnitId(value: unknown): value is string {
  return typeof value === "string" && UNIT_ID_PATTERN.test(value.trim());
}

/**
 * Unidade da sessão diária: a do link (?unit=) quando válida; senão a unidade em curso
 * da trilha (assim toda sessão avança a trilha); null sem trilha (offline, erro).
 */
export function resolveSessionUnit(param: unknown, path: Pick<PathResponse, "current_unit_id"> | null | undefined): string | null {
  if (isUnitId(param)) {
    return param.trim();
  }
  const current = path?.current_unit_id ?? null;
  return isUnitId(current) ? current : null;
}

/** Rota da sessão diária com a unidade (ou sem, se ainda não se sabe qual é). */
export function dailyHref(unitId: string | null | undefined): string {
  return isUnitId(unitId) ? `/daily?unit=${encodeURIComponent(unitId)}` : "/daily";
}

export function findUnit(path: Pick<PathResponse, "units"> | null | undefined, id: string | null | undefined): PathUnit | null {
  if (!path || !id) {
    return null;
  }
  return path.units.find((unit) => unit.id === id) ?? null;
}

/** Posição da unidade dentro da banda (1..8), para "Unidade 3". */
export function unitIndexInBand(path: Pick<PathResponse, "units">, unit: Pick<PathUnit, "id" | "band" | "order">): number {
  const ordered = path.units.filter((item) => item.band === unit.band).sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((item) => item.id === unit.id);
  return index >= 0 ? index + 1 : unit.order;
}

export type PathErrorKind = "not-available" | "not-ready" | "expired" | "offline" | "slow" | "session" | "unknown";

/**
 * Erro de teste/checkpoint em categoria que a tela sabe explicar com honestidade.
 * Ao começar, 409 é "ainda não abriu" (unidade não ativa ou critérios 1–3 faltando).
 * Ao terminar, 409/404/410 é tentativa vencida ou já fechada: precisa começar de novo.
 * 503 é "perguntas ainda não prontas" (o servidor não conseguiu montar os itens).
 */
export function pathErrorKind(error: unknown, phase: "start" | "finish" = "finish"): PathErrorKind {
  if (error instanceof ApiError) {
    if (error.kind === "network") {
      return "offline";
    }
    if (error.kind === "timeout") {
      return "slow";
    }
    if (error.kind === "auth" || error.status === 401) {
      return "session";
    }
    if (phase === "finish" && (error.status === 409 || error.status === 404 || error.status === 410)) {
      return "expired";
    }
    if (error.status === 409) {
      return "not-available";
    }
    if (error.status === 503) {
      return "not-ready";
    }
  }
  return "unknown";
}
