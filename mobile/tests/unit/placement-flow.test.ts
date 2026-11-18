import { test, expect } from "@playwright/test";
import {
  placementFlowReducer,
  initialPlacementFlowState,
  deltaLabel,
  skillPercentage,
} from "../../src/features/placement/model/placement-flow";
import type { PlacementAttempt, PlacementItem, PlacementFinish } from "../../src/api/schemas/placement";

test.describe("Placement: placement-flow reducer e modelo puro", () => {
  test("estado inicial com autoStart começa em 'loading', sem autoStart em 'intro'", () => {
    const defaultState = initialPlacementFlowState();
    expect(defaultState.phase).toBe("intro");
    expect(defaultState.currentIndex).toBe(0);
    expect(defaultState.pickedOption).toBeNull();
    expect(defaultState.result).toBeNull();

    const autoState = initialPlacementFlowState({ autoStart: true });
    expect(autoState.phase).toBe("loading");
  });

  test("deltaLabel calcula corretamente subida, manutenção ou ajuste de nível", () => {
    const copy = { placeUp: "Subiu", placeDown: "Ajustou", placeSame: "Manteve" };

    expect(deltaLabel("A1", "A2", copy)).toBe("Subiu");
    expect(deltaLabel("A2", "B1", copy)).toBe("Subiu");
    expect(deltaLabel("B1", "B1", copy)).toBe("Manteve");
    expect(deltaLabel(null, "A2", copy)).toBe("Manteve");
    expect(deltaLabel("B2", "B1", copy)).toBe("Ajustou");
  });

  test("skillPercentage calcula a porcentagem corretamente limitada a 0-100", () => {
    expect(skillPercentage(0, 0)).toBe(0);
    expect(skillPercentage(3, 4)).toBe(75);
    expect(skillPercentage(10, 10)).toBe(100);
    expect(skillPercentage(12, 10)).toBe(100);
  });

  test("START_ATTEMPT move para fase 'play' e inicializa índice", () => {
    const attempt: PlacementAttempt = {
      attempt_id: "att_1",
      target_lang: "en",
      through_lang: "pt",
      kind: "placement",
      items: [
        {
          id: "item_1",
          band: "A2",
          kind: "vocab",
          prompt: "What is book?",
          hint: "",
          options: ["Livro", "Mesa", "Caneta", "Cadeira"],
        },
      ],
      answered: {},
      index: 0,
      adaptive: true,
      cap: 12,
    };

    const state = placementFlowReducer(initialPlacementFlowState(), {
      type: "START_ATTEMPT",
      attempt,
    });

    expect(state.phase).toBe("play");
    expect(state.attempt?.attempt_id).toBe("att_1");
    expect(state.currentIndex).toBe(0);
  });

  test("PICK_OPTION atualiza a opção escolhida", () => {
    let state = initialPlacementFlowState();
    state = placementFlowReducer(state, { type: "PICK_OPTION", choice: 2 });
    expect(state.pickedOption).toBe(2);
  });

  test("ANSWER_SUCCESS adiciona próximo item e avança currentIndex quando não finalizado", () => {
    const initialItem: PlacementItem = {
      id: "i1",
      band: "A1",
      kind: "vocab",
      prompt: "Hello",
      hint: "",
      options: ["Olá", "Tchau"],
    };
    const nextItem: PlacementItem = {
      id: "i2",
      band: "A2",
      kind: "grammar",
      prompt: "I ___ student",
      hint: "",
      options: ["am", "is"],
    };

    let state = placementFlowReducer(initialPlacementFlowState(), {
      type: "START_ATTEMPT",
      attempt: {
        attempt_id: "att_1",
        target_lang: "en",
        through_lang: "pt",
        kind: "placement",
        items: [initialItem],
        answered: {},
        index: 0,
        adaptive: true,
        cap: 12,
      },
    });

    state = placementFlowReducer(state, {
      type: "ANSWER_SUCCESS",
      nextItem,
      done: false,
    });

    expect(state.currentIndex).toBe(1);
    expect(state.attempt?.items.length).toBe(2);
    expect(state.pickedOption).toBeNull();
  });

  test("SET_RESULT transiciona para fase 'result' com dados finais", () => {
    const result: PlacementFinish = {
      attempt_id: "att_1",
      target_lang: "en",
      through_lang: "pt",
      kind: "placement",
      level: "B1",
      previous_level: "A2",
      score: 82,
      correct: 10,
      total: 12,
      bands: [],
      skills: [],
      history: [],
    };

    const state = placementFlowReducer(initialPlacementFlowState(), {
      type: "SET_RESULT",
      result,
    });

    expect(state.phase).toBe("result");
    expect(state.result?.level).toBe("B1");
    expect(state.result?.score).toBe(82);
  });
});
