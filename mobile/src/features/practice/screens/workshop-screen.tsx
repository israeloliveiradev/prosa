import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { fill, languageLabel } from "@/components/persona/talk-logic";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { useAreaCopy } from "@/lib/copy/area";
import { WORKSHOP } from "@/lib/copy/workshop";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { PracticePage } from "../components/practice-header";
import { cleanTypedSentence, pickSentences } from "../model/practice-model";

/**
 * Oficina gramatical: escolha uma frase das lições recentes (ou digite a sua) e abra a análise:
 * estrutura (/grammar/deconstruct), variações (/grammar/vary) e áudio, pela folha de gramática.
 */
export function WorkshopScreen() {
  const session = useSession();
  const locale = useLocale();
  const t = useAreaCopy(WORKSHOP);
  const progress = useProgress();
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const lessons = useMemo(() => {
    const items = progress.history.map((entry) => ({ lesson: entry.lesson }));
    return progress.cachedLesson && items.length === 0 ? [{ lesson: progress.cachedLesson }] : items;
  }, [progress.history, progress.cachedLesson]);
  const recent = useMemo(() => pickSentences(lessons, null, 8).sentences, [lessons]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  const language = session.user.target_lang ?? "en";
  const lang = languageLabel(language, LOCALE_BCP47[locale]);
  const clean = cleanTypedSentence(typed);

  return (
    <PracticePage testID="workshop-screen" kicker={t.kicker} title={t.title} dek={t.dek} back="←">
      <TactilePanel>
        <Text className="text-xs font-extrabold uppercase tracking-wider" style={{ color: tactile.primaryInk }}>
          {t.recentTitle}
        </Text>
        {recent.length === 0 ? (
          <Text testID="workshop-no-recent" className="mt-2 text-base leading-6" style={{ color: tactile.muted }}>
            {t.noRecent}
          </Text>
        ) : (
          <View className="mt-3 gap-2">
            {recent.map((sentence, index) => (
              <Pressable
                key={sentence}
                testID={`workshop-sentence-${index}`}
                accessibilityRole="button"
                accessibilityLabel={fill(t.openSentence, { sentence })}
                onPress={() => setOpen(sentence)}
                className="min-h-11 cursor-pointer justify-center rounded-xl border px-4 py-2"
                style={{ borderColor: tactile.border, backgroundColor: tactile.surface, borderBottomWidth: 3 }}
              >
                <Text className="text-base leading-6" style={{ color: tactile.ink }}>
                  {sentence}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </TactilePanel>
      <TactilePanel tone="quiet">
        <Text className="text-sm font-semibold" style={{ color: tactile.body }}>
          {fill(t.typeLabel, { lang })}
        </Text>
        <TextInput
          testID="workshop-input"
          value={typed}
          onChangeText={setTyped}
          maxLength={240}
          accessibilityLabel={fill(t.typeLabel, { lang })}
          placeholder={t.typePlaceholder}
          placeholderTextColor={tactile.muted}
          className="mt-2 min-h-12 rounded-xl border px-4 py-3 text-lg"
          style={{ borderColor: tactile.border, backgroundColor: tactile.bg, color: tactile.ink }}
        />
        <View className="mt-3 self-start">
          <TactileButton testID="workshop-analyze" label={t.analyze} variant="primary" disabled={clean.length < 3} onPress={() => setOpen(clean)} />
        </View>
        {typed.length > 0 && clean.length < 3 ? (
          <Text className="mt-2 text-sm" style={{ color: tactile.muted }}>
            {t.sentenceTooShort}
          </Text>
        ) : null}
      </TactilePanel>
      <GrammarSheet sentence={open} language={language} onClose={() => setOpen(null)} />
    </PracticePage>
  );
}
