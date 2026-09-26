import Svg, { Path } from "react-native-svg";

const PATHS = {
  home: "M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.5v-6h-5V21H5a1 1 0 0 1-1-1v-9.4Z",
  book: "M6 4.5h8.2A2.8 2.8 0 0 1 17 7.3V19H8.2A2.2 2.2 0 0 0 6 16.8V4.5Zm0 12.3A2.2 2.2 0 0 1 8.2 14.6H17",
  mark: "M12 3.2 14.4 8.8l6 .5-4.6 3.9 1.4 5.8L12 16.2 6.8 19l1.4-5.8L3.6 9.3l6-.5L12 3.2Z",
  user: "M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM6.2 19.4c.9-2.8 3.1-4.2 5.8-4.2s4.9 1.4 5.8 4.2",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  news: "M5 4.5h14v15H5v-15Zm0 4h14M9 12h6M9 15.5h4",
  practice: "M5 6.5h14v8.5H9.2L5 18.2V6.5Z",
  memory: "M4.5 4.5h6v6h-6v-6Zm9 0h6v6h-6v-6Zm-9 9h6v6h-6v-6Zm9 0h6v6h-6v-6Z",
} as const;

export function Icon({ name, color }: { name: keyof typeof PATHS; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
