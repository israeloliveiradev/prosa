import { Pressable, Text, View } from "react-native";
import { CourseSwitcher } from "@/components/shell/course-switcher";
import { Flag } from "@/components/shell/flag";
import { useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { useSession } from "@/lib/session";

export function LanguageSwitcher({
  compact = false,
  open = false,
  onToggle,
  onClose: _onClose,
}: {
  compact?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const copy = useCopy();
  const session = useSession();

  if (!session) {
    return null;
  }

  const label = `${languageName(session.user.target_lang)} · ${session.user.level}`;

  return (
    <View className="relative z-50">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${copy.language}: ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => onToggle?.()}
        className="min-h-12 cursor-pointer flex-row items-center gap-2 rounded-full border border-line bg-card px-3"
      >
        <Flag code={session.user.target_lang} size={26} />
        {compact ? null : <Text className="font-label text-sm text-ink">{label}</Text>}
      </Pressable>
      {open ? (
        <View className="absolute right-0 top-14 z-50 max-w-[92vw] rounded-3xl border border-line bg-card p-4" style={{ width: 360 }}>
          <CourseSwitcher />
        </View>
      ) : null}
    </View>
  );
}
