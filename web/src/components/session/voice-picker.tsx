import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { tactile } from "@/components/tactile/tokens";
import { speakStory } from "@/lib/api";
import { VOICE_COPY, fillCopy, type VoiceCopy } from "@/lib/copy/voice";
import { useAreaCopy } from "@/lib/copy/area";
import { useLocale } from "@/lib/i18n";
import { sampleLine, setNarratorVoice, useNarratorVoice, voicesFor, type NarrationVoice } from "@/lib/narrator";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { FAST_EN_DEFAULT } from "@/services/audio/fastVoices";
import { startVoiceWarmup, subscribeVoiceWarmup, voiceWarmupState, type WarmupState } from "@/services/audio/voiceWarmup";
import { speechLang, speechService, type ModelState, type SpeechSnapshot, type SpeedInfo } from "@/services/speechService";

function genderText(voice: NarrationVoice, copy: VoiceCopy): string {
  if (voice.gender === "female") {
    return copy.femaleVoice;
  }
  if (voice.gender === "male") {
    return copy.maleVoice;
  }
  return voice.engine === "webspeech" ? copy.systemVoice : "";
}

function percentOf(loaded: number, total: number): number {
  return total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
}

/** Megabytes inteiros (base 1000), do tamanho real informado pelo download. */
function megabytes(bytes: number): number {
  return Math.max(0, Math.round(bytes / 1_000_000));
}

function modelText(state: ModelState, engine: NarrationVoice["engine"], copy: VoiceCopy): string {
  if (engine === "webspeech") {
    return "";
  }
  if (state.phase === "downloading") {
    if (state.stored) {
      return copy.preparing;
    }
    return state.total > 0 ? fillCopy(copy.downloading, { percent: percentOf(state.loaded, state.total) }) : copy.downloadingUnknown;
  }
  if (state.phase === "ready" || state.stored) {
    return copy.onDevice;
  }
  return copy.needsDownload;
}

/** Igual ao HTML estático (sem medida, sem download): usado na hidratação. */
const SERVER_SNAPSHOT: SpeechSnapshot = {
  version: 0,
  speed: { preference: "auto", engine: "kokoro", autoFast: false, verdict: null, kokoroDevice: null, switching: false },
  fastVoice: FAST_EN_DEFAULT,
  modelState: () => ({ phase: "idle", loaded: 0, total: 0, stored: false }),
};

function subscribeSpeech(onChange: () => void): () => void {
  return speechService.subscribe(() => onChange());
}

/**
 * Estado da voz (download, pronto, velocidade) como retrato imutável: com o React Compiler, ler o
 * serviço direto no render ficaria memorizado e a tela não acompanharia o download.
 */
function useSpeechSnapshot(): SpeechSnapshot {
  return useSyncExternalStore(subscribeSpeech, () => speechService.snapshot(), () => SERVER_SNAPSHOT);
}

/** Barra fina com a fração real do download. */
function ProgressBar({ fraction, testID }: { fraction: number; testID?: string }) {
  const width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` as const;
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={{ height: 4, borderRadius: 2, backgroundColor: tactile.border, overflow: "hidden", marginTop: 6 }}
    >
      <View style={{ height: 4, width, backgroundColor: tactile.primary }} />
    </View>
  );
}

function speedStatusText(info: SpeedInfo, copy: VoiceCopy, locale: string): string {
  const head = info.preference === "auto" ? copy.speedAuto : copy.speedYours;
  if (!info.verdict) {
    return info.preference === "auto" ? `${head} ${copy.speedNotMeasured}` : head;
  }
  const seconds = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(info.verdict.rtf);
  const device = info.verdict.device === "webgpu" ? copy.deviceGpu : copy.deviceCpu;
  return `${head} ${fillCopy(copy.speedMeasured, { seconds, device })}`;
}

/** Natural (Kokoro) x rápida (Piper) para o inglês, com a medida real deste aparelho. */
function SpeedChoice({ copy, snap }: { copy: VoiceCopy; snap: SpeechSnapshot }) {
  const locale = useLocale();
  const info = snap.speed;
  const fastState = info.switching ? snap.modelState("en", snap.fastVoice) : null;
  const options = [
    { id: "natural" as const, engine: "kokoro" as const, label: copy.speedNatural, hint: copy.speedNaturalHint },
    { id: "fast" as const, engine: "piper" as const, label: copy.speedFast, hint: copy.speedFastHint },
  ];
  return (
    <View className="mt-3" testID="voice-speed">
      <Text className="font-label text-sm text-muted">{copy.speedTitle}</Text>
      <View accessibilityRole="radiogroup" className="mt-2 flex-row gap-2">
        {options.map((option) => {
          const active = info.engine === option.engine;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}, ${option.hint}`}
              accessibilityState={{ selected: active, checked: active }}
              aria-checked={active}
              onPress={() => speechService.setSpeedPreference(option.id)}
              className={`min-h-14 flex-1 rounded-2xl px-3 py-2 ${active ? "border-2 border-ember bg-card" : "border border-line bg-card"}`}
              testID={`voice-speed-${option.id}`}
            >
              <Text className="text-base font-semibold text-ink">{option.label}</Text>
              <Text className="text-sm leading-5 text-muted">{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-2 text-sm leading-5 text-muted" testID="voice-speed-status">
        {speedStatusText(info, copy, locale)}
      </Text>
      {fastState ? (
        <View testID="voice-speed-switching">
          <Text className="mt-1 text-sm leading-5 text-muted">
            {fillCopy(copy.warmSwitching, { percent: percentOf(fastState.loaded, fastState.total) })}
          </Text>
          {fastState.total > 0 ? <ProgressBar fraction={fastState.loaded / fastState.total} /> : null}
        </View>
      ) : null}
      {info.preference !== "auto" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => speechService.setSpeedPreference("auto")}
          className="mt-1 min-h-11 justify-center self-start"
          testID="voice-speed-auto"
        >
          <Text className="text-sm font-semibold" style={{ color: tactile.primaryInk }}>
            {copy.speedUseAuto}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Baixar agora a voz escolhida, com o progresso real do download. */
function DownloadNow({ language, voice, copy, snap }: { language: string; voice: NarrationVoice; copy: VoiceCopy; snap: SpeechSnapshot }) {
  const [error, setError] = useState<string | null>(null);
  const state = snap.modelState(language, voice.id);
  if (voice.engine === "webspeech" || state.phase === "ready" || state.stored) {
    return null;
  }
  if (state.phase === "downloading") {
    const percent = percentOf(state.loaded, state.total);
    return (
      <View className="mt-3" testID="voice-download-progress" accessibilityLiveRegion="polite">
        <Text className="text-sm leading-5 text-muted">
          {state.total > 0
            ? `${fillCopy(copy.downloading, { percent })} · ${fillCopy(copy.downloadSize, { loaded: megabytes(state.loaded), total: megabytes(state.total) })}`
            : copy.downloadingUnknown}
        </Text>
        {state.total > 0 ? <ProgressBar fraction={state.loaded / state.total} /> : null}
      </View>
    );
  }
  return (
    <View className="mt-3 items-start">
      <TactileButton
        variant="secondary"
        size="sm"
        label={copy.downloadNow}
        accessibilityLabel={fillCopy(copy.downloadNowLabel, { name: voice.label })}
        onPress={() => {
          setError(null);
          speechService.downloadModels(undefined, { lang: language, voice: voice.id }).catch((caught: unknown) => {
            setError(caught instanceof Error && caught.message ? caught.message : copy.downloadFailed);
          });
        }}
        testID="voice-download-now"
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-2 text-sm leading-5 text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function VoicePicker({ language, onPreview }: { language: string; onPreview?: () => void }) {
  const copy = useAreaCopy(VOICE_COPY);
  const selected = useNarratorVoice(language);
  const snap = useSpeechSnapshot();
  const voices = voicesFor(language, snap.speed.engine);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, []);

  if (voices.length === 0) {
    return null;
  }

  const english = speechLang(language) === "en";
  const selectedVoice = voices.find((voice) => voice.id === selected) ?? voices[0];

  function stopSample() {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPreviewing(null);
    setPlaying(null);
  }

  async function sample(voiceId: string) {
    if (previewing === voiceId || playing === voiceId) {
      AudioService.stopAndUnload();
      stopSample();
      return;
    }
    onPreview?.();
    AudioService.stopAndUnload();
    playbackRef.current = null;
    const generation = narrationToken();
    setError(null);
    setPlaying(null);
    setPreviewing(voiceId);
    try {
      const spoken = await speakStory(sampleLine(language), language, voiceId);
      if (narrationToken() !== generation) {
        return;
      }
      setPreviewing(null);
      setPlaying(voiceId);
      playbackRef.current = startNeuralPlayback(
        spoken.audioUrl,
        1,
        () => undefined,
        () => {
          playbackRef.current = null;
          setPlaying(null);
        },
        (message) => {
          playbackRef.current = null;
          setPlaying(null);
          setError(message);
        },
      );
    } catch (caught) {
      if (narrationToken() !== generation) {
        return;
      }
      playbackRef.current = null;
      setPreviewing(null);
      setError(caught instanceof Error && caught.message ? caught.message : copy.sampleFailed);
    }
  }

  return (
    <View className="mt-6" testID="voice-picker">
      <Text className="font-label text-sm text-muted">{copy.title}</Text>
      {english ? <SpeedChoice copy={copy} snap={snap} /> : null}
      <View accessibilityRole="radiogroup" className="mt-3 gap-2">
        {voices.map((voice) => {
          const active = voice.id === selected;
          const busy = previewing === voice.id;
          const live = playing === voice.id;
          const state = snap.modelState(language, voice.id);
          const detail = [genderText(voice, copy), modelText(state, voice.engine, copy)].filter(Boolean).join(" · ");
          return (
            <View
              key={voice.id}
              className={`min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2 ${active ? "border-2 border-ember bg-card" : "border border-line bg-card"}`}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={[voice.label, genderText(voice, copy)].filter(Boolean).join(", ")}
                accessibilityState={{ selected: active, checked: active }}
                aria-checked={active}
                onPress={() => setNarratorVoice(language, voice.id)}
                className="min-h-12 flex-1 flex-row items-center gap-3"
                testID={`voice-option-${voice.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${active ? "border-ember" : "border-line"}`}>
                  {active ? <View className="h-2.5 w-2.5 rounded-full bg-ember" /> : null}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-base font-semibold text-ink">
                    {voice.label}
                  </Text>
                  {detail ? (
                    <Text numberOfLines={1} className="text-sm text-muted">
                      {detail}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={live || busy ? copy.stopSample : fillCopy(copy.sampleLabel, { name: voice.label })}
                onPress={() => {
                  void sample(voice.id);
                }}
                className={`min-h-11 min-w-24 flex-row items-center justify-center gap-2 rounded-full px-4 ${live ? "bg-ember" : "border border-line bg-card"}`}
                testID={`voice-sample-${voice.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                {busy ? <ActivityIndicator size="small" /> : null}
                <Text numberOfLines={1} className={`text-sm font-semibold ${live ? "text-onEmber" : "text-ink"}`}>
                  {live || busy ? copy.stopSample : copy.sample}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {selectedVoice ? <DownloadNow language={language} voice={selectedVoice} copy={copy} snap={snap} /> : null}
      <Text className="mt-2 text-sm leading-5 text-muted">{copy.hint}</Text>
      {error ? (
        <Text accessibilityRole="alert" className="mt-2 text-base leading-6 text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Aquecimento no onboarding
// ---------------------------------------------------------------------------

/**
 * Começa a baixar a voz do idioma-alvo em segundo plano (uma vez por idioma). `lang` nulo = ainda
 * não é hora (o aluno não escolheu o par). Usa a voz do narrador deste aparelho.
 */
export function useVoiceWarmup(lang: string | null): void {
  const voice = useNarratorVoice(lang ?? "en");
  useEffect(() => {
    if (lang) {
      void startVoiceWarmup(lang, voice);
    }
  }, [lang, voice]);
}

function useWarmupState(lang: string): WarmupState {
  return useSyncExternalStore(
    subscribeVoiceWarmup,
    () => voiceWarmupState(lang),
    () => voiceWarmupState(lang),
  );
}

function warmupText(state: WarmupState, copy: VoiceCopy): string | null {
  switch (state.phase) {
    case "downloading":
      return state.total > 0
        ? fillCopy(copy.warmDownloading, { percent: percentOf(state.loaded, state.total), loaded: megabytes(state.loaded), total: megabytes(state.total) })
        : copy.warmDownloadingUnknown;
    case "preparing":
      return copy.preparing;
    case "measuring":
      return copy.warmMeasuring;
    case "switching":
      return fillCopy(copy.warmSwitching, { percent: percentOf(state.loaded, state.total) });
    case "ready":
      return copy.warmReady;
    case "deferred":
      return copy.warmSaveData;
    case "error":
      return copy.warmFailed;
    default:
      return null;
  }
}

/** Linha curta e honesta com o estado real da voz (progresso do download, medida, pronta). */
export function VoiceWarmupLine({ lang }: { lang: string }) {
  const copy = useAreaCopy(VOICE_COPY);
  const state = useWarmupState(speechLang(lang));
  const text = warmupText(state, copy);
  if (!text) {
    return null;
  }
  const showBar = (state.phase === "downloading" || state.phase === "switching") && state.total > 0;
  return (
    <View testID="voice-warmup-line" accessibilityLiveRegion="polite" style={{ paddingHorizontal: 4 }}>
      <Text testID={`voice-warmup-${state.phase}`} style={{ color: tactile.muted, fontFamily: tactile.font, fontSize: 13, lineHeight: 18 }}>
        {text}
      </Text>
      {showBar ? <ProgressBar fraction={state.loaded / state.total} testID="voice-warmup-bar" /> : null}
    </View>
  );
}
