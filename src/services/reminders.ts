import type { Redis } from "ioredis";
import type { Pool } from "pg";
import { brandedMail } from "./mail-templates.js";
import type { Mailer } from "./mailer.js";

interface ReminderRow {
  id: string;
  email: string;
  display_name: string | null;
  display_locale: "pt" | "en";
}

export class ReminderService {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly mailer: Mailer,
  ) {}

  async tick(now = new Date()): Promise<number> {
    if (!this.mailer.configured()) {
      return 0;
    }
    const hour = now.getUTCHours();
    const day = now.toISOString().slice(0, 10);
    const found = await this.pool.query<ReminderRow>(
      `SELECT id, email, display_name, display_locale
       FROM users
       WHERE reminder_enabled
         AND reminder_hour = $1
         AND (last_lesson_at IS NULL OR (last_lesson_at AT TIME ZONE 'UTC')::date < $2::date)`,
      [hour, day],
    );
    let sent = 0;
    for (const user of found.rows) {
      const stamp = `prosa:reminded:${user.id}:${day}`;
      const reserved = await this.redis.set(stamp, "1", "EX", 36 * 60 * 60, "NX");
      if (reserved !== "OK") {
        continue;
      }
      const name = user.display_name?.trim() || user.email.split("@")[0] || "você";
      const letter = brandedMail({ locale: user.display_locale, kind: "reminder", name });
      const ok = await this.mailer.send({ to: user.email, ...letter });
      if (ok) {
        sent += 1;
      } else {
        await this.redis.del(stamp);
      }
    }
    return sent;
  }
}
