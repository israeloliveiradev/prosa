import { Platform } from "react-native";
import { Figure } from "@/components/cast/figure";
import type { MindId } from "@/design/minds";

/**
 * Retrato de uma das 16 mentes. No web usa os PNGs servidos de /cast (mobile/public/cast) num <img>
 * simples; no app nativo usa o Figure (assets/cast via require).
 */
export function Portrait({ who, size }: { who: MindId; size: number }) {
  if (Platform.OS === "web") {
    return (
      <img
        src={`/cast/${who}.png`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      />
    );
  }
  return <Figure who={who} size={size} />;
}
