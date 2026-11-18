import React from "react";
import { Button, type ButtonProps } from "@/ui";
import { keepWords } from "@/lib/text";

export function ChunkButton({
  label,
  onPress,
  disabled,
  tone = "primary",
  className = "",
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "moss" | "ink" | "ghost";
  className?: string;
  testID?: string;
}) {
  const variant: ButtonProps["variant"] = tone === "ghost" ? "secondary" : "primary";
  const buttonTone: ButtonProps["tone"] = tone === "primary" ? "brand" : "neutral";

  return (
    <Button
      label={keepWords(label)}
      variant={variant}
      tone={buttonTone}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      className={className}
      fullWidth
    />
  );
}
