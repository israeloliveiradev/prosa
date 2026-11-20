import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import {
  applyAward,
  createEmptyXpState,
  localIsoDate,
  sanitizeGoal,
  sanitizeXpState,
  todayXp,
  totalXp,
  weekDots,
  xpLog,
  type XpDay,
  type XpGoal,
  type XpReason,
  type XpState,
} from "@/lib/xp-rules";

/**
 * O único sistema de XP do app. Cada curso (idioma-alvo) tem o seu próprio registro,
 * acompanhando a faixa ativa de `@/lib/progress` (que chama `bindXpLang`).
 * A meta diária é do aluno, igual em todos os cursos.
 */
const STORAGE_KEY = "prosa.xp.v1";
const PENDING = "pending";

type XpLane = Pick<XpState, "log" | "awarded">;

interface XpBag {
  version: 2;
  goal: XpGoal;
  activeLang: string;
  lanes: Record<string, XpLane>;
}

const listeners = new Set<() => void>();

function emptyLane(): XpLane {
  return { log: {}, awarded: {} };
}

function emptyBag(goal: XpGoal = createEmptyXpState().goal): XpBag {
  return { version: 2, goal, activeLang: PENDING, lanes: { [PENDING]: emptyLane() } };
}

function laneOf(value: unknown): XpLane {
  const parsed = sanitizeXpState(value);
  return { log: parsed.log, awarded: parsed.awarded };
}

function parseBag(raw: string | undefined): XpBag {
  if (!raw) {
    return emptyBag();
  }
  try {
    const value = JSON.parse(raw) as Partial<XpBag> & Partial<XpState>;
    if (value && value.version === 2 && value.lanes && typeof value.lanes === "object") {
      const lanes: Record<string, XpLane> = {};
      for (const [lang, lane] of Object.entries(value.lanes)) {
        lanes[lang] = laneOf(lane);
      }
      const activeLang = typeof value.activeLang === "string" && value.activeLang ? value.activeLang : PENDING;
      if (!lanes[activeLang]) {
        lanes[activeLang] = emptyLane();
      }
      return { version: 2, goal: sanitizeGoal(value.goal), activeLang, lanes };
    }
    // v1: um único registro global; vai para a faixa pendente e é adotado pelo primeiro curso vinculado.
    return { version: 2, goal: sanitizeGoal(value.goal), activeLang: PENDING, lanes: { [PENDING]: laneOf(value) } };
  } catch {
    return emptyBag();
  }
}

function compose(next: XpBag): XpState {
  const lane = next.lanes[next.activeLang] ?? emptyLane();
  return { log: lane.log, awarded: lane.awarded, goal: next.goal };
}

let bag: XpBag = parseBag(kv.getString(STORAGE_KEY));
let state: XpState = compose(bag);

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persist(next: XpBag): void {
  bag = next;
  state = compose(next);
  kv.set(STORAGE_KEY, JSON.stringify(next));
  emit();
}

/** Relê o XP do armazenamento (F5, troca de conta). */
export function hydrateXp(): void {
  bag = parseBag(kv.getString(STORAGE_KEY));
  state = compose(bag);
  emit();
}

/**
 * Aponta o XP para o curso `lang`. Um registro pendente (antes do primeiro curso ou vindo do
 * formato antigo) é adotado pelo primeiro curso vinculado, como faz `bindProgressLang`.
 */
export function bindXpLang(lang: string): void {
  const key = lang.trim().toLowerCase();
  if (!key) {
    return;
  }
  const lanes = { ...bag.lanes };
  let changed = false;
  if (key !== PENDING && lanes[PENDING] && !lanes[key]) {
    lanes[key] = lanes[PENDING];
    delete lanes[PENDING];
    changed = true;
  }
  if (!lanes[key]) {
    lanes[key] = emptyLane();
    changed = true;
  }
  if (bag.activeLang === key && !changed) {
    return;
  }
  persist({ ...bag, activeLang: key, lanes });
}

/** Curso ao qual o XP está apontado agora. */
export function activeXpLang(): string {
  return bag.activeLang;
}

/**
 * Concede XP por uma ação real. `key` identifica a ação de forma única (por exemplo
 * `${data}:${fase}` ou `${data}:${frase}`): a mesma chave nunca paga duas vezes.
 * Retorna o XP ganho (0 se já foi pago ou se o teto do dia foi atingido).
 */
export function awardXp(reason: XpReason, key: string, dateOverride?: string): number {
  const today = dateOverride ?? localIsoDate();
  const { state: nextState, gained } = applyAward(state, reason, key, today);
  if (gained > 0) {
    persist({
      ...bag,
      lanes: { ...bag.lanes, [bag.activeLang]: { log: nextState.log, awarded: nextState.awarded } },
    });
  }
  return gained;
}

export function setXpGoal(goal: XpGoal): void {
  persist({ ...bag, goal: sanitizeGoal(goal) });
}

/** Apaga o XP de todos os cursos (mantém a meta diária escolhida). */
export function resetXp(): void {
  persist(emptyBag(bag.goal));
}

/** XP do curso ativo. */
export function getXpState(): XpState {
  return state;
}

export function subscribeXp(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface XpView {
  /** XP ganho hoje no curso ativo. */
  today: number;
  /** XP acumulado no curso ativo. */
  total: number;
  /** Meta diária de XP. */
  goal: XpGoal;
  /** Hoje já bateu a meta. */
  goalMet: boolean;
  /** XP que falta para a meta de hoje (0 quando bateu). */
  remaining: number;
  /** Últimos 7 dias, do mais antigo para hoje. */
  log: XpDay[];
  /** Segunda a domingo da semana atual: houve XP naquele dia. */
  weekProgress: boolean[];
  state: XpState;
}

export function xpView(current: XpState, today: string): XpView {
  const earned = todayXp(current, today);
  const activeDates = Object.keys(current.log).filter((d) => (current.log[d] ?? 0) > 0);
  return {
    today: earned,
    total: totalXp(current),
    goal: current.goal,
    goalMet: earned >= current.goal,
    remaining: Math.max(0, current.goal - earned),
    log: xpLog(current, today, 7),
    weekProgress: weekDots(activeDates, today),
    state: current,
  };
}

export function useXp(dateOverride?: string): XpView {
  const current = useSyncExternalStore(subscribeXp, getXpState, getXpState);
  return xpView(current, dateOverride ?? localIsoDate());
}
