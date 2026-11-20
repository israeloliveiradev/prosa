import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Pool } from "pg";
import type { Env } from "../config.js";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { checkoutBodySchema, checkoutSessionParamsSchema } from "../schemas/billing.js";
import { acquireOnce } from "../security/idempotency.js";
import { isAllowedReturnUrl } from "../security/return-url.js";

/** Mensagem pública (503) de quando o Stripe não está configurado: o checkout nunca abre. */
export const PAYMENTS_NOT_CONFIGURED = "Payments are not configured";

export interface BillingStatus {
  configured: boolean;
  checkout_available: boolean;
  reason: "not_configured" | null;
}

/** O checkout só existe com chave e preço do Stripe. Sem eles nada vira Pro. */
export function billingStatus(env: Pick<Env, "STRIPE_SECRET_KEY" | "STRIPE_PRICE_ID">): BillingStatus {
  const configured = Boolean(env.STRIPE_SECRET_KEY.trim() && env.STRIPE_PRICE_ID.trim());
  return { configured, checkout_available: configured, reason: configured ? null : "not_configured" };
}

export function registerBillingRoutes(app: FastifyInstance, env: Env, pool: Pool, redis: Redis): void {
  app.get(
    "/api/v1/billing/status",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async () => billingStatus(env),
  );

  app.post(
    "/api/v1/billing/checkout",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const account = await requireUser(pool, request);
      const secret = env.STRIPE_SECRET_KEY.trim();
      const price = env.STRIPE_PRICE_ID.trim();
      if (!billingStatus(env).checkout_available) {
        throw new AppError(503, PAYMENTS_NOT_CONFIGURED);
      }
      const body = checkoutBodySchema.parse(request.body);
      if (!isAllowedReturnUrl(body.success_url, env) || !isAllowedReturnUrl(body.cancel_url, env)) {
        throw new AppError(400, "Checkout return URL is not allowed");
      }
      await acquireOnce(redis, `prosa:once:checkout:${account.id}`, 20);

      const success = appendSessionPlaceholder(body.success_url);
      const payload = new URLSearchParams({
        mode: "subscription",
        success_url: success,
        cancel_url: body.cancel_url,
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        allow_promotion_codes: "true",
        client_reference_id: account.id,
        "metadata[prosa_user_id]": account.id,
      });
      const session = await stripeRequest<{ url?: string }>(secret, "POST", "checkout/sessions", payload);
      if (!session.url) {
        throw new AppError(502, "Payment provider did not return a checkout URL");
      }
      return { url: session.url };
    },
  );

  app.get(
    "/api/v1/billing/sessions/:id",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const account = await requireUser(pool, request);
      const params = checkoutSessionParamsSchema.parse(request.params);
      const secret = env.STRIPE_SECRET_KEY.trim();
      if (!secret) {
        throw new AppError(503, PAYMENTS_NOT_CONFIGURED);
      }
      const session = await stripeRequest<{
        status?: string;
        payment_status?: string;
        client_reference_id?: string | null;
      }>(secret, "GET", `checkout/sessions/${params.id}`);
      if (session.client_reference_id !== account.id) {
        throw new AppError(404, "Checkout session not found");
      }
      const active =
        session.status === "complete" &&
        (session.payment_status === "paid" || session.payment_status === "no_payment_required");
      if (active && /^[0-9a-f-]{36}$/i.test(account.id)) {
        await pool.query("UPDATE users SET plan = 'pro' WHERE id = $1", [account.id]);
      }
      return { active };
    },
  );
}

function appendSessionPlaceholder(successUrl: string): string {
  if (successUrl.includes("{CHECKOUT_SESSION_ID}")) {
    return successUrl;
  }
  const join = successUrl.includes("?") ? "&" : "?";
  return `${successUrl}${join}session_id={CHECKOUT_SESSION_ID}`;
}

async function stripeRequest<T>(secret: string, method: "GET" | "POST", path: string, body?: URLSearchParams): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) {
    throw new AppError(502, "Payment provider request failed");
  }
  return payload as T;
}
