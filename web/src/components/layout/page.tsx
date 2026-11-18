import { useEffect, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRail } from "@/components/layout/rail-context";

export interface PageProps {
  title?: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Page({ title, subtitle, aside, children, className = "" }: PageProps) {
  const { setAsideContent } = useRail();

  useEffect(() => {
    setAsideContent(aside ?? null);
    return () => setAsideContent(null);
  }, [aside, setAsideContent]);

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className={`w-full max-w-[680px] mx-auto px-4 py-8 lg:px-8 lg:py-10 ${className}`}>
        {/* Cabeçalho de Página */}
        {title ? (
          <View className="mb-8">
            <Text className="font-display text-3xl font-extrabold text-ink tracking-tight">{title}</Text>
            {subtitle ? <Text className="font-sans text-base text-muted mt-1.5 leading-6">{subtitle}</Text> : null}
          </View>
        ) : null}

        {/* Conteúdo Principal */}
        {children}
      </View>
    </ScrollView>
  );
}
