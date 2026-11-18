import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on("pageerror", (err) => {
    errors.push(`[${page.url()}] ${err.message}`);
    console.error("PAGE ERROR:", err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`[${page.url()}][console.error] ${msg.text()}`);
      console.error("CONSOLE ERROR:", msg.text());
    }
  });

  const urls = [
    "http://localhost:8081/start",
    "http://localhost:8081/account",
    "http://localhost:8081/daily",
    "http://localhost:8081/commute",
    "http://localhost:8081/duel",
    "http://localhost:8081/persona",
    "http://localhost:8081/settings",
  ];

  for (const url of urls) {
    console.log(`Checking ${url}...`);
    await page.goto(url);
    await page.waitForTimeout(1500);
  }

  // Also take a screenshot of /account
  await page.goto("http://localhost:8081/account");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-account-clean-final.png" });

  console.log("Total errors:", errors.length);
  if (errors.length > 0) {
    console.error("Errors found:", errors);
  } else {
    console.log("ALL SCREENS LOADED WITH 0 ERRORS!");
  }

  await browser.close();
}

main().catch(console.error);
