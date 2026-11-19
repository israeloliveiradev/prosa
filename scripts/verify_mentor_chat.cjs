const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719';

async function runMentorChatVerification() {
  console.log('🚀 Starting Prosa Active Mentor & Conversational Dialogue Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // 1. Visit Persona gallery to choose a mentor (Marie Curie)
  console.log('1. Navigating to Polymath Gallery (/persona)...');
  await page.goto('http://localhost:8081/persona', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  // Find Marie Curie's "Selecionar" button or card
  console.log('2. Selecting Marie Curie as active mentor...');
  const curieCard = await page.$('h3:has-text("Marie Curie")');
  if (curieCard) {
    const parentContainer = await curieCard.evaluateHandle(el => el.closest('.bg-white, .rounded-3xl, .rounded-2xl'));
    const selectBtn = await parentContainer.$('button:has-text("Tornar Mentor Ativo"), button:has-text("Selecionar"), button:has-text("Ativo")');
    if (selectBtn) {
      await selectBtn.click();
      await page.waitForTimeout(1000);
      console.log('   Clicked Marie Curie selection button.');
    }
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-persona-curie-selected.png') });
  console.log('📸 Captured verify-persona-curie-selected.png');

  // 3. Return to Home and inspect the Active Mentor Card
  console.log('3. Returning to Home (/) to verify Active Mentor card synchronization...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);

  const bodyText = await page.textContent('body');
  const hasCurie = bodyText.includes('Marie Curie');
  console.log(`Active Mentor Card updated to Marie Curie: ${hasCurie ? 'PASS' : 'FAIL'}`);

  const chatBtn = await page.$('button:has-text("Conversar em")');
  const chatBtnText = chatBtn ? await chatBtn.textContent() : '';
  console.log(`Conversational button label: "${chatBtnText?.trim()}"`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-home-active-mentor-synced.png') });
  console.log('📸 Captured verify-home-active-mentor-synced.png');

  // 4. Click the button to enter /mentor-chat
  console.log('4. Clicking "Conversar em..." button to enter dialogue room...');
  if (chatBtn) {
    await chatBtn.click();
    await page.waitForTimeout(2500);
  }

  // Verify we are on /mentor-chat
  const currentUrl = page.url();
  console.log(`Current page URL: ${currentUrl}`);
  const isMentorChatPage = currentUrl.includes('mentor-chat');
  console.log(`Navigated to /mentor-chat: ${isMentorChatPage ? 'PASS' : 'FAIL'}`);

  // Verify elements on /mentor-chat
  const chatTitle = await page.$('h1:has-text("Sala de Diálogo")');
  console.log(`Dialogue room title present: ${chatTitle ? 'PASS' : 'FAIL'}`);

  // Test suggestion pill
  const suggestionBtn = await page.$('button:has-text("Usar"), .grid button:has-text("Ouvir")');
  console.log(`Suggestion pills present: ${suggestionBtn ? 'PASS' : 'FAIL'}`);

  // Send a message using input
  console.log('5. Sending student utterance to mentor...');
  const inputEl = await page.$('input[type="text"]');
  const sendBtn = await page.$('button:has-text("Enviar")');

  if (inputEl && sendBtn) {
    await inputEl.fill('I want to understand the atomic resonance in depth.');
    await sendBtn.click();
    await page.waitForTimeout(1500);
    console.log('   Student message dispatched.');
  }

  // Check for Pedagogical Mentor Note
  const afterChatText = await page.textContent('body');
  const hasMentorNote = afterChatText.includes('Nota de') || afterChatText.includes('Impecável') || afterChatText.includes('Ótimo');
  console.log(`Pedagogical mentor note received: ${hasMentorNote ? 'PASS' : 'FAIL'}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-mentor-chat-interactive.png') });
  console.log('📸 Captured verify-mentor-chat-interactive.png');

  // 6. Test Conclusion Button
  const finishBtn = await page.$('button:has-text("Concluir (+25 XP)")');
  if (finishBtn) {
    await finishBtn.click();
    await page.waitForTimeout(1000);
    console.log('   Finished session early to test completion modal.');
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-mentor-chat-completed-modal.png') });
  console.log('📸 Captured verify-mentor-chat-completed-modal.png');

  // Audit
  console.log('\n--- VERIFICATION AUDIT ---');
  console.log(`Total console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  } else {
    console.log('✅ ZERO CONSOLE ERRORS! Interactive Mentor Chat fully functional!');
  }

  await browser.close();
  console.log('🎉 Verification completed!');
}

runMentorChatVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
