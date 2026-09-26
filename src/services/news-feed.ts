const LOCALES: Record<string, { hl: string; gl: string }> = {
  en: { hl: "en-US", gl: "US" },
  es: { hl: "es-ES", gl: "ES" },
  de: { hl: "de-DE", gl: "DE" },
  ru: { hl: "ru-RU", gl: "RU" },
  fr: { hl: "fr-FR", gl: "FR" },
  it: { hl: "it-IT", gl: "IT" },
  ja: { hl: "ja-JP", gl: "JP" },
};

export interface NewsHeadline {
  title: string;
  url: string;
  summary: string;
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

export function parseRssItems(xml: string, limit = 3): NewsHeadline[] {
  const items: NewsHeadline[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? "";
    const title = decodeXml(unwrap(textOf(block, "title")));
    const url = firstHttps(textOf(block, "link")) ?? firstHttps(textOf(block, "guid"));
    const summary = decodeXml(stripTags(unwrap(textOf(block, "description"))));
    if (!title || !url) {
      continue;
    }
    items.push({ title, url, summary });
    if (items.length >= limit) {
      break;
    }
  }
  return items;
}

export async function fetchHeadlines(targetLang: string, interest?: string): Promise<NewsHeadline[]> {
  const response = await fetch(newsFeedUrl(targetLang, interest), {
    headers: { accept: "application/rss+xml, application/xml, text/xml", "user-agent": "Prosa/4.0" },
    signal: AbortSignal.timeout(12_000),
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
