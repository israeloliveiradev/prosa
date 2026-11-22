/** Sonda da voz neural (agente A, bloco 4 e etapas de fala). */
import type { Page } from "@playwright/test";

export interface NeuralMedia {
  t: number;
  rate: number;
  preservesPitch: boolean;
  src: string;
  sampleRate: number | null;
  hash: string | null;
  bytes: number;
  ended: boolean;
}

export interface NeuralProbe {
  media: NeuralMedia[];
  speech: Array<{ t: number; lang: string; text: string; rate: number }>;
  synth: Array<{ t: number; engine: string | null; voice: string | null; lang: string | null }>;
  clicks: number[];
  errors: string[];
}

/**
 * Cada <audio>.play() (taxa, preservesPitch, taxa de amostragem lida do cabeçalho WAV do blob e hash do áudio),
 * cada speechSynthesis.speak (lang) e cada SYNTHESIZE enviado ao worker de síntese.
 */
export async function installNeuralProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: any = { media: [], speech: [], synth: [], clicks: [], errors: [] };
    (window as any).__neural = probe;
    document.addEventListener("click", () => probe.clicks.push(performance.now()), true);
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const entry: any = {
        t: performance.now(),
        rate: this.playbackRate,
        preservesPitch: (this as any).preservesPitch !== false,
        src: String(this.currentSrc || this.src).slice(0, 60),
        sampleRate: null,
        hash: null,
        bytes: 0,
        ended: false,
      };
      probe.media.push(entry);
      this.addEventListener("ended", () => (entry.ended = true), { once: true });
      const src = this.src;
      if (src.startsWith("blob:")) {
        fetch(src)
          .then((r) => r.arrayBuffer())
          .then(async (buf) => {
            entry.bytes = buf.byteLength;
            const view = new DataView(buf);
            const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
            if (buf.byteLength > 28 && riff === "RIFF") entry.sampleRate = view.getUint32(24, true);
            const digest = await crypto.subtle.digest("SHA-256", buf);
            entry.hash = Array.from(new Uint8Array(digest))
              .slice(0, 8)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          })
          .catch((e) => probe.errors.push(String(e)));
      }
      return origPlay.call(this);
    };
    const origPost = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, data: any, ...rest: any[]) {
      if (data && data.type === "SYNTHESIZE") {
        probe.synth.push({ t: performance.now(), engine: data.payload?.engine ?? null, voice: data.payload?.voice ?? null, lang: data.payload?.lang ?? null });
      }
      return (origPost as any).call(this, data, ...rest);
    } as any;
    if (window.speechSynthesis) {
      const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        probe.speech.push({ t: performance.now(), lang: u.lang, text: u.text.slice(0, 80), rate: u.rate });
        return speak(u);
      };
    }
  });
}

export async function readNeuralProbe(page: Page): Promise<NeuralProbe> {
  return page.evaluate(() => (window as any).__neural ?? { media: [], speech: [], synth: [], clicks: [], errors: [] });
}
