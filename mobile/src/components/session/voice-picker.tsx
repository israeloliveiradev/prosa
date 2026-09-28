import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { speakStory } from "@/lib/api";
import { sampleLine, setNarratorVoice, useNarratorVoice, voicesFor } from "@/lib/narrator";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

export function VoicePicker({ language, onPreview }: { language: string; onPreview?: () => void }) {
  const voices = voicesFor(language);
  const selected = useNarratorVoice(language);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  if (voices.length === 0) {
    return null;
  }

  async function choose(voiceId: string) {
    onPreview?.();
    setNarratorVoice(language, voiceId);
    AudioService.stopAndUnload();
    const generation = narrationToken();
    playbackRef.current = null;
    setError(null);
    try {
      const spoken = await speakStory(sampleLine(language), language, voiceId);
      if (narrationToken() !== generation) {
        return;
      }
      playbackRef.current = startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => {
        playbackRef.current = null;
      }, () => {
        playbackRef.current = null;
        setError("O navegador recusou o áudio.");
      });
    } catch {
      playbackRef.current = null;
      setError("A prévia da voz não saiu. Tente de novo.");
    }
  }

  return (
    <View className="mt-6">
      <Text className="font-label text-sm text-muted">Voz</Text>
      <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
        {voices.map((voice) => {
          const active = voice.id === selected;
          return (
            <Pressable
              key={voice.id}
              accessibilityRole="radio"
              accessibilityLabel={`${voice.name}, voz ${voice.detail}`}
              accessibilityState={{ selected: active, checked: active }}
              onPress={() => {
                void choose(voice.id);
              }}
              className={`min-h-12 items-center justify-center rounded-full px-4 ${active ? "bg-ember" : "border border-line bg-card"}`}
            >
              <Text numberOfLines={1} className={`text-base font-semibold ${active ? "text-onEmber" : "text-ink"}`}>
                {voice.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-2 text-sm leading-5 text-muted">Toque num nome para ouvir um trecho.</Text>
      {error ? (
        <Text accessibilityRole="alert" className="mt-2 text-base leading-6 text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
