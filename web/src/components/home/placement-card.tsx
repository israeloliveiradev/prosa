import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { fetchPlacementStatus } from "@/api/placement";
import type { PlacementStatus } from "@/api/schemas/placement";
import {
  fillCopy,
  formatDay,
  languageLabel,
  nextTestDate,
  statusKind,
} from "@/features/placement/model/placement-flow";
import { useAreaCopy } from "@/lib/copy/area";
import { PLACEMENT_COPY } from "@/lib/copy/placement";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

/**
 * Cartão do nivelamento (Hoje / Você): nível atual do idioma, se dá para medir
 * agora ou quando abre, e os últimos resultados. Tudo vem de `/placement/status`.
 */
export function PlacementCard() {
  const t = useAreaCopy(PLACEMENT_COPY);
  const locale = useLocale();
  const bcp47 = LOCALE_BCP47[locale];
  const session = useSession();
  const token = session?.token ?? null;
  const targetLang = session?.user.target_lang ?? "";
  const [status, setStatus] = useState<PlacementStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token || !targetLang) {
      return undefined;
    }
    let active = true;
    setFailed(false);
    void fetchPlacementStatus(targetLang)
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [targetLang, token]);

  if (!session) {
    return null;
  }

  const kind = status ? statusKind(status) : null;
  const opensOn = status && kind === "wait" ? nextTestDate(status) : null;
  const detail = failed
    ? t.statusFailed
    : kind === "open"
      ? t.stateOpen
      : kind === "never"
        ? t.stateNever
        : kind === "due"
          ? t.stateDue
          : kind === "wait"
            ? opensOn
              ? fillCopy(t.stateWait, { date: formatDay(opensOn, bcp47) })
              : t.stateWaitUnknown
            : t.statusLoading;
  const cta = kind === "open" ? t.resume : kind === "never" ? t.start : kind === "due" ? t.retake : t.cardOpen;
  const level = status?.current_level ?? session.user.level;
  const language = languageLabel(targetLang, bcp47, { capitalize: true });

  return (
    <Pressable
      testID="placement-card"
      accessibilityRole="button"
      accessibilityLabel={`${t.kicker}: ${language} ${level}. ${detail}`}
      onPress={() => router.push("/placement" as Href)}
      className="gap-4 rounded-3xl border-2 border-[#E2E8F0] bg-white p-5 shadow-[0_4px_0_#E2E8F0]"
      style={Platform.OS === "web" ? ({ cursor: "pointer" } as object) : undefined}
    >
      <View className="flex-row items-center gap-3">
        <Flag code={targetLang} size={34} />
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[11px] font-extrabold uppercase tracking-widest text-[#0F766E]">{t.kicker}</Text>
          <Text className="font-sans text-xl font-black text-[#111C2D]">
            {language} · {level}
          </Text>
        </View>
      </View>
      <Text className="font-sans text-sm leading-6 text-[#64748B]">{detail}</Text>
      {status && status.history.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          {status.history.slice(-6).map((entry) => (
            <View
              key={entry.id}
              className="rounded-full bg-[#F0FDFA] px-3 py-1"
              style={{ borderWidth: 1, borderColor: "#99F6E4" }}
            >
              <Text className="font-sans text-xs font-bold text-[#0F766E]">{entry.result_level}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text className="font-sans text-sm font-extrabold text-[#0D9488]">{cta}</Text>
    </Pressable>
  );
}
