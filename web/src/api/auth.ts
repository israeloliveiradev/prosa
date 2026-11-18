import { request } from "./http";
import {
  type AccountUser,
  type LoginChallenge,
  type VerifyChallenge,
  type LoginResponse,
  type RegisterResponse,
  AuthSessionResponseSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  CurrentAccountResponseSchema,
  MailInboxResponseSchema,
} from "./schemas/auth";

export interface RegisterInput {
  email: string;
  password: string;
  native_lang: string;
  target_lang: string;
  level: AccountUser["level"];
  display_locale?: "pt" | "en";
}

/**
 * Cadastra uma nova conta no Prosa.
 */
export async function registerAccount(
  input: RegisterInput,
): Promise<{ token: string; user: AccountUser } | VerifyChallenge> {
  return request<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: input,
    schema: RegisterResponseSchema,
    auth: "none",
  });
}

/**
 * Envia código de acesso de 6 dígitos para o e-mail (login sem senha).
 */
export async function sendAccountOtp(
  email: string,
): Promise<{ requires_verify: boolean; email: string }> {
  return request("/api/v1/auth/otp/send", {
    method: "POST",
    body: { email },
    auth: "none",
  });
}

/**
 * Autentica uma conta por e-mail e senha.
 * Pode retornar a sessão imediatamente ou desafios de verificação (2FA ou e-mail pendente).
 */
export async function loginAccount(
  email: string,
  password: string,
): Promise<{ token: string; user: AccountUser } | LoginChallenge | VerifyChallenge> {
  return request<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
    schema: LoginResponseSchema,
    auth: "none",
  });
}

/**
 * Confirma o e-mail da conta através do código de 6 dígitos enviado por e-mail.
 */
export async function confirmAccountEmail(
  email: string,
  code: string,
): Promise<{ token: string; user: AccountUser }> {
  return request("/api/v1/auth/verify", {
    method: "POST",
    body: { email, code },
    schema: AuthSessionResponseSchema,
    auth: "none",
  });
}

/**
 * Reenvia o código de confirmação de e-mail.
 */
export async function resendAccountEmail(email: string): Promise<void> {
  await request("/api/v1/auth/verify/resend", {
    method: "POST",
    body: { email },
    auth: "none",
  });
}

/**
 * Valida o segundo fator (TOTP ou e-mail) fornecendo o ticket temporário e o código.
 */
export async function verifySecondFactor(
  ticket: string,
  code: string,
): Promise<{ token: string; user: AccountUser }> {
  return request("/api/v1/auth/2fa", {
    method: "POST",
    body: { ticket, code },
    schema: AuthSessionResponseSchema,
    auth: "none",
  });
}

/**
 * Encerra a sessão ativa no servidor.
 */
export async function logoutAccount(_token?: string): Promise<void> {
  try {
    await request("/api/v1/auth/logout", {
      method: "POST",
      body: {},
      auth: "optional",
    });
  } catch {
    // Logout no servidor é best-effort; a limpeza local sempre ocorre
  }
}

/**
 * Busca a conta autenticada atualmente.
 */
export async function currentAccount(_token?: string): Promise<AccountUser> {
  const res = await request("/api/v1/auth/me", {
    method: "GET",
    schema: CurrentAccountResponseSchema,
    auth: "required",
  });
  return res.user;
}

/**
 * Retorna a URL da caixa de entrada do Mailpit em ambientes de teste/desenvolvimento.
 */
export async function fetchMailInbox(): Promise<string | null> {
  try {
    const res = await request("/api/v1/auth/mail", {
      method: "GET",
      schema: MailInboxResponseSchema,
      auth: "none",
    });
    return typeof res.inbox_url === "string" && res.inbox_url.length > 0 ? res.inbox_url : null;
  } catch {
    return null;
  }
}

/**
 * Solicita redefinição de senha para o e-mail informado.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await request("/api/v1/auth/forgot", {
    method: "POST",
    body: { email },
    auth: "none",
  });
}

/**
 * Confirma a redefinição de senha com código e nova senha.
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  password: string,
): Promise<void> {
  await request("/api/v1/auth/reset", {
    method: "POST",
    body: { email, code, password },
    auth: "none",
  });
}
