import { defineArea } from "@/lib/copy/area";
import { pivotCopy } from "@/features/shell/model/pivot-copy";

/** Textos de erro de Pares (os demais textos da tela vêm de lib/messages). */
export const PAIRS = defineArea(
  pivotCopy({
    loadFailed: ["Não deu para carregar seus pares agora.", "We could not load your pairs right now.", "Deine Paare konnten gerade nicht geladen werden.", "Impossible de charger vos binômes pour le moment.", "No se pudieron cargar tus parejas ahora.", "Non è stato possibile caricare le tue coppie ora.", "いまはペアを読み込めませんでした。"],
    sendFailed: ["O texto não foi enviado. Tente de novo.", "The text was not sent. Try again.", "Der Text wurde nicht gesendet. Versuche es erneut.", "Le texte n'a pas été envoyé. Réessayez.", "El texto no se envió. Inténtalo de nuevo.", "Il testo non è stato inviato. Riprova.", "テキストを送信できませんでした。もう一度お試しください。"],
    retry: ["Tentar de novo", "Try again", "Erneut versuchen", "Réessayer", "Reintentar", "Riprova", "もう一度試す"],
  }),
);
