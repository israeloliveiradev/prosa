import { test, expect } from "@playwright/test";
import { ApiError } from "@/api/errors";
import { PathResponseSchema, type PathResponse, type PathUnit, type UnitStatus } from "@/api/schemas/path";
import { completionRetriable, parseOutbox, streakToShow } from "@/features/path/model/outbox-model";
import {
  buildPathView,
  dailyHref,
  findUnit,
  pathErrorKind,
  resolveSessionUnit,
  unitIndexInBand,
  unitSummary,
  unitViews,
} from "@/features/path/model/path-model";
import {
  INITIAL_TEST_FLOW,
  STORED_TEST_MAX_AGE_MS,
  allAnswered,
  answersPayload,
  parseStoredTest,
  testFlowReducer,
  type TestAttempt,
} from "@/features/path/model/test-flow";

type Mastery = PathUnit["mastery"];

const ZERO: Mastery = {
  lessons: { done: 0, required: 3, met: false },
  lemmas: { known: 0, total: 12, required: 10, met: false },
  journal: { met: false },
  test: { best: null, required: 70, available: false, met: false },
};

function unit(id: string, order: number, status: UnitStatus, mastery: Partial<Mastery> = {}): PathUnit {
  const band = id.slice(0, 2).toUpperCase() as PathUnit["band"];
  return {
    id,
    band,
    order,
    status,
    title: `Title ${id}`,
    can_do: [`I can ${id} one`, `I can ${id} two`],
    focus: ["speaking", "listening"],
    grammar: { name: `Grammar ${id}`, examples: [`Example ${id}.`] },
    mastery: { ...ZERO, ...mastery },
    unlocked_at: null,
    completed_at: null,
  };
}

/** A1 validada (2 unidades), A2 em curso (2ª ativa), B1 bloqueada. */
function samplePath(overrides: Partial<PathResponse> = {}): PathResponse {
  return {
    target_lang: "en",
    level: "A2",
    current_unit_id: "a2-02",
    units: [
      unit("a1-01", 1, "validated"),
      unit("a1-02", 2, "validated"),
      unit("a2-01", 3, "mastered", { test: { best: 88, required: 70, available: false, met: true } }),
      unit("a2-02", 4, "active", {
        lessons: { done: 3, required: 3, met: true },
        lemmas: { known: 9, total: 12, required: 10, met: false },
        journal: { met: true },
      }),
      unit("b1-01", 5, "locked"),
      unit("b1-02", 6, "locked"),
    ],
    checkpoint: { band: "A2", available: false, passed: false },
    ...overrides,
  };
}

test.describe("Trilha: o que cada estado mostra e permite", () => {
  test("a unidade em curso abre expandida, estuda e só testa quando o servidor libera", () => {
    const views = unitViews(samplePath().units);
    const active = views.find((view) => view.unit.id === "a2-02")!;
    expect(active.expanded).toBe(true);
    expect(active.clickable).toBe(true);
    expect(active.canStudy).toBe(true);
    expect(active.canTest).toBe(false);
    expect(active.testState).toBe("locked");
    expect(active.lemmaShare).toBeCloseTo(9 / 12);
    expect(active.lemmaTarget).toBeCloseTo(10 / 12);

    const open = unitViews([unit("a1-01", 1, "active", { test: { best: 50, required: 70, available: true, met: false } })])[0];
    expect(open.canTest).toBe(true);
    expect(open.testState).toBe("available");
  });

  test("bloqueada não abre nada e diz qual unidade dominar antes", () => {
    const views = unitViews(samplePath().units);
    const locked = views.find((view) => view.unit.id === "b1-01")!;
    expect(locked.clickable).toBe(false);
    expect(locked.canStudy).toBe(false);
    expect(locked.canTest).toBe(false);
    expect(locked.lockedBy).toEqual({ id: "a2-02", title: "Title a2-02" });
    const next = views.find((view) => view.unit.id === "b1-02")!;
    expect(next.lockedBy?.id).toBe("b1-01");
  });

  test("dominada e validada abrem detalhes, mas não estudam nem testam", () => {
    const views = unitViews(samplePath().units);
    for (const id of ["a1-01", "a2-01"]) {
      const view = views.find((item) => item.unit.id === id)!;
      expect(view.clickable).toBe(true);
      expect(view.expanded).toBe(false);
      expect(view.canStudy).toBe(false);
      expect(view.canTest).toBe(false);
    }
    expect(views.find((view) => view.unit.id === "a2-01")!.testState).toBe("passed");
  });

  test("ordem global vale mesmo se o servidor mandar fora de ordem", () => {
    const path = samplePath();
    const views = unitViews([...path.units].reverse());
    expect(views.map((view) => view.unit.id)).toEqual(path.units.map((item) => item.id));
  });

  test("banda validada recolhe numa linha; a banda em curso abre; a futura recolhe e diz onde começa", () => {
    const view = buildPathView(samplePath());
    expect(view.bands.map((band) => [band.band, band.kind, band.defaultOpen])).toEqual([
      ["A1", "validated", false],
      ["A2", "current", true],
      ["B1", "future", false],
    ]);
    const future = view.bands[2];
    expect(future.lockedBy).toEqual({ id: "a2-02", title: "Title a2-02" });
    expect(view.bands[0].doneCount).toBe(2);
    expect(view.bands[1].doneCount).toBe(1);
    expect(view.doneCount).toBe(3);
    expect(view.total).toBe(6);
    expect(view.current?.unit.id).toBe("a2-02");
  });

  test("checkpoint aparece no fim da sua banda (nunca numa banda validada), com o estado do servidor", () => {
    expect(buildPathView(samplePath()).bands[1].checkpoint).toBe("locked");
    expect(buildPathView(samplePath({ checkpoint: { band: "A2", available: true, passed: false } })).bands[1].checkpoint).toBe("available");
    expect(buildPathView(samplePath({ checkpoint: { band: "A2", available: true, passed: true } })).bands[1].checkpoint).toBe("passed");
    const onValidated = buildPathView(samplePath({ checkpoint: { band: "A1", available: true, passed: false } }));
    expect(onValidated.bands.every((band) => band.checkpoint === null)).toBe(true);
    expect(buildPathView(samplePath({ checkpoint: null })).bands.every((band) => band.checkpoint === null)).toBe(true);
  });

  test("banda toda dominada é 'done' e recolhe", () => {
    const path = samplePath({
      current_unit_id: "b1-01",
      units: [unit("a1-01", 1, "mastered"), unit("a1-02", 2, "mastered"), unit("b1-01", 3, "active")],
    });
    const view = buildPathView(path);
    expect(view.bands[0].kind).toBe("done");
    expect(view.bands[0].defaultOpen).toBe(false);
  });

  test("resumo de Hoje e posição na banda usam só números do servidor", () => {
    const path = samplePath();
    const active = findUnit(path, "a2-02")!;
    expect(unitSummary(active)).toEqual({
      lessons: { done: 3, required: 3, met: true },
      lemmas: { known: 9, total: 12, met: false },
      journal: true,
      test: "locked",
      best: null,
    });
    expect(unitIndexInBand(path, active)).toBe(2);
    expect(findUnit(path, "zz-99")).toBeNull();
    expect(findUnit(null, "a2-02")).toBeNull();
  });

  test("o contrato de exemplo do documento passa no schema", () => {
    const parsed = PathResponseSchema.safeParse({
      target_lang: "en",
      level: "A1",
      current_unit_id: "a1-01",
      units: [
        {
          id: "a1-01",
          band: "A1",
          order: 1,
          status: "active",
          title: "Olá, prazer",
          can_do: ["Consigo me apresentar…"],
          focus: ["speaking", "listening"],
          grammar: { name: "Present Simple: be", examples: ["I am Ana.", "Where are you from?"] },
          mastery: {
            lessons: { done: 1, required: 3, met: false },
            lemmas: { known: 4, total: 12, required: 10, met: false },
            journal: { met: false },
            test: { best: null, required: 70, available: false, met: false },
          },
          unlocked_at: "2026-11-20T10:00:00.000Z",
          completed_at: null,
        },
      ],
      checkpoint: { band: "A1", available: false, passed: false },
    });
    expect(parsed.success).toBe(true);
  });
});

test.describe("Sessão diária: qual unidade a sessão avança", () => {
  test("?unit= válido manda; senão a unidade em curso; sem trilha, nenhuma", () => {
    const path = samplePath();
    expect(resolveSessionUnit("a1-02", path)).toBe("a1-02");
    expect(resolveSessionUnit(undefined, path)).toBe("a2-02");
    expect(resolveSessionUnit("nonsense", path)).toBe("a2-02");
    expect(resolveSessionUnit(undefined, null)).toBeNull();
    expect(resolveSessionUnit(undefined, { current_unit_id: null })).toBeNull();
  });

  test("rota da sessão leva a unidade quando há uma", () => {
    expect(dailyHref("a1-03")).toBe("/daily?unit=a1-03");
    expect(dailyHref(null)).toBe("/daily");
    expect(dailyHref("../x")).toBe("/daily");
  });

  test("ofensiva do servidor vale quando é de hoje; senão fica a do aparelho", () => {
    expect(streakToShow({ server: { date: "2026-11-20", streak: 4 }, today: "2026-11-20", local: 2 })).toEqual({ value: 4, source: "server" });
    expect(streakToShow({ server: { date: "2026-11-19", streak: 4 }, today: "2026-11-20", local: 2 })).toEqual({ value: 2, source: "device" });
    expect(streakToShow({ server: null, today: "2026-11-20", local: 0 })).toEqual({ value: 0, source: "device" });
  });

  test("fila do envio: lê só o que é válido e repete só o que pode dar certo depois", () => {
    expect(parseOutbox(JSON.stringify({ pending: { date: "2026-11-20", unit_id: "a1-01", elapsed_seconds: 1180 }, last: { date: "2026-11-20", streak: 3 } }))).toEqual({
      pending: { date: "2026-11-20", unit_id: "a1-01", elapsed_seconds: 1180 },
      last: { date: "2026-11-20", streak: 3 },
    });
    expect(parseOutbox("{bad json")).toEqual({ pending: null, last: null });
    expect(parseOutbox({ pending: { date: "ontem", elapsed_seconds: -1 }, last: { date: "x", streak: "3" } })).toEqual({ pending: null, last: null });
    expect(completionRetriable(new ApiError("network", null, "offline"))).toBe(true);
    expect(completionRetriable(new ApiError("timeout", null, "slow"))).toBe(true);
    expect(completionRetriable(new ApiError("http", 503, "down"))).toBe(true);
    expect(completionRetriable(new ApiError("http", 429, "rate"))).toBe(true);
    expect(completionRetriable(new ApiError("http", 400, "Invalid request"))).toBe(false);
    expect(completionRetriable(new ApiError("http", 404, "Not found"))).toBe(false);
  });
});

test.describe("Teste da unidade e checkpoint", () => {
  const attempt: TestAttempt = {
    attemptId: "att-1",
    band: "A1",
    items: [
      { id: "q1", skill: "grammar", prompt: "P1", options: ["a", "b", "c", "d"] },
      { id: "q2", skill: "vocab", prompt: "P2", options: ["a", "b", "c", "d"] },
    ],
  };

  test("erros viram mensagens honestas: 409 ao começar é 'não aberto', ao terminar é tentativa vencida", () => {
    expect(pathErrorKind(new ApiError("http", 409, "This unit is not active"), "start")).toBe("not-available");
    expect(pathErrorKind(new ApiError("http", 409, "This attempt expired"), "finish")).toBe("expired");
    expect(pathErrorKind(new ApiError("http", 404, "gone"), "start")).toBe("unknown");
    expect(pathErrorKind(new ApiError("http", 404, "gone"), "finish")).toBe("expired");
    expect(pathErrorKind(new ApiError("http", 503, "Unit test questions are not ready yet"), "start")).toBe("not-ready");
    expect(pathErrorKind(new ApiError("network", null, "x"))).toBe("offline");
    expect(pathErrorKind(new ApiError("timeout", null, "x"))).toBe("slow");
    expect(pathErrorKind(new ApiError("http", 401, "x"))).toBe("session");
    expect(pathErrorKind(new Error("boom"))).toBe("unknown");
  });

  test("uma pergunta por vez; só termina com todas respondidas; respostas na ordem dos itens", () => {
    let state = testFlowReducer(INITIAL_TEST_FLOW, { type: "START_REQUESTED" });
    expect(state.phase).toBe("starting");
    state = testFlowReducer(state, { type: "START_SUCCEEDED", attempt });
    expect(state.phase).toBe("answering");
    state = testFlowReducer(state, { type: "PICK", choice: 7 });
    expect(state.answers).toEqual({});
    state = testFlowReducer(state, { type: "PICK", choice: 2 });
    expect(testFlowReducer(state, { type: "FINISH_REQUESTED" }).phase).toBe("answering");
    state = testFlowReducer(state, { type: "GO", index: 99 });
    expect(state.index).toBe(1);
    state = testFlowReducer(state, { type: "PICK", choice: 0 });
    expect(allAnswered(state)).toBe(true);
    expect(answersPayload(state)).toEqual([
      { item_id: "q1", choice: 2 },
      { item_id: "q2", choice: 0 },
    ]);
    state = testFlowReducer(state, { type: "FINISH_REQUESTED" });
    expect(state.phase).toBe("sending");
    const failed = testFlowReducer(state, { type: "FINISH_FAILED", kind: "offline" });
    expect(failed.phase).toBe("answering");
    expect(failed.answers).toEqual(state.answers);
    const expired = testFlowReducer(state, { type: "FINISH_FAILED", kind: "expired" });
    expect(expired.phase).toBe("error");
    expect(expired.attempt).toBeNull();
    const done = testFlowReducer(state, {
      type: "FINISH_SUCCEEDED",
      result: { mode: "unit", data: { score: 75, passed: true, correct: 6, total: 8, unit: null, next_unit_id: "a1-02" } },
    });
    expect(done.phase).toBe("result");
  });

  test("409 ao começar leva à tela de erro, sem perguntas", () => {
    const state = testFlowReducer(testFlowReducer(INITIAL_TEST_FLOW, { type: "START_REQUESTED" }), { type: "START_FAILED", kind: "not-available" });
    expect(state.phase).toBe("error");
    expect(state.error).toEqual({ kind: "not-available", during: "start" });
    expect(state.attempt).toBeNull();
  });

  test("tentativa guardada volta no F5, sem respostas inválidas e não depois de 2 horas", () => {
    const now = 1_000_000_000;
    const raw = JSON.stringify({ attempt, answers: { q1: 1, zz: 2, q2: -1 }, index: 5, savedAt: now - 1000 });
    const stored = parseStoredTest(raw, now)!;
    expect(stored.attempt.attemptId).toBe("att-1");
    const restored = testFlowReducer(INITIAL_TEST_FLOW, { type: "RESTORED", attempt: stored.attempt, answers: stored.answers, index: stored.index });
    expect(restored.answers).toEqual({ q1: 1 });
    expect(restored.index).toBe(1);
    expect(parseStoredTest(JSON.stringify({ attempt, answers: {}, index: 0, savedAt: now - STORED_TEST_MAX_AGE_MS - 1 }), now)).toBeNull();
    expect(parseStoredTest("nope", now)).toBeNull();
  });
});
