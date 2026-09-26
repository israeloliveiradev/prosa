import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { AppError } from "../http/errors.js";
import { lessonPayloadSchema, type LessonPayload } from "../schemas/lesson.js";

export class LessonCache {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async get(hash: string): Promise<LessonPayload | null> {
    const hot = await this.redis.get(this.redisKey(hash));
    if (hot) {
      const parsed = this.parsePayload(hot);
      if (parsed) {
        return parsed;
      }
      await this.redis.del(this.redisKey(hash));
    }

    const stored = await this.readPostgres(hash);
    if (!stored) {
      return null;
    }
    await this.redis.set(this.redisKey(hash), JSON.stringify(stored), "EX", this.ttlSeconds);
    return stored;
  }

  async put(hash: string, payload: LessonPayload): Promise<LessonPayload> {
    const inserted = await this.pool.query<{ payload_json: unknown }>(
      `INSERT INTO lesson_cache (hash, payload_json)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (hash) DO NOTHING
       RETURNING payload_json`,
      [hash, JSON.stringify(payload)],
    );

    const stored = inserted.rows[0] ? payload : await this.readPostgres(hash);
    if (!stored) {
      throw new AppError(500, "Lesson cache write failed");
    }
    await this.redis.set(this.redisKey(hash), JSON.stringify(stored), "EX", this.ttlSeconds);
    return stored;
  }

  private async readPostgres(hash: string): Promise<LessonPayload | null> {
    const result = await this.pool.query<{ payload_json: unknown }>(
      "SELECT payload_json FROM lesson_cache WHERE hash = $1",
      [hash],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    const parsed = lessonPayloadSchema.safeParse(row.payload_json);
    return parsed.success ? parsed.data : null;
  }

  private parsePayload(value: string): LessonPayload | null {
    try {
      const parsed = lessonPayloadSchema.safeParse(JSON.parse(value));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private redisKey(hash: string): string {
    return `prosa:lesson:v1:${hash}`;
  }
}
