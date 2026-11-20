import { test, expect } from "@playwright/test";
import {
  journeyFlowReducer,
  initialJourneyFlowState,
  validatePair,
  normalizePair,
  previousStep,
  nextStep,
  stepIndex,
  stepProgress,
  canContinue,
  composeGoal,
  parseGoal,
  weeklyMinutes,
  migrateStep,
  toCefrLevel,
  JOURNEY_STEPS,
  STUDY_TARGETS,
  SUPPORT_LANGS,
  MAX_GOAL_LENGTH,
  type JourneyFlowState,
} from "../../src/features/onboarding/model/journey-flow";
import { parseJourney, EMPTY_JOURNEY } from "../../src/features/onboarding/model/journey-snapshot";

function run(state: JourneyFlowState, ...events: Parameters<typeof journeyFlowReducer>[1][]): JourneyFlowState {
  return events.reduce(journeyFlowReducer, state);
}

test.describe("Onboarding: journey-flow reducer e modelo puro", () => {
  test("estado inicial: boas-vindas, en através de pt, 20 min, sem nível", () => {
    const state = initialJourneyFlowState();
    expect(state.step).toBe("welcome");
    expect(state.target_lang).toBe("en");
    expect(state.through_lang).toBe("pt");
    expect(state.interests).toEqual([]);
    expect(state.goal).toBeNull();
    expect(state.minutes).toBe(20);
    expect(state.level).toBeNull();
    expect(state.pending).toBe(false);
    expect(state.error).toBeNull();
  });

  test("ordem dos 7 passos: welcome → pair → goal → themes → time → level → plan", () => {
    expect(JOURNEY_STEPS).toEqual(["welcome", "pair", "goal", "themes", "time", "level", "plan"]);
    expect(nextStep("welcome")).toBe("pair");
    expect(nextStep("pair")).toBe("goal");
    expect(nextStep("goal")).toBe("themes");
    expect(nextStep("themes")).toBe("time");
    expect(nextStep("time")).toBe("level");
    expect(nextStep("level")).toBe("plan");
    expect(nextStep("plan")).toBeNull();

    expect(previousStep("welcome")).toBeNull();
    expect(previousStep("pair")).toBe("welcome");
    expect(previousStep("goal")).toBe("pair");
    expect(previousStep("themes")).toBe("goal");
    expect(previousStep("time")).toBe("themes");
    expect(previousStep("level")).toBe("time");
    expect(previousStep("plan")).toBe("level");
  });

  test("stepIndex segue JOURNEY_STEPS e a régua conta 6 passos sem a boas-vindas", () => {
    JOURNEY_STEPS.forEach((step, idx) => {
      expect(stepIndex(step)).toBe(idx);
    });
    expect(stepProgress("welcome")).toBeNull();
    expect(stepProgress("pair")).toEqual({ current: 1, total: 6 });
    expect(stepProgress("plan")).toEqual({ current: 6, total: 6 });
  });

  test("migrateStep converte os passos antigos gravados no aparelho", () => {
    expect(migrateStep("interests")).toBe("themes");
    expect(migrateStep("place")).toBe("level");
    expect(migrateStep("ready")).toBe("plan");
    expect(migrateStep("goal")).toBe("goal");
    expect(migrateStep(undefined)).toBe("welcome");
    expect(migrateStep("nonsense")).toBe("welcome");
  });

  test("alvos são os 7 idiomas de estudo; português só como apoio", () => {
    expect([...STUDY_TARGETS].sort()).toEqual(["de", "en", "es", "fr", "it", "ja", "ru"]);
    expect(STUDY_TARGETS).not.toContain("pt");
    expect(SUPPORT_LANGS).toContain("pt");
    expect(SUPPORT_LANGS).toHaveLength(8);
  });

  test("validatePair e normalizePair: nunca iguais, pt como apoio padrão, pt nunca alvo", () => {
    expect(validatePair("en", "pt")).toEqual({ valid: true, through: "pt" });
    expect(validatePair("ja", "en")).toEqual({ valid: true, through: "en" });
    expect(validatePair("en", "en")).toEqual({ valid: false, through: "pt" });
    expect(validatePair("pt", "en").valid).toBe(false);
    expect(validatePair("ru", "xx")).toEqual({ valid: false, through: "pt" });

    expect(normalizePair("pt", "pt")).toEqual({ target_lang: "en", through_lang: "pt" });
    expect(normalizePair("de", "de")).toEqual({ target_lang: "de", through_lang: "pt" });
    expect(normalizePair(undefined, undefined)).toEqual({ target_lang: "en", through_lang: "pt" });
    expect(normalizePair("fr", "es")).toEqual({ target_lang: "fr", through_lang: "es" });
  });

  test("SET_TARGET_LANG ignora português e corrige o apoio quando coincide", () => {
    let state = initialJourneyFlowState({ target_lang: "en", through_lang: "de" });

    state = journeyFlowReducer(state, { type: "SET_TARGET_LANG", lang: "pt" });
    expect(state.target_lang).toBe("en");

    state = journeyFlowReducer(state, { type: "SET_TARGET_LANG", lang: "de" });
    expect(state.target_lang).toBe("de");
    expect(state.through_lang).toBe("pt");

    state = journeyFlowReducer(state, { type: "SET_TARGET_LANG", lang: "ru" });
    expect(state.target_lang).toBe("ru");
    expect(state.through_lang).toBe("pt");
  });

  test("SET_THROUGH_LANG ignora o idioma estudado e códigos desconhecidos", () => {
    let state = initialJourneyFlowState({ target_lang: "en", through_lang: "pt" });
    state = journeyFlowReducer(state, { type: "SET_THROUGH_LANG", lang: "en" });
    expect(state.through_lang).toBe("pt");
    state = journeyFlowReducer(state, { type: "SET_THROUGH_LANG", lang: "xx" });
    expect(state.through_lang).toBe("pt");
    state = journeyFlowReducer(state, { type: "SET_THROUGH_LANG", lang: "es" });
    expect(state.through_lang).toBe("es");
  });

  test("NEXT_STEP só avança quando o passo está completo", () => {
    let state = run(initialJourneyFlowState(), { type: "NEXT_STEP" }, { type: "NEXT_STEP" });
    expect(state.step).toBe("goal");

    // Sem objetivo não passa.
    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("goal");
    state = run(state, { type: "SET_GOAL", goal: "career" }, { type: "NEXT_STEP" });
    expect(state.step).toBe("themes");

    // Sem tema não passa.
    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("themes");
    state = run(state, { type: "TOGGLE_INTEREST", interest: "Ciência" }, { type: "NEXT_STEP" });
    expect(state.step).toBe("time");

    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("level");

    // Sem nível o plano não abre por NEXT_STEP.
    state = journeyFlowReducer(state, { type: "NEXT_STEP" });
    expect(state.step).toBe("level");

    state = journeyFlowReducer(state, { type: "PREV_STEP" });
    expect(state.step).toBe("time");
  });

  test("SET_GOAL aceita só os 6 objetivos; a nota é cortada no limite", () => {
    let state = initialJourneyFlowState();
    state = journeyFlowReducer(state, { type: "SET_GOAL", goal: "world-domination" });
    expect(state.goal).toBeNull();
    for (const goal of ["career", "travel", "studies", "culture", "family", "relocation"]) {
      state = journeyFlowReducer(state, { type: "SET_GOAL", goal });
      expect(state.goal).toBe(goal);
    }
    state = journeyFlowReducer(state, { type: "SET_GOAL_NOTE", note: "x".repeat(500) });
    expect(state.goal_note.length).toBeLessThanOrEqual(160);
    expect(canContinue(state, "goal")).toBe(true);
  });

  test("temas: alterna, adiciona livre, remove e respeita o teto de 12", () => {
    let state = initialJourneyFlowState();
    state = journeyFlowReducer(state, { type: "TOGGLE_INTEREST", interest: "Ciência" });
    state = journeyFlowReducer(state, { type: "ADD_INTEREST", interest: "  fotografia   analógica " });
    expect(state.interests).toEqual(["Ciência", "fotografia analógica"]);

    // Duplicata (sem acento/maiúscula) não entra.
    state = journeyFlowReducer(state, { type: "ADD_INTEREST", interest: "CIENCIA" });
    expect(state.interests).toEqual(["Ciência", "fotografia analógica"]);

    state = journeyFlowReducer(state, { type: "REMOVE_INTEREST", interest: "Fotografia Analógica" });
    expect(state.interests).toEqual(["Ciência"]);

    for (let i = 0; i < 20; i += 1) {
      state = journeyFlowReducer(state, { type: "ADD_INTEREST", interest: `tema ${i}` });
    }
    expect(state.interests).toHaveLength(12);
    expect(canContinue(state, "themes")).toBe(true);

    state = journeyFlowReducer(state, { type: "TOGGLE_INTEREST", interest: "Música" });
    expect(state.interests).toHaveLength(12);
    expect(state.interests).not.toContain("Música");
  });

  test("SET_MINUTES aceita só 10, 20 ou 30; meta semanal = 7 dias", () => {
    let state = initialJourneyFlowState();
    state = journeyFlowReducer(state, { type: "SET_MINUTES", minutes: 15 });
    expect(state.minutes).toBe(20);
    state = journeyFlowReducer(state, { type: "SET_MINUTES", minutes: 30 });
    expect(state.minutes).toBe(30);
    expect(weeklyMinutes(10)).toBe(70);
    expect(weeklyMinutes(20)).toBe(140);
    expect(weeklyMinutes(30)).toBe(210);
  });

  test("salvar: SAVE_START guarda nível e origem, SAVE_OK abre o plano, SAVE_FAIL mostra o erro", () => {
    let state = initialJourneyFlowState({ step: "level", goal: "travel", interests: ["Viagens"] });

    state = journeyFlowReducer(state, { type: "SAVE_START", level: "zz", source: "self" });
    expect(state.pending).toBe(false);

    state = journeyFlowReducer(state, { type: "SAVE_START", level: "b2", source: "self" });
    expect(state.level).toBe("B2");
    expect(state.level_source).toBe("self");
    expect(state.pending).toBe(true);

    // Enquanto salva, não navega.
    expect(journeyFlowReducer(state, { type: "PREV_STEP" }).step).toBe("level");

    const failed = journeyFlowReducer(state, { type: "SAVE_FAIL", error: "offline" });
    expect(failed.pending).toBe(false);
    expect(failed.error).toBe("offline");
    expect(failed.step).toBe("level");

    const saved = journeyFlowReducer(state, { type: "SAVE_OK" });
    expect(saved.step).toBe("plan");
    expect(saved.pending).toBe(false);
    expect(canContinue(saved, "plan")).toBe(true);
  });

  test("composeGoal/parseGoal: id estável + nota, dentro dos 200 caracteres", () => {
    expect(composeGoal(null, "")).toBeUndefined();
    expect(composeGoal("career", "")).toBe("career");
    expect(composeGoal("career", "  apresentar   projetos ")).toBe("career: apresentar projetos");
    expect(composeGoal(null, "só a nota")).toBe("só a nota");
    expect(composeGoal("relocation", "y".repeat(400))!.length).toBeLessThanOrEqual(MAX_GOAL_LENGTH);

    expect(parseGoal("career: apresentar projetos")).toEqual({ goal: "career", note: "apresentar projetos" });
    expect(parseGoal("travel")).toEqual({ goal: "travel", note: "" });
    expect(parseGoal("falar no trabalho")).toEqual({ goal: null, note: "falar no trabalho" });
    expect(parseGoal(undefined)).toEqual({ goal: null, note: "" });
  });

  test("toCefrLevel normaliza e rejeita o resto", () => {
    expect(toCefrLevel("b1")).toBe("B1");
    expect(toCefrLevel("C2")).toBe("C2");
    expect(toCefrLevel("D1")).toBeNull();
    expect(toCefrLevel(3)).toBeNull();
  });

  test("RESET volta ao começo, opcionalmente com sementes", () => {
    const state = run(
      initialJourneyFlowState({ step: "time", target_lang: "ja", interests: ["Música"] }),
      { type: "RESET" },
    );
    expect(state.step).toBe("welcome");
    expect(state.target_lang).toBe("en");
    expect(state.interests).toEqual([]);
  });
});

test.describe("Onboarding: jornada gravada no aparelho", () => {
  test("lê o formato novo completo", () => {
    const parsed = parseJourney(
      JSON.stringify({
        userId: "u1",
        done: false,
        step: "time",
        target_lang: "ru",
        through_lang: "de",
        interests: ["Ciência", "xadrez"],
        goal: "studies",
        goal_note: "exame em março",
        minutes: 10,
        level: "b1",
        level_source: "placement",
      }),
    );
    expect(parsed).toMatchObject({
      userId: "u1",
      step: "time",
      target_lang: "ru",
      through_lang: "de",
      interests: ["Ciência", "xadrez"],
      goal: "studies",
      goal_note: "exame em março",
      minutes: 10,
      level: "B1",
      level_source: "placement",
    });
  });

  test("migra o formato antigo (goal em texto livre, passos antigos)", () => {
    const parsed = parseJourney(
      JSON.stringify({ userId: "u1", done: true, step: "ready", goal: "falar no trabalho", interests: ["Música"], level: "A2" }),
    );
    expect(parsed.step).toBe("plan");
    expect(parsed.done).toBe(true);
    expect(parsed.goal).toBe("");
    expect(parsed.goal_note).toBe("falar no trabalho");
    expect(parsed.minutes).toBe(20);
  });

  test("semente mínima do E2E (seedDevSession) é aceita", () => {
    expect(parseJourney(JSON.stringify({ userId: "u2", done: false, step: "welcome" }))).toMatchObject({
      userId: "u2",
      done: false,
      step: "welcome",
      target_lang: "en",
      through_lang: "pt",
    });
  });

  test("jornada concluída sem dono, JSON quebrado ou vazio recomeçam do zero", () => {
    expect(parseJourney(JSON.stringify({ done: true, step: "ready" }))).toEqual(EMPTY_JOURNEY);
    expect(parseJourney("{oops")).toEqual(EMPTY_JOURNEY);
    expect(parseJourney(null)).toEqual(EMPTY_JOURNEY);
  });

  test("par inválido gravado é corrigido (pt nunca alvo, apoio ≠ alvo)", () => {
    const parsed = parseJourney(JSON.stringify({ userId: "u3", target_lang: "pt", through_lang: "pt" }));
    expect(parsed.target_lang).toBe("en");
    expect(parsed.through_lang).toBe("pt");
  });
});
