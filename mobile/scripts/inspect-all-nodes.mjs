import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // First go to /account and click Entrar no Prosa or seed localStorage
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.click('button:has-text("ENTRAR NO PROSA")');
  await page.waitForTimeout(1000);
  console.log("Current URL after login:", page.url());

  // Now we are at /
  const node3Button = page.locator('button:has-text("START!")');
  const btnBox = await node3Button.boundingBox();
  console.log("Button BoundingBox:", btnBox);

  // Find all elements whose center is within 150px of button center
  const elementsNear = await page.evaluate((btnBox) => {
    const cx = btnBox.x + btnBox.width / 2;
    const cy = btnBox.y + btnBox.height / 2;
    const elements = Array.from(document.querySelectorAll('*'));
    return elements
      .map(el => {
        const r = el.getBoundingClientRect();
        const elCx = r.x + r.width / 2;
        const elCy = r.y + r.height / 2;
        const dist = Math.hypot(elCx - cx, elCy - cy);
        return {
          tag: el.tagName,
          id: el.id,
          className: el.className,
          computedStyle: {
            background: window.getComputedStyle(el).backgroundColor,
            position: window.getComputedStyle(el).position,
            borderRadius: window.getComputedStyle(el).borderRadius,
            transform: window.getComputedStyle(el).transform,
          },
          box: { x: r.x, y: r.y, width: r.width, height: r.height },
          dist
        };
      })
      .filter(item => item.dist < 120 && item.box.width > 20 && item.box.height > 20)
      .sort((a, b) => a.dist - b.dist);
  }, btnBox);

  console.log("Elements near button center:\n", JSON.stringify(elementsNear, null, 2));

  await browser.close();
}

run();
