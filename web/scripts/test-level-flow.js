const { chromium } = require('@playwright/test');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('1. Navigating to /account...');
  await page.goto('http://localhost:8081/account');
  await page.waitForSelector('[data-testid="account-email"]');
  await page.fill('[data-testid="account-email"]', 'level.flow@prosa.app');
  await page.click('[data-testid="account-submit"]');
  await page.waitForTimeout(1500);
  
  const logContent = fs.readFileSync('C:\\Users\\israe\\.gemini\\antigravity\\brain\\abb40827-4f20-4b85-bbce-98673f7673e4\\.system_generated\\tasks\\task-1300.log', 'utf8');
  const matches = [...logContent.matchAll(/\[PROSA VERIFY CODE\] level\.flow@prosa\.app -> (\d{6})/g)];
  const code = matches[matches.length - 1][1];
  console.log('Got OTP code:', code);
  
  const otpInput = page.locator('[data-testid="account-otp-input"]');
  await otpInput.waitFor({ state: 'attached' });
  await otpInput.fill(code);
  await page.click('[data-testid="account-submit"]');
  
  console.log('2. Waiting for /start...');
  await page.waitForURL('**/start', { timeout: 10000 });
  
  // Step 1: Welcome
  await page.click('[data-testid="onboarding-begin"]');
  await page.waitForTimeout(800);
  
  // Step 2: Test Back button!
  console.log('3. On Step 2 (Pair). Testing back button...');
  const backBtn = page.locator('[data-testid="focus-shell-back"]');
  console.log('Back button count on Step 2:', await backBtn.count());
  await backBtn.click();
  await page.waitForTimeout(800);
  console.log('Went back to Step 1 (Welcome). Clicking begin again...');
  await page.click('[data-testid="onboarding-begin"]');
  await page.waitForTimeout(800);
  
  // Advance to Step 3 (Interests)
  await page.click('[data-testid="onboarding-pair-next"]');
  await page.waitForTimeout(800);
  
  console.log('4. On Step 3 (Interests). Picking theme and submitting...');
  await page.click('[data-testid="theme-Filosofia"]');
  await page.click('[data-testid="onboarding-interest-submit"]');
  
  console.log('5. Waiting for LevelChoice screen...');
  await page.waitForSelector('[data-testid="onboarding-level-choice"]', { timeout: 15000 });
  console.log('LevelChoice screen visible!');
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_level_choice.png' });
  
  // Test Option: "Fazer teste de nivelamento"
  console.log('6. Clicking Iniciar teste...');
  await page.click('[data-testid="level-choice-start-test"]');
  await page.waitForTimeout(1000);
  
  await page.waitForSelector('[data-testid="placement-question"]', { timeout: 10000 });
  console.log('Placement question is visible!');
  
  // Check speaker button
  const audioBtn = page.locator('[data-testid="placement-play-audio"]');
  if (await audioBtn.count() > 0) {
    console.log('Clicking audio button...');
    await audioBtn.click();
    await page.waitForTimeout(2000);
  }
  
  // Verify it did NOT jump to ready!
  const isStillOnQuestion = await page.locator('[data-testid="placement-question"]').count();
  console.log('Is still on placement question after clicking audio?', isStillOnQuestion > 0);
  
  // Test back button inside placement test to return to LevelChoice!
  console.log('7. Testing back button from test to level choice...');
  await page.click('[data-testid="focus-shell-back"]');
  await page.waitForTimeout(800);
  await page.waitForSelector('[data-testid="onboarding-level-choice"]');
  console.log('Returned to LevelChoice successfully!');
  
  // Test Option: "Já sei meu nível de proficiência"
  console.log('8. Selecting manual level...');
  await page.click('[data-testid="level-choice-pick-level"]');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_level_picker_grid.png' });
  
  // Pick B1
  await page.click('[data-testid="level-option-B1"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="level-choice-confirm"]');
  
  console.log('9. Waiting for Step 5 (ReadyStep)...');
  await page.waitForSelector('[data-testid="onboarding-ready"]', { timeout: 10000 });
  console.log('Ready step reached!');
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/abb40827-4f20-4b85-bbce-98673f7673e4/screenshot_level_ready_step.png' });
  
  await browser.close();
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
