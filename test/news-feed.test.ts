import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRssItems } from "../src/services/news-feed.ts";

describe("parseRssItems", () => {
  it("reads the first https story from an RSS item", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[City opens a new library]]></title>
          <link>https://news.example/library</link>
          <description><![CDATA[<p>Readers get a quiet room.</p>]]></description>
        </item>
      </channel></rss>`;
    const items = parseRssItems(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "City opens a new library");
    assert.equal(items[0]?.url, "https://news.example/library");
    assert.equal(items[0]?.summary, "Readers get a quiet room.");
  });
});
