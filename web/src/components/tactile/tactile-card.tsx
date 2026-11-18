import React from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { motion } from "framer-motion";

export interface TactileCardProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  animateEntry?: boolean;
  delay?: number;
}

export function TactileCard({
  children,
  className = "",
  style,
  animateEntry = true,
  delay = 0,
}: TactileCardProps) {
  if (Platform.OS === "web") {
    if (!animateEntry) {
      return (
        <div
          className={`bg-white border border-stone-200/80 rounded-2xl shadow-sm ${className}`}
          style={{
            boxSizing: "border-box",
            ...(style as any),
          }}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-white border border-stone-200/80 rounded-2xl shadow-sm ${className}`}
        style={{
          boxSizing: "border-box",
          ...(style as any),
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "rgba(231, 229, 228, 0.8)",
          borderRadius: 16,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        } as any,
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
}

