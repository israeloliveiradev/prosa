import { test, expect } from "@playwright/test";
import { ApiError } from "@/api/errors";
import {
  PlacementAttemptSchema,
  PlacementFinishSchema,
  PlacementStatusSchema,
  PlacementStepSchema,
  type PlacementAttempt,
  type PlacementFinish,
  type PlacementItem,
  type PlacementStatus,
} from "@/api/schemas/placement";
import {
  applyAnswer,
  canStartPlacement,
  currentItem,
  fillCopy,
  initialPlacementFlowState,
  isAttemptComplete,
  isOutOfSync,
  levelDelta,
  nextTestDate,
  orderedBands,
  percent,
  placementErrorKind,
  placementFlowReducer,
  skillSignals,
  statusKind,
  toOutcome,
} from "@/features/placement/model/placement-flow";

function item(id: string, band: PlacementItem["band"] = "A2", kind: PlacementItem["kind"] = "vocab"): PlacementItem {
  return { id, band, kind, prompt: `prompt ${id}`, hint: "", options: ["a", "b", "c", "d"] };
}

function attempt(patch: Partial<PlacementAttempt> = {}): PlacementAttempt {
  return {
    attempt_id: "11111111-1111-4111-8111-111111111111",
    target_lang: "en",
    through_lang: "pt",
    kind: "placement",
    items: [item("i1")],
    answered: {},
    index: 0,
    adaptive: true,
    cap: 24,
    ...patch,
  };
}

function status(patch: Partial<PlacementStatus> = {}): PlacementStatus {
  return {
    target_lang: "en",
    through_lang: "pt",
    current_level: "A2",
    last: null,
    due: true,
    due_reason: "never",
    days_until: 0,
    open_attempt_id: null,
    history: [],
    ...patch,
  };
}

function finish(patch: Partial<PlacementFinish> = {}): PlacementFinish {
  return {
    attempt_id: "11111111-1111-4111-8111-111111111111",
    target_lang: "en",
    through_lang: "pt",
    kind: "placement",
    level: "B1",
    previous_level: "A2",
    score: 75,
    correct: 9,
    total: 12,
    bands: [
      { band: "B1", correct: 3, total: 4 },
      { band: "A2", correct: 4, total: 4 },
      { band: "B2", correct: 2, total: 4 },
    ],
    skills: [
      { skill: "vocab", correct: 3, total: 4 },
      { skill: "listening", correct: 2, total: 3 },
    ],
    history: [],
    ...patch,
  };
}

test.describe("placement: estado inicial", () => {
  test("sem autoStart abre no status e carrega; com autoStart já começa", () => {
    const idle = initialPlacementFlowState();
    expect(idle.phase).toBe("status");
    expect(idle.statusLoading).toBe(true);
    expect(idle.pending).toBe(false);

    const auto = initialPlacementFlowState({ autoStart: true });
    expect(auto.phase).toBe("starting");
    expect(auto.pending).toBe(true);
    expect(auto.statusLoading).toBe(false);
  });
});

test.describe("placement: transições do reducer", () => {
  test("início abre a pergunta da vez e recupera a opção já salva numa tentativa fixa", () => {
    const fixed = attempt({ adaptive: false, items: [item("i1"), item("i2")], answered: { i1: 2 }, index: 0 });
    const state = placementFlowReducer(initialPlacementFlowState({ autoStart: true }), { type: "START_SUCCEEDED", attempt: fixed });
    expect(state.phase).toBe("question");
    expect(state.picked).toBe(2);
    expect(state.pending).toBe(false);
  });

  test("início de uma tentativa já toda respondida vai direto para o fechamento", () => {
    const answered = attempt({ items: [item("i1"), item("i2")], answered: { i1: 0, i2: 1 }, index: 1 });
    const state = placementFlowReducer(initialPlacementFlowState(), { type: "START_SUCCEEDED", attempt: answered });
    expect(state.phase).toBe("finishing");
    expect(state.pending).toBe(true);
  });

  test("falha ao começar fica em 'starting' com o erro para tentar de novo", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "START_REQUESTED" });
    state = placementFlowReducer(state, { type: "START_FAILED", error: "not-ready" });
    expect(state.phase).toBe("starting");
    expect(state.error).toBe("not-ready");
    expect(state.pending).toBe(false);
  });

  test("escolha só vale na fase de pergunta e fora de envio", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "PICKED", choice: 1 });
    expect(state.picked).toBeNull();
    state = placementFlowReducer(state, { type: "START_SUCCEEDED", attempt: attempt() });
    state = placementFlowReducer(state, { type: "PICKED", choice: 3 });
    expect(state.picked).toBe(3);
    state = placementFlowReducer(state, { type: "ANSWER_REQUESTED" });
    state = placementFlowReducer(state, { type: "PICKED", choice: 0 });
    expect(state.picked).toBe(3);
  });

  test("resposta adaptativa acrescenta a próxima pergunta e limpa a escolha", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "START_SUCCEEDED", attempt: attempt() });
    state = placementFlowReducer(state, { type: "PICKED", choice: 1 });
    state = placementFlowReducer(state, { type: "ANSWER_REQUESTED" });
    state = placementFlowReducer(state, {
      type: "ANSWER_SUCCEEDED",
      itemId: "i1",
      choice: 1,
      step: { saved: true, done: false, asked: 1, cap: 24, next: item("i2", "B1", "grammar") },
    });
    expect(state.phase).toBe("question");
    expect(state.attempt?.items.map((entry) => entry.id)).toEqual(["i1", "i2"]);
    expect(state.attempt?.index).toBe(1);
    expect(state.attempt?.answered).toEqual({ i1: 1 });
    expect(currentItem(state.attempt)?.id).toBe("i2");
    expect(state.picked).toBeNull();
    expect(state.pending).toBe(false);
  });

  test("quando o motor diz 'done', a tela vai para o fechamento", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "START_SUCCEEDED", attempt: attempt() });
    state = placementFlowReducer(state, {
      type: "ANSWER_SUCCEEDED",
      itemId: "i1",
      choice: 0,
      step: { saved: true, done: true, asked: 9, cap: 24, next: null },
    });
    expect(state.phase).toBe("finishing");
    expect(state.pending).toBe(true);
  });

  test("falha ao responder mantém a pergunta e a escolha", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "START_SUCCEEDED", attempt: attempt() });
    state = placementFlowReducer(state, { type: "PICKED", choice: 2 });
    state = placementFlowReducer(state, { type: "ANSWER_REQUESTED" });
    state = placementFlowReducer(state, { type: "ANSWER_FAILED", error: "offline" });
    expect(state.phase).toBe("question");
    expect(state.picked).toBe(2);
    expect(state.error).toBe("offline");
  });

  test("fechamento com sucesso mostra o resultado; falha deixa tentar de novo", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "FINISH_REQUESTED" });
    state = placementFlowReducer(state, { type: "FINISH_FAILED", error: "slow" });
    expect(state.phase).toBe("finishing");
    expect(state.error).toBe("slow");
    state = placementFlowReducer(state, { type: "FINISH_SUCCEEDED", result: finish() });
    expect(state.phase).toBe("result");
    expect(state.result?.level).toBe("B1");
    expect(state.error).toBeNull();
  });

  test("status carregado e falha de status ficam fora da fase do teste", () => {
    let state = placementFlowReducer(initialPlacementFlowState(), { type: "STATUS_FAILED", error: "offline" });
    expect(state.statusError).toBe("offline");
    expect(state.statusLoading).toBe(false);
    state = placementFlowReducer(state, { type: "STATUS_REQUESTED" });
    expect(state.statusError).toBeNull();
    state = placementFlowReducer(state, { type: "STATUS_LOADED", status: status() });
    expect(state.status?.current_level).toBe("A2");
    expect(state.phase).toBe("status");
  });
});

test.describe("placement: respostas e tentativa", () => {
  test("tentativa fixa avança pelo índice e termina na última", () => {
    const fixed = attempt({ adaptive: false, items: [item("i1"), item("i2")], cap: 2 });
    const first = applyAnswer(fixed, "i1", 0, { saved: true, done: false, next: null });
    expect(first.done).toBe(false);
    expect(first.attempt.index).toBe(1);
    const second = applyAnswer(first.attempt, "i2", 3, { saved: true, done: false, next: null });
    expect(second.done).toBe(true);
    expect(second.attempt.answered).toEqual({ i1: 0, i2: 3 });
  });

  test("isAttemptComplete exige todas as perguntas servidas respondidas", () => {
    expect(isAttemptComplete(attempt({ items: [] }))).toBe(false);
    expect(isAttemptComplete(attempt({ answered: {} }))).toBe(false);
    expect(isAttemptComplete(attempt({ answered: { i1: 0 } }))).toBe(true);
  });
});

test.describe("placement: status e espera entre testes", () => {
  test("statusKind distingue aberto, nunca medido, liberado e em espera", () => {
    expect(statusKind(status({ open_attempt_id: "x" }))).toBe("open");
    expect(statusKind(status())).toBe("never");
    const last = { finished_at: "2026-11-01T10:00:00.000Z", result_level: "B1", previous_level: "A2", score: 70, kind: "placement" as const };
    expect(statusKind(status({ last, due: true, due_reason: "scheduled" }))).toBe("due");
    expect(statusKind(status({ last, due: false, due_reason: "wait", days_until: 3 }))).toBe("wait");
    expect(canStartPlacement("wait")).toBe(false);
    expect(canStartPlacement("never")).toBe(true);
    expect(canStartPlacement("open")).toBe(true);
  });

  test("nextTestDate soma os dias que o servidor informou", () => {
    const now = new Date("2026-11-19T12:00:00.000Z");
    expect(nextTestDate(status({ days_until: 3 }), now)?.toISOString()).toBe("2026-11-22T12:00:00.000Z");
    expect(nextTestDate(status({ days_until: 0 }), now)).toBeNull();
    expect(nextTestDate(status({ days_until: null }), now)).toBeNull();
  });
});

test.describe("placement: resultado", () => {
  test("toOutcome entrega nível, nível anterior, faixas e habilidades", () => {
    const outcome = toOutcome(finish());
    expect(outcome).toEqual({
      level: "B1",
      previousLevel: "A2",
      bands: finish().bands,
      skills: finish().skills,
    });
    expect(toOutcome(finish({ previous_level: null })).previousLevel).toBeUndefined();
  });

  test("levelDelta compara na ordem do CEFR", () => {
    expect(levelDelta("A2", "B1")).toBe("up");
    expect(levelDelta("C1", "B2")).toBe("down");
    expect(levelDelta("B1", "B1")).toBe("same");
    expect(levelDelta(null, "B1")).toBe("first");
  });

  test("percent fica entre 0 e 100 e não divide por zero", () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(3, 4)).toBe(75);
    expect(percent(12, 10)).toBe(100);
  });

  test("orderedBands ordena pelo CEFR e esconde faixas sem pergunta", () => {
    const bands = orderedBands([
      { band: "B2", correct: 1, total: 2 },
      { band: "A1", correct: 0, total: 0 },
      { band: "A2", correct: 2, total: 2 },
    ]);
    expect(bands.map((band) => band.band)).toEqual(["A2", "B2"]);
  });

  test("skillSignals converte habilidades em sinais do perfil", () => {
    expect(
      skillSignals([
        { skill: "vocab", correct: 3, total: 4 },
        { skill: "grammar", correct: 0, total: 0 },
        { skill: "listening", correct: 1, total: 2 },
      ]),
    ).toEqual({ vocabulary: 75, listening: 50 });
  });
});

test.describe("placement: erros e textos", () => {
  test("placementErrorKind dá um aviso honesto para cada falha", () => {
    expect(placementErrorKind(new ApiError("network", null, "down"))).toBe("offline");
    expect(placementErrorKind(new ApiError("timeout", null, "slow"))).toBe("slow");
    expect(placementErrorKind(new ApiError("auth", null, "no session"))).toBe("session");
    expect(placementErrorKind(new ApiError("http", 401, "Unauthorized"))).toBe("session");
    expect(placementErrorKind(new ApiError("http", 429, "Too many"))).toBe("rate-limited");
    expect(placementErrorKind(new ApiError("http", 503, "not ready"))).toBe("not-ready");
    expect(placementErrorKind(new ApiError("http", 409, "closed"))).toBe("closed");
    expect(placementErrorKind(new ApiError("http", 500, "boom"))).toBe("unknown");
    expect(placementErrorKind(new TypeError("Failed to fetch"))).toBe("offline");
    expect(placementErrorKind(new Error("x"))).toBe("unknown");
    expect(isOutOfSync(new ApiError("http", 400, "Answer the current question"))).toBe(true);
    expect(isOutOfSync(new ApiError("http", 503, "x"))).toBe(false);
  });

  test("fillCopy preenche marcadores e deixa os desconhecidos como estão", () => {
    expect(fillCopy("Pergunta {n} de {total}", { n: 3, total: 12 })).toBe("Pergunta 3 de 12");
    expect(fillCopy("{a} e {b}", { a: "x" })).toBe("x e {b}");
  });
});

test.describe("placement: schemas não inventam nível", () => {
  test("status sem nível medido não vira B1", () => {
    const parsed = PlacementStatusSchema.parse({ last: null });
    expect(parsed.current_level).toBeNull();
    expect(parsed.history).toEqual([]);
  });

  test("resultado sem nível anterior fica nulo (não A2) e sem habilidades vira lista vazia", () => {
    const parsed = PlacementFinishSchema.parse({
      attempt_id: "a",
      target_lang: "en",
      through_lang: "pt",
      level: "B2",
      score: 80,
      correct: 8,
      total: 10,
    });
    expect(parsed.previous_level).toBeNull();
    expect(parsed.skills).toEqual([]);
    expect(PlacementFinishSchema.safeParse({ attempt_id: "a", target_lang: "en", through_lang: "pt", level: "Z9", score: 1, correct: 1, total: 1 }).success).toBe(false);
  });

  test("tentativa e passo aceitam a resposta real do servidor", () => {
    const real = {
      attempt_id: "1221cde9-d2ff-43e8-aff1-440bcaeba2a7",
      target_lang: "en",
      through_lang: "pt",
      kind: "placement",
      items: [
        {
          id: "en-a2-l1",
          band: "A2",
          kind: "listening",
          prompt: "A que horas a loja fecha?",
          hint: "Ouça e escolha.",
          options: ["Não fecha.", "Ao meio-dia.", "Às sete.", "Às nove."],
          audio_text: "The shop closes at seven.",
        },
      ],
      answered: {},
      index: 0,
      adaptive: true,
      cap: 24,
    };
    const parsed = PlacementAttemptSchema.parse(real);
    expect(currentItem(parsed)?.audio_text).toBe("The shop closes at seven.");
    const step = PlacementStepSchema.parse({ saved: true, done: true, asked: 12, cap: 24, next: null });
    expect(step.done).toBe(true);
  });
});
