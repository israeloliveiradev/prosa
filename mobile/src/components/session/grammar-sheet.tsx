import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { deconstructGrammar, varyGrammar, type GrammarBlock } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { narrationToken, startNeuralPlayback } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

const ROLES: Array<{ role: GrammarBlock["role"]; label: string; face: string }> = [
  { role: "subject", label: "Sujeito", face: "bg-emberSoft" },
  { role: "connector", label: "Tempo", face: "bg-sand" },
  { role: "verb", label: "Verbo", face: "bg-mossSoft" },
  { role: "object", label: "Complemento", face: "border border-line bg-card" },
];

export function GrammarSheet({
  sentence,
  language,
  onClose,
}: {
  sentence: string | null;
  language: string;
  onClose: () => void;
}) {
  const session = useSession();
  const { palette } = useTheme();
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
      setError(sentence && !token ? "Entre na conta para desmontar a frase." : null);
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
          setError(caught instanceof Error ? caught.message : "A frase não desmontou.");
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
  }, [sentence, token]);

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
      const varied = await varyGrammar(token, next, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      setBlocks(varied.blocks);
      setLine(varied.sentence);
      startNeuralPlayback(varied.audioUrl, 1, () => undefined, () => undefined);
    } catch (caught) {
      if (narrationToken() === generation) {
        setError(caught instanceof Error ? caught.message : "A variação não saiu.");
      }
    } finally {
      if (narrationToken() === generation) {
        setPending(false);
      }
    }
  }

  function close() {
    AudioService.stopAndUnload();
    onClose();
  }

  return (
    <GlassSheet visible={sentence !== null} onClose={close} label="Desconstrução">
      <Text className="mt-3 text-lg leading-8 text-ink">{line}</Text>
      {pending ? <ActivityIndicator color={palette.primary} /> : null}
      {blocks ? (
        <View className="mt-4 gap-3">
          {ROLES.map((role) => {
            const block = blocks.find((item) => item.role === role.role);
            if (!block) {
              return null;
            }
            const opened = openRole === role.role;
            return (
              <View key={role.role}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${role.label}: ${block.text}`}
                  accessibilityState={{ expanded: opened }}
                  onPress={() => setOpenRole(opened ? null : role.role)}
                  className={`min-h-12 cursor-pointer justify-center rounded-full px-4 ${role.face}`}
                >
                  <Text className="font-label text-sm text-ink">{role.label}</Text>
                  <Text className="text-base text-ink">{block.text}</Text>
                </Pressable>
                {opened ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {block.options.map((option) => {
                      const selected = option === block.text;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => void choose(role.role, option)}
                          className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                        >
                          <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
      {error ? <Text className="mt-3 text-base leading-6 text-roseInk">{error}</Text> : null}
    </GlassSheet>
  );
}
