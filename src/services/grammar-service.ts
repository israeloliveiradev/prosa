import type { GrammarBlock } from "../schemas/grammar.js";
import { GRAMMAR_ROLES } from "../schemas/grammar.js";
import { AppError } from "../http/errors.js";
import type { AuthUser } from "../auth/session.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import type { NeuralVoice } from "./neural-voice.js";

export function orderGrammarBlocks(blocks: GrammarBlock[]): GrammarBlock[] | null {
  const ordered = GRAMMAR_ROLES.map((role) => blocks.find((block) => block.role === role));
  if (ordered.some((block) => !block)) {
    return null;
  }
  return ordered.map((block) => {
    const current = block as GrammarBlock;
    const options = [current.text, ...current.options.filter((option) => option !== current.text)].slice(0, 4);
    return { role: current.role, text: current.text, options };
  });
}

export class GrammarService {
  constructor(
    private readonly gemini: GeminiGateway,
    private readonly neural: NeuralVoice,
  ) {}

  async deconstruct(user: AuthUser, sentence: string): Promise<{ sentence: string; blocks: GrammarBlock[] }> {
    const raw = await this.gemini.deconstructGrammar({
      targetLang: user.target_lang,
      nativeLang: user.native_lang,
      level: user.level,
      sentence,
    });
    const blocks = orderGrammarBlocks(raw.blocks);
    if (!blocks) {
      throw new AppError(502, "Grammar response failed validation");
    }
    return { sentence, blocks };
  }

  async vary(
    user: AuthUser,
    blocks: GrammarBlock[],
    voice?: string,
  ): Promise<{ sentence: string; blocks: GrammarBlock[]; audio_url: string | null; words: { text: string; offset_ms: number }[] }> {
    const ordered = orderGrammarBlocks(blocks);
    if (!ordered) {
      throw new AppError(400, "Grammar blocks are incomplete");
    }
    const rebuilt = await this.gemini.varyGrammar({
      targetLang: user.target_lang,
      level: user.level,
      blocks: ordered.map((block) => ({ role: block.role, text: block.text })),
    });
    const next = orderGrammarBlocks(
      rebuilt.blocks.map((block) => {
        const original = ordered.find((item) => item.role === block.role);
        // Bloco vazio (conector absorvido pelo verbo): mantém o marcador da desmontagem.
        const text = block.text.trim() || original?.text || "";
        return { role: block.role, text, options: original?.options ?? [text] };
      }),
    );
    if (!next) {
      throw new AppError(502, "Grammar response failed validation");
    }
    // A voz do servidor (edge-tts) depende de um serviço externo. Sem ela, a frase nova sai
    // sem áudio e o app lê com a voz do aparelho, em vez de perder a variação inteira (502).
    const spoken = await this.neural
      .speak({
        text: rebuilt.sentence,
        lang: user.target_lang.toLowerCase(),
        ...(voice ? { voice } : {}),
      })
      .catch(() => null);
    return { sentence: rebuilt.sentence, blocks: next, audio_url: spoken?.audioUrl ?? null, words: spoken?.words ?? [] };
  }
}
