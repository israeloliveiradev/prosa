import type { BillingStatus } from "@/api/account-extras";

export type PaywallView = "loading" | "pro" | "error" | "unavailable" | "available";

/**
 * Estado honesto da assinatura: Pro só vale quando a conta diz que é Pro;
 * sem pagamentos configurados no servidor, não há botão de assinar.
 */
export function paywallView(input: { plan: "free" | "pro"; status: BillingStatus | undefined; failed: boolean }): PaywallView {
  if (input.plan === "pro") {
    return "pro";
  }
  if (input.failed) {
    return "error";
  }
  if (!input.status) {
    return "loading";
  }
  return input.status.checkoutAvailable ? "available" : "unavailable";
}
