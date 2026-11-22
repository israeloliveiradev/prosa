import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { Portrait } from "@/components/persona/portrait";
import { classifyFailure, fill, languageLabel, proseTopic, storyExcerpt, trimHistory, type FailureKind } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { mindById } from "@/design/minds";
import { fetchProseMemory, sendProseTurn, speakStory, transcribeSpeech, type ProseTurnResult } from "@/lib/api";
import { useCast } from "@/lib/cast";
import { useAreaCopy } from "@/lib/copy/area";
import { PROFILE, mindName } from "@/lib/copy/profile";
import { READING, themeLabel } from "@/lib/copy/reading";
import { TALK, type TalkCopy } from "@/lib/copy/talk";
import { tap } from "@/lib/haptics";
import { copy as appCopy, LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { narratorVoice } from "@/lib/narrator";
import { isoDate, useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { stopIfRecording } from "@/lib/stop-recorder";
import { narrationToken } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

interface Turn {
  role: "mind" | "learner";
  text: string;
  note?: string;
  move?: ProseTurnResult["move"];
  repair?: ProseTurnResult["repair"];
}

interface MentorMemory {
  facts: string[];
  goals: string[];
  thread: string;
}

interface Failure {
  kind: FailureKind;
  during: "open" | "turn" | "speech";
  detail?: "micDenied" | "micEmpty" | "micFailed";
}

const MAX_LEARNER_TURNS = 8;

function repairText(repair: NonNullable<Turn["repair"]>, t: TalkCopy): string {
  if (repair.step === "hint") {
    return repair.mark ? fill(t.hint, { mark: repair.mark }) : t.hintPlain;
  }
  if (repair.step === "correction" && repair.fix) {
    return fill(t.correction, { fix: repair.fix });
  }
  return t.prompt;
}

function failureOf(caught: unknown): FailureKind {
  const ui = appCopy();
  return classifyFailure(caught, [ui.modelBusy, ui.lessonFailed, ui.generationOff], [ui.apiDown]);
}

/** Bloco de estado honesto quando a conversa não responde: nada de resposta inventada. */
export function TalkFailure({ failure, onRetry, retryDisabled }: { failure: Failure; onRetry?: () => void; retryDisabled?: boolean }) {
  const t = useAreaCopy(TALK);
  const offline = failure.kind === "network" || failure.kind === "ai";
  const title = offline ? t.offlineTitle : t.errorTitle;
  const body = failure.detail
    ? t[failure.detail]
    : failure.kind === "network"
      ? t.offlineNetwork
      : failure.kind === "ai"
        ? t.offlineAi
        : t.errorOther;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className={`gap-2 rounded-2xl border p-4 ${offline ? "border-amber-300 bg-amber-50" : "border-rose-200 bg-rose-50"}`}
    >
      {failure.detail ? null : (
        <Text className="text-base font-extrabold" style={{ color: offline ? "#78350F" : "#9F1239" }}>
          {title}
        </Text>
      )}
      <Text className="text-base leading-6" style={{ color: offline ? "#78350F" : "#9F1239" }}>
        {body}
      </Text>
      {onRetry ? (
        <View className="mt-1 self-start">
          <TactileButton label={t.retry} variant="amber" disabled={retryDisabled} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export type { Failure as TalkFailureState };

/**
 * Mentor com memória (GET /api/v1/prose/memory, POST /api/v1/prose/turn): a mente escolhida
 * para a fala conversa no idioma de estudo, lembra fatos, objetivos e erros, retoma a frase
 * quando algo sai errado e não elogia de graça. Entrada por texto ou por voz (transcrição no servidor).
 */
export function ProseScreen() {
  const t = useAreaCopy(TALK);
  const profileCopy = useAreaCopy(PROFILE);
  const readingCopy = useAreaCopy(READING);
  const locale = useLocale();
  const session = useSession();
  const progress = useProgress();
  const { picks } = useCast();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
  const interest = session?.user?.interests?.find((item) => item.trim().length > 1);
  const companion = mindById(picks.speech);
  const name = mindName(companion.id, profileCopy);
  const lessonToday = progress.lessonDate === isoDate();
  const todayTopic = lessonToday ? progress.topic?.trim() || null : null;
  const topic = proseTopic([todayTopic, interest]);
  const topicShown = todayTopic ?? (interest ? themeLabel(interest, readingCopy) : null);
  const story = lessonToday ? storyExcerpt(progress.cachedLesson?.story_text) : undefined;
  const lang = languageLabel(targetLang, LOCALE_BCP47[locale]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const [round, setRound] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [memory, setMemory] = useState<MentorMemory | null>(null);

  const learnerTurns = turns.filter((turn) => turn.role === "learner").length;
  const closed = learnerTurns >= MAX_LEARNER_TURNS;

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
      void stopIfRecording(recorderRef.current);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setPending(true);
    setFailure(null);
    void fetchProseMemory(token)
      .then((next) => {
        if (active) {
          setMemory(next);
        }
      })
      .catch(() => undefined);
    void sendProseTurn(token, { userLine: "", topic, story, mind: companion.id, history: [] })
      .then((result) => {
        if (!active) {
          return;
        }
        setTurns([{ role: "mind", text: result.reply, note: result.through_note || undefined, move: result.move }]);
        if (result.memory) {
          setMemory(result.memory);
        }
        // Sem vibração aqui: a abertura chega sem toque do aluno e o navegador bloqueia (e acusa) a vibração.
      })
      .catch((caught: unknown) => {
        if (active) {
          setFailure({ kind: failureOf(caught), during: "open" });
        }
      })
      .finally(() => {
        if (active) {
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
    // A conversa abre uma vez por rodada e por mente; tema e trecho entram só na abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, round, companion.id]);

  async function playLine(text: string, index: number) {
    if (speakingIndex === index) {
      AudioService.stopAndUnload();
      setSpeakingIndex(null);
      return;
    }
    AudioService.stopAndUnload();
    const generation = narrationToken();
    setVoiceFailed(false);
    setSpeakingIndex(index);
    try {
      const spoken = await speakStory(text, targetLang, narratorVoice(targetLang));
      if (narrationToken() !== generation) {
        return;
      }
      AudioService.play(
        spoken.audioUrl,
        1,
        () => undefined,
        () => setSpeakingIndex(null),
        () => {
          setSpeakingIndex(null);
          setVoiceFailed(true);
        },
      );
    } catch {
      if (narrationToken() === generation) {
        setSpeakingIndex(null);
        setVoiceFailed(true);
      }
    }
  }

  async function sendLine(line: string) {
    if (!token || pending || closed || !line.trim()) {
      return;
    }
    const history = trimHistory(turns, 8);
    setDraft("");
    setTurns((current) => [...current, { role: "learner", text: line }]);
    setPending(true);
    setFailure(null);
    AudioService.stopAndUnload();
    setSpeakingIndex(null);
    try {
      const result = await sendProseTurn(token, { userLine: line, topic, story, mind: companion.id, history });
      const index = turns.length + 1;
      setTurns((current) => [
        ...current,
        { role: "mind", text: result.reply, note: result.through_note || undefined, move: result.move, repair: result.repair },
      ]);
      if (result.memory) {
        setMemory(result.memory);
      }
      void tap("success");
      void playLine(result.reply, index);
    } catch (caught) {
      setTurns((current) => current.slice(0, -1));
      setDraft(line);
      setFailure({ kind: failureOf(caught), during: "turn" });
    } finally {
      setPending(false);
    }
  }

  async function dictate() {
    if (pending || closed || transcribing) {
      return;
    }
    if (recording) {
      setRecording(false);
      setTranscribing(true);
      setFailure(null);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          setFailure({ kind: "other", during: "speech", detail: "micFailed" });
          return;
        }
        const heard = await transcribeSpeech(uri, targetLang);
        if (!heard) {
          setFailure({ kind: "other", during: "speech", detail: "micEmpty" });
          return;
        }
        void tap("light");
        setTranscribing(false);
        await sendLine(heard);
      } catch (caught) {
        const kind = failureOf(caught);
        setFailure(kind === "network" ? { kind, during: "speech" } : { kind: "other", during: "speech", detail: "micFailed" });
      } finally {
        setTranscribing(false);
      }
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setFailure({ kind: "other", during: "speech", detail: "micDenied" });
        return;
      }
      setFailure(null);
      AudioService.stopAndUnload();
      setSpeakingIndex(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      void tap("light");
    } catch {
      setFailure({ kind: "other", during: "speech", detail: "micDenied" });
    }
  }

  function newConversation() {
    AudioService.stopAndUnload();
    setSpeakingIndex(null);
    setTurns([]);
    setDraft("");
    setFailure(null);
    setRound((current) => current + 1);
  }

  if (!token) {
    return <Redirect href="/account" />;
  }

  const remembered = memory ? [...memory.goals, ...memory.facts].filter((item) => item.trim().length > 0).slice(0, 4) : [];
  const busy = pending || transcribing;
  const canSend = !busy && !recording && draft.trim().length > 0;

  return (
    <View className="gap-5">
      <TactileCard className="p-5" animateEntry={false}>
        <View>
          <View className="flex-row items-center gap-4">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F5F0E8]">
              <Portrait who={companion.id} size={76} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.mentorRole}</Text>
              <Text className="font-display text-xl font-extrabold text-[#111C2D]">{name}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#3D4947]">
                {topicShown ? fill(t.mentorDek, { topic: topicShown, name, lang }) : fill(t.mentorDekFree, { name, lang })}
              </Text>
            </View>
          </View>
          <View className="mt-4 rounded-xl bg-[#F5F0E8] px-4 py-3">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-[#3D4947]">{t.remembers}</Text>
            <Text className="mt-1 text-sm leading-5 text-[#111C2D]">{remembered.length > 0 ? remembered.join(" · ") : t.memoryEmpty}</Text>
          </View>
        </View>
      </TactileCard>

      <View className="gap-3">
        {turns.map((turn, index) => (
          <View key={`${turn.role}-${index}`} className={turn.role === "learner" ? "items-end" : "items-start"}>
            {turn.role === "mind" ? (
              <View className="flex-row items-end gap-2" style={{ maxWidth: "92%" }}>
                <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F5F0E8]">
                  <Portrait who={companion.id} size={34} />
                </View>
                <View
                  className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                  style={{ flexShrink: 1, minWidth: 0, borderBottomLeftRadius: 6, boxShadow: "0 3px 0 #E2E8F0" } as ViewStyle}
                >
                  <Text className="text-lg leading-7 text-[#111C2D]">{turn.text}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t.listen}: ${turn.text}`}
                    onPress={() => void playLine(turn.text, index)}
                    className="mt-1 cursor-pointer justify-center self-start"
                    style={{ minHeight: 36 }}
                  >
                    <Text className="text-sm font-bold text-[#0F766E]">{speakingIndex === index ? "■" : "▶"} {t.listen}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View
                className="max-w-[85%] rounded-2xl border bg-[#0D9488] px-4 py-3"
                style={{ borderColor: "#0F766E", borderBottomRightRadius: 6, boxShadow: "0 3px 0 #0F766E" } as ViewStyle}
              >
                <Text className="text-lg leading-7 text-white">{turn.text}</Text>
              </View>
            )}
            {turn.move === "clarify" || turn.move === "rephrase" ? (
              <Text className="mt-2 max-w-[85%] text-sm text-[#64748B]" style={{ marginLeft: 44 }}>{turn.move === "clarify" ? t.clarify : t.rephrase}</Text>
            ) : null}
            {turn.repair && turn.repair.step !== "none" ? (
              <View className="mt-2 max-w-[85%] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3" style={{ marginLeft: 44 }}>
                <Text className="text-base leading-6 text-amber-900">{repairText(turn.repair, t)}</Text>
              </View>
            ) : null}
            {turn.note ? (
              <View className="mt-2 max-w-[85%] rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] px-4 py-3" style={{ marginLeft: 44 }}>
                <Text className="text-xs font-extrabold uppercase tracking-wider text-[#0D9488]">{t.noteLabel}</Text>
                <Text className="mt-1 text-base leading-6 text-[#3D4947]">{turn.note}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {pending ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
            {turns.length === 0 ? t.opening : fill(t.replying, { name })}
          </Text>
        ) : null}
        {transcribing ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
            {t.transcribing}
          </Text>
        ) : null}
        {voiceFailed ? <Text className="text-sm text-[#64748B]">{t.voiceFailed}</Text> : null}
      </View>

      {failure ? (
        <TalkFailure
          failure={failure}
          retryDisabled={busy}
          onRetry={
            failure.during === "open"
              ? newConversation
              : failure.during === "turn"
                ? () => void sendLine(draft.trim())
                : undefined
          }
        />
      ) : null}

      {failure?.during === "open" && turns.length === 0 ? null : closed ? (
        <TactileCard className="p-5" animateEntry={false}>
          <View className="gap-3">
            <Text className="text-base leading-6 text-[#3D4947]">{fill(t.closed, { n: MAX_LEARNER_TURNS })}</Text>
            <View className="self-start">
              <TactileButton label={t.newTalk} variant="primary" onPress={newConversation} />
            </View>
          </View>
        </TactileCard>
      ) : (
        <TactileCard className="p-4" animateEntry={false}>
          <View>
            <Text className="text-sm font-semibold text-[#3D4947]">{t.yourLine}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!busy && !recording}
              multiline
              textAlignVertical="top"
              placeholder={fill(t.placeholder, { lang })}
              placeholderTextColor="#64748B"
              accessibilityLabel={t.yourLine}
              className="mt-2 min-h-24 rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] px-4 py-3 text-lg leading-7 text-[#111C2D]"
            />
            <View className="mt-3 flex-row flex-wrap gap-3">
              <TactileButton label={t.send} variant="primary" disabled={!canSend} onPress={() => void sendLine(draft.trim())} />
              <TactileButton
                label={recording ? t.stopAndSend : t.speak}
                variant={recording ? "crimson" : "secondary"}
                disabled={busy}
                onPress={() => void dictate()}
              />
              {turns.length > 1 ? <TactileButton label={t.newTalk} variant="ghost" disabled={busy} onPress={newConversation} /> : null}
            </View>
          </View>
        </TactileCard>
      )}
    </View>
  );
}
