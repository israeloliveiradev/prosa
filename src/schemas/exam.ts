import { z } from "zod";
import { EXAM_IDS } from "../services/exam-tracks.js";

const lang = z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/);
const examId = z.enum(EXAM_IDS);

export const examQuerySchema = z.object({
  target_lang: lang,
  exam_id: examId.optional(),
});

export const examChooseSchema = z.object({
  target_lang: lang,
  exam_id: examId,
});

export const examFinishSchema = z.object({
  target_lang: lang,
  exam_id: examId,
  answers: z.record(z.string().trim().min(2).max(40), z.number().int().min(0).max(3)).default({}),
  writing: z.string().trim().max(4000).default(""),
  speaking: z.string().trim().max(2000).default(""),
  seconds: z.number().int().min(0).max(1800),
});
