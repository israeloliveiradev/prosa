import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRouter, type Href } from "expo-router";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon, type TactileIconName } from "@/components/tactile/tactile-icon";
import { PanelKicker, TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { capitalizeFirst, formatMinutes, longDate, nextLevel, phaseDurations, weekdayShort, xpFraction } from "@/features/home/model/home-model";
import { useTodayPlan } from "@/features/home/model/use-today-plan";
import { SessionRuler } from "@/features/session/components/session-ruler";
import { shellLayoutFor } from "@/features/shell/model/shell-model";
import { canDoFor, canDoText, type CanDoSkill } from "@/lib/can-do";
import { mindRole, useCast } from "@/lib/cast";
import { useAreaCopy } from "@/lib/copy/area";
import { HOME_COPY, type HomeCopy } from "@/lib/copy/home";
import { SHELL_COPY } from "@/lib/copy/shell";
import { LOCALE_BCP47, givenName, phaseName, useLocale } from "@/lib/i18n";
import { dailyGoalMinutes, useJourney } from "@/lib/journey";
import { useSession } from "@/lib/session";
import { themeLabel } from "@/lib/themes";

const SKILL_ICON: Record<CanDoSkill, TactileIconName> = {
  reading: "book",
  listening: "headphones",
  speaking: "mic",
  writing: "pen",
};

function skillName(skill: CanDoSkill, t: HomeCopy): string {
  return skill === "reading" ? t.skillReading : skill === "listening" ? t.skillListening : skill === "speaking" ? t.skillSpeaking : t.skillWriting;
}

function joinList(items: string[], bcp47: string): string {
  try {
    const ListFormat = (Intl as unknown as { ListFormat?: new (locale: string, options: object) => { format: (list: string[]) => string } }).ListFormat;
    if (ListFormat) {
      return new ListFormat(bcp47, { style: "long", type: "conjunction" }).format(items);
    }
  } catch {
    // Sem Intl.ListFormat: vírgulas.
  }
  return items.join(", ");
}

/** Hoje: a sessão do dia (com a régua do plano real), revisões, ofensiva, XP, nível e a notícia nos seus temas. */
export function HomeScreen() {
  const t = useAreaCopy(HOME_COPY);
  const shell = useAreaCopy(SHELL_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const session = useSession();
  const router = useRouter();
  const plan = useTodayPlan();
  const dailyMinutes = dailyGoalMinutes(useJourney());
  const cast = useCast();
  const { width } = useWindowDimensions();
  const layout = shellLayoutFor(width);
  const contentWidth = width - (layout === "wide" ? 256 : layout === "rail" ? 96 : 0);
  const twoColumns = contentWidth >= 980;
  const phone = layout === "phone";

  if (!session) {
    return null;
  }
  const { user } = session;
  const { snapshot, status } = plan;
  const name = givenName(user.email, user.display_name);
  const level = user.level;
  const next = nextLevel(level);
  const goals = next ? canDoFor(next) : [];
  const themes = (user.interests ?? []).map((theme) => themeLabel(theme, t.themes));
  const xpShare = xpFraction(snapshot.xpToday, snapshot.xpGoal);
  const goalMet = snapshot.xpGoal > 0 && snapshot.xpToday >= snapshot.xpGoal;
  const cta = status === "continue" ? shell.continueToday : status === "done" ? shell.reviewToday : shell.startToday;
  const dek = status === "continue" ? t.dekContinue : status === "done" ? t.dekDone : t.dekStart;

  const sessionCard = (
    <TactilePanel testID="home-session" tone={status === "done" ? "plain" : "accent"} padding={phone ? 18 : 24} style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <PanelKicker icon="sun">{`${t.sessionKicker} · ${shell.minutes(plan.minutes)}`}</PanelKicker>
          <Text accessibilityRole="header" style={{ fontFamily: tactile.serif, fontSize: phone ? 26 : 32, lineHeight: phone ? 32 : 38, fontWeight: "600", color: tactile.ink }}>
            {t.sessionTitle}
          </Text>
          <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body }}>{dek}</Text>
        </View>
        {phone ? null : (
          <View style={{ flexDirection: "row" }}>
            {cast.people.map((mind, index) => (
              <Image
                key={mind.id}
                source={{ uri: `/cast/${mind.id}.png` }}
                accessibilityLabel={`${mind.name}, ${mindRole(mind.slot, locale)}`}
                style={{ width: 52, height: 52, borderRadius: 999, borderWidth: 3, borderColor: tactile.surface, backgroundColor: tactile.raised, marginLeft: index === 0 ? 0 : -14 }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <SessionRuler phases={plan.phases} currentSeconds={plan.rulerAt} showLabels={false} />
        <View testID="home-plan" style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 }}>
          {phaseDurations(plan.phases).map((phase) => {
            const done = plan.completed.includes(phase.id) || status === "done";
            return (
              <View key={phase.id} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                {done ? <TactileIcon name="check" size={13} color={tactile.primary} strokeWidth={3} /> : <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: tactile.borderStrong }} />}
                <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: done ? tactile.primaryInk : tactile.body }}>
                  {phaseName(phase.id, locale)}
                  <Text style={{ fontWeight: "600", color: tactile.muted }}>{` ${formatMinutes(phase.seconds, bcp47)}`}</Text>
                </Text>
              </View>
            );
          })}
        </View>
        {status === "continue" && plan.completed.length > 0 ? (
          <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.primaryInk }}>{t.phasesDone(plan.completed.length, plan.totalPhases)}</Text>
        ) : null}
      </View>

      <View testID="home-start" style={{ alignSelf: phone ? "stretch" : "flex-start" }}>
        <TactileButton
          label={cta}
          variant={status === "done" ? "secondary" : "primary"}
          size="xl"
          fullWidth={phone}
          onPress={() => router.push("/daily")}
          icon={<TactileIcon name={status === "done" ? "check" : "play"} size={20} color={status === "done" ? tactile.primaryInk : "#FFFFFF"} fill={status === "done" ? "none" : "#FFFFFF"} />}
        />
      </View>
    </TactilePanel>
  );

  const reviewsCard = (
    <TactilePanel testID="home-reviews" style={{ flex: 1, minWidth: phone ? undefined : 220 }}>
      <PanelKicker icon="layers">{t.dueTitle}</PanelKicker>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text testID="home-reviews-count" style={{ fontFamily: tactile.font, fontSize: 36, fontWeight: "800", color: snapshot.dueCount > 0 ? tactile.primaryInk : tactile.ink, fontVariant: ["tabular-nums"] }}>
          {snapshot.dueCount}
        </Text>
        <Text style={{ flexShrink: 1, fontFamily: tactile.font, fontSize: 14, fontWeight: "700", color: tactile.body }}>{t.dueCount(snapshot.dueCount)}</Text>
      </View>
      <Text style={{ fontFamily: tactile.font, fontSize: 13, lineHeight: 19, color: tactile.muted }}>
        {snapshot.cardCount === 0 ? t.dueNone : snapshot.dueCount > 0 ? t.dueHint : t.dueClear}
      </Text>
      {snapshot.newCount > 0 ? <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.body }}>{t.newCards(snapshot.newCount)}</Text> : null}
    </TactilePanel>
  );

  const streakCard = (
    <TactilePanel testID="home-streak" style={{ flex: 1, minWidth: phone ? undefined : 220 }}>
      <PanelKicker icon="flame" color={snapshot.streak > 0 ? tactile.streak : tactile.muted}>{t.streakTitle}</PanelKicker>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Text testID="home-streak-count" style={{ fontFamily: tactile.font, fontSize: 22, fontWeight: "800", color: tactile.ink }}>
          {t.streakDays(snapshot.streak)}
        </Text>
        <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.muted }}>{t.bestStreak(snapshot.bestStreak)}</Text>
      </View>
      <View accessibilityLabel={t.weekLabel} style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
        {snapshot.week.map((done, index) => {
          const day = snapshot.weekDays[index] ?? "";
          const label = weekdayShort(day, bcp47);
          const isToday = index === snapshot.week.length - 1;
          return (
            <View key={day || index} accessible accessibilityLabel={done ? t.dayDone(label) : t.dayMissed(label)} style={{ alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? tactile.streak : tactile.raised,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: done ? "#C2410C" : tactile.borderStrong,
                }}
              >
                {done ? <TactileIcon name="check" size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 11, fontWeight: isToday ? "800" : "600", color: isToday ? tactile.ink : tactile.muted }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </TactilePanel>
  );

  const xpCard = (
    <TactilePanel testID="home-xp" style={{ flex: 1, minWidth: phone ? undefined : 220 }}>
      <PanelKicker icon="bolt" color={goalMet ? tactile.amber : tactile.primaryInk}>{t.xpTitle}</PanelKicker>
      <Text style={{ fontFamily: tactile.font, fontSize: 22, fontWeight: "800", color: tactile.ink, fontVariant: ["tabular-nums"] }}>{t.xpOf(snapshot.xpToday, snapshot.xpGoal)}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: snapshot.xpGoal, now: Math.min(snapshot.xpToday, snapshot.xpGoal) }}
        style={{ height: 12, borderRadius: 999, backgroundColor: tactile.raised, overflow: "hidden" }}
      >
        <View style={{ width: `${Math.round(xpShare * 100)}%`, height: "100%", borderRadius: 999, backgroundColor: goalMet ? "#F59E0B" : tactile.primary }} />
      </View>
      <Text style={{ fontFamily: tactile.font, fontSize: 13, lineHeight: 19, color: tactile.muted }}>
        {goalMet ? t.xpGoalMet : t.xpHint}
      </Text>
      <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.body }}>{t.minutesToday(snapshot.minutesToday, dailyMinutes)}</Text>
    </TactilePanel>
  );

  const levelCard = (
    <TactilePanel testID="home-level">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: tactile.primary, boxShadow: `0 3px 0 ${tactile.primaryDark}` } as object}>
          <Text style={{ fontFamily: tactile.font, fontSize: 20, fontWeight: "800", color: "#FFFFFF" }}>{level}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PanelKicker icon="target">{t.levelTitle}</PanelKicker>
          <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "700", color: tactile.ink, marginTop: 2 }}>
            {next ? t.nextGoal(next) : t.topLevel}
          </Text>
        </View>
      </View>
      {goals.length > 0 ? (
        <View style={{ gap: 10 }}>
          {goals.map((item) => (
            <View key={item.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <View accessibilityLabel={skillName(item.skill, t)} style={{ width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tactile.raised }}>
                <TactileIcon name={SKILL_ICON[item.skill]} size={15} color={tactile.primaryInk} />
              </View>
              <Text style={{ flex: 1, fontFamily: tactile.font, fontSize: 14, lineHeight: 20, color: tactile.body }}>{canDoText(item, locale)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <LinkButton testID="home-see-path" label={t.seePath} onPress={() => router.push("/path" as Href)} />
    </TactilePanel>
  );

  const newsCard = (
    <TactilePanel testID="home-news" tone="quiet">
      <PanelKicker icon="news">{t.newsTitle}</PanelKicker>
      <Text style={{ fontFamily: tactile.font, fontSize: 15, lineHeight: 22, color: tactile.body }}>
        {themes.length > 0 ? t.newsDek(joinList(themes, bcp47)) : t.newsDekNoThemes}
      </Text>
      <View style={{ alignSelf: "flex-start" }}>
        <TactileButton label={t.newsCta} variant="secondary" size="md" onPress={() => router.push("/news")} icon={<TactileIcon name="book" size={16} color={tactile.primaryInk} />} />
      </View>
    </TactilePanel>
  );

  return (
    <ScrollView testID="home-screen" style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ width: "100%", maxWidth: 1180, marginHorizontal: "auto", paddingHorizontal: phone ? 16 : 28, paddingTop: phone ? 18 : 28, paddingBottom: 40, gap: 20 } as object}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.muted }}>{capitalizeFirst(longDate(snapshot.today, bcp47), bcp47)}</Text>
          <Text testID="home-greeting" accessibilityRole="header" aria-level={1} style={{ fontFamily: tactile.font, fontSize: phone ? 26 : 32, fontWeight: "800", letterSpacing: -0.5, color: tactile.ink }}>
            {name ? t.greeting(name) : t.greetingNoName}
          </Text>
        </View>

        {twoColumns ? (
          <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
            <View style={{ flex: 3, minWidth: 0, gap: 20 }}>
              {sessionCard}
              <View style={{ flexDirection: "row", gap: 16 }}>
                {reviewsCard}
                {xpCard}
              </View>
              {newsCard}
            </View>
            <View style={{ flex: 2, minWidth: 0, gap: 20 }}>
              {streakCard}
              {levelCard}
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {sessionCard}
            <View style={{ flexDirection: phone ? "column" : "row", gap: 16 }}>
              {reviewsCard}
              {streakCard}
            </View>
            <View style={{ flexDirection: phone ? "column" : "row", gap: 16, alignItems: phone ? "stretch" : "flex-start" }}>
              <View style={{ flex: 1, minWidth: 0 }}>{xpCard}</View>
              <View style={{ flex: 1, minWidth: 0 }}>{newsCard}</View>
            </View>
            {levelCard}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function LinkButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="link" onPress={onPress} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 4, cursor: "pointer" } as object}>
      <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: tactile.primaryInk }}>{label}</Text>
      <TactileIcon name="chevronRight" size={16} color={tactile.primaryInk} />
    </Pressable>
  );
}
