import { request } from "./http";
import { HealthResponseSchema } from "./schemas/health";

/**
 * Consulta a saúde da API Prosa (/health).
 * Devolve true se a resposta estiver saudável (200 com status ok).
 */
export async function pingApi(): Promise<boolean> {
  try {
    const res = await request("/health", {
      auth: "none",
      schema: HealthResponseSchema,
      timeoutMs: 5000,
    });
    return res.status === "ok";
  } catch {
    return false;
  }
}
