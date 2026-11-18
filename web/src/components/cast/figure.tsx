import { Image } from "react-native";
import type { MindId } from "@/design/minds";

const PORTRAITS: Record<MindId, number> = {
  einstein: require("../../../assets/cast/einstein.png"),
  plato: require("../../../assets/cast/plato.png"),
  newton: require("../../../assets/cast/newton.png"),
  galileo: require("../../../assets/cast/galileo.png"),
  curie: require("../../../assets/cast/curie.png"),
  aristotle: require("../../../assets/cast/aristotle.png"),
  lovelace: require("../../../assets/cast/lovelace.png"),
  darwin: require("../../../assets/cast/darwin.png"),
  feynman: require("../../../assets/cast/feynman.png"),
  socrates: require("../../../assets/cast/socrates.png"),
  tesla: require("../../../assets/cast/tesla.png"),
  cicero: require("../../../assets/cast/cicero.png"),
  davinci: require("../../../assets/cast/davinci.png"),
  confucius: require("../../../assets/cast/confucius.png"),
  hypatia: require("../../../assets/cast/hypatia.png"),
  aurelius: require("../../../assets/cast/aurelius.png"),
};

export function Figure({ who, size = 120 }: { who: MindId; size?: number }) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={PORTRAITS[who]}
      resizeMode="contain"
      style={{ width: size, height: size, backgroundColor: "transparent" }}
    />
  );
}
