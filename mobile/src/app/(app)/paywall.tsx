import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { confirmBillingSession, fetchBillingStatus, startBillingCheckout } from "@/api/account-extras";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { paywallView } from "@/features/shell/model/paywall-model";
import { BodyText, TactilePage } from "@/features/shell/tactile-page";
import { useAreaCopy } from "@/lib/copy/area";
import { PAYWALL } from "@/lib/copy/paywall";
import { refreshSession, rememberProfile, useSession } from "@/lib/session";

type Notice = "confirming" | "confirmed" | "notConfirmed" | "canceled" | "checkoutFailed";

function returnUrl(flag: "success" | "cancel"): string {
  const origin = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "https://prosa.app";
  return `${origin}/paywall?checkout=${flag}`;
}

/** Assinatura: o plano real da conta e o checkout só quando o servidor tem pagamentos configurados. */
export default function PaywallScreen() {
  const t = useAreaCopy(PAYWALL);
  const session = useSession();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(params.checkout === "cancel" ? "canceled" : null);
  const status = useQuery({ queryKey: ["billing-status"], queryFn: ({ signal }) => fetchBillingStatus(signal), retry: false, staleTime: 30_000 });
  const plan = session?.user.plan ?? "free";
  const view = paywallView({ plan, status: status.data, failed: status.isError });

  const checkout = params.checkout;
  const sessionId = params.session_id;
  useEffect(() => {
    if (checkout !== "success" || !sessionId) {
      return;
    }
    let live = true;
    setNotice("confirming");
    void confirmBillingSession(sessionId)
      .then(async (paid) => {
        if (!live) {
          return;
        }
        if (paid) {
          rememberProfile({ plan: "pro" });
          await refreshSession();
        }
        setNotice(paid ? "confirmed" : "notConfirmed");
      })
      .catch(() => {
        if (live) {
          setNotice("notConfirmed");
        }
      });
    return () => {
      live = false;
    };
  }, [checkout, sessionId]);

  async function subscribe() {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const url = await startBillingCheckout(returnUrl("success"), returnUrl("cancel"));
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      setNotice("checkoutFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TactilePage testID="paywall-screen" kicker={t.kicker} title={t.title}>
      <TactilePanel testID="paywall-plan" tone={plan === "pro" ? "accent" : "plain"}>
        <BodyText tone="muted">{t.currentPlan}</BodyText>
        <BodyText tone="ink" testID="paywall-plan-name">
          {plan === "pro" ? t.planPro : t.planFree}
        </BodyText>
      </TactilePanel>

      {view === "loading" ? (
        <BodyText tone="muted" testID="paywall-loading">
          {t.loading}
        </BodyText>
      ) : null}

      {view === "error" ? (
        <TactilePanel testID="paywall-error">
          <BodyText tone="danger">{t.statusFailed}</BodyText>
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton testID="paywall-retry" label={t.retry} variant="secondary" size="sm" onPress={() => void status.refetch()} />
          </View>
        </TactilePanel>
      ) : null}

      {view === "unavailable" ? (
        <TactilePanel testID="paywall-unavailable" tone="quiet">
          <BodyText tone="ink">{t.unavailableTitle}</BodyText>
          <BodyText tone="muted">{t.unavailableBody}</BodyText>
        </TactilePanel>
      ) : null}

      {view === "available" ? (
        <TactilePanel testID="paywall-available">
          <BodyText>{t.availableBody}</BodyText>
          <View style={{ alignSelf: "flex-start" }}>
            <TactileButton testID="paywall-subscribe" label={busy ? t.opening : t.subscribe} disabled={busy} onPress={() => void subscribe()} />
          </View>
        </TactilePanel>
      ) : null}

      {view === "pro" ? (
        <BodyText testID="paywall-pro">{t.proBody}</BodyText>
      ) : null}

      {notice ? (
        <BodyText tone={notice === "checkoutFailed" || notice === "notConfirmed" ? "danger" : "body"} testID={`paywall-notice-${notice}`}>
          {t[notice]}
        </BodyText>
      ) : null}

      <View style={{ alignSelf: "flex-start" }}>
        <TactileButton testID="paywall-back" label={t.back} variant="secondary" size="sm" onPress={() => router.push("/profile")} />
      </View>
    </TactilePage>
  );
}
