import { Redirect, router, type Href } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { CefrHistory, CompetenceLine, MeasureBoard } from "@/components/home/measure-panel";
import { Portrait } from "@/components/persona/portrait";
import { fill, languageLabel } from "@/components/persona/talk-logic";
import { Flag } from "@/components/shell/flag";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { CAST_SLOTS, mindsForSlot, type CastSlot, type MindId } from "@/design/minds";
import {
  activateStudyTrack,
  fetchCourseProfile,
  listStudyTracks,
  saveAccountSettings,
  type StudyTrackChoice,
} from "@/lib/api";
import { usePath } from "@/features/path/model/use-path";
import { summarizeCanDo } from "@/features/shell/model/profile-stats";
import { displayStreak } from "@/features/shell/model/streak-model";
import { setCastSlot, useCast } from "@/lib/cast";
import { useAreaCopy } from "@/lib/copy/area";
import { PROFILE, accountLocale, mindLine, mindName, orderTracks, streakText, type ProfileCopy } from "@/lib/copy/profile";
import { READING, themeLabel } from "@/lib/copy/reading";
import { tap } from "@/lib/haptics";
import { DISPLAY_LOCALES, LOCALE_BCP47, getLocale, givenName, setLocale, useLocale, type DisplayLocale } from "@/lib/i18n";
import { CEFR_LEVELS, type CourseLevel } from "@/lib/languages";
import { dropForeignGlosses, isoDate, switchProgressLang } from "@/lib/progress";
import { refreshSession, rememberProfile, signOut, useSession } from "@/lib/session";

type SaveState = "saving" | "saved" | "failed" | "local";

const SLOT_LABEL: Record<CastSlot, keyof ProfileCopy> = {
  reading: "roleReading",
  memory: "roleMemory",
  speech: "roleSpeech",
  journal: "roleJournal",
};

function asLevel(value: string | undefined, fallback: CourseLevel): CourseLevel {
  return CEFR_LEVELS.includes((value ?? "") as CourseLevel) ? (value as CourseLevel) : fallback;
}

/**
 * O servidor guarda o idioma de interface só como pt/en; ao regravar a sessão ele voltaria para lá.
 * Quem escolheu outro idioma neste aparelho continua nele depois de salvar algo na conta.
 */
async function keepingLocale<T>(work: () => Promise<T> | T): Promise<T> {
  const chosen = getLocale();
  try {
    return await work();
  } finally {
    if (getLocale() !== chosen) {
      setLocale(chosen);
    }
  }
}

function Section({ title, dek, action, children }: { title: string; dek?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <TactileCard className="p-5" animateEntry={false}>
      <View>
        <View className="mb-4 flex-row flex-wrap items-start justify-between gap-3">
          <View className="flex-1" style={{ minWidth: 200 }}>
            <Text accessibilityRole="header" className="font-display text-lg font-extrabold text-[#111C2D]">
              {title}
            </Text>
            {dek ? <Text className="mt-1 text-sm leading-5 text-[#64748B]">{dek}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </View>
    </TactileCard>
  );
}

interface LinkItem {
  id: string;
  href: Href;
  title: string;
  detail: string;
}

function LinkGrid({ links }: { links: LinkItem[] }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {links.map((link) => (
        <Pressable
          key={link.id}
          testID={`profile-link-${link.id}`}
          accessibilityRole="link"
          accessibilityLabel={`${link.title}. ${link.detail}`}
          onPress={() => router.push(link.href)}
          className="flex-1 cursor-pointer rounded-xl border border-[#E2E8F0] bg-white px-4 py-3"
          style={{ minWidth: 200, flexBasis: 240, boxShadow: "0 3px 0 #E2E8F0" } as ViewStyle}
        >
          <Text className="text-base font-extrabold text-[#111C2D]">{`${link.title} →`}</Text>
          <Text className="mt-0.5 text-sm text-[#64748B]">{link.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const PILL_TONES = {
  teal: { borderColor: "#0F766E", backgroundColor: "#0D9488", color: "#FFFFFF" },
  amber: { borderColor: "#FCD34D", backgroundColor: "#FEF3C7", color: "#78350F" },
  neutral: { borderColor: "#E2E8F0", backgroundColor: "#F5F0E8", color: "#111C2D" },
} as const;

function Pill({ label, tone = "neutral" }: { label: string; tone?: keyof typeof PILL_TONES }) {
  const colors = PILL_TONES[tone];
  return (
    <View className="rounded-lg border px-2.5 py-1" style={{ borderColor: colors.borderColor, backgroundColor: colors.backgroundColor }}>
      <Text className="text-xs font-extrabold" style={{ color: colors.color }}>
        {label}
      </Text>
    </View>
  );
}

function SaveNote({ state, copy }: { state: SaveState | undefined; copy: { saving: string; saved: string; failed: string; local?: string } }) {
  if (!state) {
    return null;
  }
  const text = state === "saving" ? copy.saving : state === "saved" ? copy.saved : state === "local" ? (copy.local ?? copy.saved) : copy.failed;
  return (
    <Text accessibilityLiveRegion="polite" className={`mt-2 text-sm ${state === "failed" ? "text-rose-700" : "text-[#64748B]"}`}>
      {text}
    </Text>
  );
}

/** Você: progresso medido, "eu consigo", temas, idiomas, cursos, mentores, voz e atalhos. Sem números inventados. */
export default function ProfileScreen() {
  const session = useSession();
  const locale = useLocale();
  const t = useAreaCopy(PROFILE);
  const reading = useAreaCopy(READING);
  const { picks } = useCast();
  const [tracks, setTracks] = useState<StudyTrackChoice[] | null>(null);
  const [tracksFailed, setTracksFailed] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [switchFailed, setSwitchFailed] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);
  const [localeState, setLocaleState] = useState<SaveState | undefined>(undefined);
  const [mindState, setMindState] = useState<Partial<Record<CastSlot, SaveState>>>({});
  const [leaving, setLeaving] = useState(false);
  const path = usePath();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";

  const loadTracks = useCallback(async () => {
    if (!token) {
      return;
    }
    setTracksFailed(false);
    try {
      setTracks(await listStudyTracks(token));
    } catch {
      setTracksFailed(true);
    }
  }, [token]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setGoal(null);
    void fetchCourseProfile(token, targetLang)
      .then((course) => {
        if (active) {
          setGoal(typeof course?.profile?.goal === "string" ? course.profile.goal.trim() : "");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token, targetLang]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const user = session.user;
  const tag = LOCALE_BCP47[locale];
  const name = givenName(user.email, user.display_name);
  const level = user.level ?? "A2";
  const target = languageLabel(targetLang, tag);
  const support = languageLabel(user.native_lang ?? "pt", tag);
  const interests = (user.interests ?? []).filter((item) => item.trim().length > 0);
  const streak = displayStreak(user, 0, isoDate());
  const canDo = path.data ? summarizeCanDo(path.data.units, path.data.current_unit_id) : null;
  const courseList = tracks
    ? orderTracks(
        tracks.length > 0
          ? tracks
          : [{ target_lang: targetLang, through_lang: user.native_lang ?? "pt", level, active: true }],
        targetLang,
      )
    : [];

  async function chooseLocale(next: DisplayLocale) {
    if (next === locale) {
      return;
    }
    void tap("light");
    setLocale(next);
    const stored = accountLocale(next);
    if (!stored) {
      setLocaleState("local");
      return;
    }
    setLocaleState("saving");
    try {
      await saveAccountSettings(token!, { display_locale: stored });
      await keepingLocale(() => rememberProfile({ display_locale: stored }));
      setLocaleState("saved");
    } catch {
      setLocaleState("failed");
    }
  }

  async function chooseMind(slot: CastSlot, id: MindId) {
    if (picks[slot] === id || mindState[slot] === "saving") {
      return;
    }
    void tap("light");
    const previous = picks[slot];
    setCastSlot(slot, id);
    setMindState((current) => ({ ...current, [slot]: "saving" }));
    try {
      const key = `mind_${slot}` as const;
      await saveAccountSettings(token!, { [key]: id });
      await keepingLocale(() => refreshSession());
      setCastSlot(slot, id);
      setMindState((current) => ({ ...current, [slot]: "saved" }));
    } catch {
      setCastSlot(slot, previous);
      setMindState((current) => ({ ...current, [slot]: "failed" }));
    }
  }

  async function activate(track: StudyTrackChoice) {
    if (switching || track.target_lang === targetLang) {
      return;
    }
    setSwitching(track.target_lang);
    setSwitchFailed(false);
    try {
      const saved = await activateStudyTrack(token!, {
        target_lang: track.target_lang,
        through_lang: track.through_lang,
        level: track.level,
      });
      await keepingLocale(() =>
        rememberProfile({
          target_lang: saved.target_lang,
          native_lang: saved.through_lang,
          level: asLevel(saved.level, asLevel(track.level, "A2")),
        }),
      );
      switchProgressLang(saved.target_lang);
      dropForeignGlosses(saved.through_lang);
      void tap("success");
      await loadTracks();
    } catch {
      setSwitchFailed(true);
    } finally {
      setSwitching(null);
    }
  }

  async function leave() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    try {
      await signOut();
    } finally {
      router.replace("/account");
    }
  }

  const practices: LinkItem[] = [
    { id: "practice", href: "/practice", title: t.linkPractice, detail: t.linkPracticeDetail },
    { id: "memory", href: "/memory", title: t.linkMemory, detail: t.linkMemoryDetail },
    { id: "pronunciation", href: "/pronunciation" as Href, title: t.linkPronunciation, detail: t.linkPronunciationDetail },
    { id: "syntax-workshop", href: "/syntax-workshop" as Href, title: t.linkSyntax, detail: t.linkSyntaxDetail },
    { id: "duel", href: "/duel", title: t.linkDuel, detail: t.linkDuelDetail },
  ];
  const links: LinkItem[] = [
    { id: "dossier", href: "/dossier", title: t.linkDossier, detail: t.linkDossierDetail },
    { id: "score", href: "/score", title: t.linkScore, detail: t.linkScoreDetail },
    { id: "exam", href: "/exam", title: t.linkExams, detail: t.linkExamsDetail },
    { id: "pairs", href: "/pairs", title: t.linkPairs, detail: t.linkPairsDetail },
    { id: "life", href: "/life", title: t.linkLife, detail: t.linkLifeDetail },
    { id: "guide", href: "/guide", title: t.linkGuide, detail: t.linkGuideDetail },
    { id: "settings", href: "/settings", title: t.linkSettings, detail: t.linkSettingsDetail },
  ];

  return (
    <View className="w-full gap-6 pb-16" style={{ maxWidth: 992, alignSelf: "center", paddingHorizontal: 16 }}>
      <TactileCard className="p-6" animateEntry={false}>
        <View>
          <View className="flex-row flex-wrap items-center gap-5">
            <View
              className="h-20 w-20 items-center justify-center rounded-2xl border bg-[#0D9488]"
              style={{ borderColor: "#0F766E", boxShadow: "0 4px 0 #0F766E" } as ViewStyle}
            >
              <Text className="text-3xl font-black text-white">{(name.slice(0, 1) || "?").toUpperCase()}</Text>
            </View>
            <View className="flex-1 gap-1" style={{ minWidth: 220 }}>
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.kicker}</Text>
              <Text accessibilityRole="header" className="font-display text-2xl font-extrabold text-[#111C2D]">
                {name}
              </Text>
              <Text className="text-sm text-[#64748B]">{user.email}</Text>
              <Text className="mt-1 text-sm text-[#3D4947]">{fill(t.studying, { target, support })}</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <Pill label={fill(t.levelBadge, { level })} tone="teal" />
                <Pill label={user.plan === "pro" ? t.planPro : t.planFree} tone={user.plan === "pro" ? "amber" : "neutral"} />
                {streak.count > 0 ? <Pill label={streakText(streak.count, t)} /> : null}
              </View>
            </View>
          </View>
        </View>
      </TactileCard>

      <Section title={t.progressTitle} dek={t.progressDek}>
        <View className="gap-4">
          <CompetenceLine targetLang={targetLang} />
          <MeasureBoard targetLang={targetLang} showCefr={false} />
        </View>
      </Section>

      <Section
        title={t.cefrTitle}
        action={<TactileButton label={t.placementCta} variant="secondary" size="sm" onPress={() => router.push("/placement")} />}
      >
        <CefrHistory targetLang={targetLang} />
      </Section>

      <Section title={t.canDoPathTitle} dek={canDo ? fill(t.canDoPathDek, { done: String(canDo.done), total: String(canDo.total) }) : undefined}>
        {path.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-base" style={{ color: "#9F1239" }}>{t.canDoError}</Text>
            <View className="self-start">
              <TactileButton label={t.retry} variant="secondary" size="sm" testID="profile-cando-retry" onPress={() => void path.refetch()} />
            </View>
          </View>
        ) : canDo ? (
          <View testID="profile-cando" className="gap-2">
            {canDo.current ? <Text className="text-sm font-bold text-[#3D4947]">{fill(t.canDoCurrent, { unit: canDo.current.title })}</Text> : null}
            {canDo.current?.goals.map((goal) => (
              <View key={goal} className="rounded-xl bg-[#FDFBF7] px-4 py-3">
                <Text className="text-base leading-6 text-[#111C2D]">{goal}</Text>
              </View>
            ))}
            {canDo.done === 0 ? <Text className="text-base text-[#64748B]">{t.canDoNone}</Text> : null}
          </View>
        ) : null}
      </Section>

      <Section
        title={t.themesTitle}
        action={<TactileButton label={t.edit} variant="secondary" size="sm" onPress={() => router.push("/quiz")} />}
      >
        {interests.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {interests.map((item) => (
              <Pill key={item} label={themeLabel(item, reading)} />
            ))}
          </View>
        ) : (
          <Text className="text-base text-[#64748B]">{t.themesEmpty}</Text>
        )}
        {goal !== null ? (
          <View className="mt-4">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-[#3D4947]">{t.goalLabel}</Text>
            <Text className={`mt-1 text-base leading-6 ${goal ? "text-[#111C2D]" : "text-[#64748B]"}`}>{goal || t.goalEmpty}</Text>
          </View>
        ) : null}
      </Section>

      <Section title={t.languagesTitle}>
        <Text className="text-sm font-bold text-[#3D4947]">{t.uiLanguage}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t.uiLanguage} className="mt-2 flex-row flex-wrap gap-2">
          {DISPLAY_LOCALES.map((code) => {
            const selected = code === locale;
            const here = languageLabel(code, tag);
            const own = languageLabel(code, LOCALE_BCP47[code]);
            const label = here.toLowerCase() === own.toLowerCase() ? own : `${own} · ${here}`;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => void chooseLocale(code)}
                className={`min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 ${selected ? "bg-[#0D9488]" : "bg-white"}`}
                style={{ borderColor: selected ? "#0F766E" : "#E2E8F0", boxShadow: selected ? "0 3px 0 #0F766E" : "0 3px 0 #E2E8F0" } as ViewStyle}
              >
                <Text className={`text-sm font-bold ${selected ? "text-white" : "text-[#111C2D]"}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <SaveNote
          state={localeState}
          copy={{ saving: t.mentorSaving, saved: t.uiLanguageSaved, failed: t.uiLanguageSaveFailed, local: t.uiLanguageLocal }}
        />

        <View className="mt-5 flex-row items-center gap-3 rounded-xl bg-[#FDFBF7] px-4 py-3">
          <Flag code={user.native_lang ?? "pt"} size={28} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-[#3D4947]">{`${t.supportLanguage}: ${support}`}</Text>
            <Text className="text-sm text-[#64748B]">{fill(t.supportHint, { support })}</Text>
          </View>
        </View>

        <View className="mt-5 flex-row flex-wrap items-center justify-between gap-3">
          <Text className="text-sm font-bold text-[#3D4947]">{t.coursesTitle}</Text>
          <TactileButton label={t.addLanguage} variant="secondary" size="sm" onPress={() => router.push("/quiz")} />
        </View>
        {tracksFailed ? (
          <View accessibilityRole="alert" className="mt-3 gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-base" style={{ color: "#9F1239" }}>
              {t.coursesError}
            </Text>
            <View className="self-start">
              <TactileButton label={t.retry} variant="secondary" size="sm" onPress={() => void loadTracks()} />
            </View>
          </View>
        ) : null}
        <View className="mt-3 gap-2">
          {courseList.map((track) => {
            const active = track.target_lang === targetLang;
            const busy = switching === track.target_lang;
            return (
              <View
                key={track.target_lang}
                className="flex-row flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: active ? "#5EEAD4" : "#E2E8F0", backgroundColor: active ? "#F0FDFA" : "#FFFFFF" }}
              >
                <Flag code={track.target_lang} size={30} />
                <View className="flex-1" style={{ minWidth: 160 }}>
                  <Text className="text-base font-bold text-[#111C2D]">{languageLabel(track.target_lang, tag)}</Text>
                  <Text className="text-sm text-[#64748B]">
                    {`${fill(t.levelBadge, { level: track.level })} · ${fill(t.courseThrough, { lang: languageLabel(track.through_lang, tag) })}`}
                  </Text>
                </View>
                {active ? (
                  <Pill label={t.courseActive} tone="teal" />
                ) : (
                  <TactileButton
                    label={busy ? t.mentorSaving : t.courseActivate}
                    variant="secondary"
                    size="sm"
                    disabled={switching !== null}
                    onPress={() => void activate(track)}
                  />
                )}
              </View>
            );
          })}
        </View>
        {switchFailed ? (
          <Text accessibilityRole="alert" className="mt-2 text-sm text-rose-700">
            {t.courseSwitchFailed}
          </Text>
        ) : null}
      </Section>

      <Section title={t.mentorsTitle} dek={t.mentorsDek}>
        <View className="gap-5">
          {CAST_SLOTS.map((slot) => {
            const chosen = picks[slot];
            return (
              <View key={slot}>
                <Text className="text-xs font-extrabold uppercase tracking-wider text-[#0D9488]">{t[SLOT_LABEL[slot]] as string}</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel={t[SLOT_LABEL[slot]] as string} className="mt-2 flex-row flex-wrap gap-3">
                  {mindsForSlot(slot).map((mind) => {
                    const selected = mind.id === chosen;
                    const mindLabel = mindName(mind.id, t);
                    return (
                      <Pressable
                        key={mind.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${mindLabel}. ${mindLine(mind.id, t)}`}
                        accessibilityState={{ selected, checked: selected, disabled: mindState[slot] === "saving" }}
                        onPress={() => void chooseMind(slot, mind.id)}
                        className="flex-1 cursor-pointer flex-row items-center gap-3 rounded-xl border p-2.5"
                        style={
                          {
                            minWidth: 150,
                            flexBasis: 160,
                            borderColor: selected ? "#0F766E" : "#E2E8F0",
                            backgroundColor: selected ? "#F0FDFA" : "#FFFFFF",
                            boxShadow: selected ? "0 3px 0 #0F766E" : "0 3px 0 #E2E8F0",
                          } as ViewStyle
                        }
                      >
                        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[#F5F0E8]">
                          <Portrait who={mind.id} size={46} />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-sm font-extrabold text-[#111C2D]">
                            {mindLabel}
                          </Text>
                          <Text numberOfLines={2} className="text-xs leading-4 text-[#64748B]">
                            {mindLine(mind.id, t)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <SaveNote state={mindState[slot]} copy={{ saving: t.mentorSaving, saved: t.mentorSaved, failed: t.mentorFailed }} />
              </View>
            );
          })}
        </View>
      </Section>

      <Section title={t.practicesTitle} dek={t.practicesDek}>
        <LinkGrid links={practices} />
      </Section>

      <Section title={t.moreTitle}>
        <LinkGrid links={links} />
      </Section>

      <View className="self-start">
        <TactileButton label={leaving ? t.signingOut : t.signOut} variant="crimson" disabled={leaving} onPress={() => void leave()} />
      </View>
    </View>
  );
}
