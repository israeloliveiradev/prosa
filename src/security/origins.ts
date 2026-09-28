import type { Env } from "../config.js";

const LOCAL_WEB = ["http://localhost:8081", "http://127.0.0.1:8081"] as const;

export function allowedOrigins(env: Env): Set<string> {
  const origins = new Set<string>(LOCAL_WEB);
  try {
    origins.add(new URL(env.APP_PUBLIC_URL).origin);
  } catch {
    /* APP_PUBLIC_URL is already validated as a URL on boot */
  }
  for (const extra of env.CORS_ORIGINS.split(/[,\s]+/)) {
    const trimmed = extra.trim();
    if (!trimmed) {
      continue;
    }
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      /* skip malformed extras so a typo cannot open the allowlist */
    }
  }
  return origins;
}

export function isAllowedOrigin(origin: string | undefined, env: Env): boolean {
  if (!origin) {
    return true;
  }
  return allowedOrigins(env).has(origin);
}

export function isLocalInboxHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function publicInboxUrl(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    if ((url.protocol === "http:" || url.protocol === "https:") && isLocalInboxHost(url.hostname)) {
      return raw;
    }
  } catch {
    return null;
  }
  return null;
}
