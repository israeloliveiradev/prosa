import React from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { motion } from "framer-motion";
import { tactile } from "./tokens";

export interface TactileCardProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  animateEntry?: boolean;
  delay?: number;
  testID?: string;
}

const CARD_CLASS = "border border-stone-200/80 rounded-2xl shadow-sm";

/**
 * No web o cartão é um <div> (para a animação de entrada). Como no nativo ele é
 * uma View, o <div> também empilha os filhos em coluna (o Text do RN-web é
 * inline e, num bloco comum, emendaria na mesma linha). Estilos em array são
 * achatados antes de virar CSS.
 */
function webStyle(style: StyleProp<ViewStyle>, className: string): React.CSSProperties {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const has = (name: string) => new RegExp(`(^|\\s)${name}(\\s|$)`).test(className);
  // Quem já escolheu o layout por classe (flex, grid…) manda; senão, coluna como uma View.
  const ownLayout = has("flex") || has("inline-flex") || has("grid") || has("block") || has("flex-row") || has("flex-col");
  return {
    boxSizing: "border-box",
    ...(ownLayout ? {} : { display: "flex", flexDirection: "column" as const }),
    ...(has("flex-row") && !has("flex") ? { display: "flex", flexDirection: "row" as const } : {}),
    ...(has("flex-col") && !has("flex") ? { display: "flex", flexDirection: "column" as const } : {}),
    ...(/(^|\s)bg-/.test(className) ? {} : { backgroundColor: tactile.surface }),
    ...(flat as React.CSSProperties),
  };
}

export function TactileCard({
  children,
  className = "",
  style,
  animateEntry = true,
  delay = 0,
  testID,
}: TactileCardProps) {
  if (Platform.OS === "web") {
    if (!animateEntry) {
      return (
        <div className={`${CARD_CLASS} ${className}`} style={webStyle(style, className)} data-testid={testID}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`${CARD_CLASS} ${className}`}
        style={webStyle(style, className) as never}
        data-testid={testID}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: tactile.surface,
          borderWidth: 1,
          borderColor: "rgba(231, 229, 228, 0.8)",
          borderRadius: 16,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        } as ViewStyle,
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
}
