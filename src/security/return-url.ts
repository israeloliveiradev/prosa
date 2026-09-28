import type { Env } from "../config.js";
import { allowedOrigins } from "./origins.js";

export function isAllowedReturnUrl(raw: string, env: Env): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) {
    return false;
  }
  if (url.protocol === "prosa:") {
    return url.hostname === "paywall" && (url.pathname === "" || url.pathname === "/");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }
  return allowedOrigins(env).has(url.origin);
}

export function assertAllowedReturnUrl(raw: string, env: Env): string {
  if (!isAllowedReturnUrl(raw, env)) {
    throw new Error("Return URL is not allowed");
  }
  return raw;
}
