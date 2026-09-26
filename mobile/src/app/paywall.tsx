import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { confirmCheckout, startCheckout } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { setPro, useProgress } from "@/lib/progress";
import { getSession, refreshSession, useSession } from "@/lib/session";

const FREE = ["1 prosa por dia", "1 par de idiomas", "Revisão e áudio da lição do dia, também sem rede"];
const PRO = ["Vários idiomas, um através do outro", "Histórico ilimitado de lições", "Tema personalizado e prosa além do limite diário"];

function checkoutMessage(message: string): string {
  if (message.includes("Authentication required")) {
    return "Entre na conta antes de assinar.";
  }
  if (message.includes("Stripe is not configured")) {
    return "O checkout ainda não está ligado neste servidor.";
  }
  return message;
}

export default function PaywallScreen() {
  const progress = useProgress();
  const session = useSession();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let active = true;
    setPending(true);
    void confirmCheckout(sessionId)
      .then((paid) => {
        if (!active) {
          return;
        }
        if (paid) {
          setPro(true);
          void refreshSession();
          setError(null);
        } else {
          setError("O pagamento ainda não foi confirmado.");
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(checkoutMessage(caught instanceof Error ? caught.message : "Não foi possível confirmar a assinatura."));
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
  }, [sessionId]);

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
      setError(checkoutMessage(caught instanceof Error ? caught.message : "Não foi possível abrir o checkout."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AppFrame>
      <View className="gap-8 md:flex-row md:items-end md:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-label text-xs uppercase tracking-widest text-ember">Assinatura</Text>
          <Text className="font-displayItalic mt-4 text-display text-ink">Prosa Pro</Text>
          <Text className="mt-4 max-w-xl text-lg leading-7 text-muted">
            A edição grátis abre uma lição por dia, num par de idiomas. A Pro acrescenta outros idiomas, o arquivo e o tema.
          </Text>
        </View>
        <Figure who="lia" size={96} />
      </View>

      <View className="mt-12 h-px bg-ink" />

      <View className="mt-8 flex-col gap-10 md:flex-row md:gap-0">
        <View className="flex-1 md:pr-10">
          <Text className="font-displayItalic text-headline text-ink">Grátis</Text>
          {FREE.map((item) => (
            <Text key={item} className="mt-4 border-b border-line pb-3 text-base leading-6 text-ink">
              {item}
            </Text>
          ))}
        </View>
        <View className="flex-1 md:border-l md:border-ink md:pl-10">
          <Text className="font-displayItalic text-headline text-ember">Pro</Text>
          {PRO.map((item) => (
            <Text key={item} className="mt-4 border-b border-line pb-3 text-base leading-6 text-ink">
              {item}
            </Text>
          ))}
          <Text className="mt-4 text-sm leading-5 text-muted">O valor aparece no checkout da Stripe.</Text>
          {progress.pro ? (
            <Text className="mt-6 font-label text-base text-moss">Prosa Pro está ativo neste aparelho.</Text>
          ) : (
            <ChunkButton className="mt-6 w-full" label={!session ? "Entrar para assinar" : pending ? "Abrindo o checkout" : "Assinar Prosa Pro"} onPress={() => void subscribe()} disabled={pending} />
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
