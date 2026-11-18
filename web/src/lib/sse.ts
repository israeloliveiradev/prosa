export interface SseFrame {
  event: string;
  data: string;
}

export function parseSseBlock(block: string): SseFrame | null {
  const trimmed = block.replace(/^\uFEFF/, "").trim();
  if (!trimmed || trimmed.startsWith(":")) {
    return null;
  }
  let event = "message";
  const data: string[] = [];
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }
  if (data.length === 0) {
    return null;
  }
  return { event, data: data.join("\n") };
}

export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";
      for (const block of parts) {
        const frame = parseSseBlock(block);
        if (frame) {
          yield frame;
        }
      }
      if (done) {
        const frame = parseSseBlock(buffer);
        if (frame) {
          yield frame;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
