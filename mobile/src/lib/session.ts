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
import { shouldAdoptServerLocale, serverLocaleFor } from "@/features/auth/model/locale-sync";
import { hydrateCast } from "@/lib/cast";
import { getLocale, hydrateLocale, type DisplayLocale } from "@/lib/i18n";
import { kv } from "@/lib/kv";

const STORAGE_KEY = "prosa.session.v1";

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

function persist(next: SessionState | null): void {
  state = next;
  if (next) {
    kv.set(STORAGE_KEY, JSON.stringify(next));
    adoptAccountLocale(next.user.display_locale);
    hydrateCast({
      reading: next.user.mind_reading,
      memory: next.user.mind_memory,
      speech: next.user.mind_speech,
      journal: next.user.mind_journal,
    });
  } else {
    kv.delete(STORAGE_KEY);
  }
  emit();
}

/** O idioma de interface da conta vale, salvo quando o servidor só guardou o substituto (pt/en). */
function adoptAccountLocale(server: unknown): void {
  if (shouldAdoptServerLocale(getLocale(), server)) {
    hydrateLocale(server);
  }
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
      adoptAccountLocale(parsed.user.display_locale);
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
  /** Idioma da interface; o servidor guarda pt ou en (os outros viram en). */
  display_locale?: DisplayLocale;
}): Promise<AccountUser | VerifyChallenge> {
  const { display_locale: displayLocale, ...rest } = input;
  const session = await registerAccount({
    ...rest,
    ...(displayLocale ? { display_locale: serverLocaleFor(displayLocale) } : {}),
  });
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

export function rememberProfile(patch: Partial<AccountUser>): void {
  if (!state) {
    return;
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
  try {
    const user = await currentAccount(token);
    if (state?.token !== token) {
      // A sessão mudou (saiu ou trocou de conta) enquanto a resposta vinha.
      return state?.user ?? null;
    }
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
