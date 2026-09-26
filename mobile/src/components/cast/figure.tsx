import { Image } from "react-native";
import type { CastId } from "@/design/cast";

const PORTRAITS: Record<CastId, number> = {
  clara: require("../../../assets/cast/clara.png"),
  bento: require("../../../assets/cast/bento.png"),
  nuno: require("../../../assets/cast/nuno.png"),
  lia: require("../../../assets/cast/lia.png"),
};

export function Figure({ who, size = 120 }: { who: CastId; size?: number }) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={PORTRAITS[who]}
      resizeMode="cover"
      style={{ width: size, height: size, borderRadius: 28 }}
    />
  );
}
