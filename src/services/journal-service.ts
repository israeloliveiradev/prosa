import type { EvaluateJournalBody, JournalEvaluation } from "../schemas/journal.js";
import type { ReconstructionBody, ReconstructionReport } from "../schemas/reconstruction.js";
import type { GeminiGateway } from "./gemini-gateway.js";

export class JournalService {
  constructor(private readonly gemini: GeminiGateway) {}

  evaluate(input: EvaluateJournalBody): Promise<JournalEvaluation> {
    return this.gemini.evaluateJournal(input);
  }

  reconstruct(input: ReconstructionBody): Promise<ReconstructionReport> {
    return this.gemini.reconstruct(input);
  }
}
