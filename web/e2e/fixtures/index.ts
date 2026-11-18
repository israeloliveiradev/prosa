import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MockApiAdapter } from "./mock-api";
import { installBrowserStubs } from "./stubs";
import { mockUsers } from "../mocks/routes.mjs";

export type PersonaType = "new" | "learner" | "pro" | "admin" | "firstDay";
export type ThemeType = "light" | "dark" | "system";

export interface FixtureOptions {
  mockApi: MockApiAdapter;
  persona: PersonaType;
  theme: ThemeType;
  signedIn: boolean;
  checkA11y: (options?: { include?: string[]; disableRules?: string[] }) => Promise<void>;
  waitForApp: () => Promise<void>;
}

export const test = base.extend<FixtureOptions>({
  persona: ["learner", { option: true }],
  theme: ["system", { option: true }],
  signedIn: [false, { option: true }],

  mockApi: [
    async ({ page, persona }, use) => {
      if (process.env.PW_SMOKE) {
        await use(null as any);
        return;
      }
      const adapter = new MockApiAdapter(page, {
        persona: persona === "new" ? "new" : persona === "admin" ? "admin" : persona === "pro" ? "pro" : "learner",
      });
      await adapter.install();
      await use(adapter);
    },
    { auto: true },
  ],

  page: async ({ page, theme, signedIn, persona }, use) => {
    // Stubs
    await installBrowserStubs(page);

    // Emulate color scheme if specified
    if (theme === "dark" || theme === "light") {
      await page.emulateMedia({ colorScheme: theme });
    }

    // Seed theme and session
    const user = persona !== "new" ? mockUsers[persona === "admin" ? "admin" : persona === "pro" ? "pro" : "learner"] : null;
    const session = signedIn && user ? JSON.stringify({ token: `mock-token-${persona}`, user }) : null;
    const journey = signedIn && user ? JSON.stringify({
      userId: user.id,
      done: persona !== "firstDay",
      step: persona === "firstDay" ? "pair" : "ready",
    }) : null;
    const guide = signedIn && user ? JSON.stringify({ seen: ["daily", "memory", "news", "practice"] }) : null;
    const themeVal = theme;

    await page.addInitScript(
      ({ session, journey, guide, themeVal }) => {
        try {
          if (session) localStorage.setItem("prosa\\prosa.session.v1", session);
          if (journey) localStorage.setItem("prosa\\prosa.journey.v1", journey);
          if (guide) localStorage.setItem("prosa\\prosa.guide.v1", guide);
          if (themeVal && themeVal !== "system") {
            localStorage.setItem("prosa\\prosa.theme.v2", themeVal);
          }
        } catch (e) {
          console.error("Init script failed", e);
        }
      },
      { session, journey, guide, themeVal }
    );

    await use(page);
  },

  checkA11y: async ({ page }, use) => {
    await use(async (options = {}) => {
      let builder = new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
      ]);
      if (options.include && options.include.length > 0) {
        builder = builder.include(options.include);
      }
      if (options.disableRules && options.disableRules.length > 0) {
        builder = builder.disableRules(options.disableRules);
      }
      const results = await builder.analyze();
      expect(results.violations).toEqual([]);
    });
  },

  waitForApp: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => (document as any).fonts?.ready);
      const appReady = page.locator('[data-testid="app-ready"]');
      if (await appReady.count() > 0) {
        await appReady.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
      }
    });
  },
});

export { expect };
