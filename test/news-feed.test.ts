import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { backupFeedUrl, headlineFitsInterest, interestSearchQueries, parseRssItems, selectFreshHeadlines } from "../src/services/news-feed.ts";

describe("parseRssItems", () => {
  it("reads the first https story from an RSS item", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[City opens a new library]]></title>
          <link>https://news.example/library</link>
          <pubDate>Sat, 26 Sep 2026 12:00:00 GMT</pubDate>
          <description><![CDATA[<p>Readers get a quiet room.</p>]]></description>
        </item>
      </channel></rss>`;
    const items = parseRssItems(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "City opens a new library");
    assert.equal(items[0]?.url, "https://news.example/library");
    assert.equal(items[0]?.summary, "Readers get a quiet room.");
    assert.equal(items[0]?.published, "Sat, 26 Sep 2026 12:00:00 GMT");
  });
});

describe("selectFreshHeadlines", () => {
  it("keeps the newest stories and drops a two-week-old item", () => {
    const now = Date.parse("Sat, 26 Sep 2026 12:00:00 GMT");
    const picked = selectFreshHeadlines(
      [
        { title: "Old library", url: "https://news.example/old", summary: "old", published: "Fri, 12 Sep 2026 12:00:00 GMT" },
        { title: "Today city", url: "https://news.example/today", summary: "now", published: "Sat, 26 Sep 2026 09:00:00 GMT" },
        { title: "Yesterday park", url: "https://news.example/park", summary: "park", published: "Fri, 25 Sep 2026 18:00:00 GMT" },
      ],
      3,
      now,
    );
    assert.equal(picked[0]?.title, "Today city");
    assert.equal(picked.some((item) => item.title === "Old library"), false);
    assert.equal(picked.length, 2);
  });
});

describe("headlineFitsInterest", () => {
  it("keeps an AI story and drops a heritage-month headline", () => {
    assert.equal(
      headlineFitsInterest(
        { title: "Nvidia ships a new AI chip to data centers", url: "https://news.example/ai", summary: "The GPU trains larger models." },
        "Tecnologia e IA",
      ),
      true,
    );
    assert.equal(
      headlineFitsInterest(
        {
          title: "Celebrating Hispanic Heritage Month: Helping shape what's next through innovation",
          url: "https://news.example/heritage",
          summary: "A month of culture and community.",
        },
        "Tecnologia e IA",
      ),
      false,
    );
    assert.equal(
      headlineFitsInterest(
        { title: "A stoic philosopher on daily practice", url: "https://news.example/stoic", summary: "Ethics and habit." },
        "Filosofia",
      ),
      true,
    );
    assert.equal(
      headlineFitsInterest(
        {
          title: "Celebrating Hispanic Heritage Month: Helping shape what's next through innovation",
          url: "https://news.example/heritage",
          summary: "A month of culture and community.",
        },
        "Filosofia",
      ),
      false,
    );
  });
});

describe("interestSearchQueries", () => {
  it("searches English AI terms when the quiz label is Portuguese", () => {
    const queries = interestSearchQueries("Tecnologia e IA", "en");
    assert.equal(queries.includes("artificial intelligence"), true);
    assert.equal(queries.includes("Tecnologia e IA"), true);
  });

  it("keeps a free theme as its own search", () => {
    const queries = interestSearchQueries("arquitetura", "en");
    assert.equal(queries.includes("arquitetura"), true);
  });
});

describe("backupFeedUrl", () => {
  it("keeps a BBC world feed for English and a known backup for Spanish", () => {
    assert.equal(backupFeedUrl("en"), "https://feeds.bbci.co.uk/news/world/rss.xml");
    assert.equal(backupFeedUrl("es"), "https://feeds.bbci.co.uk/mundo/rss.xml");
    assert.match(backupFeedUrl("xx"), /^https:\/\//);
  });
});
