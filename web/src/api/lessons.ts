import { request } from "./http";
import {
  CognatesResponseSchema,
  type CognateAnchor,
  type CognatesResponse,
} from "./schemas/lessons";

/**
 * Busca âncoras de cognatos (verdadeiros e falsos) entre o idioma de apoio e o idioma alvo.
 */
export async function fetchCognates(
  through: string,
  target: string,
): Promise<CognateAnchor[]> {
  const res = await request<CognatesResponse>("/api/v1/cognates", {
    method: "GET",
    query: { through, target },
    schema: CognatesResponseSchema,
    auth: "none",
  });
  return res.anchors;
}
