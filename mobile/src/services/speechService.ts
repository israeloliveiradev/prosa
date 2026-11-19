// Prosa Neural Speech Synthesis Service
// 100% Automatic, Silent, Frictionless Kokoro-82M & Piper TTS Neural Audio Engine.
// Operates exclusively in a dedicated Web Worker (ttsWorker.js) to guarantee 60 FPS on the UI.
// Lookahead Cache (Map<string, AudioBuffer>) for instant zero-latency playback.
// ZERO robotic window.speechSynthesis fallback - pure neural AudioBuffer playback.

import { Platform } from "react-native";
import { KOKORO_MENTOR_VOICES, PIPER_MENTOR_VOICES } from "@/workers/ttsWorker";

export type VoiceEngineMode = "instant" | "hybrid";

export interface SpeechOptions {
  lang?: string; // e.g. "pt-BR", "en-US", "de-DE", "fr-FR", "es-ES", "it-IT", "ja-JP"
  speed?: number | "0.75x" | "0.8x" | "0.9x" | "1.0x" | "1.15x" | "1.2x";
  mentorId?: string;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onBoundary?: (ev: { charIndex: number; charLength?: number; name?: string }) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface VoiceEngineStatus {
  mode: VoiceEngineMode;
  isKokoroReady: boolean;
  isPiperReady: boolean;
  downloadProgress: number; // 0 to 100
  downloadStatus: string;
  cachedAudiosCount: number;
  cachedBytesApprox: number;
  isWarmingUp: boolean;
}

export interface ActivePlaybackInfo {
  isPlaying: boolean;
  engine: string;
  voice: string;
  mentorName: string;
  lang: string;
  samplingRate?: number;
}

export type MentorGender = "female" | "male_paused" | "male_expressive";

export interface MentorVoiceProfile {
  name: string;
  gender: MentorGender;
  pitch: number;
  rateMultiplier: number;
  kokoroVoice: Record<string, string>;
  piperVoice: Record<string, string>;
  description: string;
}

export const MENTOR_VOICE_PROFILES: Record<string, MentorVoiceProfile> = {
  curie: {
    name: "Marie Curie",
    gender: "female",
    pitch: 1.12,
    rateMultiplier: 0.94,
    kokoroVoice: KOKORO_MENTOR_VOICES.curie || {},
    piperVoice: PIPER_MENTOR_VOICES.curie || {},
    description: "Articulação cristalina, feminina, ressonância harmônica e precisão.",
  },
  lovelace: {
    name: "Ada Lovelace",
    gender: "female",
    pitch: 1.14,
    rateMultiplier: 0.96,
    kokoroVoice: KOKORO_MENTOR_VOICES.lovelace || {},
    piperVoice: PIPER_MENTOR_VOICES.lovelace || {},
    description: "Tom analítico, feminino, cadência poética e estruturada.",
  },
  hypatia: {
    name: "Hipátia",
    gender: "female",
    pitch: 1.15,
    rateMultiplier: 0.95,
    kokoroVoice: KOKORO_MENTOR_VOICES.hypatia || {},
    piperVoice: PIPER_MENTOR_VOICES.hypatia || {},
    description: "Voz clássica feminina de clareza matemática e ressonância límpida.",
  },
  bingen: {
    name: "Hildegard von Bingen",
    gender: "female",
    pitch: 1.10,
    rateMultiplier: 0.92,
    kokoroVoice: KOKORO_MENTOR_VOICES.bingen || {},
    piperVoice: PIPER_MENTOR_VOICES.bingen || {},
    description: "Voz polifônica, feminina, suave e contemplativa.",
  },
  hildegard: {
    name: "Hildegard von Bingen",
    gender: "female",
    pitch: 1.10,
    rateMultiplier: 0.92,
    kokoroVoice: KOKORO_MENTOR_VOICES.hildegard || {},
    piperVoice: PIPER_MENTOR_VOICES.hildegard || {},
    description: "Voz polifônica, feminina, suave e contemplativa.",
  },
  einstein: {
    name: "Albert Einstein",
    gender: "male_paused",
    pitch: 0.82,
    rateMultiplier: 0.88,
    kokoroVoice: KOKORO_MENTOR_VOICES.einstein || {},
    piperVoice: PIPER_MENTOR_VOICES.einstein || {},
    description: "Voz masculina grave, cadência reflexiva e pausas didáticas.",
  },
  aurelius: {
    name: "Marco Aurélio",
    gender: "male_paused",
    pitch: 0.80,
    rateMultiplier: 0.86,
    kokoroVoice: KOKORO_MENTOR_VOICES.aurelius || {},
    piperVoice: PIPER_MENTOR_VOICES.aurelius || {},
    description: "Profundo, estóico, grave e pausado.",
  },
  goethe: {
    name: "Johann Wolfgang von Goethe",
    gender: "male_paused",
    pitch: 0.84,
    rateMultiplier: 0.88,
    kokoroVoice: KOKORO_MENTOR_VOICES.goethe || {},
    piperVoice: PIPER_MENTOR_VOICES.goethe || {},
    description: "Voz clássica alemã, ressonante e rica em harmônicos.",
  },
  feynman: {
    name: "Richard Feynman",
    gender: "male_expressive",
    pitch: 1.04,
    rateMultiplier: 1.06,
    kokoroVoice: KOKORO_MENTOR_VOICES.feynman || {},
    piperVoice: PIPER_MENTOR_VOICES.feynman || {},
    description: "Masculino rápido, enérgico, direto e envolvente.",
  },
  davinci: {
    name: "Leonardo da Vinci",
    gender: "male_expressive",
    pitch: 0.98,
    rateMultiplier: 1.00,
    kokoroVoice: KOKORO_MENTOR_VOICES.davinci || {},
    piperVoice: PIPER_MENTOR_VOICES.davinci || {},
    description: "Tom expressivo renascentista, equilíbrio melódico.",
  },
  tesla: {
    name: "Nikola Tesla",
    gender: "male_expressive",
    pitch: 1.02,
    rateMultiplier: 1.04,
    kokoroVoice: KOKORO_MENTOR_VOICES.tesla || {},
    piperVoice: PIPER_MENTOR_VOICES.tesla || {},
    description: "Voz elétrica, rápida, focada e inventiva.",
  },
  cicero: {
    name: "Marco Túlio Cícero",
    gender: "male_paused",
    pitch: 0.84,
    rateMultiplier: 0.90,
    kokoroVoice: KOKORO_MENTOR_VOICES.cicero || {},
    piperVoice: PIPER_MENTOR_VOICES.cicero || {},
    description: "Voz oratória majestosa, ressonância profunda e ênfase retórica.",
  },
  confucius: {
    name: "Confúcio",
    gender: "male_paused",
    pitch: 0.82,
    rateMultiplier: 0.85,
    kokoroVoice: KOKORO_MENTOR_VOICES.confucius || {},
    piperVoice: PIPER_MENTOR_VOICES.confucius || {},
    description: "Profundo, meditativo, lento e harmonioso.",
  },
  plato: {
    name: "Platão",
    gender: "male_paused",
    pitch: 0.85,
    rateMultiplier: 0.88,
    kokoroVoice: KOKORO_MENTOR_VOICES.plato || {},
    piperVoice: PIPER_MENTOR_VOICES.plato || {},
    description: "Voz dialética, solene e reflexiva.",
  },
  aristotle: {
    name: "Aristóteles",
    gender: "male_paused",
    pitch: 0.86,
    rateMultiplier: 0.90,
    kokoroVoice: KOKORO_MENTOR_VOICES.aristotle || {},
    piperVoice: PIPER_MENTOR_VOICES.aristotle || {},
    description: "Tom enciclopédico, estruturado e categórico.",
  },
  socrates: {
    name: "Sócrates",
    gender: "male_paused",
    pitch: 0.88,
    rateMultiplier: 0.92,
    kokoroVoice: KOKORO_MENTOR_VOICES.socrates || {},
    piperVoice: PIPER_MENTOR_VOICES.socrates || {},
    description: "Voz interrogativa, provocativa e perspicaz.",
  },
  newton: {
    name: "Isaac Newton",
    gender: "male_expressive",
    pitch: 0.94,
    rateMultiplier: 0.96,
    kokoroVoice: KOKORO_MENTOR_VOICES.newton || {},
    piperVoice: PIPER_MENTOR_VOICES.newton || {},
    description: "Foco analítico rigoroso, geométrico e calculado.",
  },
  darwin: {
    name: "Charles Darwin",
    gender: "male_paused",
    pitch: 0.86,
    rateMultiplier: 0.90,
    kokoroVoice: KOKORO_MENTOR_VOICES.darwin || {},
    piperVoice: PIPER_MENTOR_VOICES.darwin || {},
    description: "Cadência naturalista, paciente e observadora.",
  },
  galileo: {
    name: "Galileu Galilei",
    gender: "male_expressive",
    pitch: 0.96,
    rateMultiplier: 1.00,
    kokoroVoice: KOKORO_MENTOR_VOICES.galileo || {},
    piperVoice: PIPER_MENTOR_VOICES.galileo || {},
    description: "Tom vibrante, empírico e contestador.",
  },
  galilei: {
    name: "Galileu Galilei",
    gender: "male_expressive",
    pitch: 0.96,
    rateMultiplier: 1.00,
    kokoroVoice: KOKORO_MENTOR_VOICES.galilei || {},
    piperVoice: PIPER_MENTOR_VOICES.galilei || {},
    description: "Tom vibrante, empírico e contestador.",
  },
  machado: {
    name: "Machado de Assis",
    gender: "male_expressive",
    pitch: 0.92,
    rateMultiplier: 0.94,
    kokoroVoice: KOKORO_MENTOR_VOICES.machado || {},
    piperVoice: PIPER_MENTOR_VOICES.machado || {},
    description: "Ironia fina, elegância rítmica e prosa sutil.",
  },
  humboldt: {
    name: "Alexander von Humboldt",
    gender: "male_paused",
    pitch: 0.88,
    rateMultiplier: 0.92,
    kokoroVoice: KOKORO_MENTOR_VOICES.humboldt || {},
    piperVoice: PIPER_MENTOR_VOICES.humboldt || {},
    description: "Voz exploratória ampla, harmoniosa e descritiva.",
  },
  spinoza: {
    name: "Baruch Spinoza",
    gender: "male_paused",
    pitch: 0.84,
    rateMultiplier: 0.88,
    kokoroVoice: KOKORO_MENTOR_VOICES.spinoza || {},
    piperVoice: PIPER_MENTOR_VOICES.spinoza || {},
    description: "Monismo geométrico, sereno e luminoso.",
  },
  descartes: {
    name: "René Descartes",
    gender: "male_paused",
    pitch: 0.88,
    rateMultiplier: 0.92,
    kokoroVoice: KOKORO_MENTOR_VOICES.descartes || {},
    piperVoice: PIPER_MENTOR_VOICES.descartes || {},
    description: "Dúvida metódica, clareza e distinção cartesiana.",
  },
  leibniz: {
    name: "Gottfried Leibniz",
    gender: "male_paused",
    pitch: 0.86,
    rateMultiplier: 0.90,
    kokoroVoice: KOKORO_MENTOR_VOICES.leibniz || {},
    piperVoice: PIPER_MENTOR_VOICES.leibniz || {},
    description: "Harmonia preestabelecida e cálculo integral.",
  },
};

const SPEED_NUMERIC_MAP: Record<string, number> = {
  "0.75x": 0.75,
  "0.8x": 0.8,
  "0.9x": 0.9,
  "1.0x": 1.0,
  "1.15x": 1.15,
  "1.2x": 1.2,
};

class SpeechService {
  private engineMode: VoiceEngineMode = "hybrid";
  private isKokoroReady = true;
  private isPiperReady = true;
  private isWarmingUp = false;
  private downloadProgress = 100;
  private downloadStatus = "Kokoro-82M + Piper ONNX Prontos";
  private audioCtx: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private activeTimerId: NodeJS.Timeout | null = null;
  private inMemoryCache: Map<string, AudioBuffer> = new Map();
  private statusListeners: Set<(status: VoiceEngineStatus) => void> = new Set();
  private playbackListeners: Set<(info: ActivePlaybackInfo) => void> = new Set();

  private worker: Worker | null = null;
  private workerRequests: Map<string, {
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }> = new Map();
  private requestIdCounter = 0;

  private activePlayback: ActivePlaybackInfo = {
    isPlaying: false,
    engine: "Kokoro-82M",
    voice: "bm_george (Einstein)",
    mentorName: "Albert Einstein",
    lang: "en-US",
    samplingRate: 24000,
  };

  constructor() {
    this.ensureWorker();
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof Worker === "undefined") {
      return null;
    }

    try {
      this.worker = new Worker("/workers/ttsWorker.js", { type: "module" });
      this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
      this.worker.onerror = (err) => {
        console.warn("[SpeechService] Worker notice:", err);
      };
      return this.worker;
    } catch (e) {
      console.warn("[SpeechService] Could not instantiate Web Worker:", e);
      return null;
    }
  }

  private handleWorkerMessage(data: any) {
    if (!data) return;
    const { type, id, audioData, samplingRate, lang, mentorId, speed, text, voiceToken, engine, latencyMs, error } = data;

    if (type === "WARMED_UP") {
      this.isKokoroReady = true;
      this.isPiperReady = true;
      this.isWarmingUp = false;
      this.downloadProgress = 100;
      this.downloadStatus = "Kokoro-82M & Piper ONNX Prontos (Singleton)";
      this.notifyStatus();
      if (id && this.workerRequests.has(id)) {
        const req = this.workerRequests.get(id);
        this.workerRequests.delete(id);
        req?.resolve(true);
      }
      return;
    }

    if (type === "SYNTHESIZED" || type === "PRELOADED") {
      if (audioData) {
        // Explicit sample rate passed to AudioContext (24000 for Kokoro, 22050 for Piper medium/high, 16000 for low)
        const isPiperLang = /^(de|pt|fr|es|it)/i.test(lang || "");
        const rate = samplingRate || (isPiperLang ? 22050 : 24000);
        const buffer = this.createAudioBufferFromFloat32(audioData, rate);
        if (buffer && text) {
          const cacheKey = this.getCacheKey(lang || "en", mentorId || "einstein", speed || 1.0, text);
          this.inMemoryCache.set(cacheKey, buffer);
          this.notifyStatus();
        }

        if (id && this.workerRequests.has(id)) {
          const req = this.workerRequests.get(id);
          this.workerRequests.delete(id);
          req?.resolve({ buffer, voiceToken, samplingRate: rate, engine, latencyMs });
        }
      }
      return;
    }

    if (type === "ERROR") {
      if (id && this.workerRequests.has(id)) {
        const req = this.workerRequests.get(id);
        this.workerRequests.delete(id);
        req?.reject(new Error(error || "Worker synthesis failure"));
      }
    }
  }

  // Explicitly passes sample rate (24000 for Kokoro, 22050 for Piper)
  // NEVER uses the browser default 48 kHz to avoid pitch acceleration/distortion!
  private createAudioBufferFromFloat32(data: Float32Array, sampleRate: number): AudioBuffer | null {
    if (typeof window === "undefined") return null;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtxClass();
    }

    try {
      const buffer = this.audioCtx.createBuffer(1, data.length, sampleRate || 24000);
      buffer.copyToChannel(data, 0);
      return buffer;
    } catch (e) {
      console.warn("[SpeechService] Error creating AudioBuffer:", e);
      return null;
    }
  }

  private getCacheKey(lang: string, mentorId: string, speed: number, text: string): string {
    const shortLang = lang.toLowerCase().split("-")[0];
    const cleanText = text.replace(/[“”"«»]/g, "").trim();
    return `${shortLang}:${mentorId}:${speed.toFixed(2)}:${cleanText}`;
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.warn("[SpeechService] Status listener notice:", e);
      }
    });
  }

  private notifyPlayback(info: ActivePlaybackInfo) {
    this.activePlayback = { ...info };
    this.playbackListeners.forEach((listener) => {
      try {
        listener(this.activePlayback);
      } catch (e) {
        console.warn("[SpeechService] Playback listener notice:", e);
      }
    });
  }

  public subscribe(listener: (status: VoiceEngineStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  public subscribePlayback(listener: (info: ActivePlaybackInfo) => void): () => void {
    this.playbackListeners.add(listener);
    listener(this.activePlayback);
    return () => this.playbackListeners.delete(listener);
  }

  public getStatus(): VoiceEngineStatus {
    return {
      mode: this.engineMode,
      isKokoroReady: this.isKokoroReady,
      isPiperReady: this.isPiperReady,
      downloadProgress: this.downloadProgress,
      downloadStatus: this.downloadStatus,
      cachedAudiosCount: this.inMemoryCache.size,
      cachedBytesApprox: this.inMemoryCache.size * 96000,
      isWarmingUp: this.isWarmingUp,
    };
  }

  public getActivePlayback(): ActivePlaybackInfo {
    return { ...this.activePlayback };
  }

  public getEngineMode(): VoiceEngineMode {
    return this.engineMode;
  }

  public setEngineMode(mode: VoiceEngineMode) {
    this.engineMode = mode;
    this.notifyStatus();
  }

  public isCached(text: string, options: SpeechOptions = {}): boolean {
    const lang = options.lang || "en-US";
    const speedRate =
      typeof options.speed === "number"
        ? options.speed
        : options.speed && options.speed in SPEED_NUMERIC_MAP
        ? SPEED_NUMERIC_MAP[options.speed]
        : 1.0;
    const mentorId = options.mentorId || "einstein";
    const key = this.getCacheKey(lang, mentorId, speedRate, text);
    return this.inMemoryCache.has(key);
  }

  // Silent automatic boot called from ProsaContext mount
  public async warmup(targetLang: string = "en", mentorId: string = "einstein"): Promise<boolean> {
    const worker = this.ensureWorker();
    if (!worker) return false;

    this.isWarmingUp = true;
    this.downloadStatus = "Aquecendo motor neural (Kokoro / Piper)...";
    this.notifyStatus();

    const id = `warmup-${++this.requestIdCounter}`;
    return new Promise((resolve) => {
      this.workerRequests.set(id, {
        resolve: () => {
          this.isWarmingUp = false;
          this.isKokoroReady = true;
          this.isPiperReady = true;
          this.notifyStatus();
          resolve(true);
        },
        reject: () => {
          this.isWarmingUp = false;
          resolve(false);
        },
      });

      worker.postMessage({
        type: "WARMUP",
        id,
        payload: {
          lang: targetLang,
          mentorId,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
      });
    });
  }

  // Pre-synthesize silently in the background for lookahead cards
  public preload(text: string, options: SpeechOptions = {}): void {
    if (!text || !text.trim()) return;
    const worker = this.ensureWorker();
    if (!worker) return;

    const lang = options.lang || "en-US";
    const speedRate =
      typeof options.speed === "number"
        ? options.speed
        : options.speed && options.speed in SPEED_NUMERIC_MAP
        ? SPEED_NUMERIC_MAP[options.speed]
        : 1.0;
    const mentorId = options.mentorId || "einstein";
    const cacheKey = this.getCacheKey(lang, mentorId, speedRate, text);

    if (this.inMemoryCache.has(cacheKey)) {
      return; // Already synthesized in memory
    }

    worker.postMessage({
      type: "PRELOAD",
      id: `preload-${++this.requestIdCounter}`,
      payload: {
        text: text.replace(/[“”"«»]/g, "").trim(),
        lang,
        mentorId,
        speed: speedRate,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  }

  public clearCache() {
    this.inMemoryCache.clear();
    this.notifyStatus();
  }

  public stop() {
    if (this.activeTimerId) {
      clearInterval(this.activeTimerId);
      this.activeTimerId = null;
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {}
      this.currentAudioSource = null;
    }
    this.notifyPlayback({
      ...this.activePlayback,
      isPlaying: false,
    });
  }

  // Main speak method: 100% Neural Web Worker synthesis & Web Audio playback.
  // NEVER calls window.speechSynthesis!
  public async speak(
    text: string,
    options: SpeechOptions = {}
  ): Promise<boolean> {
    if (!text || !text.trim()) return false;
    this.stop();

    const cleanText = text.replace(/[“”"«»]/g, "").trim();
    const lang = options.lang || "en-US";
    const speedRate =
      typeof options.speed === "number"
        ? options.speed
        : options.speed && options.speed in SPEED_NUMERIC_MAP
        ? SPEED_NUMERIC_MAP[options.speed]
        : 1.0;
    const mentorId = options.mentorId || "einstein";
    const mentorProfile =
      MENTOR_VOICE_PROFILES[mentorId] || MENTOR_VOICE_PROFILES.einstein;

    const shortLang = lang.toLowerCase().split("-")[0];
    const isPiperLang = shortLang === "de" || shortLang === "pt" || shortLang === "fr" || shortLang === "es" || shortLang === "it";
    const engineName = isPiperLang ? "Piper TTS ONNX" : "Kokoro-82M";
    const defaultVoiceMap: Record<string, string> = {
      de: "de_DE-thorsten-high",
      pt: "pt_BR-faber-medium",
      fr: "fr_FR-siwis-medium",
      es: "es_ES-davefx-medium",
      it: "it_IT-paola-medium",
    };
    const voiceToken = isPiperLang
      ? mentorProfile.piperVoice[shortLang] || defaultVoiceMap[shortLang] || "de_DE-thorsten-high"
      : mentorProfile.kokoroVoice[shortLang] || mentorProfile.kokoroVoice.en || "af_river";
    const expectedSampleRate = isPiperLang ? (voiceToken.includes("-low") ? 16000 : 22050) : 24000;

    const cacheKey = this.getCacheKey(lang, mentorId, speedRate, cleanText);

    // 1. Instant Playback from Lookahead Cache
    const cachedBuffer = this.inMemoryCache.get(cacheKey);
    if (cachedBuffer) {
      this.notifyPlayback({
        isPlaying: true,
        engine: engineName,
        voice: `${voiceToken} (${mentorProfile.name})`,
        mentorName: mentorProfile.name,
        lang,
        samplingRate: expectedSampleRate,
      });
      return this.playAudioBuffer(cachedBuffer, cleanText, options);
    }

    // 2. Synthesize on-demand via Web Worker
    const worker = this.ensureWorker();
    if (!worker) {
      options.onStart?.();
      options.onEnd?.();
      return true;
    }

    const requestId = `synthesize-${++this.requestIdCounter}`;

    try {
      const {
        buffer,
        voiceToken: resVoice,
        engine: resEngine,
        samplingRate: resRate,
      }: {
        buffer: AudioBuffer;
        voiceToken: string;
        engine?: string;
        samplingRate?: number;
      } = await new Promise((resolve, reject) => {
        this.workerRequests.set(requestId, { resolve, reject });
        worker.postMessage({
          type: "SYNTHESIZE",
          id: requestId,
          payload: {
            text: cleanText,
            lang,
            mentorId,
            speed: speedRate,
            voice: voiceToken,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
        });
      });

      if (!buffer) {
        options.onEnd?.();
        return false;
      }

      this.notifyPlayback({
        isPlaying: true,
        engine: resEngine || engineName,
        voice: `${resVoice || voiceToken} (${mentorProfile.name})`,
        mentorName: mentorProfile.name,
        lang,
        samplingRate: resRate || expectedSampleRate,
      });

      return this.playAudioBuffer(buffer, cleanText, options);
    } catch (err) {
      console.warn("[SpeechService] Neural synthesis error:", err);
      options.onError?.(err);
      options.onEnd?.();
      return false;
    }
  }

  private playAudioBuffer(
    buffer: AudioBuffer,
    cleanText: string,
    options: SpeechOptions
  ): boolean {
    if (typeof window === "undefined") return false;

    const AudioCtxClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return false;

    if (!this.audioCtx) {
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const mentorId = options.mentorId || "einstein";
      const mentorProfile =
        MENTOR_VOICE_PROFILES[mentorId] || MENTOR_VOICE_PROFILES.einstein;
      const speedRate =
        typeof options.speed === "number"
          ? options.speed
          : options.speed && options.speed in SPEED_NUMERIC_MAP
          ? SPEED_NUMERIC_MAP[options.speed]
          : 1.0;
      const personaRate = (mentorProfile.rateMultiplier || 1.0) * speedRate;
      source.playbackRate.value = Math.max(0.5, Math.min(2.0, personaRate));

      source.connect(this.audioCtx.destination);
      this.currentAudioSource = source;

      options.onStart?.();

      const words = cleanText.split(/\s+/);
      const durationMs = (buffer.duration / Math.max(0.5, personaRate)) * 1000;
      const stepMs = durationMs / Math.max(1, words.length);
      let wordIdx = 0;
      let charAcc = 0;

      const boundaryInterval = setInterval(() => {
        if (wordIdx < words.length) {
          const w = words[wordIdx];
          options.onBoundary?.({
            charIndex: charAcc,
            charLength: w.length,
            name: "word",
          });
          charAcc += w.length + 1;
          wordIdx++;
        } else {
          clearInterval(boundaryInterval);
        }
      }, stepMs);

      source.onended = () => {
        clearInterval(boundaryInterval);
        this.notifyPlayback({
          ...this.activePlayback,
          isPlaying: false,
        });
        options.onEnd?.();
        this.currentAudioSource = null;
      };

      source.start(0);
      return true;
    } catch (e) {
      this.notifyPlayback({
        ...this.activePlayback,
        isPlaying: false,
      });
      options.onError?.(e);
      return false;
    }
  }
}

export const speechService = new SpeechService();
