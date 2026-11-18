import { test, expect } from "@playwright/test";
import {
  calculatePhaseSegments,
  phaseName,
} from "../../src/features/session/model/session-ruler-geometry";
import { sessionPhases, SESSION_SECONDS } from "../../src/lib/session-clock";

test.describe("SessionRuler: cálculo de geometria e segmentos", () => {
  test("soma das durações dos segmentos é exatamente igual à duração total da sessão", () => {
    const phases = sessionPhases({ dueCount: 0 });
    const segments = calculatePhaseSegments(phases, SESSION_SECONDS);

    expect(segments).toHaveLength(6);
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    expect(totalDuration).toBe(SESSION_SECONDS);
  });

  test("expansão de revisão com dueCount alto preserva a soma total e aumenta a fase review", () => {
    const basePhases = sessionPhases({ dueCount: 0 });
    const busyPhases = sessionPhases({ dueCount: 15 });

    const baseSegments = calculatePhaseSegments(basePhases, SESSION_SECONDS);
    const busySegments = calculatePhaseSegments(busyPhases, SESSION_SECONDS);

    const baseReview = baseSegments.find((s) => s.id === "review")!;
    const busyReview = busySegments.find((s) => s.id === "review")!;

    expect(busyReview.duration).toBeGreaterThan(baseReview.duration);

    const busyTotal = busySegments.reduce((sum, seg) => sum + seg.duration, 0);
    expect(busyTotal).toBe(SESSION_SECONDS);
  });

  test("fases com duração personalizada (40 min) escalam proporcionalmente", () => {
    const customDuration = 40 * 60;
    const phases = sessionPhases({ dueCount: 0, totalDurationSeconds: customDuration });
    const segments = calculatePhaseSegments(phases, customDuration);

    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    expect(totalDuration).toBe(customDuration);
  });

  test("phaseName traduz os identificadores das fases", () => {
    const mockCopy = {
      reviewingGroup: "Revisão",
      listenPhase: "Ouvir",
      reading: "Leitura",
      speech: "Fala",
      journal: "Diário",
      note: "Fecho",
    };

    expect(phaseName(mockCopy, "review")).toBe("Revisão");
    expect(phaseName(mockCopy, "listen")).toBe("Ouvir");
    expect(phaseName(mockCopy, "reading")).toBe("Leitura");
    expect(phaseName(mockCopy, "shadow")).toBe("Fala");
    expect(phaseName(mockCopy, "journal")).toBe("Diário");
    expect(phaseName(mockCopy, "note")).toBe("Fecho");
  });
});
