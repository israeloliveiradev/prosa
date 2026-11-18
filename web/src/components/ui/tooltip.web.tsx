import { useState, type ReactNode } from "react";
import { View } from "react-native";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View
      className={`relative inline-flex ${className}`}
      // @ts-expect-error onMouseEnter / onMouseLeave suportados na web
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <View className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-ink shadow-md">
          <span style={{ color: "#ffffff", fontSize: "12px", fontFamily: "Nunito", whiteSpace: "nowrap" }}>
            {content}
          </span>
          <View className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
        </View>
      ) : null}
    </View>
  );
}
