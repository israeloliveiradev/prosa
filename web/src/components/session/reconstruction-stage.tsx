import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { IconMic } from "@/components/session/session-icons";
import { Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { reconstructStory, transcribeSpeech } from "@/lib/api";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import type { ReconstructionAnchor } from "@/lib/reconstruction";
import { useSession } from "@/lib/session";
import { stopIfRecording } from "@/lib/stop-recorder";
import type { ReconstructionReport, RepairCard } from "@/lib/types";
import { useTheme } from "@/theme/ThemeContext";

export function ReconstructionStage({
  anchor,
  onCompleted,
  onCards,
}: {
  anchor: ReconstructionAnchor;
  /** Chamado uma vez, quando a comparação fecha a escada de correção. */
  onCompleted: (report: ReconstructionReport) => void;
  onCards?: (cards: RepairCard[]) => void;
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const session = useSession();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const finishedRef = useRef(false);
  const [text, setText] = useState("");
  const [tryIndex, setTryIndex] = useState(1);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ReconstructionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finished = result != null && (result.step === "correction" || result.step == null);

  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  useEffect(() => {
    return () => {
      void stopIfRecording(recorderRef.current);
    };
  }, []);

  async function dictate() {
    if (pending) {
      return;
    }
    if (recording) {
      setRecording(false);
      setPending(true);
      setError(null);
      try {
        await stopIfRecording(recorder);
        const uri = recorder.uri;
        if (!uri) {
          throw new Error(local.recordingLost);
        }
        const spoken = await transcribeSpeech(uri, anchor.targetLang);
        if (!spoken) {
          throw new Error(local.noSpeechHeard);
        }
        setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken));
        void tap("light");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : local.transcribeFailed);
      } finally {
        setPending(false);
      }
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(local.micNeeded);
        return;
      }
      setError(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      void tap("light");
    } catch {
      setError(local.micNeeded);
    }
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const report = await reconstructStory({
        attempt: text.trim(),
        story_text: anchor.storyText,
        translation: anchor.translation,
        target_lang: anchor.targetLang,
        through_lang: anchor.throughLang,
        level: anchor.level,
        try_index: tryIndex,
        token: session?.token,
      });
      setResult(report);
      if (report.cards && report.cards.length > 0) {
        onCards?.(report.cards);
      }
      const done = report.step === "correction" || report.step == null;
      if (!done) {
        setTryIndex((current) => Math.min(4, current + 1));
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        onCompleted(report);
      }
      void tap(report.score >= 80 ? "success" : "medium");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : local.rebuildFailed);
    } finally {
      setPending(false);
    }
  }

  const locked = pending || text.trim().length === 0;

  return (
    <View className="gap-4">
      <StageCard>
        <Kicker tone="accent">{local.rebuildKicker}</Kicker>
        <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{local.rebuildTitle}</Text>
        <View accessibilityLabel={local.rebuildSource} className="mt-4 rounded-2xl px-4 py-4" style={{ backgroundColor: palette.raised }}>
          <Text className="font-serif text-lg leading-8 text-ink">{anchor.translation}</Text>
        </View>
        <Text className="mt-4 font-sans text-sm font-bold text-muted">{local.rebuildYours}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!finished}
          multiline
          textAlignVertical="top"
          placeholder={local.rebuildPlaceholder}
          placeholderTextColor={palette.faint}
          accessibilityLabel={local.rebuildYours}
          className="mt-2 min-h-40 rounded-2xl px-4 py-3 font-serif text-lg leading-8 text-ink"
          style={{ backgroundColor: palette.card, borderWidth: 2, borderColor: palette.border }}
        />
        <View className="mt-4 flex-row flex-wrap gap-2">
          <TactileButton
            variant={recording ? "crimson" : "secondary"}
            size="md"
            disabled={(pending && !recording) || finished}
            onPress={() => void dictate()}
            icon={<IconMic color={recording ? palette.onPrimary : palette.primary} size={15} />}
            label={recording ? local.rebuildStopDictate : local.rebuildDictate}
          />
          <TactileButton
            variant="primary"
            size="md"
            disabled={locked || finished}
            onPress={() => void submit()}
            label={pending && !recording ? local.rebuildComparing : tryIndex > 1 ? copy.journalRetry : local.rebuildCompare}
          />
        </View>
        {error ? <Notice>{error}</Notice> : null}
        {result?.cards && result.cards.length > 0 ? <Notice tone="success">{copy.repairCardSaved}</Notice> : null}
      </StageCard>
      {result ? <ReconstructionReportView result={result} story={anchor.storyText} /> : null}
    </View>
  );
}

function ReconstructionReportView({ result, story }: { result: ReconstructionReport; story: string }) {
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  return (
    <StageCard>
      <Kicker>{fill(local.score, { score: result.score })}</Kicker>
      <Text className="mt-4 font-sans text-sm font-extrabold text-ink">{local.rebuildGrammar}</Text>
      {result.grammar.length === 0 ? <Text className="mt-2 font-sans text-base text-muted">{local.rebuildNoGrammar}</Text> : null}
      {result.grammar.map((item, index) => (
        <View key={`${item.original}-${index}`} className="mt-3">
          <Text className="font-sans text-base text-muted">{item.original}</Text>
          {item.corrected ? <Text className="mt-1 font-sans text-base font-bold text-ink">{item.corrected}</Text> : null}
          {item.reason ? <Text className="mt-1 font-sans text-sm leading-5 text-muted">{item.reason}</Text> : null}
          {!item.corrected && !item.reason ? <Text className="mt-1 font-sans text-sm leading-5 text-ink">{copy.journalRewrite}</Text> : null}
        </View>
      ))}
      <Text className="mt-5 font-sans text-sm font-extrabold text-ink">{local.rebuildLiteral}</Text>
      {result.literals.length === 0 ? <Text className="mt-2 font-sans text-base text-muted">{local.rebuildNoLiteral}</Text> : null}
      {result.literals.map((item, index) => (
        <View key={`${item.phrase}-${index}`} className="mt-3">
          <Text className="font-sans text-base text-muted">{item.phrase}</Text>
          {item.native_alternative ? <Text className="mt-1 font-sans text-base font-bold text-ink">{item.native_alternative}</Text> : null}
          {item.reason ? <Text className="mt-1 font-sans text-sm leading-5 text-muted">{item.reason}</Text> : null}
          {!item.native_alternative && !item.reason ? <Text className="mt-1 font-sans text-sm leading-5 text-ink">{copy.journalRewrite}</Text> : null}
        </View>
      ))}
      {result.step === "correction" || result.step == null ? (
        <View>
          <Text className="mt-5 font-sans text-sm font-extrabold text-ink">{local.rebuildOriginal}</Text>
          <Text className="mt-2 font-serif text-lg leading-8 text-ink">{story}</Text>
        </View>
      ) : null}
    </StageCard>
  );
}
