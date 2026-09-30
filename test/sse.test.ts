import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSseBlock, readSse } from "../src/http/sse.ts";

describe("SSE frames", () => {
  it("reads an audio chunk and a word mark", () => {
    const audio = parseSseBlock("event: audio\ndata: Zm9v\n");
    const word = parseSseBlock('event: word\ndata: {"text":"Hello","offset_ms":12}');
    assert.equal(audio?.event, "audio");
    assert.equal(audio?.data, "Zm9v");
    assert.equal(word?.event, "word");
    assert.equal(word?.data, '{"text":"Hello","offset_ms":12}');
  });

  it("walks a byte stream of events", async () => {
    const payload = "event: audio\ndata: YQ==\n\nevent: done\ndata: {}\n\n";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const frames = [];
    for await (const frame of readSse(stream)) {
      frames.push(frame);
    }
    assert.equal(frames.length, 2);
    assert.equal(frames[0]?.event, "audio");
    assert.equal(frames[1]?.event, "done");
  });
});
