import { AppError } from "../http/errors.js";
import { modelBusy } from "./ops.js";

export function scrubSecrets(text: string): string {
  return text
    .replace(/gsk_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/sk-or-v1-[A-Za-z0-9-]+/g, "[redacted]")
    .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/AQ\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

export function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new AppError(502, "Model response was not valid JSON", { cause: error instanceof Error ? error : undefined });
  }
}

export function textOnlyPrompt(contents: unknown): string | null {
  if (typeof contents === "string") {
    return contents;
  }
  if (!Array.isArray(contents)) {
    return null;
  }
  const texts: string[] = [];
  for (const item of contents) {
    if (typeof item === "string") {
      texts.push(item);
      continue;
    }
    if (!item || typeof item !== "object") {
      return null;
    }
    const record = item as { text?: unknown; parts?: unknown };
    if (typeof record.text === "string" && !record.parts) {
      texts.push(record.text);
      continue;
    }
    if (!Array.isArray(record.parts)) {
      return null;
    }
    for (const part of record.parts) {
      if (!part || typeof part !== "object") {
        return null;
      }
      const piece = part as { text?: unknown; inlineData?: unknown };
      if (piece.inlineData) {
        return null;
      }
      if (typeof piece.text === "string") {
        texts.push(piece.text);
      }
    }
  }
  return texts.join("\n") || null;
}

export async function openaiCompatibleJson(input: {
  url: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userText: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  temperature: number;
  extraHeaders?: Record<string, string>;
}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(input.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${input.apiKey}`,
        ...input.extraHeaders,
      },
      body: JSON.stringify({
        model: input.model,
        temperature: input.temperature,
        max_tokens: Math.min(8_000, Math.max(256, input.maxOutputTokens)),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${input.systemInstruction}\n\nRespond with a JSON object that matches this schema:\n${JSON.stringify(input.schema)}`,
          },
          { role: "user", content: input.userText },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    throw new AppError(502, "Fallback provider request failed", { cause: error instanceof Error ? error : undefined });
  }
  const raw = await response.text();
  if (!response.ok) {
    const busy = modelBusy(raw) || response.status === 429 || response.status === 503;
    const message = scrubSecrets(raw.slice(0, 240) || `fallback ${response.status}`);
    if (busy) {
      throw new AppError(503, "The model is busy. Try again in a minute.");
    }
    throw new AppError(502, message);
  }
  let body: { choices?: Array<{ message?: { content?: string | null } }> };
  try {
    body = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string | null } }> };
  } catch (error) {
    throw new AppError(502, "Model response was not valid JSON", { cause: error instanceof Error ? error : undefined });
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new AppError(502, "Model returned an empty structured response");
  }
  return parseJsonContent(content);
}

export async function groqTranscribe(input: {
  apiKey: string;
  audio: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  const form = new FormData();
  const type = input.mimeType.split(";")[0]?.trim() || "audio/webm";
  const bytes = Uint8Array.from(input.audio);
  const file = new File([bytes], input.filename || "speech.webm", { type });
  form.append("file", file);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  const lang = input.language?.trim().toLowerCase();
  if (lang && /^[a-z]{2}$/.test(lang)) {
    form.append("language", lang);
  }
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new AppError(502, "Transcription failed", { cause: error instanceof Error ? error : undefined });
  }
  const raw = await response.text();
  if (!response.ok) {
    throw new AppError(response.status === 429 || response.status === 503 ? 503 : 502, scrubSecrets(raw.slice(0, 240) || "Transcription failed"));
  }
  let body: { text?: string };
  try {
    body = JSON.parse(raw) as { text?: string };
  } catch (error) {
    throw new AppError(502, "Transcription response was not valid JSON", { cause: error instanceof Error ? error : undefined });
  }
  return (body.text ?? "").trim();
}
