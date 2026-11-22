import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { classifyFailure, fill, languageLabel, trimHistory } from "@/components/persona/talk-logic";
import { TalkFailure, type TalkFailureState } from "@/components/session/prose-screen";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { fetchPersonaScenes, sendPersonaTurn, speakStory, transcribeSpeech, type PersonaScene, type PersonaTurnResult, type SceneSource } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { TALK, type TalkCopy } from "@/lib/copy/talk";
import { tap } from "@/lib/haptics";
import { copy as appCopy, LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { stopIfRecording } from "@/lib/stop-recorder";
import { narrationToken } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

type Tone = PersonaTurnResult["tone"];

interface Turn {
  role: "persona" | "learner";
  text: string;
  tone?: Tone;
  note?: string;
}

function toneText(tone: Tone, t: TalkCopy): string {
  if (tone === "adequate") {
    return t.toneAdequate;
  }
  if (tone === "direct") {
    return t.toneDirect;
  }
  if (tone === "informal") {
    return t.toneInformal;
  }
  return t.toneInadequate;
}

function kindLabel(kind: PersonaScene["kind"], t: TalkCopy): string {
  if (kind === "goal") {
    return t.fromGoal;
  }
  if (kind === "unit") {
    return t.fromUnit;
  }
  return t.fromInterest;
}

function failureOf(caught: unknown) {
  const ui = appCopy();
  return classifyFailure(caught, [ui.modelBusy, ui.lessonFailed, ui.generationOff], [ui.apiDown]);
}

/**
 * Cenas (GET /api/v1/persona/scenes, POST /api/v1/persona/turn): role-play num lugar real,
 * com uma complicação e, a cada fala, o veredito do registro (tom) e a nota cultural da IA.
 */
export function PersonaScreen() {
  const t = useAreaCopy(TALK);
  const locale = useLocale();
  const session = useSession();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
  const lang = languageLabel(targetLang, LOCALE_BCP47[locale]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const [scenes, setScenes] = useState<PersonaScene[]>([]);
  const [source, setSource] = useState<SceneSource>("ai");
  const [scene, setScene] = useState<PersonaScene | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"loading" | "list" | "talk" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [failure, setFailure] = useState<TalkFailureState | null>(null);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
      void stopIfRecording(recorderRef.current);
    };
  }, []);

  const loadScenes = useCallback(() => {
    if (!token) {
      return () => undefined;
    }
    let active = true;
    setPhase("loading");
    setFailure(null);
    void fetchPersonaScenes(token, targetLang)
      .then((next) => {
        if (active) {
          setScenes(next.scenes);
          setSource(next.source);
          setPhase("list");
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setFailure({ kind: failureOf(caught), during: "open" });
          setPhase("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token, targetLang]);

  useEffect(() => loadScenes(), [loadScenes]);

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

  function openScene(next: PersonaScene) {
    AudioService.stopAndUnload();
    setSpeakingIndex(null);
    setScene(next);
    // A personagem fala primeiro quando a cena traz a abertura; não vira turno do aluno.
    setTurns(next.opener ? [{ role: "persona", text: next.opener }] : []);
    setDraft("");
    setFailure(null);
    setVoiceFailed(false);
    setPhase("talk");
    void tap("light");
  }

  function leaveScene() {
    AudioService.stopAndUnload();
    setSpeakingIndex(null);
    setScene(null);
    setTurns([]);
    setFailure(null);
    setPhase("list");
  }

  async function dictate() {
    if (pending || transcribing) {
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
        setDraft((current) => (current.trim() ? `${current.trim()} ${heard}` : heard));
        void tap("light");
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

  async function send() {
    if (!token || !scene || pending) {
      return;
    }
    const line = draft.trim();
    if (!line) {
      return;
    }
    const history = trimHistory(turns, 12);
    const index = turns.length + 1;
    setDraft("");
    setTurns((current) => [...current, { role: "learner", text: line }]);
    setPending(true);
    setFailure(null);
    AudioService.stopAndUnload();
    setSpeakingIndex(null);
    try {
      const result = await sendPersonaTurn(token, scene, line, history);
      setTurns((current) => [...current, { role: "persona", text: result.reply, tone: result.tone, note: result.cultural_note }]);
      void tap(result.tone === "adequate" ? "success" : "medium");
      void playLine(result.reply, index);
    } catch (caught) {
      setTurns((current) => current.slice(0, -1));
      setDraft(line);
      setFailure({ kind: failureOf(caught), during: "turn" });
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return <Redirect href="/account" />;
  }

  const busy = pending || transcribing;
  const canSend = !busy && !recording && draft.trim().length > 0;

  return (
    <View className="gap-5">
      {phase === "loading" ? (
        <TactileCard className="p-5" animateEntry={false}>
          <View>
            <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
              {t.scenesLoading}
            </Text>
          </View>
        </TactileCard>
      ) : null}

      {phase === "error" && failure ? <TalkFailure failure={failure} onRetry={() => void loadScenes()} /> : null}

      {phase === "list" ? (
        <View className="gap-4">
          <Text className="text-base leading-6 text-[#3D4947]">{fill(t.scenesDek, { lang })}</Text>
          {source === "fallback" ? (
            <View testID="talk-scenes-offline" accessibilityRole="alert" className="self-start rounded-lg px-3 py-1.5" style={{ backgroundColor: "#FEF3C7" }}>
              <Text className="text-xs font-bold" style={{ color: "#78350F" }}>
                {t.fallbackBadge}
              </Text>
            </View>
          ) : null}
          {scenes.length === 0 ? <Text className="text-base text-[#64748B]">{t.scenesEmpty}</Text> : null}
          <View className="flex-row flex-wrap gap-4">
            {scenes.map((item) => (
              <Pressable
                key={item.id}
                testID={`talk-scene-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.objective}. ${t.openScene}`}
                onPress={() => openScene(item)}
                className="flex-1 cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white p-5"
                style={{ minWidth: 260, flexBasis: 300, boxShadow: "0 4px 0 #E2E8F0" } as ViewStyle}
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{kindLabel(item.kind, t)}</Text>
                <Text className="mt-2 font-display text-xl font-extrabold text-[#111C2D]">{item.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-[#64748B]">{item.setting}</Text>
                <Text className="mt-2 text-sm leading-5 text-[#3D4947]">
                  <Text className="font-bold">{`${t.objective}: `}</Text>
                  {item.objective}
                </Text>
                {/* A reviravolta (twist) fica só com o parceiro: mostrada antes, estragaria a surpresa. */}
                <Text className="mt-3 text-sm font-extrabold text-[#0F766E]">{`${t.openScene} →`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {phase === "talk" && scene ? (
        <View className="gap-4">
          <TactileCard className="p-5" animateEntry={false}>
            <View>
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{kindLabel(scene.kind, t)}</Text>
              <Text className="mt-2 font-display text-xl font-extrabold text-[#111C2D]">{scene.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#64748B]">{scene.setting}</Text>
              <Text className="mt-2 text-sm leading-5 text-[#3D4947]">
                <Text className="font-bold">{`${t.youAre}: `}</Text>
                {scene.learner_role}
              </Text>
              <Text className="text-sm leading-5 text-[#3D4947]">
                <Text className="font-bold">{`${t.partnerIs}: `}</Text>
                {scene.partner_role}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-[#111C2D]">
                <Text className="font-bold">{`${t.objective}: `}</Text>
                {scene.objective}
              </Text>
              {source === "fallback" ? (
                <Text className="mt-2 text-xs font-bold" style={{ color: "#78350F" }}>
                  {t.fallbackBadge}
                </Text>
              ) : null}
              <View className="mt-3 self-start">
                <TactileButton testID="talk-other-scenes" label={t.otherScenes} variant="secondary" size="sm" onPress={leaveScene} />
              </View>
            </View>
          </TactileCard>

          <View className="gap-3">
            {turns.length === 0 ? <Text className="text-base leading-6 text-[#3D4947]">{fill(t.youStart, { lang })}</Text> : null}
            {turns.map((turn, index) => (
              <View key={`${turn.role}-${index}`} className={turn.role === "learner" ? "items-end" : "items-start"}>
                {turn.role === "persona" ? (
                  <View
                    className="max-w-[90%] rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                    style={{ borderBottomLeftRadius: 6, boxShadow: "0 3px 0 #E2E8F0" } as ViewStyle}
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
                ) : (
                  <View
                    className="max-w-[85%] rounded-2xl border bg-[#0D9488] px-4 py-3"
                    style={{ borderColor: "#0F766E", borderBottomRightRadius: 6, boxShadow: "0 3px 0 #0F766E" } as ViewStyle}
                  >
                    <Text className="text-lg leading-7 text-white">{turn.text}</Text>
                  </View>
                )}
                {turn.tone && turn.note ? (
                  <View
                    className={`mt-2 max-w-[90%] rounded-xl border px-4 py-3 ${
                      turn.tone === "adequate" ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
                    }`}
                  >
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-[#3D4947]">{t.toneLabel}</Text>
                    <Text className={`mt-1 text-base font-bold ${turn.tone === "adequate" ? "text-emerald-900" : "text-amber-900"}`}>
                      {toneText(turn.tone, t)}
                    </Text>
                    <Text className="mt-2 text-xs font-extrabold uppercase tracking-wider text-[#3D4947]">{t.culturalNote}</Text>
                    <Text className="mt-1 text-base leading-6 text-[#3D4947]">{turn.note}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            {pending ? (
              <Text accessibilityLiveRegion="polite" className="text-base text-[#64748B]">
                {t.sceneReplying}
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
            <TalkFailure failure={failure} retryDisabled={busy} onRetry={failure.during === "turn" ? () => void send() : undefined} />
          ) : null}

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
                <TactileButton testID="talk-send" label={t.send} variant="primary" disabled={!canSend} onPress={() => void send()} />
                <TactileButton
                  label={recording ? t.stopAndTranscribe : t.dictate}
                  variant={recording ? "crimson" : "secondary"}
                  disabled={busy}
                  onPress={() => void dictate()}
                />
              </View>
            </View>
          </TactileCard>
        </View>
      ) : null}
    </View>
  );
}
