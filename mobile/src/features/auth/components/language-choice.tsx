import { Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { tactile } from "@/components/tactile/tokens";

export interface LanguageChoiceProps {
  label: string;
  hint?: string;
  options: readonly string[];
  value: string;
  onChange: (code: string) => void;
  nameFor: (code: string) => string;
  testID?: string;
}

/** Grupo de idiomas em botões táteis (um radiogroup acessível). */
export function LanguageChoice({ label, hint, options, value, onChange, nameFor, testID }: LanguageChoiceProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "700", color: tactile.ink }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((code) => {
          const selected = code === value;
          const name = nameFor(code);
          return (
            <Pressable
              key={code}
              testID={testID ? `${testID}-${code}` : undefined}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ checked: selected, selected }}
              onPress={() => onChange(code)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selected ? tactile.primary : tactile.border,
                backgroundColor: selected ? tactile.primarySoft : tactile.surface,
                boxShadow: `0 3px 0 ${selected ? tactile.primaryDark : tactile.border}`,
                cursor: "pointer",
              } as object}
            >
              <Flag code={code} size={20} />
              <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: selected ? "800" : "600", color: selected ? tactile.primaryInk : tactile.body }}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={{ fontFamily: tactile.font, fontSize: 12, color: tactile.muted }}>{hint}</Text> : null}
    </View>
  );
}
