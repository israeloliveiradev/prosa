import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pool } from "pg";
import { AppError, publicErrorMessage } from "../src/http/errors.ts";
import {
  extractArticleText,
  fetchArticleBody,
  isAllowedArticleUrl,
  publisherOf,
  resolveGoogleNewsUrl,
} from "../src/services/news-article.ts";
import { parseRssItems } from "../src/services/news-feed.ts";
import { isInLanguage, languageVerdict } from "../src/services/news-language.ts";
import type { GeminiGateway } from "../src/services/gemini-gateway.ts";
import { PersonalizationService } from "../src/services/personalization-service.ts";

const LONG_EN =
  "The city council voted on Tuesday to open a new public library in the north of the city. The building will have a quiet reading room and a space for children. Officials said the library is expected to open next year after the works are finished.";

const PAGE = `<!doctype html><html><head><title>x</title>
<script>var tracking = "<p>not text</p>";</script>
<style>p { color: red }</style></head>
<body>
<nav><p>Home | World | Business | Sport and other sections of the site</p></nav>
<header><p>Breaking news banner that should never reach the model at all</p></header>
<article>
  <p>${LONG_EN}</p>
  <p>Residents welcomed the decision &amp; said the old library was too small for the growing number of families.</p>
  <p>Short.</p>
  <figure><figcaption><p>A caption that describes a photo of the old library building</p></figcaption></figure>
</article>
<footer><p>Copyright 2026 BBC. All rights reserved. Read about our approach to links.</p></footer>
</body></html>`;

describe("article extraction", () => {
  it("keeps only paragraph text and drops script, style, nav, header, footer and figures", () => {
    const text = extractArticleText(PAGE);
    assert.match(text, /^The city council voted/);
    assert.match(text, /decision & said/);
    assert.doesNotMatch(text, /tracking|color: red|Home \| World|Breaking news|caption|Copyright|Short\./);
  });

  it("caps the body at a paragraph boundary", () => {
    const html = Array.from({ length: 60 }, (_, index) => `<p>Paragraph ${index} ${"word ".repeat(30)}</p>`).join("");
    const text = extractArticleText(html, 1_000);
    assert.ok(text.length <= 1_000);
    assert.ok(text.endsWith("word"));
  });
});

describe("article allowlist", () => {
  it("allows only https publisher hosts the feeds already use", () => {
    assert.equal(isAllowedArticleUrl("https://www.bbc.com/news/articles/abc"), true);
    assert.equal(isAllowedArticleUrl("https://www3.nhk.or.jp/news/html/x.html"), true);
    assert.equal(isAllowedArticleUrl("https://www.tagesschau.de/inland/x.html"), true);
    assert.equal(isAllowedArticleUrl("http://www.bbc.com/news"), false);
    assert.equal(isAllowedArticleUrl("https://evilbbc.com/news"), false);
    assert.equal(isAllowedArticleUrl("https://bbc.com.evil.test/news"), false);
    assert.equal(isAllowedArticleUrl("https://user:pass@www.bbc.com/news"), false);
    assert.equal(isAllowedArticleUrl("https://news.google.com/rss/articles/abc"), false);
    assert.equal(publisherOf("https://www.ansa.it/sito/x.html"), "ANSA");
    assert.equal(publisherOf("https://example.com/x"), null);
  });

  it("resolves an old-format Google News link only when it carries an allowlisted URL", () => {
    const id = (target: string) =>
      Buffer.concat([Buffer.from([0x08, 0x13, 0x22, 0x2a]), Buffer.from(target), Buffer.from([0xd2, 0x01, 0x00])]).toString("base64url");
    assert.equal(
      resolveGoogleNewsUrl(`https://news.google.com/rss/articles/${id("https://www.bbc.com/news/articles/c123")}?oc=5`),
      "https://www.bbc.com/news/articles/c123",
    );
    assert.equal(resolveGoogleNewsUrl(`https://news.google.com/rss/articles/${id("https://example.com/a")}?oc=5`), null);
    assert.equal(resolveGoogleNewsUrl("https://news.google.com/rss/articles/AU_yqLOpaqueNewFormat?oc=5"), null);
  });
});

describe("fetchArticleBody", () => {
  it("reads an allowlisted article and never calls out for other hosts", async () => {
    const calls: string[] = [];
    const fetcher = async (url: string) => {
      calls.push(url);
      return new Response(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    };
    const body = await fetchArticleBody("https://www.bbc.com/news/articles/c1", { fetcher });
    assert.equal(body?.url, "https://www.bbc.com/news/articles/c1");
    assert.match(body?.text ?? "", /city council/);
    assert.equal(await fetchArticleBody("https://example.com/story", { fetcher }), null);
    assert.equal(await fetchArticleBody("https://news.google.com/rss/articles/AU_yqLx?oc=5", { fetcher }), null);
    assert.deepEqual(calls, ["https://www.bbc.com/news/articles/c1"]);
  });

  it("follows a redirect only to another allowlisted host", async () => {
    const hop = async (url: string) =>
      url.endsWith("/a")
        ? new Response(null, { status: 302, headers: { location: "https://example.com/elsewhere" } })
        : new Response(PAGE, { status: 200, headers: { "content-type": "text/html" } });
    assert.equal(await fetchArticleBody("https://www.bbc.com/a", { fetcher: hop }), null);
    const inside = async (url: string) =>
      url.endsWith("/a")
        ? new Response(null, { status: 301, headers: { location: "/news/b" } })
        : new Response(PAGE, { status: 200, headers: { "content-type": "text/html" } });
    assert.equal((await fetchArticleBody("https://www.bbc.com/a", { fetcher: inside }))?.url, "https://www.bbc.com/news/b");
  });

  it("drops non-HTML, thin pages, and reads at most the byte cap", async () => {
    const json = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    assert.equal(await fetchArticleBody("https://www.bbc.com/a", { fetcher: json }), null);
    const thin = async () => new Response("<p>Too short to be an article body.</p>", { status: 200, headers: { "content-type": "text/html" } });
    assert.equal(await fetchArticleBody("https://www.bbc.com/a", { fetcher: thin }), null);
    const huge = Array.from({ length: 200 }, (_, index) => `<p>${index}. ${LONG_EN}</p>`).join("");
    const capped = await fetchArticleBody("https://www.bbc.com/a", {
      fetcher: async () => new Response(huge, { status: 200, headers: { "content-type": "text/html" } }),
      maxBytes: 2_000,
    });
    assert.ok(capped);
    assert.ok((capped?.text.length ?? 0) < 2_000);
  });
});

describe("output language check", () => {
  const ES = "El ayuntamiento votó el martes para abrir una nueva biblioteca pública en el norte de la ciudad. Los vecinos dijeron que la antigua biblioteca era muy pequeña para las familias, y el gobierno prometió que estará lista el próximo año.";
  const DE = "Der Stadtrat hat am Dienstag beschlossen, im Norden der Stadt eine neue Bibliothek zu eröffnen. Die Anwohner sagen, dass die alte Bibliothek für die Familien zu klein ist und auch nicht mehr modern war.";
  const FR = "Le conseil municipal a voté mardi pour ouvrir une nouvelle bibliothèque dans le nord de la ville. Les habitants disent que l'ancienne bibliothèque était trop petite pour les familles et qu'elle n'est plus adaptée.";
  const IT = "Il consiglio comunale ha votato martedì per aprire una nuova biblioteca nel nord della città. Gli abitanti dicono che la vecchia biblioteca era troppo piccola per le famiglie e che non è più adatta.";
  const JA = "市議会は火曜日、町の北に新しい図書館を作ることを決めました。住民は、古い図書館は家族には小さすぎると話しています。";
  const ZH = "市议会周二投票决定在城市北部开设一座新的公共图书馆。居民说旧图书馆对家庭来说太小了。";
  const RU = "Городской совет во вторник решил открыть новую библиотеку на севере города. Жители говорят, что старая библиотека слишком маленькая для семей.";

  it("accepts each target language and rejects a Spanish story cached for en", () => {
    assert.equal(isInLanguage(LONG_EN, "en"), true);
    assert.equal(isInLanguage(ES, "es"), true);
    assert.equal(isInLanguage(ES, "en"), false);
    assert.equal(isInLanguage(DE, "de"), true);
    assert.equal(isInLanguage(FR, "fr"), true);
    assert.equal(isInLanguage(IT, "it"), true);
    assert.equal(isInLanguage(IT, "es"), false);
    assert.equal(isInLanguage(FR, "it"), false);
    assert.equal(isInLanguage(LONG_EN, "de"), false);
  });

  it("checks the script for ja and ru", () => {
    assert.equal(isInLanguage(JA, "ja"), true);
    assert.equal(isInLanguage(ZH, "ja"), false);
    assert.equal(isInLanguage(LONG_EN, "ja"), false);
    assert.equal(isInLanguage(RU, "ru"), true);
    assert.equal(isInLanguage(LONG_EN, "ru"), false);
    assert.ok(languageVerdict(RU, "ru").detail.cyrillic! > 0.9);
  });
});

describe("adapted news pipeline", () => {
  const headline = {
    title: "City opens a new library",
    url: "https://www.bbc.com/news/articles/c1",
    summary: "Readers get a quiet room.",
    published: "Fri, 20 Nov 2026 09:00:00 GMT",
  };
  const lesson = (story: string, title = "A new library") => ({
    title,
    story_text: story,
    translation: "Uma nova biblioteca.",
    vocabulary: [{ word: "library", translation: "biblioteca", example_sentence: "The library is new." }],
    journal_prompt: "What do you think?",
  });

  function harness(outputs: Array<ReturnType<typeof lesson>>, cachedRow?: unknown) {
    const inserts: unknown[][] = [];
    const calls: Array<Record<string, unknown>> = [];
    const pool = {
      query: async (sql: string, params: unknown[] = []) => {
        if (/SELECT simplified_text_json/.test(sql)) {
          return { rows: cachedRow ? [{ simplified_text_json: cachedRow }] : [] };
        }
        if (/INSERT INTO news_feed_cache/.test(sql)) {
          inserts.push(params);
        }
        return { rows: [] };
      },
    } as unknown as Pool;
    const gemini = {
      adaptNews: async (input: Record<string, unknown>) => {
        calls.push(input);
        const next = outputs.shift();
        if (!next) {
          throw new Error("no more outputs");
        }
        return next;
      },
    } as unknown as GeminiGateway;
    return { pool, gemini, inserts, calls };
  }

  it("feeds the article body to the model, retries once on the wrong language and caches a full story", async () => {
    const { pool, gemini, inserts, calls } = harness([lesson("El ayuntamiento votó para abrir una biblioteca en la ciudad, y los vecinos están muy contentos con la decisión."), lesson(LONG_EN)]);
    const service = new PersonalizationService(pool, gemini, {} as never, {} as never, undefined, async (url) => ({ url, text: LONG_EN }));
    const result = await service.adaptedNews({ targetLang: "en", nativeLang: "pt", level: "A2", headline: { ...headline, source: "BBC News" } });
    assert.equal(result.cached, false);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.body, LONG_EN);
    assert.equal(calls[0]?.strictLanguage, undefined);
    assert.equal(calls[1]?.strictLanguage, true);
    assert.equal(result.news.source_depth, "full");
    assert.equal(result.news.source_name, "BBC News");
    assert.equal(result.news.source_url, headline.url);
    assert.equal(inserts.length, 1);
  });

  it("without a body rewrites from the summary, and fails with 502 without caching when the language stays wrong", async () => {
    const spanish = lesson("El ayuntamiento votó para abrir una biblioteca en la ciudad, y los vecinos están muy contentos con la decisión.");
    const { pool, gemini, inserts, calls } = harness([spanish, { ...spanish }]);
    const service = new PersonalizationService(pool, gemini, {} as never, {} as never, undefined, async () => null);
    await assert.rejects(
      service.adaptedNews({ targetLang: "en", nativeLang: "pt", level: "A2", headline }),
      (error: unknown) => error instanceof AppError && error.statusCode === 502 && error.message === "News adaptation failed",
    );
    assert.equal(calls[0]?.body, undefined);
    assert.equal(inserts.length, 0);
    assert.equal(publicErrorMessage(new AppError(502, "News adaptation failed"), 502), "News adaptation failed");
  });

  it("reuses a cached story in the right language and regenerates one in the wrong language", async () => {
    const good = { ...lesson(LONG_EN), source_url: headline.url, source_title: headline.title, source_depth: "summary" };
    const hit = harness([], good);
    const reuse = new PersonalizationService(hit.pool, hit.gemini, {} as never, {} as never, undefined, async () => null);
    assert.equal((await reuse.adaptedNews({ targetLang: "en", nativeLang: "pt", level: "A2", headline })).cached, true);
    assert.equal(hit.calls.length, 0);

    const bad = { ...lesson("Los vecinos dijeron que la biblioteca era muy pequeña para las familias de la ciudad y que el gobierno prometió más."), source_url: headline.url, source_title: headline.title };
    const miss = harness([lesson(LONG_EN)], bad);
    const redo = new PersonalizationService(miss.pool, miss.gemini, {} as never, {} as never, undefined, async () => null);
    const result = await redo.adaptedNews({ targetLang: "en", nativeLang: "pt", level: "A2", headline });
    assert.equal(result.cached, false);
    assert.equal(result.news.source_depth, "summary");
    assert.equal(result.news.source_name, "BBC");
    assert.equal(miss.inserts.length, 1);
  });

  it("reads the publisher from a Google News <source> tag", () => {
    const items = parseRssItems(`<rss><channel><item>
      <title>Library opens - BBC</title>
      <link>https://news.google.com/rss/articles/abc?oc=5</link>
      <source url="https://www.bbc.com">BBC</source>
    </item></channel></rss>`);
    assert.equal(items[0]?.source, "BBC");
  });
});
