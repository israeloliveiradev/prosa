import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { TactileButton } from "@/components/tactile/tactile-button";
import { tactile } from "@/components/tactile/tokens";
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
  const tints = {
    accent: { bg: tactile.primarySoft, edge: tactile.primary },
    warning: { bg: tactile.amberSoft, edge: tactile.amber },
    positive: { bg: tactile.successSoft, edge: tactile.success },
    neutral: { bg: tactile.surface, edge: tactile.borderStrong },
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
      <Text style={{ marginTop: 12, fontFamily: tactile.serif, fontSize: 22, lineHeight: 32, color: tactile.ink }}>{line}</Text>
      {pending ? <ActivityIndicator color={tactile.primary} style={{ marginTop: 12 }} /> : null}
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
                  <Text style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: tactile.muted }}>{label}</Text>
                  <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "700", color: tactile.ink }}>{block.text}</Text>
                </Pressable>
                {opened ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {block.options.map((option) => (
                      <TactileButton
                        key={option}
                        label={option}
                        size="sm"
                        variant={option === block.text ? "primary" : "secondary"}
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
          <Text style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: tactile.primaryInk }}>{copy.chunkInSentence}</Text>
          {expressions.length === 0 ? <Text style={{ marginTop: 8, fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color: tactile.muted }}>{copy.noChunkHere}</Text> : null}
          {expressions.map((entry) => {
            const saved = isSaved?.(entry.word) === true;
            return (
              <View key={entry.word} style={{ marginTop: 12, backgroundColor: tactile.surface, borderWidth: 1, borderColor: tactile.border, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontFamily: tactile.font, fontSize: 16, fontWeight: "700", color: tactile.ink }}>{entry.word}</Text>
                <Text style={{ marginTop: 4, fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.muted }}>{entry.translation}</Text>
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
      {error ? (
        <View accessibilityRole="alert" style={{ marginTop: 12, backgroundColor: tactile.dangerSoft, borderRadius: 14, padding: 12 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.danger }}>{error}</Text>
        </View>
      ) : null}
    </GlassSheet>
  );
}
