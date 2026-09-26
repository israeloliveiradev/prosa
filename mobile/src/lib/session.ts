import { useSyncExternalStore } from "react";
import { currentAccount, loginAccount, logoutAccount, registerAccount, type AccountUser } from "@/lib/api";
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
  } else {
    kv.delete(STORAGE_KEY);
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
      return;
    }
  } catch {
    state = null;
  }
  kv.delete(STORAGE_KEY);
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
    () => null,
  );
}

export async function signIn(email: string, password: string): Promise<AccountUser> {
  const session = await loginAccount(email, password);
  persist(session);
  return session.user;
}

export async function signUp(input: {
  email: string;
  password: string;
  native_lang: string;
  target_lang: string;
  level: AccountUser["level"];
}): Promise<AccountUser> {
  const session = await registerAccount(input);
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
  const token = state?.token;
  if (!token) {
    return null;
  }
  try {
    const user = await currentAccount(token);
    persist({ token, user });
    return user;
  } catch {
    persist(null);
    return null;
  }
}
