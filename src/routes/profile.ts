import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { profileQuerySchema, profileSignalsSchema } from "../schemas/profile.js";
import { clientProfileSignals, clockHint, measuredFieldsIn, profileNote } from "../services/learner-profile.js";
import type { ProfileStore } from "../services/profile-store.js";

export function registerProfileRoutes(app: FastifyInstance, pool: Pool, store: ProfileStore): void {
  app.get("/api/v1/profile", async (request) => {
    const user = await requireUser(pool, request);
    const query = profileQuerySchema.parse(request.query);
    const profile = await store.load(user.id, query.target_lang);
    return {
      profile,
      note: profileNote(profile),
      clock: clockHint(profile),
    };
  });

  /**
   * Só preferências (objetivo da semana, minutos, modo da sessão, sessão pausada). Notas por
   * habilidade, vocabulário, erros, sons, ritmo e tempo são medidos pelo servidor; um corpo
   * com qualquer um deles é recusado com 400, sem gravar nada.
   */
  app.post("/api/v1/profile/signals", async (request) => {
    const user = await requireUser(pool, request);
    const raw = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
    const measured = measuredFieldsIn(raw);
    if (measured.length > 0) {
      throw new AppError(400, `Measured signals are computed by the server: ${measured.join(", ")}`);
    }
    const body = profileSignalsSchema.parse(request.body);
    const { target_lang, ...rest } = body;
    const profile = await store.merge(user.id, target_lang, clientProfileSignals(rest));
    return {
      profile,
      note: profileNote(profile),
      clock: clockHint(profile),
    };
  });
}
