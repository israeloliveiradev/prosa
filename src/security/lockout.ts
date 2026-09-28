import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import { AppError } from "../http/errors.js";

const WINDOW_SECONDS = 900;
const MAX_FAILURES = 10;

export function lockoutKey(scope: string, identity: string): string {
  const digest = createHash("sha256").update(identity.trim().toLowerCase()).digest("hex");
  return `prosa:lock:${scope}:${digest}`;
}

export async function assertNotLocked(redis: Redis, key: string): Promise<void> {
  const raw = await redis.get(key);
  const count = raw ? Number(raw) : 0;
  if (Number.isFinite(count) && count >= MAX_FAILURES) {
    throw new AppError(429, "Too many attempts");
  }
}

export async function recordFailure(redis: Redis, key: string): Promise<void> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
}

export async function clearFailures(redis: Redis, key: string): Promise<void> {
  await redis.del(key);
}
