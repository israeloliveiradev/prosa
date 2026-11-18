import { useCallback, useEffect, useState } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Sheet } from "@/ui/sheet";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Flag } from "@/ui/flag";
import { Pill } from "@/ui/pill";
import { InlineError } from "@/ui/inline-error";
import { listStudyTracks, activateStudyTrack } from "@/api/study";
import {
  STUDY_LANGUAGES,
  languageName,
  CEFR_LEVELS,
  type CourseLevel,
} from "@/lib/languages";
import { laneStats, switchProgressLang, dropForeignGlosses } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { useCopy } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import type { StudyTrackChoice } from "@/api/schemas/study";

export interface CourseSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CourseSheet({ visible, onClose }: CourseSheetProps) {
  const router = useRouter();
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();

  const [tracks, setTracks] = useState<StudyTrackChoice[]>([]);
  const [adding, setAdding] = useState(false);
  const [draftTarget, setDraftTarget] = useState("es");
  const [draftThrough] = useState("pt");
  const [draftLevel, setDraftLevel] = useState<CourseLevel>("A2");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.token;
  const user = session?.user;
  const currentTarget = user?.target_lang || "en";
  const isPro = user?.plan === "pro";

  const loadTracks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await listStudyTracks(token);
      if (res.length > 0) {
        setTracks(res);
      } else if (user) {
        setTracks([
          {
            target_lang: user.target_lang,
            through_lang: user.native_lang,
            level: user.level,
            active: true,
          },
        ]);
      }
    } catch {
      if (user) {
        setTracks([
          {
            target_lang: user.target_lang,
            through_lang: user.native_lang,
            level: user.level,
            active: true,
          },
        ]);
      }
    }
  }, [token, user]);

  useEffect(() => {
    if (visible) {
      void loadTracks();
      setAdding(false);
      setError(null);
    }
  }, [visible, loadTracks]);

  const handleSelectTrack = async (track: StudyTrackChoice) => {
    if (pending || track.target_lang === currentTarget) {
      onClose();
      return;
    }

    setPending(true);
    setError(null);

    try {
      if (token) {
        const saved = await activateStudyTrack(token, {
          target_lang: track.target_lang,
          through_lang: track.through_lang,
          level: (track.level as CourseLevel) || user?.level || "A2",
        });
        rememberProfile({
          target_lang: saved.target_lang as any,
          native_lang: saved.through_lang as any,
          level: (saved.level as CourseLevel) || "A2",
        });
      }
      switchProgressLang(track.target_lang);
      dropForeignGlosses(track.through_lang);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar de curso.");
    } finally {
      setPending(false);
    }
  };

  const handleCreateTrack = async () => {
    if (!token) return;
    setPending(true);
    setError(null);

    try {
      const saved = await activateStudyTrack(token, {
        target_lang: draftTarget,
        through_lang: draftThrough,
        level: draftLevel,
      });
      rememberProfile({
        target_lang: saved.target_lang as any,
        native_lang: saved.through_lang as any,
        level: (saved.level as CourseLevel) || draftLevel,
      });
      switchProgressLang(saved.target_lang);
      dropForeignGlosses(saved.through_lang);
      setAdding(false);
      await loadTracks();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar curso.");
    } finally {
      setPending(false);
    }
  };

  const enrolledLangs = new Set(tracks.map((t) => t.target_lang));
  const availableLangs = STUDY_LANGUAGES.filter((item) => !enrolledLangs.has(item.id));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.yourCourses ?? "Seus cursos"}
      description="Escolha o idioma que deseja estudar agora."
      testID="course-sheet"
    >
      <ScrollView contentContainerStyle={styles.content}>
        {error && <InlineError message={error} />}

        {/* Lista de cursos ativos/cadastrados */}
        <View style={{ gap: 8 }}>
          {tracks.map((track) => {
            const isActive = track.target_lang === currentTarget;
            const stats = laneStats(track.target_lang);

            return (
              <Pressable
                key={track.target_lang}
                accessibilityRole="button"
                accessibilityLabel={`${languageName(track.target_lang)}, nível ${track.level}`}
                accessibilityState={{ selected: isActive, disabled: pending }}
                disabled={pending}
                onPress={() => void handleSelectTrack(track)}
                testID={`course-item-${track.target_lang}`}
                style={[
                  styles.trackCard,
                  {
                    backgroundColor: isActive ? palette.accentSoft : palette.sheet,
                    borderColor: isActive ? palette.accent : palette.border,
                  },
                ]}
              >
                <Flag code={track.target_lang} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text variant="body" weight="semibold" tone="ink">
                      {languageName(track.target_lang)}
                    </Text>
                    {isActive && <Pill label="Ativo" tone="accent" />}
                  </View>
                  <Text variant="caption" tone="muted">
                    Nível {track.level} • {copy.through ?? "Através de"} {languageName(track.through_lang)}
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {stats.words} {stats.words === 1 ? (copy.courseWord ?? "palavra") : (copy.courseWords ?? "palavras")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Adicionar novo curso */}
        {!adding ? (
          <View style={{ paddingTop: 8 }}>
            <Button
              variant="secondary"
              label={copy.addCourse ?? "Adicionar outro idioma"}
              onPress={() => {
                if (isPro) {
                  setAdding(true);
                } else {
                  onClose();
                  router.push("/paywall");
                }
              }}
              testID="course-add-btn"
            />
          </View>
        ) : (
          <View style={[styles.addForm, { backgroundColor: palette.raised, borderColor: palette.border }]}>
            <Text variant="label" weight="semibold" tone="ink">
              Novo curso
            </Text>

            {/* Escolha do idioma de estudo */}
            <View style={{ gap: 6 }}>
              <Text variant="caption" tone="muted">
                {copy.study ?? "Idioma"}
              </Text>
              <View style={styles.chipRow}>
                {availableLangs.map((l) => {
                  const isSel = l.id === draftTarget;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => setDraftTarget(l.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSel ? palette.accentSoft : palette.sheet,
                          borderColor: isSel ? palette.accent : palette.border,
                        },
                      ]}
                    >
                      <Flag code={l.id} size={20} />
                      <Text variant="caption" weight={isSel ? "semibold" : "regular"} tone="ink">
                        {languageName(l.id)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Escolha do nível inicial */}
            <View style={{ gap: 6 }}>
              <Text variant="caption" tone="muted">
                Nível
              </Text>
              <View style={styles.chipRow}>
                {CEFR_LEVELS.map((lvl) => {
                  const isSel = lvl === draftLevel;
                  return (
                    <Pressable
                      key={lvl}
                      onPress={() => setDraftLevel(lvl)}
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor: isSel ? palette.accentSoft : palette.sheet,
                          borderColor: isSel ? palette.accent : palette.border,
                        },
                      ]}
                    >
                      <Text variant="caption" weight={isSel ? "semibold" : "regular"} tone="ink">
                        {lvl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Button
                variant="primary"
                label="Confirmar"
                loading={pending}
                onPress={handleCreateTrack}
                testID="course-save-btn"
              />
              <Button
                variant="ghost"
                label="Cancelar"
                disabled={pending}
                onPress={() => setAdding(false)}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  addForm: {
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    minWidth: 40,
    alignItems: "center",
  },
});
