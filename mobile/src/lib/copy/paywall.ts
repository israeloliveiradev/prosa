import { defineArea } from "@/lib/copy/area";
import { pivotCopy } from "@/features/shell/model/pivot-copy";

/** Assinatura (/paywall): só estados reais, sem Pro de mentira. */
export const PAYWALL = defineArea(
  pivotCopy({
    kicker: ["Assinatura", "Subscription", "Abo", "Abonnement", "Suscripción", "Abbonamento", "サブスクリプション"],
    title: ["Prosa Pro", "Prosa Pro", "Prosa Pro", "Prosa Pro", "Prosa Pro", "Prosa Pro", "Prosa Pro"],
    currentPlan: ["Seu plano", "Your plan", "Dein Tarif", "Votre formule", "Tu plan", "Il tuo piano", "現在のプラン"],
    planFree: ["Gratuito", "Free", "Kostenlos", "Gratuit", "Gratis", "Gratuito", "無料"],
    planPro: ["Pro ativo", "Pro active", "Pro aktiv", "Pro actif", "Pro activo", "Pro attivo", "Pro 有効"],
    unavailableTitle: ["Pagamentos ainda não estão disponíveis", "Payments are not available yet", "Zahlungen sind noch nicht verfügbar", "Les paiements ne sont pas encore disponibles", "Los pagos aún no están disponibles", "I pagamenti non sono ancora disponibili", "お支払いはまだご利用いただけません"],
    unavailableBody: [
      "Você continua no plano gratuito. Nenhum acesso Pro é liberado sem um pagamento confirmado.",
      "You stay on the free plan. No Pro access is granted without a confirmed payment.",
      "Du bleibst im kostenlosen Tarif. Ohne bestätigte Zahlung wird kein Pro-Zugang freigeschaltet.",
      "Vous restez sur la formule gratuite. Aucun accès Pro n'est accordé sans paiement confirmé.",
      "Sigues en el plan gratuito. No se concede acceso Pro sin un pago confirmado.",
      "Resti nel piano gratuito. Nessun accesso Pro viene concesso senza un pagamento confermato.",
      "無料プランのままご利用いただけます。支払いが確認されるまでPro機能は有効になりません。",
    ],
    availableBody: [
      "O pagamento é feito na página segura da Stripe. O Pro só é ativado depois que o pagamento é confirmado.",
      "Payment happens on Stripe's secure page. Pro is only activated after the payment is confirmed.",
      "Die Zahlung läuft über die sichere Seite von Stripe. Pro wird erst nach bestätigter Zahlung aktiviert.",
      "Le paiement se fait sur la page sécurisée de Stripe. Pro n'est activé qu'après confirmation du paiement.",
      "El pago se hace en la página segura de Stripe. Pro solo se activa tras confirmar el pago.",
      "Il pagamento avviene sulla pagina sicura di Stripe. Pro si attiva solo dopo la conferma del pagamento.",
      "お支払いはStripeの安全なページで行います。Proは支払いの確認後にのみ有効になります。",
    ],
    proBody: [
      "Prosa Pro está ativo na sua conta.",
      "Prosa Pro is active on your account.",
      "Prosa Pro ist für dein Konto aktiv.",
      "Prosa Pro est actif sur votre compte.",
      "Prosa Pro está activo en tu cuenta.",
      "Prosa Pro è attivo sul tuo account.",
      "Prosa Proがアカウントで有効です。",
    ],
    subscribe: ["Assinar Prosa Pro", "Subscribe to Prosa Pro", "Prosa Pro abonnieren", "S'abonner à Prosa Pro", "Suscribirse a Prosa Pro", "Abbonati a Prosa Pro", "Prosa Proに登録"],
    opening: ["Abrindo o pagamento…", "Opening checkout…", "Zahlung wird geöffnet …", "Ouverture du paiement…", "Abriendo el pago…", "Apertura del pagamento…", "お支払いページを開いています…"],
    loading: ["Verificando os pagamentos…", "Checking payments…", "Zahlungen werden geprüft …", "Vérification des paiements…", "Comprobando los pagos…", "Verifica dei pagamenti…", "お支払い状況を確認しています…"],
    statusFailed: ["Não deu para verificar os pagamentos agora.", "We could not check payments right now.", "Die Zahlungen konnten gerade nicht geprüft werden.", "Impossible de vérifier les paiements pour le moment.", "No se pudieron comprobar los pagos ahora.", "Non è stato possibile verificare i pagamenti ora.", "いまはお支払い状況を確認できませんでした。"],
    checkoutFailed: ["O pagamento não abriu. Nada foi cobrado.", "Checkout did not open. Nothing was charged.", "Die Zahlung wurde nicht geöffnet. Es wurde nichts abgebucht.", "Le paiement ne s'est pas ouvert. Rien n'a été débité.", "El pago no se abrió. No se cobró nada.", "Il pagamento non si è aperto. Non è stato addebitato nulla.", "お支払いページが開けませんでした。請求は発生していません。"],
    retry: ["Tentar de novo", "Try again", "Erneut versuchen", "Réessayer", "Reintentar", "Riprova", "もう一度試す"],
    confirming: ["Confirmando o pagamento…", "Confirming the payment…", "Zahlung wird bestätigt …", "Confirmation du paiement…", "Confirmando el pago…", "Conferma del pagamento…", "お支払いを確認しています…"],
    confirmed: ["Pagamento confirmado. Prosa Pro está ativo.", "Payment confirmed. Prosa Pro is active.", "Zahlung bestätigt. Prosa Pro ist aktiv.", "Paiement confirmé. Prosa Pro est actif.", "Pago confirmado. Prosa Pro está activo.", "Pagamento confermato. Prosa Pro è attivo.", "お支払いが確認されました。Prosa Proが有効です。"],
    notConfirmed: ["O pagamento ainda não foi confirmado. Tente de novo em instantes.", "The payment is not confirmed yet. Try again in a moment.", "Die Zahlung ist noch nicht bestätigt. Versuche es gleich noch einmal.", "Le paiement n'est pas encore confirmé. Réessayez dans un instant.", "El pago aún no está confirmado. Inténtalo de nuevo en un momento.", "Il pagamento non è ancora confermato. Riprova tra poco.", "お支払いはまだ確認できていません。しばらくしてからもう一度お試しください。"],
    canceled: ["Pagamento cancelado. Nada foi cobrado.", "Payment canceled. Nothing was charged.", "Zahlung abgebrochen. Es wurde nichts abgebucht.", "Paiement annulé. Rien n'a été débité.", "Pago cancelado. No se cobró nada.", "Pagamento annullato. Non è stato addebitato nulla.", "お支払いはキャンセルされました。請求は発生していません。"],
    back: ["Voltar para Você", "Back to You", "Zurück zum Profil", "Retour au profil", "Volver al perfil", "Torna al profilo", "マイページに戻る"],
  }),
);
