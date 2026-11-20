import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { readBearer, requireUser, revokeOtherSessions } from "../auth/session.js";
import { publicInboxUrl } from "../security/origins.js";
import {
  accountSettingsBodySchema,
  changeEmailBodySchema,
  changePasswordBodySchema,
  confirmCodeBodySchema,
  disableFactorBodySchema,
  passwordOnlyBodySchema,
  totpConfirmBodySchema,
  type AccountGoal,
  type DailyMinutes,
} from "../schemas/account.js";
import type { DisplayLocale } from "../schemas/auth.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import type { Mailer } from "../services/mailer.js";
import type { SecondFactor } from "../services/second-factor.js";

/** Colunas de GET e PATCH /account/settings (as mesmas nas duas respostas). */
const SETTINGS_COLUMNS = `display_name, display_locale, reminder_enabled, reminder_hour, totp_enabled, email_2fa,
       mind_reading, mind_memory, mind_speech, mind_journal, goal, goal_note, daily_minutes`;

interface SettingsRow {
  display_name: string | null;
  display_locale: DisplayLocale;
  reminder_enabled: boolean;
  reminder_hour: number;
  totp_enabled: boolean;
  email_2fa: boolean;
  mind_reading: string;
  mind_memory: string;
  mind_speech: string;
  mind_journal: string;
  goal: AccountGoal | null;
  goal_note: string | null;
  daily_minutes: DailyMinutes;
}

export function registerAccountRoutes(app: FastifyInstance, pool: Pool, mailer: Mailer, factors: SecondFactor): void {
  app.get("/api/v1/account/settings", async (request) => {
    const user = await requireUser(pool, request);
    const found = await pool.query<SettingsRow>(`SELECT ${SETTINGS_COLUMNS} FROM users WHERE id = $1`, [user.id]);
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Account not found");
    }
    return { ...row, mail_configured: mailer.configured(), mail_inbox_url: publicInboxUrl(mailer.inboxUrl()) };
  });

  app.patch("/api/v1/account/settings", async (request) => {
    const user = await requireUser(pool, request);
    const body = accountSettingsBodySchema.parse(request.body);
    // goal e goal_note aceitam null para apagar; por isso cada um leva um sinal "veio no corpo".
    const found = await pool.query<SettingsRow>(
      `UPDATE users
       SET display_name = COALESCE($2, display_name),
           display_locale = COALESCE($3, display_locale),
           reminder_enabled = COALESCE($4, reminder_enabled),
           reminder_hour = COALESCE($5, reminder_hour),
           mind_reading = COALESCE($6, mind_reading),
           mind_memory = COALESCE($7, mind_memory),
           mind_speech = COALESCE($8, mind_speech),
           mind_journal = COALESCE($9, mind_journal),
           goal = CASE WHEN $10::boolean THEN $11::text ELSE goal END,
           goal_note = CASE WHEN $12::boolean THEN $13::text ELSE goal_note END,
           daily_minutes = COALESCE($14::smallint, daily_minutes)
       WHERE id = $1
       RETURNING ${SETTINGS_COLUMNS}`,
      [
        user.id,
        body.display_name ?? null,
        body.display_locale ?? null,
        body.reminder_enabled ?? null,
        body.reminder_hour ?? null,
        body.mind_reading ?? null,
        body.mind_memory ?? null,
        body.mind_speech ?? null,
        body.mind_journal ?? null,
        body.goal !== undefined,
        body.goal ?? null,
        body.goal_note !== undefined,
        body.goal_note ?? null,
        body.daily_minutes ?? null,
      ],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Account not found");
    }
    return { ...row, mail_configured: mailer.configured(), mail_inbox_url: publicInboxUrl(mailer.inboxUrl()) };
  });

  app.post("/api/v1/account/password", async (request) => {
    const user = await requireUser(pool, request);
    const token = readBearer(request);
    const body = changePasswordBodySchema.parse(request.body);
    await assertPassword(pool, user.id, body.current_password);
    await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(body.password)]);
    if (token) {
      await revokeOtherSessions(pool, user.id, token);
    }
    return { ok: true };
  });

  app.post("/api/v1/account/email/request", async (request) => {
    const user = await requireUser(pool, request);
    const body = changeEmailBodySchema.parse(request.body);
    await assertPassword(pool, user.id, body.password);
    await factors.requestEmailChange(user.id, body.email);
    return { ok: true };
  });

  app.post("/api/v1/account/email/confirm", async (request) => {
    const user = await requireUser(pool, request);
    const token = readBearer(request);
    const body = confirmCodeBodySchema.parse(request.body);
    const email = await factors.confirmEmailChange(user.id, body.code);
    if (token) {
      await revokeOtherSessions(pool, user.id, token);
    }
    return { email };
  });

  app.post("/api/v1/account/2fa/totp/start", async (request) => {
    const user = await requireUser(pool, request);
    return factors.startTotp(user.id, user.email);
  });

  app.post("/api/v1/account/2fa/totp/confirm", async (request) => {
    const user = await requireUser(pool, request);
    const body = totpConfirmBodySchema.parse(request.body);
    const recovery_codes = await factors.confirmTotp(user.id, body.code);
    return { ok: true, recovery_codes };
  });

  app.post("/api/v1/account/2fa/totp/disable", async (request) => {
    const user = await requireUser(pool, request);
    const body = disableFactorBodySchema.parse(request.body);
    await assertPassword(pool, user.id, body.password);
    if (!(await factors.verifyOwned(user.id, body.code))) {
      throw new AppError(401, "Invalid second factor");
    }
    await factors.disableTotp(user.id);
    return { ok: true };
  });

  app.post("/api/v1/account/2fa/email/start", async (request) => {
    const user = await requireUser(pool, request);
    await factors.setEmailFactor(user.id, true);
    return { ok: true };
  });

  app.post("/api/v1/account/2fa/email/confirm", async (request) => {
    const user = await requireUser(pool, request);
    const body = confirmCodeBodySchema.parse(request.body);
    await factors.confirmEmailFactor(user.id, body.code);
    return { ok: true };
  });

  app.post("/api/v1/account/2fa/email/disable", async (request) => {
    const user = await requireUser(pool, request);
    const body = passwordOnlyBodySchema.parse(request.body);
    await assertPassword(pool, user.id, body.password);
    await factors.setEmailFactor(user.id, false);
    return { ok: true };
  });
}

async function assertPassword(pool: Pool, userId: string, password: string): Promise<void> {
  const found = await pool.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const row = found.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new AppError(401, "Invalid credentials");
  }
}
