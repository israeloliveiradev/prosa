import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import type { EvaluateJournalBody, JournalEvaluation } from "../schemas/journal.js";
import type { ReconstructionBody, ReconstructionReport } from "../schemas/reconstruction.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import {
  emptyMemory,
  feedbackStep,
  mergeMemory,
  readMemory,
  type LearnerMemory,
  type RepairStep,
} from "./learner-memory.js";
import { calqueCards, countOf, recurringCorrectionCards, recurringGrammarCards, type RepairCard } from "./repair-cards.js";
import { ProfileStore } from "./profile-store.js";
import { recordJournalClosure } from "./path-service.js";

const PATH_LANGS = ["en", "es", "de", "ru", "fr", "it", "ja"];

/**
 * Um diário conta para a trilha quando tem corpo de verdade: 6 palavras ou mais
 * (em ja, 12 caracteres ou mais, já que não há espaços).
 */
export function journalCountsForPath(text: string, targetLang: string): boolean {
  const clean = text.trim();
  if (targetLang.toLowerCase() === "ja") {
    return clean.replace(/[\s　]/g, "").length >= 12;
  }
  return clean.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length >= 6;
}

export interface JournalCorrectionView {
  original: string;
  corrected: string;
  reason: string;
  kind: string;
  step: RepairStep;
}

export interface JournalEvaluationView {
  score: number;
  corrections: JournalCorrectionView[];
  native_upgrade: string;
  step: RepairStep;
  cards: RepairCard[];
}

export interface ReconstructionView extends ReconstructionReport {
  step: RepairStep;
  cards: RepairCard[];
}

const RANK: Record<RepairStep, number> = { none: 0, prompt: 1, hint: 2, correction: 3 };

export function ladderStep(steps: RepairStep[]): RepairStep {
  return steps.reduce((low, step) => (RANK[step] < RANK[low] ? step : low), "correction" as RepairStep);
}

export function veilCorrection(
  item: { original: string; corrected: string; reason: string; kind: string },
  attempt: number,
  errors: LearnerMemory["errors"],
): JournalCorrectionView {
  const step = feedbackStep(attempt, item.kind, errors);
  return {
    original: item.original,
    corrected: step === "correction" ? item.corrected : "",
    reason: step === "prompt" ? "" : item.reason,
    kind: step === "prompt" ? "" : item.kind,
    step,
  };
}

export class JournalService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async evaluate(input: EvaluateJournalBody, user: AuthUser | null): Promise<JournalEvaluationView> {
    const evaluation = await this.gemini.evaluateJournal(input);
    const memory = user ? await this.load(user.id, input.target_lang) : emptyMemory();
    const corrections = evaluation.corrections.map((item) => veilCorrection(item, input.attempt, memory.errors));
    const step = ladderStep(corrections.map((item) => item.step));
    let stored = memory;
    if (input.attempt === 1) {
      for (const item of evaluation.corrections) {
        stored = mergeMemory(stored, { facts: [], goal: "", error: item.kind, thread: "" });
      }
      if (user) {
        await this.save(user.id, input.target_lang, stored);
        await this.markKinds(user.id, input.target_lang, evaluation.corrections.map((item) => item.kind));
      }
    }
    const cards = input.attempt === 1 ? recurringCorrectionCards(evaluation.corrections, memory.errors, stored.errors) : [];
    if (user && cards.length > 0) {
      await this.keepCards(user.id, input.target_lang, cards);
    }
    // Escada fechada (correção completa à vista ou texto sem erros): o servidor registra o
    // diário do dia para o domínio da unidade. Nenhuma flag do cliente entra nisso.
    const targetLang = input.target_lang.toLowerCase();
    if (user && step === "correction" && PATH_LANGS.includes(targetLang) && journalCountsForPath(input.text, targetLang)) {
      try {
        await recordJournalClosure(this.pool, {
          userId: user.id,
          targetLang,
          attempt: input.attempt,
          score: evaluation.score,
        });
      } catch {
        // A correção já chegou ao aluno; o registro da trilha não derruba o diário.
      }
    }
    return {
      score: evaluation.score,
      corrections,
      native_upgrade: step === "correction" ? evaluation.native_upgrade : "",
      step,
      cards,
    };
  }

  async reconstruct(input: ReconstructionBody, user: AuthUser | null): Promise<ReconstructionView> {
    const report = await this.gemini.reconstruct(input);
    const memory = user ? await this.load(user.id, input.target_lang) : emptyMemory();
    const clean = report.grammar.length === 0 && report.literals.length === 0;
    const step = clean ? "correction" : feedbackStep(input.try_index, "", []);
    const cards =
      input.try_index === 1
        ? [...calqueCards(report.literals), ...recurringGrammarCards(report.grammar, countOf(memory.errors, "grammar"))]
        : [];
    if (input.try_index === 1) {
      let next = memory;
      if (report.grammar.length > 0) {
        next = mergeMemory(next, { facts: [], goal: "", error: "grammar", thread: "" });
      }
      if (report.literals.length > 0) {
        next = mergeMemory(next, { facts: [], goal: "", error: "literal translation", thread: "" });
      }
      if (user) {
        await this.save(user.id, input.target_lang, next);
        await this.keepCards(user.id, input.target_lang, cards);
      }
    }
    return {
      score: report.score,
      step,
      cards,
      grammar: report.grammar.map((item) => ({
        ...item,
        corrected: step === "correction" ? item.corrected : "",
        reason: step === "prompt" ? "" : item.reason,
      })),
      literals: report.literals.map((item) => ({
        ...item,
        native_alternative: step === "correction" ? item.native_alternative : "",
        reason: step === "prompt" ? "" : item.reason,
      })),
    };
  }

  private async keepCards(userId: string, targetLang: string, cards: RepairCard[]): Promise<void> {
    if (!["en", "es", "de", "ru", "fr", "it", "ja"].includes(targetLang)) {
      return;
    }
    for (const card of cards) {
      try {
        const found = await this.pool.query(
          `SELECT id FROM srs_cards WHERE user_id = $1 AND target_lang = $2 AND lower(front_phrase) = lower($3) LIMIT 1`,
          [userId, targetLang, card.front_phrase],
        );
        if ((found.rowCount ?? 0) > 0) {
          continue;
        }
        await this.pool.query(
          `INSERT INTO srs_cards (user_id, target_lang, front_phrase, back_translation, context_sentence, next_review_at)
           VALUES ($1, $2, $3, $4, $5, now())`,
          [userId, targetLang, card.front_phrase, card.back_translation, card.context_sentence],
        );
      } catch {
        continue;
      }
    }
  }

  private async load(userId: string, targetLang: string): Promise<LearnerMemory> {
    const result = await this.pool.query<{ facts: unknown; goals: unknown; errors: unknown; thread: string | null }>(
      `SELECT facts, goals, errors, thread FROM learner_memory WHERE user_id = $1 AND target_lang = $2`,
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

  private async markKinds(userId: string, targetLang: string, kinds: string[]): Promise<void> {
    const store = new ProfileStore(this.pool);
    for (const kind of kinds) {
      if (!kind.trim()) {
        continue;
      }
      try {
        await store.merge(userId, targetLang, { error: kind.trim() });
      } catch {
        continue;
      }
    }
  }
}

export type { JournalEvaluation };
