import { test, expect } from "@playwright/test";
import { readSse, parseSseBlock, type SseFrame } from "@/lib/sse";
import { streamSse } from "@/api/sse";
import { ApiError } from "@/api/errors";

test.describe("Camada de dados: parser SSE e streamSse", () => {
  const originalFetch = globalThis.fetch;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("parseSseBlock processa eventos e dados com quebras de linha", () => {
    const block = "event: message\ndata: primeira linha\ndata: segunda linha\n";
    const parsed = parseSseBlock(block);
    expect(parsed).toEqual({
      event: "message",
      data: "primeira linha\nsegunda linha",
    });
  });

  test("readSse remonta frames que chegam divididos ao meio em chunks", async () => {
    const chunks = [
      "event: step\nda",
      "ta: progresso parcial 1\n\nevent:",
      " step\ndata: progresso parcial 2\n\n",
    ];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    const frames: SseFrame[] = [];
    for await (const frame of readSse(stream)) {
      frames.push(frame);
    }

    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ event: "step", data: "progresso parcial 1" });
    expect(frames[1]).toEqual({ event: "step", data: "progresso parcial 2" });
  });

  test("streamSse consome stream de fetch e despacha para onFrame", async () => {
    const ssePayload = "event: delta\ndata: Olá\n\nevent: delta\ndata: mundo\n\n";

    globalThis.fetch = (async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }) as typeof fetch;

    const frames: SseFrame[] = [];
    await streamSse("/api/v1/stream", { prompt: "test" }, (frame) => {
      frames.push(frame);
    });

    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ event: "delta", data: "Olá" });
    expect(frames[1]).toEqual({ event: "delta", data: "mundo" });
  });

  test("streamSse lança ApiError quando a resposta não é 200 OK", async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "Stream indisponível" }), {
        status: 503,
      });
    }) as typeof fetch;

    await expect(
      streamSse("/api/v1/stream", {}, () => {}),
    ).rejects.toThrow(ApiError);
  });
});
