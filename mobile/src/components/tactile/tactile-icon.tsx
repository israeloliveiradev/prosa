import { Platform } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { tactile } from "./tokens";

/**
 * Ícones de traço (estilo Lucide, 24×24) desenhados com react-native-svg,
 * para o shell e as telas táteis funcionarem no web e no nativo.
 * Formato: "M…" é um path; "c:cx,cy,r" um círculo; "r:x,y,w,h,rx" um retângulo.
 */
const SHAPES = {
  sun: ["c:12,12,4", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  route: ["c:6,19,3", "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "c:18,5,3"],
  book: ["M12 7v14", "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"],
  chat: ["M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "c:12,7,4"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  bolt: ["M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"],
  chevronDown: ["m6 9 6 6 6-6"],
  chevronRight: ["m9 18 6-6-6-6"],
  play: ["M6 3 20 12 6 21 6 3z"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M5 12h14", "M12 5v14"],
  sliders: ["M20 7h-9", "M14 17H5", "c:17,17,3", "c:7,7,3"],
  help: ["c:12,12,10", "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  lock: ["r:3,11,18,11,2", "M7 11V7a5 5 0 0 1 10 0v4"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  refresh: ["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", "M8 16H3v5"],
  news: ["M15 18h-5", "M18 14h-8", "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2", "r:10,6,8,4,1"],
  layers: ["m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z", "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"],
  target: ["c:12,12,10", "c:12,12,6", "c:12,12,2"],
  mail: ["r:2,4,20,16,2", "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"],
  eye: ["M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0", "c:12,12,3"],
  eyeOff: ["M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49", "M14.084 14.158a3 3 0 0 1-4.242-4.242", "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143", "m2 2 20 20"],
  arrowRight: ["M5 12h14", "m12 5 7 7-7 7"],
  arrowLeft: ["m12 19-7-7 7-7", "M19 12H5"],
  alert: ["c:12,12,10", "M12 8v4", "M12 16h.01"],
  key: ["M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z", "c:16.5,7.5,.5"],
  shield: ["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"],
  headphones: ["M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"],
  pen: ["M12 20h9", "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"],
  mic: ["M12 19v3", "M19 10v2a7 7 0 0 1-14 0v-2", "r:9,2,6,13,3"],
  globe: ["c:12,12,10", "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"],
} as const;

export type TactileIconName = keyof typeof SHAPES;

/** Decorativo: fora da árvore de acessibilidade (aria-hidden no web; props nativas no app). */
export const HIDDEN: object =
  Platform.OS === "web" ? { "aria-hidden": true } : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" };

export interface TactileIconProps {
  name: TactileIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function TactileIcon({ name, size = 20, color = tactile.muted, strokeWidth = 2, fill = "none" }: TactileIconProps) {
  const shapes = SHAPES[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...HIDDEN}
    >
      {shapes.map((shape, index) => {
        if (shape.startsWith("c:")) {
          const [cx, cy, r] = shape.slice(2).split(",");
          return <Circle key={index} cx={cx} cy={cy} r={r} fill={fill} />;
        }
        if (shape.startsWith("r:")) {
          const [x, y, width, height, rx] = shape.slice(2).split(",");
          return <Rect key={index} x={x} y={y} width={width} height={height} rx={rx} fill={fill} />;
        }
        return <Path key={index} d={shape} fill={fill} />;
      })}
    </Svg>
  );
}
