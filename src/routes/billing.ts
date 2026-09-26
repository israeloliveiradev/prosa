import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Env } from "../config.js";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { checkoutBodySchema, checkoutSessionParamsSchema } from "../schemas/billing.js";

export function registerBillingRoutes(app: FastifyInstance, env: Env, pool: Pool): void {
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
      const body = checkoutBodySchema.parse(request.body);
      const account = await requireUser(pool, request);
      const secret = env.STRIPE_SECRET_KEY;
      const price = env.STRIPE_PRICE_ID;
      if (!secret || !price) {
        throw new AppError(503, "Stripe is not configured");
      }

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
        throw new AppError(502, "Stripe did not return a checkout URL");
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
      const params = checkoutSessionParamsSchema.parse(request.params);
      const secret = env.STRIPE_SECRET_KEY;
      if (!secret) {
        throw new AppError(503, "Stripe is not configured");
      }
      const session = await stripeRequest<{
        status?: string;
        payment_status?: string;
        client_reference_id?: string | null;
      }>(secret, "GET", `checkout/sessions/${params.id}`);
      const active =
        session.status === "complete" &&
        (session.payment_status === "paid" || session.payment_status === "no_payment_required");
      if (active && session.client_reference_id && /^[0-9a-f-]{36}$/i.test(session.client_reference_id)) {
        await pool.query("UPDATE users SET plan = 'pro' WHERE id = $1", [session.client_reference_id]);
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
    throw new AppError(502, payload?.error?.message ?? "Stripe request failed");
  }
  return payload as T;
}
