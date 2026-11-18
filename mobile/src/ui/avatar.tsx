import React from "react";
import { View, Image, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./text";
import { useThemeTokens } from "../theme/ThemeContext";
import { cast } from "../design/tokens";
import type { CastSlot } from "../design/minds";

export interface AvatarProps extends ViewProps {
  name?: string;
  imageUri?: string;
  slot?: CastSlot;
  size?: "sm" | "md" | "lg" | number;
  testID?: string;
}

export function Avatar({
  name,
  imageUri,
  slot,
  size = "md",
  testID = "ui-avatar",
  style,
  ...props
}: AvatarProps) {
  const { scheme, colors, radius } = useThemeTokens();
  const isDark = scheme === "dark";

  const dimension =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 28
      : size === "lg"
      ? 48
      : 36;

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
    : "";

  let bgColor = colors.surface.raised;
  if (slot && cast[slot]) {
    bgColor = isDark ? cast[slot].dark : cast[slot].light;
  }

  const borderRadius = radius.sm; // 8px per taste-skill flat radius

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : "Avatar"}
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius,
          backgroundColor: bgColor,
          borderColor: colors.border.subtle,
        },
        style,
      ]}
      {...props}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { borderRadius }]}
          resizeMode="cover"
        />
      ) : (
        <Text
          variant={dimension >= 40 ? "body-md" : "caption"}
          weight="semibold"
          color="primary"
        >
          {initials || "?"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
