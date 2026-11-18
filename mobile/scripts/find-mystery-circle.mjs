import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.click('button:has-text("ENTRAR NO PROSA")');
  await page.waitForTimeout(1000);

  const node3 = page.locator("text=Lição 7").first();
  await node3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const btnBox = await page.locator('button:has-text("START!")').boundingBox();
  console.log("Button bounding box after scroll:", btnBox);

  // Check what element is 60px to the left and 40px above button center
  const targetX = btnBox.x - 30;
  const targetY = btnBox.y - 20;

  const pointInfo = await page.evaluate(({ targetX, targetY }) => {
    const list = document.elementsFromPoint(targetX, targetY);
    return list.map(el => ({
      tag: el.tagName,
      className: typeof el.className === "string" ? el.className : "",
      outerHTML: el.outerHTML.slice(0, 150),
      rect: el.getBoundingClientRect(),
      computed: {
        background: window.getComputedStyle(el).backgroundColor,
        position: window.getComputedStyle(el).position,
        transform: window.getComputedStyle(el).transform,
      }
    }));
  }, { targetX, targetY });

  console.log("Element at target point:", JSON.stringify(pointInfo, null, 2));

  await browser.close();
}

run();
