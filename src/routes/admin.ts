import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireAdmin } from "../auth/admin.js";
import type { Env } from "../config.js";
import { AppError } from "../http/errors.js";
import {
  adminEventsQuerySchema,
  adminFreezeBodySchema,
  adminGenerationBodySchema,
  adminPlanBodySchema,
  adminUserQuerySchema,
} from "../schemas/admin.js";
import type { OpsService } from "../services/ops.js";
import { escapeLike } from "../security/like.js";

interface AdminUserRow {
  id: string;
  email: string;
  native_lang: string;
  target_lang: string;
  level: string;
  plan: "free" | "pro";
  role: "learner" | "admin";
  streak_count: number;
  streak_freeze_count: number;
  last_lesson_at: Date | null;
  created_at: Date;
  lesson_count?: string;
}

function presentUser(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    native_lang: row.native_lang,
    target_lang: row.target_lang,
    level: row.level,
    plan: row.plan,
    role: row.role,
    streak_count: row.streak_count,
    streak_freeze_count: row.streak_freeze_count,
    last_lesson_at: row.last_lesson_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    lesson_count: Number(row.lesson_count ?? 0),
  };
}

const USER_SELECT = `u.id, u.email, u.native_lang, u.target_lang, u.level, u.plan, u.role,
         u.streak_count, u.streak_freeze_count, u.last_lesson_at, u.created_at,
         (SELECT count(*)::text FROM daily_lessons d WHERE d.user_id = u.id) AS lesson_count`;

export function registerAdminRoutes(
  app: FastifyInstance,
  pool: Pool,
  emails: ReadonlySet<string>,
  env: Env,
  ops: OpsService,
): void {
  app.get(
    "/api/v1/admin/dashboard",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const [users, lessons, duels, audio, gemini, series, events, paused] = await Promise.all([
        pool.query<{ total: string; pro: string; free: string }>(
          `SELECT count(*)::text AS total,
                  count(*) FILTER (WHERE plan = 'pro')::text AS pro,
                  count(*) FILTER (WHERE plan = 'free')::text AS free
           FROM users`,
        ),
        pool.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM daily_lessons
           WHERE lesson_date = CURRENT_DATE`,
        ),
        pool.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM duel_runs
           WHERE played_at >= date_trunc('day', now())`,
        ),
        pool.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM ops_events
           WHERE kind = 'audio' AND status = 'ok' AND created_at >= date_trunc('day', now())`,
        ),
        pool.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM ops_events
           WHERE kind = 'gemini' AND status = 'error' AND created_at >= date_trunc('day', now())`,
        ),
        ops.series(14),
        ops.events(undefined, 24),
        ops.isGenerationPaused(),
      ]);
      const counts = users.rows[0];
      return {
        users: Number(counts?.total ?? 0),
        pro: Number(counts?.pro ?? 0),
        free: Number(counts?.free ?? 0),
        lessons_today: Number(lessons.rows[0]?.total ?? 0),
        duels_today: Number(duels.rows[0]?.total ?? 0),
        audio_today: Number(audio.rows[0]?.total ?? 0),
        gemini_errors_today: Number(gemini.rows[0]?.total ?? 0),
        generation_paused: paused,
        stripe_configured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID),
        gemini_configured: Boolean(env.GEMINI_API_KEY),
        series,
        events,
      };
    },
  );

  app.get(
    "/api/v1/admin/summary",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const found = await pool.query<{ total: string; pro: string; free: string }>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE plan = 'pro')::text AS pro,
                count(*) FILTER (WHERE plan = 'free')::text AS free
         FROM users`,
      );
      const lessons = await pool.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM daily_lessons WHERE lesson_date = CURRENT_DATE`,
      );
      const duels = await pool.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM duel_runs WHERE played_at >= date_trunc('day', now())`,
      );
      const counts = found.rows[0];
      return {
        users: Number(counts?.total ?? 0),
        pro: Number(counts?.pro ?? 0),
        free: Number(counts?.free ?? 0),
        lessons_today: Number(lessons.rows[0]?.total ?? 0),
        duels_today: Number(duels.rows[0]?.total ?? 0),
      };
    },
  );

  app.get(
    "/api/v1/admin/events",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const query = adminEventsQuerySchema.parse(request.query);
      return { events: await ops.events(query.kind, query.limit ?? 40) };
    },
  );

  app.post(
    "/api/v1/admin/generation",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const body = adminGenerationBodySchema.parse(request.body);
      const paused = await ops.setGenerationPaused(body.paused);
      return { generation_paused: paused };
    },
  );

  app.get(
    "/api/v1/admin/users",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const query = adminUserQuerySchema.parse(request.query);
      const search = query.q ? `%${escapeLike(query.q.toLowerCase())}%` : null;
      const found = await pool.query<AdminUserRow>(
        `SELECT ${USER_SELECT}
         FROM users u
         WHERE ($1::text IS NULL OR u.email LIKE $1 ESCAPE E'\\\\')
           AND ($2::text IS NULL OR u.plan = $2)
           AND ($3::text IS NULL OR u.role = $3)
         ORDER BY u.created_at DESC
         LIMIT 80`,
        [search, query.plan ?? null, query.role ?? null],
      );
      return { users: found.rows.map(presentUser) };
    },
  );

  app.get(
    "/api/v1/admin/users/:id",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const found = await pool.query<AdminUserRow>(
        `SELECT ${USER_SELECT}
         FROM users u
         WHERE u.id = $1`,
        [params.id],
      );
      const row = found.rows[0];
      if (!row) {
        throw new AppError(404, "User not found");
      }
      const [lessons, duels] = await Promise.all([
        pool.query<{ lesson_date: string; title: string; target_lang: string }>(
          `SELECT lesson_date::text, title, target_lang
           FROM daily_lessons
           WHERE user_id = $1
           ORDER BY lesson_date DESC
           LIMIT 14`,
          [params.id],
        ),
        pool.query<{ total: string; best: string }>(
          `SELECT count(*)::text AS total, coalesce(max(score), 0)::text AS best
           FROM duel_runs
           WHERE user_id = $1`,
          [params.id],
        ),
      ]);
      return {
        user: presentUser(row),
        lessons: lessons.rows,
        duels: {
          total: Number(duels.rows[0]?.total ?? 0),
          best: Number(duels.rows[0]?.best ?? 0),
        },
      };
    },
  );

  app.post(
    "/api/v1/admin/users/:id/plan",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = adminPlanBodySchema.parse(request.body);
      const updated = await pool.query<AdminUserRow>(
        `UPDATE users u
         SET plan = $2
         WHERE u.id = $1
         RETURNING ${USER_SELECT}`,
        [params.id, body.plan],
      );
      const row = updated.rows[0];
      if (!row) {
        throw new AppError(404, "User not found");
      }
      await ops.record("billing", "ok", `Plan set to ${body.plan} for ${row.email}`);
      return { user: presentUser(row) };
    },
  );

  app.post(
    "/api/v1/admin/users/:id/freeze",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireAdmin(pool, request, emails);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = adminFreezeBodySchema.parse(request.body);
      const updated = await pool.query<AdminUserRow>(
        `UPDATE users u
         SET streak_freeze_count = streak_freeze_count + $2
         WHERE u.id = $1 AND streak_freeze_count + $2 >= 0
         RETURNING ${USER_SELECT}`,
        [params.id, body.delta],
      );
      const row = updated.rows[0];
      if (!row) {
        throw new AppError(404, "User not found or freeze would go below zero");
      }
      return { user: presentUser(row) };
    },
  );
}
