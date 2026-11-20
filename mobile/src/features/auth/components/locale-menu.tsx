import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { TactileMenu, TactileMenuItem } from "@/components/tactile/tactile-menu";
import { tactile } from "@/components/tactile/tokens";
import { languageLabel } from "@/features/shell/model/shell-model";
import { DISPLAY_LOCALES, LOCALE_BCP47, setLocale, useLocale, type DisplayLocale } from "@/lib/i18n";

/** Nome de cada idioma de interface no próprio idioma (endônimo). */
function endonym(locale: DisplayLocale): string {
  return languageLabel(locale, LOCALE_BCP47[locale]);
}

/** Seletor do idioma da tela, para quem ainda não entrou. */
export function LocaleMenu({ label }: { label: string }) {
  const locale = useLocale();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);

  return (
    <View ref={anchor} collapsable={false}>
      <Pressable
        testID="account-locale"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${endonym(locale)}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: tactile.border,
          backgroundColor: tactile.surface,
          boxShadow: `0 2px 0 ${tactile.borderStrong}`,
          cursor: "pointer",
        } as object}
      >
        <TactileIcon name="globe" size={16} color={tactile.primary} />
        <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.ink }}>{endonym(locale)}</Text>
        <TactileIcon name="chevronDown" size={14} color={tactile.muted} />
      </Pressable>
      <TactileMenu open={open} onClose={() => setOpen(false)} anchor={anchor} align="right" width={240} label={label}>
        {DISPLAY_LOCALES.map((item) => (
          <TactileMenuItem
            key={item}
            testID={`account-locale-${item}`}
            label={endonym(item)}
            selected={item === locale}
            onPress={() => {
              setLocale(item);
              setOpen(false);
            }}
          />
        ))}
      </TactileMenu>
    </View>
  );
}
