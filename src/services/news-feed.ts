import { assertAllowedNewsUrl } from "../security/news-url.js";

const LOCALES: Record<string, { hl: string; gl: string }> = {
  en: { hl: "en-US", gl: "US" },
  es: { hl: "es-ES", gl: "ES" },
  de: { hl: "de-DE", gl: "DE" },
  ru: { hl: "ru-RU", gl: "RU" },
  fr: { hl: "fr-FR", gl: "FR" },
  it: { hl: "it-IT", gl: "IT" },
  ja: { hl: "ja-JP", gl: "JP" },
};

const WORLD_BACKUP: Record<string, string> = {
  en: "https://feeds.bbci.co.uk/news/world/rss.xml",
  es: "https://feeds.bbci.co.uk/mundo/rss.xml",
  fr: "https://feeds.bbci.co.uk/afrique/rss.xml",
  de: "https://www.tagesschau.de/xml/rss2",
  it: "https://www.ansa.it/sito/ansait_rss.xml",
  ru: "https://feeds.bbci.co.uk/russian/rss.xml",
  ja: "https://www.nhk.or.jp/rss/news/cat0.xml",
};

const FRESH_MS = 48 * 60 * 60 * 1000;

const STOP = new Set(["and", "the", "for", "com", "uma", "dos", "das", "del", "und"]);

interface InterestSpec {
  queries: Record<string, string[]>;
  topic?: string;
  backups: string[];
  terms: string[];
}

const INTERESTS: Record<string, InterestSpec> = {
  "tecnologia e ia": {
    topic: "TECHNOLOGY",
    queries: {
      en: ["artificial intelligence", "AI technology", "machine learning"],
      es: ["inteligencia artificial", "tecnología IA"],
      de: ["Künstliche Intelligenz", "Technologie KI"],
      fr: ["intelligence artificielle", "technologie IA"],
      it: ["intelligenza artificiale", "tecnologia IA"],
      ru: ["искусственный интеллект"],
      ja: ["人工知能", "AI"],
    },
    backups: ["https://feeds.bbci.co.uk/news/technology/rss.xml", "https://www.theverge.com/rss/index.xml"],
    terms: [
      "artificial intelligence",
      "machine learning",
      "inteligência artificial",
      "inteligencia artificial",
      "künstliche intelligenz",
      "intelligence artificielle",
      "intelligenza artificiale",
      "chatgpt",
      "openai",
      "anthropic",
      "deepmind",
      "nvidia",
      "semiconductor",
      "neural",
      "algorithm",
      "algoritm",
      "llm",
      "gpt",
      "claude",
      "gemini",
      "robot",
      "cyber",
      "software",
      "startup",
      "chip",
      "tecnolog",
      "technology",
      "tech ",
      " ai ",
      "a.i",
    ],
  },
  ciencia: {
    topic: "SCIENCE",
    queries: {
      en: ["science research", "space science"],
      es: ["ciencia investigación"],
      de: ["Wissenschaft Forschung"],
      fr: ["science recherche"],
      it: ["scienza ricerca"],
      ru: ["наука исследование"],
      ja: ["科学"],
    },
    backups: ["https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],
    terms: ["science", "ciência", "ciencia", "wissenschaft", "research", "pesquisa", "space", "espaço", "physics", "biology", "climate", "nasa"],
  },
  negocios: {
    topic: "BUSINESS",
    queries: {
      en: ["business markets", "economy"],
      es: ["negocios economía"],
      de: ["Wirtschaft Unternehmen"],
      fr: ["économie entreprises"],
      it: ["economia imprese"],
      ru: ["бизнес экономика"],
      ja: ["経済 ビジネス"],
    },
    backups: ["https://feeds.bbci.co.uk/news/business/rss.xml"],
    terms: ["business", "negócio", "negocio", "market", "economia", "economy", "stock", "empresa", "company", "banco", "bank", "inflação", "inflation"],
  },
  viagens: {
    queries: {
      en: ["travel tourism", "airlines travel"],
      es: ["viajes turismo"],
      de: ["Reisen Tourismus"],
      fr: ["voyage tourisme"],
      it: ["viaggi turismo"],
      ru: ["путешествия туризм"],
      ja: ["旅行 観光"],
    },
    backups: ["https://feeds.bbci.co.uk/news/world/rss.xml"],
    terms: ["travel", "viagem", "viaje", "tourism", "turismo", "airline", "airport", "hotel", "passport", "flight", "voo"],
  },
  filosofia: {
    queries: {
      en: ["philosophy ethics", "philosopher"],
      es: ["filosofía ética"],
      de: ["Philosophie Ethik"],
      fr: ["philosophie éthique"],
      it: ["filosofia etica"],
      ru: ["философия этика"],
      ja: ["哲学"],
    },
    backups: [],
    terms: ["philosophy", "filosofia", "philosopher", "ethics", "ética", "etica", "thinker", "stoic"],
  },
  "cultura pop": {
    topic: "ENTERTAINMENT",
    queries: {
      en: ["pop culture film", "entertainment"],
      es: ["cultura pop cine"],
      de: ["Popkultur Film"],
      fr: ["culture pop cinéma"],
      it: ["cultura pop cinema"],
      ru: ["поп культура кино"],
      ja: ["ポップカルチャー"],
    },
    backups: ["https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"],
    terms: ["film", "movie", "cinema", "série", "series", "netflix", "marvel", "oscar", "album", "celebrity", "pop culture", "cultura pop"],
  },
  cozinha: {
    queries: {
      en: ["cooking food recipe"],
      es: ["cocina receta comida"],
      de: ["Kochen Rezept"],
      fr: ["cuisine recette"],
      it: ["cucina ricetta"],
      ru: ["кулинария рецепт"],
      ja: ["料理 レシピ"],
    },
    backups: [],
    terms: ["cook", "recipe", "receita", "cozinha", "cocina", "chef", "food", "comida", "restaurant", "restaurante"],
  },
  musica: {
    queries: {
      en: ["music album concert"],
      es: ["música álbum concierto"],
      de: ["Musik Album Konzert"],
      fr: ["musique album concert"],
      it: ["musica album concerto"],
      ru: ["музыка альбом"],
      ja: ["音楽 アルバム"],
    },
    backups: ["https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"],
    terms: ["music", "música", "musica", "album", "álbum", "concert", "show", "song", "canção", "singer", "banda", "band"],
  },
};

export interface NewsHeadline {
  title: string;
  url: string;
  summary: string;
  published?: string;
}

export function newsFeedUrl(targetLang: string, interest?: string): string {
  const locale = LOCALES[targetLang] ?? LOCALES.en;
  if (!locale) {
    throw new Error("Missing news locale");
  }
  if (interest) {
    const query = new URLSearchParams({
      q: interest,
      hl: locale.hl,
      gl: locale.gl,
      ceid: `${locale.gl}:${targetLang}`,
    });
    return `https://news.google.com/rss/search?${query.toString()}`;
  }
  const query = new URLSearchParams({
    hl: locale.hl,
    gl: locale.gl,
    ceid: `${locale.gl}:${targetLang}`,
  });
  return `https://news.google.com/rss?${query.toString()}`;
}

export function backupFeedUrl(targetLang: string): string {
  return WORLD_BACKUP[targetLang] ?? WORLD_BACKUP.en ?? "https://feeds.bbci.co.uk/news/world/rss.xml";
}

export function interestSearchQueries(interest: string, targetLang: string): string[] {
  const spec = resolveInterest(interest);
  const mapped = spec ? spec.queries[targetLang] ?? spec.queries.en ?? [] : [];
  return [...new Set([interest, ...mapped].map((item) => item.trim()).filter((item) => item.length > 0))];
}

export function headlineFitsInterest(headline: NewsHeadline, interest?: string): boolean {
  if (!interest) {
    return true;
  }
  const text = ` ${headline.title} ${headline.summary} `.toLowerCase();
  const spec = resolveInterest(interest);
  if (spec?.terms.some((term) => text.includes(term))) {
    return true;
  }
  const tokens = tokenizeInterest(interest);
  if (tokens.some((word) => text.includes(word))) {
    return true;
  }
  return !spec && tokens.length === 0;
}

export function parseRssItems(xml: string, limit = 15): NewsHeadline[] {
  const items: NewsHeadline[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? "";
    const title = decodeXml(unwrap(textOf(block, "title")));
    const url = firstHttps(textOf(block, "link")) ?? firstHttps(textOf(block, "guid"));
    const summary = decodeXml(stripTags(unwrap(textOf(block, "description"))));
    const published = decodeXml(unwrap(textOf(block, "pubDate") || textOf(block, "updated")));
    if (!title || !url) {
      continue;
    }
    items.push({ title, url, summary, ...(published ? { published } : {}) });
    if (items.length >= limit) {
      break;
    }
  }
  return items;
}

export function selectFreshHeadlines(
  items: NewsHeadline[],
  limit = 3,
  now = Date.now(),
  maxAgeMs = FRESH_MS,
): NewsHeadline[] {
  const unique = dedupeHeadlines(items);
  const scored = unique.map((item) => {
    const at = item.published ? Date.parse(item.published) : Number.NaN;
    return { item, at: Number.isNaN(at) ? null : at };
  });
  scored.sort((left, right) => (right.at ?? 0) - (left.at ?? 0));
  const fresh = scored.filter((row) => row.at === null || now - row.at <= maxAgeMs).map((row) => row.item);
  if (fresh.length > 0) {
    return fresh.slice(0, limit);
  }
  return scored.slice(0, limit).map((row) => row.item);
}

export async function fetchHeadlines(targetLang: string, interest?: string): Promise<NewsHeadline[]> {
  const urls = headlineUrls(targetLang, interest);
  const pool: NewsHeadline[] = [];
  let lastError: unknown;
  for (const url of urls) {
    try {
      const items = await fetchFrom(url);
      for (const item of items) {
        if (acceptsHeadline(item, interest, url)) {
          pool.push(item);
        }
      }
      const picked = selectFreshHeadlines(pool);
      if (picked.length >= 3) {
        return picked;
      }
    } catch (error) {
      lastError = error;
    }
  }
  const picked = selectFreshHeadlines(pool);
  if (picked.length > 0) {
    return picked;
  }
  throw lastError instanceof Error ? lastError : new Error("News feed is unavailable");
}

function acceptsHeadline(headline: NewsHeadline, interest: string | undefined, url: string): boolean {
  if (!interest) {
    return true;
  }
  if (url.includes("/rss/search?")) {
    return true;
  }
  return headlineFitsInterest(headline, interest);
}

function headlineUrls(targetLang: string, interest?: string): string[] {
  if (!interest) {
    return [newsFeedUrl(targetLang), backupFeedUrl(targetLang)];
  }
  const spec = resolveInterest(interest);
  const urls: string[] = [];
  if (spec?.topic) {
    urls.push(googleTopicUrl(targetLang, spec.topic));
  }
  for (const query of interestSearchQueries(interest, targetLang)) {
    urls.push(newsFeedUrl(targetLang, `${query} when:1d`));
    urls.push(newsFeedUrl(targetLang, `${query} when:7d`));
    urls.push(newsFeedUrl(targetLang, query));
  }
  urls.push(...(spec?.backups ?? []));
  return urls;
}

function googleTopicUrl(targetLang: string, topic: string): string {
  const locale = LOCALES[targetLang] ?? LOCALES.en;
  if (!locale) {
    throw new Error("Missing news locale");
  }
  const query = new URLSearchParams({
    hl: locale.hl,
    gl: locale.gl,
    ceid: `${locale.gl}:${targetLang}`,
  });
  return `https://news.google.com/rss/headlines/section/topic/${topic}?${query.toString()}`;
}

function resolveInterest(interest: string): InterestSpec | undefined {
  return INTERESTS[fold(interest)];
}

function tokenizeInterest(interest: string): string[] {
  return fold(interest)
    .split(/[^a-z0-9\u00c0-\u024f]+/i)
    .map((word) => word.trim())
    .filter((word) => (word.length > 3 || word === "ia" || word === "ai") && !STOP.has(word));
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeHeadlines(items: NewsHeadline[]): NewsHeadline[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/\s+/g, " ").slice(0, 56);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchFrom(url: string): Promise<NewsHeadline[]> {
  const safe = assertAllowedNewsUrl(url);
  const response = await fetch(safe, {
    headers: { accept: "application/rss+xml, application/xml, text/xml", "user-agent": "Prosa/4.0" },
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`News feed responded ${response.status}`);
  }
  return parseRssItems(await response.text());
}

function textOf(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function unwrap(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function firstHttps(value: string): string | null {
  const match = value.match(/https:\/\/[^\s<"']+/);
  return match?.[0] ?? null;
}
