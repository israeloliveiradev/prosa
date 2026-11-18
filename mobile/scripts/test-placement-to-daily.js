const { chromium } = require('@playwright/test');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to /account...');
  await page.goto('http://localhost:8081/account');
  await page.waitForSelector('[data-testid="account-email"]');
  await page.fill('[data-testid="account-email"]', 'fullflow@prosa.app');
  await page.click('[data-testid="account-submit"]');
  
  await page.waitForTimeout(1500);
  
  const logContent = fs.readFileSync('C:\\Users\\israe\\.gemini\\antigravity\\brain\\abb40827-4f20-4b85-bbce-98673f7673e4\\.system_generated\\tasks\\task-301.log', 'utf8');
  const matches = [...logContent.matchAll(/\[PROSA VERIFY CODE\] fullflow@prosa\.app -> (\d{6})/g)];
  const code = matches[matches.length - 1][1];
  console.log('Got OTP code:', code);
  
  const otpInput = page.locator('[data-testid="account-otp-input"]');
  await otpInput.waitFor({ state: 'attached' });
  await otpInput.fill(code);
  await page.click('[data-testid="account-submit"]');
  
  console.log('Waiting for /start...');
  await page.waitForURL('**/start', { timeout: 10000 });
  
  console.log('Step 1: Welcome...');
  await page.click('[data-testid="onboarding-begin"]');
  await page.waitForTimeout(800);
  
  console.log('Step 2: Language pair...');
  await page.click('[data-testid="onboarding-pair-next"]');
  await page.waitForTimeout(800);
  
  console.log('Step 3: Interests...');
  await page.click('[data-testid="theme-Filosofia"]');
  await page.click('[data-testid="onboarding-interest-submit"]');
  
  console.log('Step 4: Answering placement questions...');
  let maxQuestions = 15;
  while (maxQuestions-- > 0) {
    try {
      await page.waitForSelector('[data-testid="placement-question"]', { timeout: 4000 });
    } catch {
      console.log('No more questions found or phase transitioned!');
      break;
    }
    
    // Pick first option
    await page.click('[data-testid="placement-option-0"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="placement-submit-answer"]');
    await page.waitForTimeout(1500);
  }
  
  console.log('Waiting for placement result or ready step...');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_placement_result.png' });
  console.log('Placement result screenshot captured!');
  
  // Look for result button or ready button
  const doneBtn = page.locator('[data-testid="placement-done"]');
  if (await doneBtn.count() > 0) {
    console.log('Clicking placement-done...');
    await doneBtn.click();
    await page.waitForTimeout(2000);
  }
  
  const readyBtn = page.locator('[data-testid="onboarding-ready-finish"]');
  if (await readyBtn.count() > 0) {
    console.log('Clicking onboarding-ready-finish...');
    await readyBtn.click();
    await page.waitForTimeout(3000);
  }
  
  console.log('Final URL:', page.url());
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_placement_final_landing.png' });
  console.log('Final screenshot captured!');
  
  await browser.close();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

