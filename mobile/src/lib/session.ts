import { useSyncExternalStore } from "react";
import {
  confirmAccountEmail,
  currentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  sendAccountOtp,
  verifySecondFactor,
} from "@/api/auth";
import type {
  AccountUser,
  LoginChallenge,
  VerifyChallenge,
} from "@/api/schemas/auth";
import { ApiError } from "@/api/errors";
import { saveAccountPrefs } from "@/api/onboarding";
import { isAccountLocale, reconcileLocale } from "@/features/auth/model/locale-sync";
import { hydrateCast } from "@/lib/cast";
import { getLocale, hydrateLocale, type DisplayLocale } from "@/lib/i18n";
import { adoptAccountPlan, localPlanForAccount } from "@/lib/journey";
import { kv } from "@/lib/kv";

const STORAGE_KEY = "prosa.session.v1";
/** Último idioma de interface em que este aparelho e a conta concordaram: {userId, locale}. */
const LOCALE_SYNC_KEY = "prosa.locale.synced.v1";
const DEMO_TOKEN = "prosa_demo_token";
/** Campos da conta que o aparelho também muda (idioma, objetivo, minutos). */
const PREF_KEYS = ["display_locale", "goal", "goal_note", "daily_minutes"] as const;

export interface SessionState {
  token: string;
  user: AccountUser;
}

let state: SessionState | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Conta quantas vezes o aparelho gravou preferências na conta. Uma resposta de /auth/me
 * pedida antes de uma gravação é velha para esses campos (ver refreshSession).
 */
let prefsEpoch = 0;
/** Idioma que já está subindo para a conta (evita PATCH repetido). */
let pushingLocale: string | null = null;

function readSyncedLocale(userId: string): DisplayLocale | null {
  const raw = kv.getString(LOCALE_SYNC_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { userId?: unknown; locale?: unknown };
    return parsed.userId === userId && isAccountLocale(parsed.locale) ? parsed.locale : null;
  } catch {
    return null;
  }
}

function writeSyncedLocale(userId: string, locale: DisplayLocale | null): void {
  if (locale) {
    kv.set(LOCALE_SYNC_KEY, JSON.stringify({ userId, locale }));
  } else {
    kv.delete(LOCALE_SYNC_KEY);
  }
}

/**
 * Idioma de interface: a conta vale num aparelho novo; uma escolha deste aparelho mais nova
 * que o último acordo vale e sobe para a conta (send = false só aplica, sem rede).
 */
function syncAccountLocale(next: SessionState, send: boolean): void {
  const decision = reconcileLocale({
    local: getLocale(),
    server: next.user.display_locale,
    synced: readSyncedLocale(next.user.id),
  });
  if (decision.adopt) {
    hydrateLocale(decision.adopt);
  }
  writeSyncedLocale(next.user.id, decision.synced);
  if (send && decision.push) {
    pushLocale(next, decision.push);
  }
}

function pushLocale(session: SessionState, locale: DisplayLocale): void {
  if (session.token === DEMO_TOKEN) {
    return;
  }
  const key = `${session.user.id}:${locale}`;
  if (pushingLocale === key) {
    return;
  }
  pushingLocale = key;
  void saveAccountPrefs({ display_locale: locale })
    .then((saved) => {
      if (state?.token !== session.token) {
        return;
      }
      prefsEpoch += 1;
      writeSyncedLocale(session.user.id, saved.display_locale);
      state = { token: session.token, user: { ...state.user, display_locale: saved.display_locale } };
      kv.set(STORAGE_KEY, JSON.stringify(state));
      emit();
    })
    .catch(() => undefined)
    .finally(() => {
      if (pushingLocale === key) {
        pushingLocale = null;
      }
    });
}

/** Plano que já está subindo para a conta (evita PATCH repetido). */
let pushingPlan: string | null = null;

/** Jornada do M1 concluída neste aparelho e conta sem plano: o objetivo e os minutos sobem. */
function pushLocalPlan(session: SessionState): void {
  const plan = localPlanForAccount(session.user);
  if (!plan || session.token === DEMO_TOKEN || pushingPlan === session.user.id) {
    return;
  }
  pushingPlan = session.user.id;
  void saveAccountPrefs(plan)
    .then((saved) => {
      if (state?.token !== session.token) {
        return;
      }
      prefsEpoch += 1;
      state = {
        token: session.token,
        user: { ...state.user, goal: saved.goal ?? null, goal_note: saved.goal_note ?? null, daily_minutes: saved.daily_minutes ?? state.user.daily_minutes },
      };
      kv.set(STORAGE_KEY, JSON.stringify(state));
      emit();
    })
    .catch(() => undefined)
    .finally(() => {
      if (pushingPlan === session.user.id) {
        pushingPlan = null;
      }
    });
}

/** Mantém no usuário novo os campos de preferência do atual (resposta velha do servidor). */
function keepPrefs(user: AccountUser, current: AccountUser): AccountUser {
  const next: AccountUser = { ...user };
  for (const key of PREF_KEYS) {
    if (current[key] !== undefined) {
      (next as Record<string, unknown>)[key] = current[key];
    }
  }
  return next;
}

function persist(next: SessionState | null): void {
  state = next;
  if (next) {
    kv.set(STORAGE_KEY, JSON.stringify(next));
    syncAccountLocale(next, true);
    adoptAccountPlan(next.user);
    pushLocalPlan(next);
    hydrateCast({
      reading: next.user.mind_reading,
      memory: next.user.mind_memory,
      speech: next.user.mind_speech,
      journal: next.user.mind_journal,
    });
  } else {
    kv.delete(STORAGE_KEY);
    kv.delete(LOCALE_SYNC_KEY);
  }
  emit();
}

function isUser(value: unknown): value is AccountUser {
  if (!value || typeof value !== "object") {
    return false;
  }
  const user = value as AccountUser;
  return typeof user.id === "string" && typeof user.email === "string" && (user.plan === "free" || user.plan === "pro");
}

export function hydrateSession(): void {
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    state = null;
    return;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (typeof parsed.token === "string" && isUser(parsed.user)) {
      state = { token: parsed.token, user: parsed.user };
      // Sem rede aqui: só aplica. O refreshSession do boot reconcilia e sobe o que faltar.
      syncAccountLocale(state, false);
      hydrateCast({
        reading: parsed.user.mind_reading,
        memory: parsed.user.mind_memory,
        speech: parsed.user.mind_speech,
        journal: parsed.user.mind_journal,
      });
      return;
    }
  } catch {
    state = null;
  }
  state = null;
}

export function getSession(): SessionState | null {
  return state;
}

export function useSession(): SessionState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export async function sendLoginCode(email: string): Promise<VerifyChallenge> {
  const result = await sendAccountOtp(email);
  return { requires_verify: true, email: result.email };
}

export async function signIn(email: string, password: string): Promise<AccountUser | LoginChallenge | VerifyChallenge> {
  const session = await loginAccount(email, password);
  if ("requires_2fa" in session || "requires_verify" in session) {
    return session;
  }
  persist(session);
  return session.user;
}

export async function finishSignIn(ticket: string, code: string): Promise<AccountUser> {
  const session = await verifySecondFactor(ticket, code);
  persist(session);
  return session.user;
}

export async function signUp(input: {
  email: string;
  password: string;
  native_lang: string;
  target_lang: string;
  /** Opcional: sem nível, o servidor usa o padrão e o nivelamento do primeiro dia decide. */
  level?: AccountUser["level"];
  /** Idioma da interface; a conta guarda os 7 (e as cartas saem nele, ou em inglês). */
  display_locale?: DisplayLocale;
}): Promise<AccountUser | VerifyChallenge> {
  const { display_locale: displayLocale, ...rest } = input;
  const session = await registerAccount({ ...rest, ...(displayLocale ? { display_locale: displayLocale } : {}) });
  if ("requires_verify" in session) {
    return session;
  }
  persist(session);
  return session.user;
}

export async function finishVerify(email: string, code: string): Promise<AccountUser> {
  const session = await confirmAccountEmail(email, code);
  persist(session);
  return session.user;
}

/**
 * Guarda na sessão o que acabou de ser confirmado pela conta (ex.: depois de um PATCH).
 * Se o patch traz idioma, objetivo ou minutos, respostas de /auth/me já em voo ficam velhas
 * para esses campos.
 */
export function rememberProfile(patch: Partial<AccountUser>): void {
  if (!state) {
    return;
  }
  if (PREF_KEYS.some((key) => patch[key] !== undefined)) {
    prefsEpoch += 1;
  }
  persist({ token: state.token, user: { ...state.user, ...patch } });
}

export async function signOut(): Promise<void> {
  const token = state?.token;
  persist(null);
  if (token) {
    await logoutAccount(token);
  }
}

export async function refreshSession(): Promise<AccountUser | null> {
  const current = state;
  const token = current?.token;
  if (!token) {
    return null;
  }
  const epoch = prefsEpoch;
  try {
    const fetched = await currentAccount(token);
    if (state?.token !== token) {
      // A sessão mudou (saiu ou trocou de conta) enquanto a resposta vinha.
      return state?.user ?? null;
    }
    // Uma gravação de preferências aconteceu durante a ida: a resposta é velha nesses campos.
    const user = epoch === prefsEpoch ? fetched : keepPrefs(fetched, state.user);
    persist({ token, user });
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Token recusado pelo servidor: a sessão local não vale mais.
      if (state?.token === token) {
        persist(null);
      }
      return null;
    }
    // Sem rede ou servidor fora: segue com o cache local (sobrevive ao F5).
    return current.user;
  }
}
