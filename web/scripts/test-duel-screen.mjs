import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  // Inject session directly
  await page.addInitScript(() => {
    localStorage.setItem(
      "prosa.session.v1",
      JSON.stringify({
        token: "prosa_demo_token",
        user: {
          id: "gabriel_santos_prosa",
          email: "gabriel.santos@prosa.app",
          display_name: "Gabriel Santos",
          display_locale: "pt",
          plan: "pro",
          target_lang: "de",
          native_lang: "pt",
          level: "B2",
          mind_reading: "da_vinci",
          mind_memory: "feynman",
          mind_speech: "curie",
          mind_journal: "einstein",
        },
      })
    );
  });

  console.log("=== 1. NAVIGATING TO /duel ===");
  await page.goto("http://localhost:8081/duel", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  console.log("Current URL:", page.url());

  const syntaxError = await page.locator('text="SyntaxError"').isVisible();
  console.log("SyntaxError visible:", syntaxError);

  const serverError = await page.locator('text="Server Error"').isVisible();
  console.log("Server Error visible:", serverError);

  const duelHeading = await page.locator('text="Duelo Relâmpago 120s"').first().isVisible();
  console.log("Duel Heading visible:", duelHeading);

  await page.screenshot({ path: "mobile/dist-qa/verify-duel-clean.png" });

  console.log("Console errors:", errors.filter(e => !e.includes("net::ERR_CONNECTION_REFUSED")));

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
