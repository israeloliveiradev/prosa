import { View } from "react-native";
import { ChoiceTile } from "@/components/session/stage-kit";
import { LOCALE_BCP47, useLocale, type DisplayLocale } from "@/lib/i18n";
import { LISTEN_RATES, type ListenRate } from "@/lib/listen-pace";
import { setListenRate, useListenRate } from "@/lib/listen-rate";

export function ListenPace() {
  const rate = useListenRate();
  const locale = useLocale();
  return (
    <View accessibilityRole="radiogroup" className="mt-4 flex-row flex-wrap gap-2">
      {LISTEN_RATES.map((item) => {
        const selected = rate === item;
        return (
          <ChoiceTile
            key={item}
            label={paceLabel(item, locale)}
            state={selected ? "selected" : "idle"}
            onPress={() => setListenRate(item)}
            className="min-w-16 items-center"
          />
        );
      })}
    </View>
  );
}

export function paceLabel(rate: ListenRate, locale: DisplayLocale): string {
  const number = new Intl.NumberFormat(LOCALE_BCP47[locale], { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(rate);
  return `${number}×`;
}
