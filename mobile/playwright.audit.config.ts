import { defineConfig, devices } from "@playwright/test";

/**
 * Auditoria E2E (M5): app real contra backend real e IA real. Não sobe servidor: espera
 *   - o build estático em :8081 (npm run audit:build && npm run audit:serve), porque o CORS
 *     da API só aceita :8081;
 *   - o Docker do backend no ar (API :3000, Postgres :5433, Redis, Mailpit :8025).
 * Roda em série (1 worker): a API limita requisições por IP e a IA tem cota.
 */
export default defineConfig({
  testDir: "./e2e/audit",
  outputDir: "./test-results/audit",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/audit" }], ["json", { outputFile: "test-results/audit/results.json" }]],
  use: {
    baseURL: process.env.AUDIT_APP_URL ?? "http://127.0.0.1:8081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    launchOptions: {
      // Microfone falso do Chromium (tom) e sem pedir permissão; installFakeMic troca por silêncio quando preciso.
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
    },
    permissions: ["microphone", "clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "audit-1440",
      grepInvert: /@layout-only/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "audit-390",
      grep: /@layout|@mobile/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: true },
    },
    {
      name: "audit-1024",
      grep: /@layout/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
  ],
});
