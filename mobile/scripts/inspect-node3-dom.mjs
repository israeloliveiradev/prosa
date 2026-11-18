import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Set default session in localStorage
  await page.addInitScript(() => {
    localStorage.setItem("prosa.session.v1", JSON.stringify({
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
      }
    }));
  });

  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Inspect the DOM inside the S-curve nodes
  const nodeInfo = await page.evaluate(() => {
    const node3 = document.querySelector('button')?.closest('.relative.z-20');
    if (!node3) return { found: false };
    
    const children = Array.from(node3.querySelectorAll('*')).map(el => ({
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      text: el.innerText ? el.innerText.slice(0, 30) : ''
    }));

    // Also check if any element has rounded-full near node3
    const node3Rect = node3.getBoundingClientRect();
    const allElements = Array.from(document.querySelectorAll('*'));
    const nearby = allElements
      .filter(el => {
        const r = el.getBoundingClientRect();
        return (
          el.className &&
          typeof el.className === 'string' &&
          el.className.includes('rounded-full') &&
          Math.abs(r.x - node3Rect.x) < 200 &&
          Math.abs(r.y - node3Rect.y) < 200
        );
      })
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        rect: el.getBoundingClientRect()
      }));

    return { found: true, node3Rect, children, nearby };
  });

  console.log("NODE INFO:", JSON.stringify(nodeInfo, null, 2));

  await browser.close();
}

run();
