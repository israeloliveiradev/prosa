import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { calibrateOwnlife, checkOwnlifeMission, fetchOwnlife, transcribeSpeech, type OwnlifeNote } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";

export function OwnlifeScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
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
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.lifeKicker} title={copy.lifeTitle} dek={copy.lifeDek} />
        <View>
          <TextInput
            value={source}
            onChangeText={setSource}
            multiline
            textAlignVertical="top"
            accessibilityLabel={copy.lifePaste}
            placeholder={copy.lifePaste}
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-40 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void calibrate()}
            disabled={pending || source.trim().length < 12}
            className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
          >
            <Text className="text-base font-semibold text-paper">{copy.lifeCalibrate}</Text>
          </Pressable>
        </View>
        {note ? (
          <View className="gap-3">
            <Text className="text-lg leading-8 text-ink">{note.calibrated}</Text>
            {note.through_note ? <Text className="text-base leading-7 text-muted">{note.through_note}</Text> : null}
            {note.vocabulary?.map((entry) => (
              <View key={entry.word}>
                <Text className="font-label text-base text-ink">{entry.word}</Text>
                <Text className="text-sm text-muted">{entry.translation}</Text>
              </View>
            ))}
            <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.lifeMission}</Text>
            <Text className="text-base leading-7 text-ink">{note.mission_prompt}</Text>
            <Pressable accessibilityRole="button" onPress={() => void check()} disabled={pending} className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5">
              <Text className="text-base font-semibold text-ink">{recording ? copy.dictoglossPlaying : copy.lifeCheck}</Text>
            </Pressable>
            {note.mission_done ? <Text className="text-base text-ember">{copy.lifeHeld}</Text> : null}
          </View>
        ) : null}
        {status ? <Text className="text-base text-ember">{status}</Text> : null}
      </View>
    </AppFrame>
  );
}
