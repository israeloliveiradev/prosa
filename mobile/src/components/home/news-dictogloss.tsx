import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ListenPace } from "@/components/session/listen-pace";
import { classifyFailure, fill } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { reconstructStory, speakStory, type AdaptedNews } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { READING } from "@/lib/copy/reading";
import { tap } from "@/lib/haptics";
import { copy as appCopy } from "@/lib/i18n";
import { listenRate } from "@/lib/listen-rate";
import { narratorVoice } from "@/lib/narrator";
import type { LessonRequest, ReconstructionReport } from "@/lib/types";
import { narrationToken } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

type Problem = "audio" | "network" | "ai" | "compare";

/**
 * Ditado de ouvido (dictogloss) sobre uma notícia: ouvir duas vezes (voz no aparelho),
 * escrever a ideia e comparar no servidor (POST /api/v1/reconstruct), com pista antes da correção.
 */
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
  const t = useAreaCopy(READING);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [report, setReport] = useState<ReconstructionReport | null>(null);
  const [tryIndex, setTryIndex] = useState(1);
  const ready = plays >= 2;
  const finished = report != null && (report.step === "correction" || report.step == null);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  async function play() {
    if (playing || finished) {
      return;
    }
    setProblem(null);
    AudioService.stopAndUnload();
    const generation = narrationToken();
    setPlaying(true);
    try {
      const spoken = await speakStory(story.story_text, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      AudioService.play(
        spoken.audioUrl,
        listenRate(),
        () => undefined,
        () => {
          setPlaying(false);
          setPlays((count) => Math.min(2, count + 1));
        },
        () => {
          setPlaying(false);
          setProblem("audio");
        },
      );
    } catch {
      if (narrationToken() === generation) {
        setPlaying(false);
        setProblem("audio");
      }
    }
  }

  async function compare() {
    if (!ready || pending || text.trim().length === 0) {
      return;
    }
    setPending(true);
    setProblem(null);
    AudioService.stopAndUnload();
    setPlaying(false);
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
      const ui = appCopy();
      const kind = classifyFailure(caught, [ui.modelBusy, ui.lessonFailed, ui.generationOff], [ui.apiDown]);
      setProblem(kind === "network" ? "network" : kind === "ai" ? "ai" : "compare");
    } finally {
      setPending(false);
    }
  }

  const problemText =
    problem === "audio" ? t.audioFailed : problem === "network" ? t.errorNetwork : problem === "ai" ? t.errorAi : problem === "compare" ? t.dgFailed : null;
  const empty = text.trim().length === 0;

  return (
    <View className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#FDFBF7] p-5">
      <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.dgKicker}</Text>
      <Text className="mt-2 text-lg font-bold leading-7 text-[#111C2D]">{t.dgTitle}</Text>
      {finished ? null : (
        <View className="mt-4 flex-row flex-wrap gap-3">
          <TactileButton
            label={playing ? t.dgPlaying : plays === 0 ? t.dgFirst : t.dgSecond}
            variant="primary"
            disabled={playing}
            onPress={() => void play()}
          />
          {ready ? null : <TactileButton label={t.dgHeard} variant="secondary" onPress={() => setPlays(2)} />}
        </View>
      )}
      {finished ? null : <ListenPace />}
      {ready && !finished ? (
        <View className="mt-5">
          <Text className="text-sm font-semibold text-[#3D4947]">{t.dgWrite}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder={t.dgPlaceholder}
            placeholderTextColor="#64748B"
            accessibilityLabel={t.dgWrite}
            className="mt-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-lg leading-7 text-[#111C2D]"
            style={{ minHeight: 144 }}
          />
          <View className="mt-3 self-start">
            <TactileButton
              label={pending ? t.dgComparing : t.dgCompare}
              variant="primary"
              disabled={pending || empty}
              onPress={() => void compare()}
            />
          </View>
        </View>
      ) : null}
      {problemText ? (
        <Text accessibilityRole="alert" className="mt-3 text-base leading-6 text-rose-700">
          {problemText}
        </Text>
      ) : null}
      {report ? <DictoglossReport report={report} story={story.story_text} showStory={finished} /> : null}
      <View className="mt-4 self-start">
        <TactileButton label={t.dgClose} variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

function DictoglossReport({ report, story, showStory }: { report: ReconstructionReport; story: string; showStory: boolean }) {
  const t = useAreaCopy(READING);
  return (
    <View className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <Text className="text-sm font-extrabold text-[#0F766E]">{fill(t.dgScore, { score: report.score })}</Text>
      <Text className="mt-4 text-sm font-bold text-[#111C2D]">{t.dgGrammar}</Text>
      {report.grammar.length === 0 ? <Text className="mt-1 text-base text-[#64748B]">{t.dgClear}</Text> : null}
      {report.grammar.map((item, index) => (
        <View key={`${item.original}-${index}`} className="mt-3">
          <Text className="text-base text-[#64748B] line-through">{item.original}</Text>
          {item.corrected ? <Text className="mt-1 text-base font-semibold text-[#111C2D]">{item.corrected}</Text> : null}
          {item.reason ? <Text className="mt-1 text-sm leading-5 text-[#64748B]">{item.reason}</Text> : null}
        </View>
      ))}
      <Text className="mt-5 text-sm font-bold text-[#111C2D]">{t.dgLiteral}</Text>
      {report.literals.length === 0 ? <Text className="mt-1 text-base text-[#64748B]">{t.dgClear}</Text> : null}
      {report.literals.map((item, index) => (
        <View key={`${item.phrase}-${index}`} className="mt-3">
          <Text className="text-base text-[#64748B]">{item.phrase}</Text>
          {item.native_alternative ? <Text className="mt-1 text-base font-semibold text-[#111C2D]">{item.native_alternative}</Text> : null}
          {item.reason ? <Text className="mt-1 text-sm leading-5 text-[#64748B]">{item.reason}</Text> : null}
        </View>
      ))}
      {showStory ? (
        <>
          <Text className="mt-5 text-sm font-bold text-[#111C2D]">{t.dgOriginal}</Text>
          <Text className="mt-2 font-reading text-base leading-7 text-[#111C2D]">{story}</Text>
        </>
      ) : null}
    </View>
  );
}
