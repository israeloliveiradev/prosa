import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { speakStory } from "@/lib/api";
import { VOICE_COPY, fillCopy, type VoiceCopy } from "@/lib/copy/voice";
import { useAreaCopy } from "@/lib/copy/area";
import { sampleLine, setNarratorVoice, useNarratorVoice, voicesFor, type NarrationVoice } from "@/lib/narrator";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { speechService, type ModelState } from "@/services/speechService";

function genderText(voice: NarrationVoice, copy: VoiceCopy): string {
  if (voice.gender === "female") {
    return copy.femaleVoice;
  }
  if (voice.gender === "male") {
    return copy.maleVoice;
  }
  return voice.engine === "webspeech" ? copy.systemVoice : "";
}

function modelText(state: ModelState, engine: NarrationVoice["engine"], copy: VoiceCopy): string {
  if (engine === "webspeech") {
    return "";
  }
  if (state.phase === "downloading") {
    return state.total > 0 ? fillCopy(copy.downloading, { percent: Math.floor((state.loaded / state.total) * 100) }) : copy.downloadingUnknown;
  }
  if (state.phase === "ready" || state.stored) {
    return copy.onDevice;
  }
  return copy.needsDownload;
}

/** Hook: re-renderiza quando o motor de voz muda de estado (download, pronto, cache). */
function useSpeechStatus(): void {
  const [, setTick] = useState(0);
  useEffect(() => speechService.subscribe(() => setTick((tick) => tick + 1)), []);
}

export function VoicePicker({ language, onPreview }: { language: string; onPreview?: () => void }) {
  const copy = useAreaCopy(VOICE_COPY);
  const selected = useNarratorVoice(language);
  const voices = voicesFor(language);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useSpeechStatus();

  useEffect(() => {
    return () => {
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, []);

  if (voices.length === 0) {
    return null;
  }

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
      <View accessibilityRole="radiogroup" className="mt-3 gap-2">
        {voices.map((voice) => {
          const active = voice.id === selected;
          const busy = previewing === voice.id;
          const live = playing === voice.id;
          const state = speechService.modelState(language, voice.id);
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
      <Text className="mt-2 text-sm leading-5 text-muted">{copy.hint}</Text>
      {error ? (
        <Text accessibilityRole="alert" className="mt-2 text-base leading-6 text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
