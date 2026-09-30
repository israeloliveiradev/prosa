import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { Field, Panel, PanelHead, SoftInput } from "@/components/shell/panel";
import { confirmPasswordReset, fetchMailInbox, requestPasswordReset } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { normalizeOtp } from "@/lib/otp";
import { keepWords } from "@/lib/text";

export default function ResetScreen() {
  const copy = useCopy();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [inboxUrl, setInboxUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchMailInbox().then(setInboxUrl);
  }, []);

  return (
    <AppFrame>
      <View className="max-w-xl">
        <Panel>
          <PanelHead kicker={copy.forgot} title={copy.resetTitle} dek={copy.forgotHint} />
          <Field label="E-mail">
            <SoftInput value={email} onChangeText={setEmail} label="E-mail" email placeholder="ana@exemplo.com" autoComplete="email" textContentType="emailAddress" />
          </Field>
          <ChunkButton
            label={copy.sendReset}
            disabled={pending || !email.includes("@")}
            onPress={() => {
              setPending(true);
              setError(null);
              void requestPasswordReset(email)
                .then(() => setNote(copy.forgotHint))
                .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código não saiu."))
                .finally(() => setPending(false));
            }}
          />
          <Text className="mt-4 text-sm leading-6 text-muted">{copy.mailOff}</Text>
          {inboxUrl ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(inboxUrl)} className="mt-2 min-h-12 cursor-pointer items-center justify-center self-start">
              <Text className="font-label text-base text-ember">{copy.mailBox}</Text>
            </Pressable>
          ) : null}
          <View className="mt-8 border-t border-line pt-6">
            <Field label={copy.resetCode}>
              <SoftInput value={code} onChangeText={setCode} label={copy.resetCode} code autoComplete="one-time-code" textContentType="oneTimeCode" />
            </Field>
            <Field label={copy.newPassword}>
              <SoftInput value={password} onChangeText={setPassword} label={copy.newPassword} secure autoComplete="new-password" textContentType="newPassword" />
            </Field>
            {note ? <Text className="mb-4 text-base text-moss">{keepWords(note)}</Text> : null}
            {error ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="mb-4 text-base text-roseInk">
                {keepWords(error)}
              </Text>
            ) : null}
            <ChunkButton
              label={copy.resetSave}
              disabled={pending || !email.includes("@") || code.length !== 6 || password.length < 8}
              onPress={() => {
                setPending(true);
                setError(null);
                void confirmPasswordReset(email, normalizeOtp(code), password)
                  .then(() => router.replace("/account"))
                  .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "O código expirou."))
                  .finally(() => setPending(false));
              }}
            />
          </View>
        </Panel>
      </View>
    </AppFrame>
  );
}
