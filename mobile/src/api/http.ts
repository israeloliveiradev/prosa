import { apiUrl } from "./config";
import { ApiError } from "./errors";
import { getSession } from "@/lib/session";
import { wipeDeviceStudy } from "@/lib/wipe-device";

export type AuthRequirement = "required" | "optional" | "none";

export interface ZodLikeSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } };
}

export interface RequestOptions<T> {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  form?: FormData;
  schema?: ZodLikeSchema<T>;
  auth?: AuthRequirement;
  signal?: AbortSignal;
  timeoutMs?: number;
  onUnauthorized?: () => void;
}

let customUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  customUnauthorizedHandler = handler;
}

function handleUnauthorizedDefault(): void {
  if (customUnauthorizedHandler) {
    customUnauthorizedHandler();
    return;
  }
  const current = getSession();
  if (current?.user?.id) {
    wipeDeviceStudy(current.user.id);
  }
}

/**
 * Cliente HTTP unificado do Prosa.
 * Implementa validação por schema, resolução central de token, timeouts configuráveis e erros tipados.
 */
export async function request<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const {
    method = "GET",
    query,
    body,
    form,
    schema,
    auth = "optional",
    signal,
    timeoutMs = 20_000,
    onUnauthorized,
  } = options;

  // 1. Montagem da URL com query params
  let fullUrl = `${apiUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
    }
  }

  // 2. Cabeçalhos e autorização
  const headers: Record<string, string> = {};

  if (body !== undefined && !form) {
    headers["Content-Type"] = "application/json";
  }

  if (auth !== "none") {
    const session = getSession();
    if (session?.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    } else if (auth === "required") {
      throw new ApiError("auth", null, "Sessão necessária para esta requisição.");
    }
  }

  // 3. Timeout e AbortController combinado
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      signal.addEventListener("abort", onExternalAbort);
    }
  }

  // 4. Execução do fetch
  let response: Response;
  try {
    const fetchBody = form !== undefined ? form : body !== undefined ? JSON.stringify(body) : undefined;
    response = await fetch(fullUrl, {
      method,
      headers,
      body: fetchBody,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
    if (timedOut) {
      throw new ApiError("timeout", null, "A API demorou para responder. Tente de novo.");
    }
    throw new ApiError("network", null, err?.message ?? "Falha de conexão com a API.");
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  }

  // 5. Tratamento de respostas de erro
  if (!response.ok) {
    if (response.status === 401 && auth !== "none" && !path.includes("/auth/login")) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        handleUnauthorizedDefault();
      }
    }

    let rawMessage = "";
    try {
      const errorJson = await response.json();
      rawMessage = errorJson?.error ?? errorJson?.message ?? "";
    } catch {
      rawMessage = response.statusText || `HTTP ${response.status}`;
    }

    throw new ApiError("http", response.status, rawMessage);
  }

  // 6. Tratamento de 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 7. Parse do corpo da resposta e validação Zod
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("schema", response.status, "A resposta não pôde ser lida como JSON.");
  }

  if (schema) {
    const parseResult = schema.safeParse(data);
    if (!parseResult.success) {
      const issue = parseResult.error.issues?.[0];
      const issuePath = issue?.path?.join(".") ?? "raiz";
      const issueMessage = issue?.message ?? "formato inválido";
      throw new ApiError(
        "schema",
        response.status,
        `Resposta da API divergente do schema em '${issuePath}': ${issueMessage}`,
      );
    }
    return parseResult.data;
  }

  return data as T;
}
