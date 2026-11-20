/**
 * Corpo da matéria para a notícia adaptada (M3).
 *
 * A IA só pode reescrever fatos que estão na fonte. Quando dá para ler o corpo da matéria
 * num editor da lista abaixo, ele vai para o prompt; sem corpo, a notícia é reescrita só da
 * manchete + resumo do RSS e marcada como `source_depth: "summary"`.
 *
 * Segurança (SSRF): só https, só os editores da lista (os mesmos que os feeds já usam),
 * redirecionamento seguido à mão e só para outro host da lista, 6 s no total e no máximo
 * 600 KB lidos. Links do Google News só valem quando o próprio link já traz o endereço de
 * um editor da lista (nenhuma requisição ao Google para descobrir o destino).
 */

/** Domínios dos editores cujos artigos podem ser lidos (o host pode ser um subdomínio). */
const ARTICLE_DOMAINS: Record<string, string> = {
  "bbc.co.uk": "BBC",
  "bbc.com": "BBC",
  "tagesschau.de": "tagesschau",
  "ansa.it": "ANSA",
  "nhk.or.jp": "NHK",
  "theverge.com": "The Verge",
};

export const ARTICLE_TIMEOUT_MS = 6_000;
export const ARTICLE_MAX_BYTES = 600 * 1024;
export const ARTICLE_MAX_CHARS = 4_000;
/** Menos texto que isso não é o corpo de uma matéria (é menu, legenda ou paywall). */
export const ARTICLE_MIN_CHARS = 280;
/** Em japonês o texto é mais denso: o mínimo em caracteres é menor. */
const ARTICLE_MIN_CHARS_CJK = 120;
const MAX_REDIRECTS = 3;
const MIN_PARAGRAPH_CHARS = 40;

export interface ArticleBody {
  url: string;
  text: string;
}

function hostOf(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function domainOf(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const domain of Object.keys(ARTICLE_DOMAINS)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return domain;
    }
  }
  return null;
}

/** true quando a URL é https e aponta para um editor da lista. */
export function isAllowedArticleUrl(raw: string): boolean {
  const url = hostOf(raw);
  return url !== null && domainOf(url.hostname) !== null;
}

/** Nome do editor pela URL do artigo ("BBC", "NHK"…), ou null fora da lista. */
export function publisherOf(raw: string): string | null {
  const url = hostOf(raw);
  const domain = url ? domainOf(url.hostname) : null;
  return domain ? ARTICLE_DOMAINS[domain] ?? null : null;
}

/**
 * Link do Google News → URL do editor, só quando o id do artigo traz a URL em base64
 * (formato antigo "CBMi…"). O formato novo exige chamar o Google: aí devolve null.
 */
export function resolveGoogleNewsUrl(raw: string): string | null {
  const url = hostOf(raw);
  if (!url || url.hostname !== "news.google.com") {
    return null;
  }
  const match = url.pathname.match(/\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/);
  const id = match?.[1];
  if (!id) {
    return null;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(id.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("latin1");
  } catch {
    return null;
  }
  const found = decoded.match(/https:\/\/[\x21-\x7e]+/);
  if (!found) {
    return null;
  }
  // O protobuf pode colar bytes de controle/campos depois da URL: corta no primeiro caractere
  // que não pode estar numa URL de artigo.
  const candidate = found[0].replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%].*$/, "");
  return isAllowedArticleUrl(candidate) ? candidate : null;
}

/** URL do artigo que pode ser lida: a própria (editor da lista) ou a resolvida do Google News. */
export function readableArticleUrl(raw: string): string | null {
  if (isAllowedArticleUrl(raw)) {
    return raw;
  }
  return resolveGoogleNewsUrl(raw);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  euro: "€",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const DROP_BLOCKS = ["script", "style", "noscript", "nav", "header", "footer", "aside", "form", "figure", "figcaption", "svg", "iframe", "template", "button", "select"];

const BOILERPLATE =
  /(cookie|javascript|newsletter|subscribe|sign up|copyright|©|all rights reserved|follow us|read more|advertis|abonnier|iscriviti|inscrivez|suscr[ií]b|войдите|подпиш|クッキー|登録してください)/i;

/**
 * Texto dos parágrafos de uma página HTML: tira script/style/nav/…, junta só o conteúdo de
 * `<p>`, descarta parágrafos curtos ou de rodapé e corta em ~4000 caracteres num fim de parágrafo.
 */
export function extractArticleText(html: string, maxChars = ARTICLE_MAX_CHARS): string {
  let page = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of DROP_BLOCKS) {
    page = page.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi"), " ");
  }
  const article = page.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1];
  const scope = article && /<p\b/i.test(article) ? article : page;
  const paragraphs: string[] = [];
  const seen = new Set<string>();
  for (const match of scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)) {
    const text = decodeEntities((match[1] ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < MIN_PARAGRAPH_CHARS && !/[぀-ヿ一-鿿]{12,}/.test(text)) {
      continue;
    }
    if (BOILERPLATE.test(text) && text.length < 240) {
      continue;
    }
    if (seen.has(text)) {
      continue;
    }
    seen.add(text);
    paragraphs.push(text);
  }
  let out = "";
  for (const paragraph of paragraphs) {
    const next = out ? `${out}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars) {
      if (!out) {
        out = paragraph.slice(0, maxChars);
      }
      break;
    }
    out = next;
  }
  return out;
}

function charsetOf(contentType: string | null, head: string): string {
  const declared =
    contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    new TextDecoder(declared);
    return declared;
  } catch {
    return "utf-8";
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) {
        break;
      }
      const room = maxBytes - total;
      const piece = value.byteLength > room ? value.subarray(0, room) : value;
      chunks.push(piece);
      total += piece.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function minCharsFor(text: string): number {
  const cjk = text.match(/[぀-ヿ一-鿿]/g)?.length ?? 0;
  return cjk > text.length / 3 ? ARTICLE_MIN_CHARS_CJK : ARTICLE_MIN_CHARS;
}

export type ArticleFetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Lê o corpo da matéria. Devolve null (sem lançar) quando o link não é de um editor da lista,
 * a página não responde a tempo, não é HTML ou não tem parágrafos o bastante.
 */
export async function fetchArticleBody(
  rawUrl: string,
  options: { fetcher?: ArticleFetch; timeoutMs?: number; maxBytes?: number } = {},
): Promise<ArticleBody | null> {
  const first = readableArticleUrl(rawUrl);
  if (!first) {
    return null;
  }
  let url: string = first;
  const fetcher = options.fetcher ?? ((target, init) => fetch(target, init));
  const signal = AbortSignal.timeout(options.timeoutMs ?? ARTICLE_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetcher(url, {
        headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Prosa/4.0 (+reader)" },
        redirect: "manual",
        signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        const next: string | null = location ? new URL(location, url).toString() : null;
        if (!next || !isAllowedArticleUrl(next)) {
          return null;
        }
        url = next;
        continue;
      }
      if (!response.ok || !/html/i.test(response.headers.get("content-type") ?? "")) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      const bytes = await readCapped(response, options.maxBytes ?? ARTICLE_MAX_BYTES);
      const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
      const html = new TextDecoder(charsetOf(response.headers.get("content-type"), head)).decode(bytes);
      const text = extractArticleText(html);
      return text.length >= minCharsFor(text) ? { url, text } : null;
    }
    return null;
  } catch {
    return null;
  }
}
