/**
 * Cenas de Conversa (GET /api/v1/persona/scenes). Lógica pura: a leitura da resposta
 * descarta cenas malformadas em vez de mostrar dados quebrados.
 */
export type SceneKind = "goal" | "unit" | "interest";
export type SceneSource = "ai" | "fallback";

export interface PersonaScene {
  id: string;
  kind: SceneKind;
  title: string;
  setting: string;
  learner_role: string;
  partner_role: string;
  objective: string;
  twist: string | null;
  unit_id: string | null;
}

export interface ScenesResponse {
  scenes: PersonaScene[];
  source: SceneSource;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseScene(raw: unknown): PersonaScene | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const kind = item.kind === "goal" || item.kind === "unit" || item.kind === "interest" ? item.kind : null;
  const id = text(item.id);
  const title = text(item.title);
  const setting = text(item.setting);
  const learnerRole = text(item.learner_role);
  const partnerRole = text(item.partner_role);
  const objective = text(item.objective);
  if (!kind || !id || !title || !setting || !learnerRole || !partnerRole || !objective) {
    return null;
  }
  return {
    id,
    kind,
    title,
    setting,
    learner_role: learnerRole,
    partner_role: partnerRole,
    objective,
    twist: text(item.twist) || null,
    unit_id: text(item.unit_id) || null,
  };
}

/** `source` ausente ou desconhecido conta como "fallback": só "ai" é afirmado quando o servidor diz. */
export function parseScenesResponse(raw: unknown): ScenesResponse {
  const body = (raw && typeof raw === "object" ? raw : {}) as { scenes?: unknown; source?: unknown };
  const scenes = Array.isArray(body.scenes) ? body.scenes.flatMap((item) => parseScene(item) ?? []) : [];
  return { scenes, source: body.source === "ai" ? "ai" : "fallback" };
}
