import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { Field, Panel, PanelHead, SoftInput } from "@/components/shell/panel";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api";
import { useCopy } from "@/lib/i18n";
import { keepWords } from "@/lib/text";

export default function ResetScreen() {
  const copy = useCopy();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  return (
    <AppFrame>
      <View className="max-w-xl">
        <Panel>
          <PanelHead kicker={copy.forgot} title={copy.resetTitle} dek={copy.forgotHint} />
          <Field label="E-mail">
            <SoftInput value={email} onChangeText={setEmail} label="E-mail" email placeholder="ana@exemplo.com" />
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
          <View className="mt-8 border-t border-line pt-6">
            <Field label={copy.resetCode}>
              <SoftInput value={code} onChangeText={setCode} label={copy.resetCode} code />
            </Field>
            <Field label={copy.newPassword}>
              <SoftInput value={password} onChangeText={setPassword} label={copy.newPassword} secure />
            </Field>
            {note ? <Text className="mb-4 text-base text-moss">{keepWords(note)}</Text> : null}
            {error ? <Text className="mb-4 text-base text-roseInk">{keepWords(error)}</Text> : null}
            <ChunkButton
              label={copy.resetSave}
              disabled={pending || !email.includes("@") || code.length !== 6 || password.length < 8}
              onPress={() => {
                setPending(true);
                setError(null);
                void confirmPasswordReset(email, code, password)
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
