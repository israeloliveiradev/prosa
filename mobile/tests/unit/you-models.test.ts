import { test, expect } from "@playwright/test";
import { parseBillingStatus } from "@/api/account-extras";
import { paywallView } from "@/features/shell/model/paywall-model";
import { summarizeCanDo } from "@/features/shell/model/profile-stats";
import { displayStreak } from "@/features/shell/model/streak-model";

test("streak: server value wins and is marked as server", () => {
  expect(displayStreak({ streak_count: 3, last_session_date: "2026-11-19" }, 0, "2026-11-20")).toEqual({ count: 3, source: "server" });
  expect(displayStreak({ streak_count: 3, last_session_date: "2026-11-20" }, 9, "2026-11-20")).toEqual({ count: 3, source: "server" });
});

test("streak: stale server value (last session before yesterday) shows 0", () => {
  expect(displayStreak({ streak_count: 5, last_session_date: "2026-11-10" }, 0, "2026-11-20")).toEqual({ count: 0, source: "server" });
  expect(displayStreak({ streak_count: 5, last_session_date: "2026-12-01" }, 0, "2026-12-02")).toEqual({ count: 5, source: "server" });
  expect(displayStreak({ streak_count: 4, last_session_date: "2026-02-28" }, 0, "2026-03-01")).toEqual({ count: 4, source: "server" });
});

test("streak: without a server value the device value is used and labeled device", () => {
  expect(displayStreak({}, 2, "2026-11-20")).toEqual({ count: 2, source: "device" });
  expect(displayStreak(null, 0, "2026-11-20")).toEqual({ count: 0, source: "device" });
  expect(displayStreak({ streak_count: undefined }, -4, "2026-11-20")).toEqual({ count: 0, source: "device" });
});

test("profile stats count mastered and validated units and expose the current can_do", () => {
  const units = [
    { id: "a1-01", status: "validated" as const, title: "One", can_do: ["I greet"] },
    { id: "a1-02", status: "mastered" as const, title: "Two", can_do: [] },
    { id: "a1-03", status: "active" as const, title: "Three", can_do: ["I order", "  "] },
    { id: "a1-04", status: "locked" as const, title: "Four", can_do: [] },
  ];
  const summary = summarizeCanDo(units, "a1-03");
  expect(summary.done).toBe(2);
  expect(summary.total).toBe(4);
  expect(summary.current).toEqual({ id: "a1-03", title: "Three", goals: ["I order"] });
  expect(summarizeCanDo(units, null).current).toBeNull();
  expect(summarizeCanDo([], "x")).toEqual({ done: 0, total: 0, current: null });
});

test("billing status parsing accepts the new and the old server shape", () => {
  expect(parseBillingStatus({ checkout_available: true, reason: null })).toEqual({ checkoutAvailable: true, reason: null });
  expect(parseBillingStatus({ checkout_available: false, reason: "not_configured" })).toEqual({ checkoutAvailable: false, reason: "not_configured" });
  expect(parseBillingStatus({ configured: true }).checkoutAvailable).toBe(true);
  expect(parseBillingStatus({ configured: false }).checkoutAvailable).toBe(false);
  expect(parseBillingStatus(null).checkoutAvailable).toBe(false);
});

test("paywall never shows checkout without server support and never invents Pro", () => {
  const off = { checkoutAvailable: false, reason: "not_configured" as const };
  const on = { checkoutAvailable: true, reason: null };
  expect(paywallView({ plan: "free", status: undefined, failed: false })).toBe("loading");
  expect(paywallView({ plan: "free", status: undefined, failed: true })).toBe("error");
  expect(paywallView({ plan: "free", status: off, failed: false })).toBe("unavailable");
  expect(paywallView({ plan: "free", status: on, failed: false })).toBe("available");
  expect(paywallView({ plan: "pro", status: off, failed: false })).toBe("pro");
});
