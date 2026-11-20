import { request } from "./http";
import { AccountSettingsSchema, type AccountSettings } from "./schemas/auth";

/**
 * Clientes de Você, Ajustes e Assinatura que não existem em lib/api.ts.
 */

export interface BillingStatus {
  checkoutAvailable: boolean;
  reason: "not_configured" | null;
}

interface RawBillingStatus {
  checkout_available?: unknown;
  configured?: unknown;
  reason?: unknown;
}

/** Lê o corpo de GET /billing/status; servidor antigo só manda `configured`. */
export function parseBillingStatus(raw: unknown): BillingStatus {
  const body = (raw && typeof raw === "object" ? raw : {}) as RawBillingStatus;
  const available = typeof body.checkout_available === "boolean" ? body.checkout_available : body.configured === true;
  return { checkoutAvailable: available, reason: available ? null : "not_configured" };
}

export async function fetchBillingStatus(signal?: AbortSignal): Promise<BillingStatus> {
  const raw = await request<unknown>("/api/v1/billing/status", { method: "GET", auth: "none", ...(signal ? { signal } : {}) });
  return parseBillingStatus(raw);
}

/** Abre o checkout. Sem Stripe configurado o servidor responde 503 e ninguém ganha Pro. */
export async function startBillingCheckout(successUrl: string, cancelUrl: string): Promise<string> {
  const body = await request<{ url?: string }>("/api/v1/billing/checkout", {
    method: "POST",
    body: { success_url: successUrl, cancel_url: cancelUrl },
    auth: "required",
  });
  if (!body.url) {
    throw new Error("checkout-without-url");
  }
  return body.url;
}

export async function confirmBillingSession(sessionId: string): Promise<boolean> {
  const body = await request<{ active?: boolean }>(`/api/v1/billing/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    auth: "required",
  });
  return body.active === true;
}

export async function loadAccountSettings(signal?: AbortSignal): Promise<AccountSettings> {
  return request<AccountSettings>("/api/v1/account/settings", {
    method: "GET",
    schema: AccountSettingsSchema,
    auth: "required",
    ...(signal ? { signal } : {}),
  });
}

/** Lembretes por e-mail (o servidor só envia se o e-mail estiver configurado). Hora em UTC. */
export async function saveReminders(patch: { reminder_enabled?: boolean; reminder_hour?: number }): Promise<AccountSettings> {
  return request<AccountSettings>("/api/v1/account/settings", {
    method: "PATCH",
    body: patch,
    schema: AccountSettingsSchema,
    auth: "required",
  });
}
