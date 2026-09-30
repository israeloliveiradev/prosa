import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import type { ProseTurnBody } from "../schemas/prose.js";
import { emptyMemory, mergeMemory, readMemory, repairStep, type LearnerMemory, type RepairStep } from "./learner-memory.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { DEFAULT_CAST, isMindId, mindById } from "./minds.js";
import { stripPraise, talkMove, type TalkMove } from "./sense-negotiate.js";

export interface ProseTurnResult {
  reply: string;
  through_note: string;
  move: TalkMove;
  repair: { step: RepairStep; mark: string; fix: string };
  memory: Pick<LearnerMemory, "facts" | "goals" | "thread">;
}

export class ProseService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async memory(user: AuthUser): Promise<Pick<LearnerMemory, "facts" | "goals" | "thread">> {
    const stored = await this.load(user.id, user.target_lang);
    return { facts: stored.facts, goals: stored.goals, thread: stored.thread };
  }

  async turn(user: AuthUser, body: ProseTurnBody): Promise<ProseTurnResult> {
    const mind = mindById(body.mind && isMindId(body.mind) ? body.mind : DEFAULT_CAST.speech);
    const stored = await this.load(user.id, user.target_lang);
    const reply = await this.gemini.proseTalk({
      targetLang: user.target_lang,
      throughLang: user.native_lang,
      level: user.level,
      mindName: mind.name,
      mindPrompt: mind.prompt,
      topic: body.topic,
      story: body.story ?? "",
      history: body.history,
      userLine: body.user_line,
      memory: this.brief(stored),
    });
    const spoken = body.user_line.trim().length > 0;
    const move = spoken ? talkMove(body.user_line, body.history) : "continue";
    const step = spoken ? repairStep(reply.mistake, stored.errors) : "none";
    const next = mergeMemory(stored, {
      facts: spoken ? reply.facts : [],
      goal: spoken ? reply.goal : "",
      error: spoken ? reply.mistake : "",
      thread: reply.thread,
    });
    await this.save(user.id, user.target_lang, next);
    return {
      reply: stripPraise(reply.reply) || reply.reply,
      through_note: reply.through_note,
      move,
      repair: {
        step,
        mark: step === "hint" || step === "correction" ? reply.mistake : "",
        fix: step === "correction" ? reply.fix : "",
      },
      memory: { facts: next.facts, goals: next.goals, thread: next.thread },
    };
  }

  private brief(memory: LearnerMemory): string {
    const lines = [
      memory.facts.length > 0 ? `Facts: ${memory.facts.join("; ")}` : "",
      memory.goals.length > 0 ? `Goals: ${memory.goals.join("; ")}` : "",
      memory.errors.length > 0
        ? `Recurring mistakes, with how many times each was seen: ${memory.errors.map((item) => `${item.note} (${item.count})`).join("; ")}`
        : "",
      memory.thread ? `Ongoing thread: ${memory.thread}` : "",
    ].filter(Boolean);
    return lines.length > 0 ? lines.join("\n") : "No memory yet.";
  }

  private async load(userId: string, targetLang: string): Promise<LearnerMemory> {
    const result = await this.pool.query<{ facts: unknown; goals: unknown; errors: unknown; thread: string | null }>(
      `SELECT facts, goals, errors, thread
       FROM learner_memory
       WHERE user_id = $1 AND target_lang = $2`,
      [userId, targetLang],
    );
    const row = result.rows[0];
    if (!row) {
      return emptyMemory();
    }
    return readMemory({
      facts: Array.isArray(row.facts) ? (row.facts as string[]) : [],
      goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
      errors: Array.isArray(row.errors) ? (row.errors as LearnerMemory["errors"]) : [],
      thread: row.thread ?? "",
    });
  }

  private async save(userId: string, targetLang: string, memory: LearnerMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO learner_memory (user_id, target_lang, facts, goals, errors, thread, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, now())
       ON CONFLICT (user_id, target_lang)
       DO UPDATE SET facts = EXCLUDED.facts,
                     goals = EXCLUDED.goals,
                     errors = EXCLUDED.errors,
                     thread = EXCLUDED.thread,
                     updated_at = now()`,
      [userId, targetLang, JSON.stringify(memory.facts), JSON.stringify(memory.goals), JSON.stringify(memory.errors), memory.thread],
    );
  }
}
