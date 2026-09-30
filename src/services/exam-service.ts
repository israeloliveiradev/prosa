import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import type { AuthUser } from "../auth/session.js";
import {
  blendForecast,
  examBand,
  examFits,
  examOf,
  examsFor,
  formatExamScore,
  publicMock,
  scoreMock,
  skillSeed,
  toScale,
  type ExamId,
} from "./exam-tracks.js";
import { applySignals } from "./learner-profile.js";
import type { ProfileStore } from "./profile-store.js";

interface AttemptRow {
  predicted: number;
  raw_score: number;
  band: string;
  exam_id: string;
  finished_at: Date;
  sections: unknown;
}

export class ExamService {
  constructor(
    private readonly pool: Pool,
    private readonly profiles: ProfileStore,
  ) {}

  async status(user: AuthUser, targetLang: string) {
    const lang = code(targetLang);
    const profile = await this.profiles.load(user.id, lang);
    const exams = examsFor(lang).map((exam) => ({
      id: exam.id,
      title: exam.title,
      scale: exam.scale,
    }));
    const track = examFits(profile.exam_track, lang) ? profile.exam_track : "";
    const history = track ? await this.history(user.id, lang, track as ExamId) : [];
    const latest = history[0];
    const seed = skillSeed(profile);
    const exam = track ? examOf(track) : null;
    const forecast = exam
      ? {
          exam_id: exam.id,
          predicted: latest?.predicted ?? toScale(seed, exam),
          band: latest?.band ?? examBand(exam.id, toScale(seed, exam)),
          display: formatExamScore(exam.id, latest?.predicted ?? toScale(seed, exam)),
          attempts: history.length,
        }
      : null;
    return { exams, track, forecast, history, seed };
  }

  async choose(user: AuthUser, targetLang: string, examId: ExamId) {
    const lang = code(targetLang);
    if (!examFits(examId, lang)) {
      throw new AppError(400, "This exam is not offered for that language");
    }
    const profile = await this.profiles.load(user.id, lang);
    profile.exam_track = examId;
    await this.profiles.save(user.id, lang, profile);
    return this.status(user, lang);
  }

  mock(targetLang: string, examId: ExamId) {
    const lang = code(targetLang);
    if (!examFits(examId, lang)) {
      throw new AppError(400, "This exam is not offered for that language");
    }
    return publicMock(examId);
  }

  async finish(
    user: AuthUser,
    input: {
      target_lang: string;
      exam_id: ExamId;
      answers: Record<string, number>;
      writing: string;
      speaking: string;
      seconds: number;
    },
  ) {
    const lang = code(input.target_lang);
    if (!examFits(input.exam_id, lang)) {
      throw new AppError(400, "This exam is not offered for that language");
    }
    const exam = examOf(input.exam_id);
    if (!exam) {
      throw new AppError(400, "Unknown exam");
    }
    const profile = await this.profiles.load(user.id, lang);
    const scored = scoreMock(input.exam_id, input.answers, input.writing, input.speaking);
    const previous = await this.latestPredicted(user.id, lang, input.exam_id);
    const predicted = blendForecast(previous, skillSeed(profile), scored.raw, exam);
    const band = examBand(input.exam_id, predicted);
    await this.pool.query(
      `INSERT INTO exam_attempts (user_id, target_lang, exam_id, predicted, raw_score, band, sections)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [user.id, lang, input.exam_id, predicted, scored.raw, band, JSON.stringify(scored.sections)],
    );
    const next = applySignals(profile, {
      reading: scored.sections.reading,
      listening: scored.sections.listening,
      ...(input.writing.trim() ? { writing: scored.sections.writing } : {}),
      ...(input.speaking.trim() ? { fluency: scored.sections.speaking } : {}),
    });
    next.exam_track = input.exam_id;
    await this.profiles.save(user.id, lang, next);
    return {
      predicted,
      previous,
      band,
      raw: scored.raw,
      display: formatExamScore(input.exam_id, predicted),
      sections: scored.sections,
      seconds: input.seconds,
    };
  }

  private async history(userId: string, lang: string, examId: ExamId) {
    const result = await this.pool.query<AttemptRow>(
      `SELECT predicted, raw_score, band, exam_id, finished_at, sections
       FROM exam_attempts
       WHERE user_id = $1 AND target_lang = $2 AND exam_id = $3
       ORDER BY finished_at DESC
       LIMIT 5`,
      [userId, lang, examId],
    );
    return result.rows.map((row) => ({
      predicted: row.predicted,
      raw: row.raw_score,
      band: row.band,
      exam_id: row.exam_id,
      finished_at: row.finished_at.toISOString(),
      display: formatExamScore(examId, row.predicted),
    }));
  }

  private async latestPredicted(userId: string, lang: string, examId: ExamId): Promise<number | null> {
    const result = await this.pool.query<{ predicted: number }>(
      `SELECT predicted FROM exam_attempts
       WHERE user_id = $1 AND target_lang = $2 AND exam_id = $3
       ORDER BY finished_at DESC
       LIMIT 1`,
      [userId, lang, examId],
    );
    return result.rows[0]?.predicted ?? null;
  }
}

function code(lang: string): string {
  return lang.trim().toLowerCase().slice(0, 2);
}
