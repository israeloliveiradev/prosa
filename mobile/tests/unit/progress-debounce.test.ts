import { test, expect } from "@playwright/test";
import {
  clearLocalProgress,
  flushProgressDebounce,
  getProgress,
  recordSpeaking,
} from "@/lib/progress";
import { kv } from "@/lib/kv";

test.describe("Camada de dados: debounce de 250ms em progress.ts", () => {
  test.beforeEach(() => {
    clearLocalProgress();
  });

  test.afterEach(() => {
    clearLocalProgress();
  });

  test("múltiplas escritas rápidas consolidam e a última escrita vence", async () => {
    // Escrita 1: nota 60
    recordSpeaking(60);

    // Escrita 2: nota 75
    recordSpeaking(75);

    // Escrita 3: nota 95
    recordSpeaking(95);

    // Em memória, o snapshot reflete imediatamente a última alteração
    expect(getProgress().speakingBest).toBe(95);

    // No disco (kv), a escrita é debounced em 250ms
    // Forçamos o flush
    flushProgressDebounce();

    const storedRaw = kv.getString("prosa.progress.v1");
    expect(storedRaw).toBeDefined();

    const stored = JSON.parse(storedRaw!);
    expect(stored.lanes[stored.activeLang].speakingBest).toBe(95);
  });

  test("aguarda o timer real de 250ms persistir no disco sem flush manual", async () => {
    recordSpeaking(88);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const storedRaw = kv.getString("prosa.progress.v1");
    expect(storedRaw).toBeDefined();
    const stored = JSON.parse(storedRaw!);
    expect(stored.lanes[stored.activeLang].speakingBest).toBe(88);
  });
});
