import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const noServer = !!process.env.PW_NO_SERVER;
const isSmoke = !!process.env.PW_SMOKE;

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./test-results",
  snapshotPathTemplate: "{testDir}/../__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 7_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  reporter: CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: isSmoke ? "http://127.0.0.1:4175" : "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  webServer: noServer
    ? undefined
    : isSmoke
    ? {
        command: "npm run build:web:smoke && node e2e/helpers/serve.mjs --dist dist-smoke --port 4175 --api none",
        url: "http://127.0.0.1:4175/account",
        reuseExistingServer: !CI,
        timeout: 240_000,
      }
    : {
        command: "npm run build:web:e2e && node e2e/helpers/serve.mjs --dist dist-e2e --port 4173 --api none",
        url: "http://127.0.0.1:4173/account",
        reuseExistingServer: !CI,
        timeout: 240_000,
      },
  projects: [
    {
      name: "unit",
      testDir: "./tests/unit",
      testMatch: /.*\.test\.ts/,
      use: {},
    },
    {
      name: "mobile",
      grepInvert: /@visual|@smoke|@baseline/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "desktop",
      grepInvert: /@visual|@smoke|@baseline/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "visual-mobile",
      grep: /@visual/,
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        reducedMotion: "reduce",
      },
    },
    {
      name: "visual-desktop",
      grep: /@visual/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      },
    },
    {
      name: "smoke",
      grep: /@smoke/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4175",
      },
    },
    {
      name: "baseline",
      grep: /@baseline/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
