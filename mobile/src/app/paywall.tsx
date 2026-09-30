import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { confirmCheckout, fetchBillingStatus, startCheckout } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { setPro, useProgress } from "@/lib/progress";
import { getSession, refreshSession, useSession } from "@/lib/session";

function checkoutMessage(message: string, ui: ReturnType<typeof useCopy>): string {
  if (message.includes("Authentication required")) {
    return ui.authToSubscribe;
  }
  if (message.includes("Stripe is not configured")) {
    return ui.stripeNotOn;
  }
  return message;
}

export default function PaywallScreen() {
  const progress = useProgress();
  const session = useSession();
  const ui = useCopy();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";

  useEffect(() => {
    let active = true;
    void fetchBillingStatus().then((configured) => {
      if (active) {
        setStripeReady(configured);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !session?.token) {
      return;
    }
    let active = true;
    setPending(true);
    void confirmCheckout(session.token, sessionId)
      .then((paid) => {
        if (!active) {
          return;
        }
        if (paid) {
          setPro(true);
          void refreshSession();
          setError(null);
        } else {
          setError(ui.paymentNotConfirmed);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(checkoutMessage(caught instanceof Error ? caught.message : ui.checkoutConfirmFailed, ui));
        }
      })
      .finally(() => {
        if (active) {
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionId, session?.token, ui]);

  async function subscribe() {
    const current = getSession();
    if (!current) {
      router.push("/account");
      return;
    }
    void tap("medium");
    setPending(true);
    setError(null);
    try {
      const origin = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "prosa://";
      const returnUrl = Platform.OS === "web" ? `${origin}/paywall` : "prosa://paywall";
      const url = await startCheckout(current.token, returnUrl, returnUrl);
      if (Platform.OS === "web") {
        window.location.assign(url);
        return;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch (caught) {
      setError(checkoutMessage(caught instanceof Error ? caught.message : ui.checkoutOpenFailed, ui));
    } finally {
      setPending(false);
    }
  }

  if (!session) {
    return <Redirect href="/account" />;
  }

  return (
    <AppFrame>
      <PageMasthead
        kicker={ui.paywallKicker}
        title="Prosa Pro"
        dek={ui.paywallDek}
        trailing={<Figure who="davinci" size={96} />}
      />

      <View className="mt-8 flex-col gap-10 md:flex-row md:gap-0">
        <View className="flex-1 md:pr-10">
          <Text className="font-displayItalic text-headline text-ink">{ui.paywallFree}</Text>
          {[ui.freeLessonDay, ui.freeLangPair, ui.freeReviewAudio].map((item) => (
            <Text key={item} className="mt-4 border-b border-line pb-3 text-base leading-6 text-ink">
              {item}
            </Text>
          ))}
        </View>
        <View className="flex-1 md:border-l md:border-ink md:pl-10">
          <Text className="font-displayItalic text-headline text-ember">Pro</Text>
          {[ui.proHistory, ui.proTopic].map((item) => (
            <Text key={item} className="mt-4 border-b border-line pb-3 text-base leading-6 text-ink">
              {item}
            </Text>
          ))}
          <Text className="mt-4 w-full max-w-xl text-sm leading-6 text-muted">
            {stripeReady === false ? ui.stripeNotOn : ui.stripeValue}
          </Text>
          {progress.pro || session?.user.plan === "pro" ? (
            <Text className="mt-6 font-label text-base text-moss">{ui.paywallProActive}</Text>
          ) : (
            <ChunkButton
              className="mt-6 w-full"
              label={!session ? ui.signInToSubscribe : pending ? ui.openingCheckout : stripeReady === true ? ui.subscribePro : ui.checkoutUnavailable}
              onPress={() => void subscribe()}
              disabled={pending || Boolean(session && stripeReady !== true)}
            />
          )}
          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-base leading-6 text-roseInk">
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    </AppFrame>
  );
}
