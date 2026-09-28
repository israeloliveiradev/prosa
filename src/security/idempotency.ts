import type { Redis } from "ioredis";
import { AppError } from "../http/errors.js";

export async function acquireOnce(redis: Redis, key: string, ttlSeconds: number): Promise<void> {
  const locked = await redis.set(key, "1", "EX", ttlSeconds, "NX");
  if (locked !== "OK") {
    throw new AppError(409, "Request already in progress");
  }
}
