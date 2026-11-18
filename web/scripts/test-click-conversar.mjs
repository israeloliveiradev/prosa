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

  console.log("=== 1. OPENING HOME ===");
  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  console.log("Current URL:", page.url());

  // Click Conversar
  const btn = page.locator('button:has-text("Conversar em Alemão com Albert")');
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  console.log("Clicking 'Conversar em Alemão com Albert'...");
  await btn.click();
  await page.waitForTimeout(1200);

  console.log("After click URL:", page.url());

  // Check if error overlay or red box is present
  const errorOverlay = await page.locator('text="Unexpected text node"').isVisible();
  console.log("Error overlay 'Unexpected text node' visible:", errorOverlay);

  const errorModal = await page.locator('text="Console Error"').isVisible();
  console.log("Error modal 'Console Error' visible:", errorModal);

  await page.screenshot({ path: "mobile/dist-qa/verify-conversar-clean.png" });

  console.log("\nCritical errors:", errors.filter(e => !e.includes("net::ERR_CONNECTION_REFUSED")));

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
