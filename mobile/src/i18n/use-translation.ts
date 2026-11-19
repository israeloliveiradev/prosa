import { useProsa } from "@/context/prosa-context";
import { TRANSLATIONS, type SupportedLanguage } from "./translations";

export function useTranslation() {
  const { uiLang } = useProsa();
  const safeLang = (uiLang && uiLang in TRANSLATIONS ? uiLang : "pt-BR") as SupportedLanguage;
  const currentDict = TRANSLATIONS[safeLang] || TRANSLATIONS["pt-BR"];

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let str = currentDict[key] || TRANSLATIONS["pt-BR"][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return str;
  };

  return { t, currentLang: safeLang };
}
