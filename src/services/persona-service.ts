import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import type { PersonaTurnBody } from "../schemas/persona.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { findPersonaScene, personaScenes } from "./persona-scenes.js";

export class PersonaService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async scenes(user: AuthUser): Promise<{ scenes: ReturnType<typeof personaScenes> }> {
    const interests = await this.interests(user.id);
    return { scenes: personaScenes(user.target_lang, interests) };
  }

  async turn(user: AuthUser, body: PersonaTurnBody) {
    const interests = await this.interests(user.id);
    const scene = findPersonaScene(user.target_lang, interests, body.scene_id);
    if (!scene) {
      throw new AppError(404, "Scene not found");
    }
    const reply = await this.gemini.personaReply({
      targetLang: user.target_lang,
      throughLang: user.native_lang,
      level: user.level,
      role: scene.role,
      place: scene.place,
      register: scene.register,
      opener: scene.opener,
      hitch: scene.hitch,
      history: body.history,
      userLine: body.user_line,
    });
    return { ...reply, register: scene.register };
  }

  private async interests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [];
  }
}
