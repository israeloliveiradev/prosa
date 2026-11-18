const { chromium } = require('@playwright/test');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to /account...');
  await page.goto('http://localhost:8081/account');
  await page.waitForSelector('[data-testid="account-email"]');
  await page.fill('[data-testid="account-email"]', 'audio.e2e@prosa.app');
  await page.click('[data-testid="account-submit"]');
  
  await page.waitForTimeout(1500);
  
  const logContent = fs.readFileSync('C:\\Users\\israe\\.gemini\\antigravity\\brain\\abb40827-4f20-4b85-bbce-98673f7673e4\\.system_generated\\tasks\\task-301.log', 'utf8');
  const matches = [...logContent.matchAll(/\[PROSA VERIFY CODE\] audio\.e2e@prosa\.app -> (\d{6})/g)];
  if (!matches.length) {
    throw new Error('Verification code not found in task log');
  }
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
  
  console.log('Step 4: Waiting for placement question...');
  await page.waitForSelector('[data-testid="placement-question"]', { timeout: 15000 });
  console.log('Placement question container found!');
  
  const audioBtn = page.locator('[data-testid="placement-play-audio"]');
  const hasAudio = await audioBtn.count();
  console.log('Has audio button?', hasAudio > 0);
  if (hasAudio > 0) {
    console.log('Clicking audio button...');
    await audioBtn.click();
    await page.waitForTimeout(2000);
  }
  
  console.log('Selecting option 0...');
  await page.click('[data-testid="placement-option-0"]');
  await page.waitForTimeout(500);
  
  console.log('Submitting answer...');
  await page.click('[data-testid="placement-submit-answer"]');
  await page.waitForTimeout(2500);
  
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_placement_step2.png' });
  console.log('Screenshot captured successfully!');
  
  await browser.close();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
