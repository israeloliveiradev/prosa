import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ListenPace } from "@/components/session/listen-pace";
import { reconstructStory, speakStory, type AdaptedNews } from "@/lib/api";
import { listenRate } from "@/lib/listen-rate";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { narratorVoice } from "@/lib/narrator";
import type { LessonRequest, ReconstructionReport } from "@/lib/types";
import { startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export function NewsDictogloss({
  story,
  language,
  through,
  level,
  token,
  onClose,
}: {
  story: AdaptedNews;
  language: string;
  through: string;
  level: LessonRequest["level"];
  token: string;
  onClose: () => void;
}) {
  const copy = useCopy();
  const { palette } = useTheme();
  const playback = useRef<PlaybackHandle | null>(null);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReconstructionReport | null>(null);
  const [tryIndex, setTryIndex] = useState(1);
  const ready = plays >= 2;
  const finished = report != null && (report.step === "correction" || report.step == null);

  useEffect(() => {
    return () => {
      playback.current?.stop();
      AudioService.stopAndUnload();
    };
  }, []);

  async function play() {
    if (playing || finished) {
      return;
    }
    setError(null);
    setPlaying(true);
    const done = () => {
      setPlaying(false);
      setPlays((count) => Math.min(2, count + 1));
    };
    const fail = () => {
      setPlaying(false);
      setError(copy.neuralVoiceFailed);
    };
    try {
      const url = story.audioUrl || (await speakStory(story.story_text, language, narratorVoice(language))).audioUrl;
      playback.current?.stop();
      playback.current = startNeuralPlayback(url, listenRate(), () => undefined, done, fail);
    } catch (caught) {
      setPlaying(false);
      setError(caught instanceof Error ? caught.message : copy.neuralVoiceFailed);
    }
  }

  async function compare() {
    if (!ready || pending || text.trim().length === 0) {
      return;
    }
    setPending(true);
    setError(null);
    AudioService.stopAndUnload();
    try {
      const next = await reconstructStory({
        attempt: text.trim(),
        story_text: story.story_text,
        translation: story.translation,
        target_lang: language,
        through_lang: through,
        level,
        try_index: tryIndex,
        token,
      });
      setReport(next);
      if (next.step && next.step !== "correction") {
        setTryIndex((current) => Math.min(4, current + 1));
      }
      void tap(next.score >= 80 ? "success" : "medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.dictoglossFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="mt-5">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.dictogloss}</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{copy.dictoglossTitle}</Text>
      <ListenPace />
      {finished ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: playing }}
          disabled={playing}
          onPress={() => {
            void play();
          }}
          className={`mt-5 min-h-12 items-center justify-center self-start rounded-full px-6 ${playing ? "bg-line" : "bg-ember"}`}
        >
          <Text className={`text-base font-semibold ${playing ? "text-muted" : "text-onEmber"}`}>
            {playing ? copy.dictoglossPlaying : plays === 0 ? copy.dictoglossFirst : copy.dictoglossSecond}
          </Text>
        </Pressable>
      )}
      {finished || ready ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPlays(2)}
          className="mt-3 min-h-12 items-center justify-center self-start rounded-full bg-line px-6"
        >
          <Text className="text-base font-semibold text-ink">{copy.dictoglossHeard}</Text>
        </Pressable>
      )}
      {ready && !finished ? (
        <View className="mt-5">
          <Text className="font-label text-sm text-muted">{copy.dictoglossWrite}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder={copy.dictoglossPlaceholder}
            placeholderTextColor={palette.onSurfaceVariant}
            accessibilityLabel={copy.dictoglossWrite}
            className="mt-2 min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending || text.trim().length === 0, busy: pending }}
            disabled={pending || text.trim().length === 0}
            onPress={() => {
              void compare();
            }}
            className={`mt-4 min-h-12 items-center justify-center self-start rounded-full px-6 ${pending || text.trim().length === 0 ? "bg-line" : "bg-ember"}`}
          >
            <Text className={`text-base font-semibold ${pending || text.trim().length === 0 ? "text-muted" : "text-onEmber"}`}>
              {pending ? copy.dictoglossComparing : copy.dictoglossCompare}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
      {report ? <DictoglossReport report={report} story={story.story_text} /> : null}
      <Pressable accessibilityRole="button" onPress={onClose} className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-line px-6">
        <Text className="text-base font-semibold text-ink">{copy.dictoglossClose}</Text>
      </Pressable>
    </View>
  );
}

function DictoglossReport({ report, story }: { report: ReconstructionReport; story: string }) {
  const copy = useCopy();
  return (
    <View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-sm text-ember">{copy.dictoglossScore.replace("{score}", String(report.score))}</Text>
      <Text className="mt-4 font-label text-sm text-ink">{copy.dictoglossGrammar}</Text>
      {report.grammar.length === 0 ? <Text className="mt-2 text-base text-muted">{copy.dictoglossClear}</Text> : null}
      {report.grammar.map((item, index) => (
        <View key={`${item.original}-${index}`} className="mt-3">
          <Text className="text-base text-muted">{item.original}</Text>
          {item.corrected ? <Text className="mt-1 font-label text-base text-ink">{item.corrected}</Text> : null}
          {item.reason ? <Text className="mt-1 text-sm leading-5 text-muted">{item.reason}</Text> : null}
        </View>
      ))}
      <Text className="mt-5 font-label text-sm text-ink">{copy.dictoglossLiteral}</Text>
      {report.literals.length === 0 ? <Text className="mt-2 text-base text-muted">{copy.dictoglossClear}</Text> : null}
      {report.literals.map((item, index) => (
        <View key={`${item.phrase}-${index}`} className="mt-3">
          <Text className="text-base text-muted">{item.phrase}</Text>
          {item.native_alternative ? <Text className="mt-1 font-label text-base text-ink">{item.native_alternative}</Text> : null}
          {item.reason ? <Text className="mt-1 text-sm leading-5 text-muted">{item.reason}</Text> : null}
        </View>
      ))}
      <Text className="mt-5 font-label text-sm text-ink">{copy.dictoglossStory}</Text>
      <Text className="mt-2 text-base leading-7 text-ink">{story}</Text>
    </View>
  );
}
