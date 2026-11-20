import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { ChoiceTile, Kicker, Notice } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { deconstructGrammar, speakStory, varyGrammar, type GrammarBlock } from "@/lib/api";
import { chunksInSentence, type ChunkEntry } from "@/lib/chunks";
import { tap } from "@/lib/haptics";
import { SESSION_COPY, type SessionCopy } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { useCopy } from "@/lib/i18n";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { narrationToken, startNeuralPlayback } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

const ROLES: Array<{ role: GrammarBlock["role"]; label: keyof SessionCopy; tint: "accent" | "warning" | "positive" | "neutral" }> = [
  { role: "subject", label: "roleSubject", tint: "accent" },
  { role: "connector", label: "roleConnector", tint: "warning" },
  { role: "verb", label: "roleVerb", tint: "positive" },
  { role: "object", label: "roleObject", tint: "neutral" },
];

export function GrammarSheet({
  sentence,
  language,
  vocabulary = [],
  isSaved,
  onSaveChunk,
  onClose,
}: {
  sentence: string | null;
  language: string;
  vocabulary?: ChunkEntry[];
  isSaved?: (phrase: string) => boolean;
  onSaveChunk?: (phrase: string, translation: string, sentence: string) => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const session = useSession();
  const { palette } = useTheme();
  const tints = {
    accent: { bg: palette.accentSoft, edge: palette.accent },
    warning: { bg: palette.pillWarningBg, edge: palette.warning },
    positive: { bg: palette.pillPositiveBg, edge: palette.positive },
    neutral: { bg: palette.card, edge: palette.control },
  } as const;
  const [blocks, setBlocks] = useState<GrammarBlock[] | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [openRole, setOpenRole] = useState<GrammarBlock["role"] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = session?.token;

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  useEffect(() => {
    if (!sentence || !token) {
      setBlocks(null);
      setLine(sentence);
      setError(sentence && !token ? local.grammarSignIn : null);
      return;
    }
    const current = sentence;
    const auth = token;
    let cancelled = false;
    setPending(true);
    setError(null);
    setBlocks(null);
    setOpenRole(null);
    setLine(current);
    void deconstructGrammar(auth, current)
      .then((result) => {
        if (!cancelled) {
          setBlocks(result.blocks);
          setLine(result.sentence);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : local.grammarFailed);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [local.grammarFailed, local.grammarSignIn, sentence, token]);

  async function choose(role: GrammarBlock["role"], option: string) {
    if (!token || !blocks) {
      return;
    }
    void tap("light");
    const next = blocks.map((block) => (block.role === role ? { ...block, text: option } : block));
    setBlocks(next);
    setOpenRole(null);
    setPending(true);
    setError(null);
    AudioService.stopAndUnload();
    const generation = narrationToken();
    try {
      const varied = await varyGrammar(token, next);
      if (narrationToken() !== generation) {
        return;
      }
      setBlocks(varied.blocks);
      setLine(varied.sentence);
      // A frase variada é narrada no aparelho (Kokoro/Piper), como o resto da sessão.
      const spoken = await speakStory(varied.sentence, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => undefined);
    } catch (caught) {
      if (narrationToken() === generation) {
        setError(caught instanceof Error ? caught.message : local.varyFailed);
      }
    } finally {
      if (narrationToken() === generation) {
        setPending(false);
      }
    }
  }

  const expressions = chunksInSentence(vocabulary, line ?? sentence ?? "");

  function close() {
    AudioService.stopAndUnload();
    onClose();
  }

  return (
    <GlassSheet visible={sentence !== null} onClose={close} label={local.grammarTitle}>
      <Text className="mt-3 font-serif text-lg leading-8 text-ink">{line}</Text>
      {pending ? <ActivityIndicator color={palette.primary} style={{ marginTop: 12 }} /> : null}
      {blocks ? (
        <View className="mt-4 gap-3">
          {ROLES.map((role) => {
            const block = blocks.find((item) => item.role === role.role);
            if (!block) {
              return null;
            }
            const opened = openRole === role.role;
            const tint = tints[role.tint];
            const label = local[role.label];
            return (
              <View key={role.role}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${block.text}`}
                  accessibilityState={{ expanded: opened }}
                  onPress={() => setOpenRole(opened ? null : role.role)}
                  className="min-h-12 cursor-pointer justify-center rounded-2xl px-4 py-2"
                  style={{ backgroundColor: tint.bg, borderWidth: 2, borderColor: tint.edge, borderBottomWidth: 4 }}
                >
                  <Text className="font-sans text-xs font-extrabold uppercase tracking-wider text-muted">{label}</Text>
                  <Text className="font-sans text-base font-semibold text-ink">{block.text}</Text>
                </Pressable>
                {opened ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {block.options.map((option) => (
                      <ChoiceTile
                        key={option}
                        label={option}
                        state={option === block.text ? "selected" : "idle"}
                        onPress={() => void choose(role.role, option)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {onSaveChunk ? (
        <View className="mt-5">
          <Kicker tone="muted">{copy.chunkInSentence}</Kicker>
          {expressions.length === 0 ? <Text className="mt-2 font-sans text-base leading-6 text-muted">{copy.noChunkHere}</Text> : null}
          {expressions.map((entry) => {
            const saved = isSaved?.(entry.word) === true;
            return (
              <View key={entry.word} className="mt-3">
                <Text className="font-sans text-base font-semibold text-ink">{entry.word}</Text>
                <Text className="mt-1 font-sans text-sm leading-5 text-muted">{entry.translation}</Text>
                <View className="mt-2 flex-row">
                  <TactileButton
                    variant={saved ? "secondary" : "primary"}
                    size="sm"
                    disabled={saved}
                    onPress={() => {
                      void tap("success");
                      onSaveChunk(entry.word, entry.translation, line ?? sentence ?? "");
                    }}
                    label={saved ? copy.alreadyInDeck : copy.saveExpression}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </GlassSheet>
  );
}
