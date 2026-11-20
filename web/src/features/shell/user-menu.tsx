import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { TactileMenu, TactileMenuDivider, TactileMenuItem } from "@/components/tactile/tactile-menu";
import { tactile } from "@/components/tactile/tokens";
import { initialFor } from "@/features/shell/model/shell-model";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";
import { signOut, useSession } from "@/lib/session";
import { SECONDARY_NAV_ITEMS } from "@/navigation/nav-items";

/** Avatar com o menu da conta: Você, Ajustes, Como usar e Sair. */
export function UserMenu() {
  const t = useAreaCopy(SHELL_COPY);
  const session = useSession();
  const router = useRouter();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!session) {
    return null;
  }
  const { user } = session;
  const initial = initialFor(user.display_name, user.email);

  function go(path: Href) {
    setOpen(false);
    router.push(path);
  }

  async function leave() {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
      setOpen(false);
      router.replace("/account");
    }
  }

  return (
    <View ref={anchor} collapsable={false}>
      <Pressable
        testID="shell-user-menu"
        accessibilityRole="button"
        accessibilityLabel={t.openUserMenu}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tactile.primary,
          boxShadow: `0 3px 0 ${tactile.primaryDark}`,
          cursor: "pointer",
        } as object}
      >
        <Text style={{ fontFamily: tactile.font, fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}>{initial}</Text>
      </Pressable>
      <TactileMenu open={open} onClose={() => setOpen(false)} anchor={anchor} align="right" width={280} label={t.openUserMenu} testID="shell-user-sheet">
        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          {user.display_name ? (
            <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: tactile.ink }}>
              {user.display_name}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={{ fontFamily: tactile.font, fontSize: 13, color: tactile.muted }}>
            {user.email}
          </Text>
        </View>
        <TactileMenuDivider />
        <TactileMenuItem testID="shell-menu-profile" icon="user" label={t.navYou} onPress={() => go("/profile")} />
        {SECONDARY_NAV_ITEMS.map((item) => (
          <TactileMenuItem key={item.id} testID={`shell-menu-${item.id}`} icon={item.icon} label={t[item.labelKey]} onPress={() => go(item.path as Href)} />
        ))}
        <TactileMenuDivider />
        <TactileMenuItem
          testID="shell-menu-signout"
          icon="logout"
          label={leaving ? t.signingOut : t.menuSignOut}
          tone="danger"
          disabled={leaving}
          onPress={() => void leave()}
        />
      </TactileMenu>
    </View>
  );
}
