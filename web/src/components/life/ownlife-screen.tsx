import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { calibrateOwnlife, checkOwnlifeMission, fetchOwnlife, transcribeSpeech, type OwnlifeNote } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";

export function OwnlifeScreen() {
  const session = useSession();
  const copy = useCopy();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
  const [source, setSource] = useState("");
  const [note, setNote] = useState<OwnlifeNote | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchOwnlife(token, targetLang).then((next) => {
      if (active) {
        setNote(next);
      }
    });
    return () => {
      active = false;
    };
  }, [token, targetLang]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;

  async function calibrate() {
    setPending(true);
    setStatus(null);
    try {
      const next = await calibrateOwnlife(auth, targetLang, source.trim());
      setNote(next);
      setSource("");
      void tap("success");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : copy.lifeDek);
    } finally {
      setPending(false);
    }
  }

  async function check() {
    if (recording) {
      setRecording(false);
      setPending(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          return;
        }
        const spoken = await transcribeSpeech(uri, targetLang);
        const result = await checkOwnlifeMission(auth, targetLang, spoken);
        setStatus(result.held ? copy.lifeHeld : copy.lifeMissed);
        if (result.held) {
          setNote((current) => (current ? { ...current, mission_done: true } : current));
        }
        void tap(result.held ? "success" : "light");
      } finally {
        setPending(false);
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  return (
    <View testID="life-screen" className="w-full gap-6 pb-16" style={{ maxWidth: 852, alignSelf: "center", paddingHorizontal: 16 }}>
      <View className="gap-2">
        <Text style={{ color: tactile.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{copy.lifeKicker}</Text>
        <Text accessibilityRole="header" className="font-display text-3xl font-extrabold tracking-tight" style={{ color: tactile.ink }}>
          {copy.lifeTitle}
        </Text>
        <Text className="text-base leading-6" style={{ color: tactile.body }}>
          {copy.lifeDek}
        </Text>
      </View>
      <TactilePanel>
        <TextInput
          testID="life-source-input"
          value={source}
          onChangeText={setSource}
          multiline
          textAlignVertical="top"
          accessibilityLabel={copy.lifePaste}
          placeholder={copy.lifePaste}
          placeholderTextColor={tactile.muted}
          className="min-h-40 rounded-xl border px-4 py-3 text-lg leading-7"
          style={{ borderColor: tactile.border, backgroundColor: tactile.bg, color: tactile.ink }}
        />
        <View className="mt-4 self-start">
          <TactileButton
            testID="life-calibrate"
            label={copy.lifeCalibrate}
            variant="primary"
            onPress={() => void calibrate()}
            disabled={pending || source.trim().length < 12}
          />
        </View>
      </TactilePanel>
      {note ? (
        <TactilePanel tone="accent" testID="life-note">
          <Text className="text-lg leading-8" style={{ color: tactile.ink }}>
            {note.calibrated}
          </Text>
          {note.through_note ? (
            <Text className="mt-2 text-base leading-7" style={{ color: tactile.body }}>
              {note.through_note}
            </Text>
          ) : null}
          {note.vocabulary?.map((entry) => (
            <View key={entry.word} className="mt-3">
              <Text className="text-base font-bold" style={{ color: tactile.ink }}>
                {entry.word}
              </Text>
              <Text className="text-sm" style={{ color: tactile.muted }}>
                {entry.translation}
              </Text>
            </View>
          ))}
          <Text className="mt-5 text-xs font-extrabold uppercase tracking-wider" style={{ color: tactile.primaryInk }}>
            {copy.lifeMission}
          </Text>
          <Text className="mt-1 text-base leading-7" style={{ color: tactile.ink }}>
            {note.mission_prompt}
          </Text>
          <View className="mt-3 self-start">
            <TactileButton
              testID="life-check"
              label={recording ? copy.dictoglossPlaying : copy.lifeCheck}
              variant={recording ? "crimson" : "secondary"}
              onPress={() => void check()}
              disabled={pending}
            />
          </View>
          {note.mission_done ? (
            <Text className="mt-3 text-base font-bold" style={{ color: tactile.success }}>
              {copy.lifeHeld}
            </Text>
          ) : null}
        </TactilePanel>
      ) : null}
      {status ? (
        <Text accessibilityRole="alert" className="text-base font-semibold" style={{ color: tactile.primaryInk }}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}
