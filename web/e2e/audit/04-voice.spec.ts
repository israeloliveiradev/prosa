import { test, expect, createAccount, seedSession, assertLayout, type TargetLang } from "./fixtures";
import { tid } from "./helpers-a";
import { installNeuralProbe, readNeuralProbe } from "./helpers-neural";
import { VOICE_COPY } from "@/lib/copy/voice";
import { DEFAULT_VOICE_BY_LANG, ENGINE_BY_LANG, PIPER_VOICES } from "@/workers/ttsWorker";

/**
 * Bloco 4: voz neural no navegador. Os modelos baixam da internet na primeira escuta (minutos).
 * Pelo seletor de voz de Ajustes, que toca a frase de exemplo do app com o mesmo caminho da lição.
 */

const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-");

type P = import("@playwright/test").Page;

async function waitMedia(page: P, countBefore: number, timeout: number): Promise<void> {
  await expect
    .poll(async () => (await readNeuralProbe(page)).media.length, { timeout, intervals: [500, 1000, 2000] })
    .toBeGreaterThan(countBefore);
  await expect.poll(async () => (await readNeuralProbe(page)).media.at(-1)?.hash ?? null, { timeout: 15_000 }).not.toBeNull();
}

const LANGS: TargetLang[] = ["en", "de", "fr", "es", "it", "ru", "ja"];

for (const lang of LANGS) {
  test(`voz neural em ${lang}: motor, taxa de amostragem, velocidade e cache @neural`, async ({ page, guard }) => {
    test.setTimeout(260_000);
    // O download dos modelos (Hugging Face, WASM) gera avisos próprios do navegador.
    guard.allow(/huggingface|hf\.co|onnx|wasm|cdn\.jsdelivr|unpkg/i);
    const session = await createAccount({ prefix: `voice-${lang}`, target: lang, level: "A1" });
    await installNeuralProbe(page);
    await seedSession(page, session);
    await page.goto("/settings");
    await expect(tid(page, "voice-picker")).toBeVisible({ timeout: 30_000 });
    await assertLayout(page, `Ajustes voz ${lang}`);

    const engine = ENGINE_BY_LANG[lang];
    const defaultVoice = DEFAULT_VOICE_BY_LANG[lang];
    if (engine === "webspeech") {
      // Japonês: Web Speech com lang ja-JP, sem worker neural.
      const buttons = page.locator("[data-testid^='voice-sample-']").filter({ visible: true });
      await expect(buttons.first()).toBeVisible();
      // 1) Este Chromium não tem voz japonesa do sistema: o app tem de dizer isso (texto honesto), não tocar nada.
      await buttons.first().click();
      const honest = page.getByText(VOICE_COPY.pt.noJapaneseVoice);
      await expect(honest, "sem voz ja instalada o app avisa").toBeVisible({ timeout: 15_000 });
      expect((await readNeuralProbe(page)).speech).toHaveLength(0);
      // 2) Com uma voz ja-JP no sistema (SIMULADA: este navegador de teste não traz nenhuma e a interface pública do
      // navegador não deixa criar uma voz real), o app fala com speechSynthesis em ja-JP.
      await page.addInitScript(() => {
        class FakeUtterance {
          text: string;
          lang = "";
          voice: unknown = null;
          rate = 1;
          pitch = 1;
          volume = 1;
          onstart: unknown = null;
          onend: ((e: unknown) => void) | null = null;
          onerror: unknown = null;
          onboundary: unknown = null;
          constructor(text: string) {
            this.text = text;
          }
        }
        const voice = { name: "Teste Haruka", lang: "ja-JP", voiceURI: "teste-ja", default: true, localService: true };
        (window as any).SpeechSynthesisUtterance = FakeUtterance;
        const synth = window.speechSynthesis;
        synth.getVoices = () => [voice as unknown as SpeechSynthesisVoice];
        synth.speak = ((u: any) => {
          (window as any).__neural.speech.push({ t: performance.now(), lang: u.lang, text: String(u.text).slice(0, 80), rate: u.rate, voice: u.voice?.name ?? null });
          setTimeout(() => {
            u.onstart?.({});
            u.onend?.({});
          }, 200);
        }) as typeof synth.speak;
      });
      await page.reload();
      await expect(tid(page, "voice-picker")).toBeVisible({ timeout: 30_000 });
      await page.locator("[data-testid^='voice-sample-']").filter({ visible: true }).first().click();
      await expect.poll(async () => (await readNeuralProbe(page)).speech.length, { timeout: 30_000 }).toBeGreaterThan(0);
      const probe = await readNeuralProbe(page);
      expect(probe.speech[0].lang).toBe("ja-JP");
      expect(probe.speech[0].text).toContain("こんにちは");
      expect(probe.speech[0].rate, "a velocidade da fala no japonês vem do app").toBeGreaterThan(0);
      expect(probe.synth, "japonês não usa o worker neural").toHaveLength(0);
      expect(probe.media.filter((m) => m.src.startsWith("blob:")), "japonês não toca áudio neural").toHaveLength(0);
      return;
    }

    const sampleButton = (id: string) => tid(page, `voice-sample-${slug(id)}`);

    // Voz padrão: baixa, sintetiza e toca.
    await expect(sampleButton(defaultVoice), `botão de exemplo da voz ${defaultVoice}`).toBeVisible();
    await sampleButton(defaultVoice).click();
    await waitMedia(page, 0, 220_000);
    const probe1 = await readNeuralProbe(page);
    const media = probe1.media.at(-1)!;
    const synth = probe1.synth.at(-1)!;
    const expectedRate = engine === "kokoro" ? 24000 : PIPER_VOICES[defaultVoice].sampleRate;
    expect(synth.engine, "motor usado na síntese").toBe(engine);
    expect(media.sampleRate, `taxa de amostragem de ${defaultVoice} (${engine})`).toBe(expectedRate);
    expect(media.rate, "playbackRate fica em 1: a velocidade é do motor").toBe(1);
    expect(media.preservesPitch).toBe(true);
    expect(media.bytes).toBeGreaterThan(10_000);

    // Segunda vez, a mesma frase: vem do cache (sem nova síntese) e rápido.
    await expect.poll(async () => (await readNeuralProbe(page)).media.at(-1)?.ended ?? false, { timeout: 30_000 }).toBe(true);
    const synthCount = (await readNeuralProbe(page)).synth.length;
    const mediaCount = (await readNeuralProbe(page)).media.length;
    await sampleButton(defaultVoice).click();
    await waitMedia(page, mediaCount, 15_000);
    const probe2 = await readNeuralProbe(page);
    const click = probe2.clicks.at(-1)!;
    const replay = probe2.media.at(-1)!;
    expect(probe2.synth.length, "a repetição não sintetiza de novo").toBe(synthCount);
    expect(replay.t - click, "tempo até a segunda reprodução (ms)").toBeLessThan(50);
    expect(replay.hash, "mesmo áudio na repetição").toBe(media.hash);

    // Duas vozes diferentes (dois locutores) no mesmo idioma: áudios diferentes. A lista é lida de novo: em inglês,
    // se o Kokoro for mais lento que a fala neste aparelho, o app troca sozinho para a voz rápida (Piper) e muda a lista.
    await expect.poll(async () => (await readNeuralProbe(page)).media.at(-1)?.ended ?? false, { timeout: 30_000 }).toBe(true);
    if (lang === "en") await page.waitForTimeout(2_000);
    const voices = await page
      .locator("[data-testid^='voice-sample-']")
      .filter({ visible: true })
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid") as string));
    expect(voices.length, "o seletor oferece mais de uma voz").toBeGreaterThanOrEqual(2);
    const defaultTestId = `voice-sample-${slug(defaultVoice)}`;
    const firstTestId = voices.includes(defaultTestId) ? defaultTestId : voices[0];
    const otherTestId = voices.find((id) => id !== firstTestId)!;
    const heard: Array<{ id: string; hash: string | null; sampleRate: number | null; rate: number; preservesPitch: boolean; engine: string | null }> = [];
    for (const testId of [firstTestId, otherTestId]) {
      await expect.poll(async () => (await readNeuralProbe(page)).media.at(-1)?.ended ?? false, { timeout: 30_000 }).toBe(true);
      const mediaBefore = (await readNeuralProbe(page)).media.length;
      const synthBefore = (await readNeuralProbe(page)).synth.length;
      await tid(page, testId).click();
      await waitMedia(page, mediaBefore, 220_000);
      const now = await readNeuralProbe(page);
      const clip = now.media.at(-1)!;
      heard.push({ id: testId, hash: clip.hash, sampleRate: clip.sampleRate, rate: clip.rate, preservesPitch: clip.preservesPitch, engine: now.synth.length > synthBefore ? now.synth.at(-1)!.engine : engine });
    }
    expect(heard[1].hash, `a voz ${heard[1].id} soa diferente de ${heard[0].id}`).not.toBe(heard[0].hash);
    for (const clip of heard) {
      expect(clip.rate).toBe(1);
      expect(clip.preservesPitch).toBe(true);
      const id = clip.id.replace("voice-sample-", "");
      const expected = clip.engine === "kokoro" ? 24000 : Object.entries(PIPER_VOICES).find(([voiceId]) => slug(voiceId) === id)?.[1].sampleRate;
      if (expected) expect(clip.sampleRate, `taxa de ${id}`).toBe(expected);
      else expect(clip.sampleRate).toBeGreaterThanOrEqual(16000);
    }
    expect((await readNeuralProbe(page)).errors).toEqual([]);
  });
}
