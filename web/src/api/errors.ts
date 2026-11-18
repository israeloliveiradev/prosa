export type ApiErrorKind = "network" | "timeout" | "auth" | "http" | "schema";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number | null,
    readonly raw: string,
  ) {
    super(raw);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Mapeia erros de API (ApiError ou Error comum) para mensagens amigáveis em português ou inglês
 * conforme a tabela 12.4 do plano de refatoração.
 */
export function toUserMessage(
  error: unknown,
  copy: Record<string, string | ((...args: any[]) => string)>,
): string {
  const c = (key: string, fallback: string): string => {
    const val = copy[key];
    return typeof val === "string" ? val : fallback;
  };

  if (error instanceof ApiError) {
    if (error.kind === "network") {
      return c("apiDown", "A API não abriu. Confira se o servidor está em :3000.");
    }
    if (error.kind === "timeout") {
      return c("apiSlow", "A API demorou para responder. Tente de novo.");
    }
    if (error.kind === "schema") {
      return c("apiShapeChanged", "A resposta da API veio num formato inesperado.");
    }
    if (error.kind === "auth" && error.status === null) {
      return c("invalidCredentials", "E-mail ou senha não confere.");
    }

    if (error.status === 429) {
      return c("tooManyTries", "Muitas tentativas. Espere um minuto e tente de novo.");
    }

    const raw = error.raw || "";

    if (error.status === 409 && raw.includes("Email already registered")) {
      return c("emailRegistered", "Este e-mail já tem uma conta.");
    }

    return mapRawMessage(raw, copy, c);
  }

  if (error instanceof Error) {
    const msg = error.message || "";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) {
      return c("apiDown", "A API não abriu. Confira se o servidor está em :3000.");
    }
    if (msg.includes("timeout") || msg.includes("AbortError")) {
      return c("apiSlow", "A API demorou para responder. Tente de novo.");
    }
    return mapRawMessage(msg, copy, c);
  }

  return c("apiSilent", "A API do Prosa não respondeu.");
}

function mapRawMessage(
  raw: string,
  _copy: Record<string, string | ((...args: any[]) => string)>,
  c: (key: string, fallback: string) => string,
): string {
  if (!raw) {
    return c("apiSilent", "A API do Prosa não respondeu.");
  }

  if (raw.includes("The model is busy") || raw.includes("busy") || raw.includes("high demand") || raw.includes("UNAVAILABLE")) {
    return c("modelBusy", "O modelo está ocupado. Tente de novo em um minuto.");
  }

  if (raw.includes("Model request failed") || raw.includes("empty structured") || raw.includes("not valid JSON")) {
    return c("lessonFailed", "A lição não saiu agora. Tente de novo em instantes.");
  }

  if (raw.includes("Lesson generation is unavailable")) {
    return c("generationOff", "A geração da lição não está disponível agora.");
  }

  if (raw.includes("Body cannot be empty") || raw.includes("content-type")) {
    return c("requestIncomplete", "O pedido não saiu completo. Tente de novo.");
  }

  if (raw.includes("Invalid credentials")) {
    return c("invalidCredentials", "E-mail ou senha não confere.");
  }

  if (raw.includes("Email already registered")) {
    return c("emailRegistered", "Este e-mail já tem uma conta.");
  }

  if (raw.includes("Invalid request")) {
    return c("checkEmailPassword", "Confira o e-mail e use uma senha com pelo menos 8 caracteres.");
  }

  if (raw.includes("Verify code expired")) {
    return c("verifyExpired", "O código expirou ou não confere. Peça outro.");
  }

  if (raw.includes("The verification letter did not leave") || raw.includes("Mail is not configured")) {
    return c("mailDidNotLeave", "O e-mail de validação não saiu. Tente de novo em instantes.");
  }

  return raw;
}
