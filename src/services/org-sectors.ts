import type { TargetLang } from "../types/database.js";

export const ORG_SECTORS = ["technology", "health", "sales"] as const;
export type OrgSector = (typeof ORG_SECTORS)[number];

export interface SectorTerm {
  phrase: string;
  gloss: string;
}

const TECHNOLOGY: Record<TargetLang, SectorTerm[]> = {
  en: [
    { phrase: "backlog", gloss: "fila de trabalho" },
    { phrase: "deploy", gloss: "publicar o sistema" },
    { phrase: "pull request", gloss: "pedido de revisão" },
    { phrase: "stand-up", gloss: "reunião curta do time" },
    { phrase: "latency", gloss: "atraso da rede" },
    { phrase: "endpoint", gloss: "ponta da API" },
    { phrase: "rollback", gloss: "desfazer a versão" },
    { phrase: "sprint", gloss: "ciclo de duas semanas" },
  ],
  es: [
    { phrase: "backlog", gloss: "fila de trabajo" },
    { phrase: "desplegar", gloss: "publicar el sistema" },
    { phrase: "solicitud de cambio", gloss: "pedido de revisión" },
    { phrase: "reunión diaria", gloss: "stand-up del equipo" },
    { phrase: "latencia", gloss: "retraso de la red" },
    { phrase: "punto de acceso", gloss: "extremo da API" },
    { phrase: "reversión", gloss: "deshacer la versión" },
    { phrase: "sprint", gloss: "ciclo de dos semanas" },
  ],
  de: [
    { phrase: "Backlog", gloss: "fila de trabalho" },
    { phrase: "Deployment", gloss: "publicar o sistema" },
    { phrase: "Änderungsantrag", gloss: "pedido de revisão" },
    { phrase: "Stand-up", gloss: "reunião curta do time" },
    { phrase: "Latenz", gloss: "atraso da rede" },
    { phrase: "Schnittstelle", gloss: "ponta da API" },
    { phrase: "Rollback", gloss: "desfazer a versão" },
    { phrase: "Sprint", gloss: "ciclo de duas semanas" },
  ],
  fr: [
    { phrase: "backlog", gloss: "fila de trabalho" },
    { phrase: "déploiement", gloss: "publicar o sistema" },
    { phrase: "demande de revue", gloss: "pedido de revisão" },
    { phrase: "réunion quotidienne", gloss: "stand-up do time" },
    { phrase: "latence", gloss: "atraso da rede" },
    { phrase: "point d'accès", gloss: "ponta da API" },
    { phrase: "retour arrière", gloss: "desfazer a versão" },
    { phrase: "sprint", gloss: "ciclo de duas semanas" },
  ],
  it: [
    { phrase: "backlog", gloss: "fila de trabalho" },
    { phrase: "rilascio", gloss: "publicar o sistema" },
    { phrase: "richiesta di revisione", gloss: "pedido de revisão" },
    { phrase: "stand-up", gloss: "reunião curta do time" },
    { phrase: "latenza", gloss: "atraso da rede" },
    { phrase: "endpoint", gloss: "ponta da API" },
    { phrase: "ripristino", gloss: "desfazer a versão" },
    { phrase: "sprint", gloss: "ciclo de duas semanas" },
  ],
  ru: [
    { phrase: "бэклог", gloss: "fila de trabalho" },
    { phrase: "релиз", gloss: "publicar o sistema" },
    { phrase: "запрос на проверку", gloss: "pedido de revisão" },
    { phrase: "стендап", gloss: "reunião curta do time" },
    { phrase: "задержка", gloss: "atraso da rede" },
    { phrase: "эндпоинт", gloss: "ponta da API" },
    { phrase: "откат", gloss: "desfazer a versão" },
    { phrase: "спринт", gloss: "ciclo de duas semanas" },
  ],
  ja: [
    { phrase: "バックログ", gloss: "fila de trabalho" },
    { phrase: "デプロイ", gloss: "publicar o sistema" },
    { phrase: "プルリクエスト", gloss: "pedido de revisão" },
    { phrase: "スタンドアップ", gloss: "reunião curta do time" },
    { phrase: "レイテンシ", gloss: "atraso da rede" },
    { phrase: "エンドポイント", gloss: "ponta da API" },
    { phrase: "ロールバック", gloss: "desfazer a versão" },
    { phrase: "スプリント", gloss: "ciclo de duas semanas" },
  ],
};

const HEALTH: Record<TargetLang, SectorTerm[]> = {
  en: [
    { phrase: "intake", gloss: "acolhimento do paciente" },
    { phrase: "triage", gloss: "classificação de risco" },
    { phrase: "dosage", gloss: "dose do medicamento" },
    { phrase: "chart", gloss: "prontuário" },
    { phrase: "consent", gloss: "autorização do paciente" },
    { phrase: "ward", gloss: "ala do hospital" },
    { phrase: "referral", gloss: "encaminhamento" },
    { phrase: "discharge", gloss: "alta" },
  ],
  es: [
    { phrase: "ingreso", gloss: "acolhimento do paciente" },
    { phrase: "triaje", gloss: "classificação de risco" },
    { phrase: "dosis", gloss: "dose do medicamento" },
    { phrase: "historia clínica", gloss: "prontuário" },
    { phrase: "consentimiento", gloss: "autorização do paciente" },
    { phrase: "planta", gloss: "ala do hospital" },
    { phrase: "derivación", gloss: "encaminhamento" },
    { phrase: "alta", gloss: "alta hospitalar" },
  ],
  de: [
    { phrase: "Aufnahme", gloss: "acolhimento do paciente" },
    { phrase: "Triage", gloss: "classificação de risco" },
    { phrase: "Dosierung", gloss: "dose do medicamento" },
    { phrase: "Krankenakte", gloss: "prontuário" },
    { phrase: "Einwilligung", gloss: "autorização do paciente" },
    { phrase: "Station", gloss: "ala do hospital" },
    { phrase: "Überweisung", gloss: "encaminhamento" },
    { phrase: "Entlassung", gloss: "alta" },
  ],
  fr: [
    { phrase: "accueil", gloss: "acolhimento do paciente" },
    { phrase: "triage", gloss: "classificação de risco" },
    { phrase: "posologie", gloss: "dose do medicamento" },
    { phrase: "dossier", gloss: "prontuário" },
    { phrase: "consentement", gloss: "autorização do paciente" },
    { phrase: "service", gloss: "ala do hospital" },
    { phrase: "orientation", gloss: "encaminhamento" },
    { phrase: "sortie", gloss: "alta" },
  ],
  it: [
    { phrase: "accettazione", gloss: "acolhimento do paciente" },
    { phrase: "triage", gloss: "classificação de risco" },
    { phrase: "dosaggio", gloss: "dose do medicamento" },
    { phrase: "cartella", gloss: "prontuário" },
    { phrase: "consenso", gloss: "autorização do paciente" },
    { phrase: "reparto", gloss: "ala do hospital" },
    { phrase: "invio", gloss: "encaminhamento" },
    { phrase: "dimissione", gloss: "alta" },
  ],
  ru: [
    { phrase: "приём", gloss: "acolhimento do paciente" },
    { phrase: "сортировка", gloss: "classificação de risco" },
    { phrase: "дозировка", gloss: "dose do medicamento" },
    { phrase: "карта", gloss: "prontuário" },
    { phrase: "согласие", gloss: "autorização do paciente" },
    { phrase: "отделение", gloss: "ala do hospital" },
    { phrase: "направление", gloss: "encaminhamento" },
    { phrase: "выписка", gloss: "alta" },
  ],
  ja: [
    { phrase: "受付", gloss: "acolhimento do paciente" },
    { phrase: "トリアージ", gloss: "classificação de risco" },
    { phrase: "用量", gloss: "dose do medicamento" },
    { phrase: "カルテ", gloss: "prontuário" },
    { phrase: "同意", gloss: "autorização do paciente" },
    { phrase: "病棟", gloss: "ala do hospital" },
    { phrase: "紹介", gloss: "encaminhamento" },
    { phrase: "退院", gloss: "alta" },
  ],
};

const SALES: Record<TargetLang, SectorTerm[]> = {
  en: [
    { phrase: "pipeline", gloss: "funil de vendas" },
    { phrase: "quota", gloss: "meta do período" },
    { phrase: "lead", gloss: "contato em aberto" },
    { phrase: "close", gloss: "fechar o contrato" },
    { phrase: "discovery", gloss: "conversa de descoberta" },
    { phrase: "objection", gloss: "resistência do cliente" },
    { phrase: "renewal", gloss: "renovação" },
    { phrase: "forecast", gloss: "previsão de receita" },
  ],
  es: [
    { phrase: "embudo", gloss: "funil de vendas" },
    { phrase: "cuota", gloss: "meta do período" },
    { phrase: "prospecto", gloss: "contato em aberto" },
    { phrase: "cerrar", gloss: "fechar o contrato" },
    { phrase: "descubrimiento", gloss: "conversa de descoberta" },
    { phrase: "objeción", gloss: "resistência do cliente" },
    { phrase: "renovación", gloss: "renovação" },
    { phrase: "previsión", gloss: "previsão de receita" },
  ],
  de: [
    { phrase: "Pipeline", gloss: "funil de vendas" },
    { phrase: "Quote", gloss: "meta do período" },
    { phrase: "Lead", gloss: "contato em aberto" },
    { phrase: "Abschluss", gloss: "fechar o contrato" },
    { phrase: "Bedarfsgespräch", gloss: "conversa de descoberta" },
    { phrase: "Einwand", gloss: "resistência do cliente" },
    { phrase: "Verlängerung", gloss: "renovação" },
    { phrase: "Prognose", gloss: "previsão de receita" },
  ],
  fr: [
    { phrase: "pipeline", gloss: "funil de vendas" },
    { phrase: "quota", gloss: "meta do período" },
    { phrase: "piste", gloss: "contato em aberto" },
    { phrase: "conclure", gloss: "fechar o contrato" },
    { phrase: "découverte", gloss: "conversa de descoberta" },
    { phrase: "objection", gloss: "resistência do cliente" },
    { phrase: "renouvellement", gloss: "renovação" },
    { phrase: "prévision", gloss: "previsão de receita" },
  ],
  it: [
    { phrase: "pipeline", gloss: "funil de vendas" },
    { phrase: "quota", gloss: "meta do período" },
    { phrase: "contatto", gloss: "contato em aberto" },
    { phrase: "chiudere", gloss: "fechar o contrato" },
    { phrase: "scoperta", gloss: "conversa de descoberta" },
    { phrase: "obiezione", gloss: "resistência do cliente" },
    { phrase: "rinnovo", gloss: "renovação" },
    { phrase: "previsione", gloss: "previsão de receita" },
  ],
  ru: [
    { phrase: "воронка", gloss: "funil de vendas" },
    { phrase: "квота", gloss: "meta do período" },
    { phrase: "лид", gloss: "contato em aberto" },
    { phrase: "сделка", gloss: "fechar o contrato" },
    { phrase: "разведка", gloss: "conversa de descoberta" },
    { phrase: "возражение", gloss: "resistência do cliente" },
    { phrase: "продление", gloss: "renovação" },
    { phrase: "прогноз", gloss: "previsão de receita" },
  ],
  ja: [
    { phrase: "パイプライン", gloss: "funil de vendas" },
    { phrase: "ノルマ", gloss: "meta do período" },
    { phrase: "見込み客", gloss: "contato em aberto" },
    { phrase: "成約", gloss: "fechar o contrato" },
    { phrase: "ヒアリング", gloss: "conversa de descoberta" },
    { phrase: "反論", gloss: "resistência do cliente" },
    { phrase: "更新", gloss: "renovação" },
    { phrase: "見通し", gloss: "previsão de receita" },
  ],
};

const CATALOG: Record<OrgSector, Record<TargetLang, SectorTerm[]>> = {
  technology: TECHNOLOGY,
  health: HEALTH,
  sales: SALES,
};

const LANGS: TargetLang[] = ["en", "es", "de", "ru", "fr", "it", "ja"];

export function isOrgSector(value: string): value is OrgSector {
  return (ORG_SECTORS as readonly string[]).includes(value);
}

export function workplaceInterest(sector: OrgSector): string {
  if (sector === "health") {
    return "health workplace";
  }
  if (sector === "sales") {
    return "sales workplace";
  }
  return "technology workplace";
}

export function sectorTerms(sector: OrgSector, lang: string): SectorTerm[] {
  if (!(LANGS as string[]).includes(lang)) {
    return [];
  }
  return CATALOG[sector][lang as TargetLang];
}

export function sectorPhrases(sector: OrgSector, lang: string): string[] {
  return sectorTerms(sector, lang).map((item) => item.phrase);
}

export function mergeDue(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const phrase = item.trim();
      const key = phrase.toLowerCase();
      if (!phrase || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(phrase);
      if (out.length >= 6) {
        return out;
      }
    }
  }
  return out;
}
