import { apiUrl } from "./config";
import { ApiError } from "./errors";
import { readSse, type SseFrame } from "@/lib/sse";
import { getSession } from "@/lib/session";

/**
 * Consome um fluxo Server-Sent Events (SSE) autenticado.
 * Utiliza o parser puro readSse de lib/sse.ts.
 */
export async function streamSse(
  path: string,
  body: unknown,
  onFrame: (frame: SseFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const fullUrl = `${apiUrl()}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const session = getSession();
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (signal?.aborted) {
      return;
    }
    throw new ApiError("network", null, err?.message ?? "Falha ao conectar no fluxo SSE.");
  }

  if (!response.ok) {
    let rawMessage = "";
    try {
      const errorJson = await response.json();
      rawMessage = errorJson?.error ?? errorJson?.message ?? "";
    } catch {
      rawMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new ApiError("http", response.status, rawMessage);
  }

  if (!response.body) {
    throw new ApiError("network", response.status, "Resposta SSE sem corpo de stream.");
  }

  try {
    for await (const frame of readSse(response.body as ReadableStream<Uint8Array>)) {
      if (signal?.aborted) {
        break;
      }
      onFrame(frame);
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return;
    }
    throw err;
  }
}
