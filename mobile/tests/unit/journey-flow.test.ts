import { test, expect } from "@playwright/test";
import {
  journeyFlowReducer,
  initialJourneyFlowState,
  validatePair,
  previousStep,
  nextStep,
  stepIndex,
  JOURNEY_STEPS,
} from "../../src/features/onboarding/model/journey-flow";

test.describe("Onboarding: journey-flow reducer e modelo puro", () => {
  test("estado inicial padrão inicia em 'welcome' com par en/pt", () => {
    const state = initialJourneyFlowState();
    expect(state.step).toBe("welcome");
    expect(state.target_lang).toBe("en");
    expect(state.through_lang).toBe("pt");
    expect(state.interests).toEqual([]);
    expect(state.level).toBeNull();
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  test("nextStep e previousStep navegam na ordem exata dos 5 passos", () => {
    expect(nextStep("welcome")).toBe("pair");
    expect(nextStep("pair")).toBe("interests");
    expect(nextStep("interests")).toBe("place");
    expect(nextStep("place")).toBe("ready");
    expect(nextStep("ready")).toBeNull();

    expect(previousStep("welcome")).toBeNull();
    expect(previousStep("pair")).toBe("welcome");
    expect(previousStep("interests")).toBe("pair");
    expect(previousStep("place")).toBe("interests");
    expect(previousStep("ready")).toBeNull();
  });

  test("stepIndex retorna o índice correto baseado em JOURNEY_STEPS", () => {
    JOURNEY_STEPS.forEach((step, idx) => {
      expect(stepIndex(step)).toBe(idx);
    });
  });

  test("validatePair garante que o idioma de estudo não é idêntico ao de apoio", () => {
    // Par válido
    const valid = validatePair("en", "pt");
    expect(valid.valid).toBe(true);
    expect(valid.through).toBe("pt");

    // Par inválido en -> en deve alternar para pt
    const invalidEn = validatePair("en", "en");
    expect(invalidEn.valid).toBe(false);
    expect(invalidEn.through).toBe("pt");

    // Par inválido pt -> pt deve alternar para en
    const invalidPt = validatePair("pt", "pt");
    expect(invalidPt.valid).toBe(false);
    expect(invalidPt.through).toBe("en");
  });

  test("reducer avança e recua passos com NEXT_STEP e PREV_STEP", () => {
    let state = initialJourneyFlowState();

    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("pair");

    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("interests");

    state = journeyFlowReducer(state, { type: "PREV_STEP" });
    expect(state.step).toBe("pair");
  });

  test("SET_TARGET_LANG corrige automaticamente o through_lang se coincidir", () => {
    let state = initialJourneyFlowState({ target_lang: "en", through_lang: "pt" });

    // Muda target para pt (que coincide com through pt)
    state = journeyFlowReducer(state, { type: "SET_TARGET_LANG", lang: "pt" });
    expect(state.target_lang).toBe("pt");
    expect(state.through_lang).toBe("en"); // auto-corrigido
  });

  test("SET_THROUGH_LANG ignora se for idêntico ao target_lang", () => {
    let state = initialJourneyFlowState({ target_lang: "en", through_lang: "pt" });

    state = journeyFlowReducer(state, { type: "SET_THROUGH_LANG", lang: "en" });
    expect(state.through_lang).toBe("pt"); // não alterou para coincidir
  });

  test("TOGGLE_INTEREST adiciona e remove interesses com limite de 12", () => {
    let state = initialJourneyFlowState();

    state = journeyFlowReducer(state, { type: "TOGGLE_INTEREST", interest: "tecnologia" });
    expect(state.interests).toEqual(["tecnologia"]);

    state = journeyFlowReducer(state, { type: "TOGGLE_INTEREST", interest: "cultura" });
    expect(state.interests).toEqual(["tecnologia", "cultura"]);

    // Remove tecnologia
    state = journeyFlowReducer(state, { type: "TOGGLE_INTEREST", interest: "tecnologia" });
    expect(state.interests).toEqual(["cultura"]);
  });

  test("FINISH_PLACEMENT define nível e avança para 'ready'", () => {
    let state = initialJourneyFlowState({ step: "place" });

    state = journeyFlowReducer(state, { type: "FINISH_PLACEMENT", level: "B2" });
    expect(state.step).toBe("ready");
    expect(state.level).toBe("B2");
  });
});
