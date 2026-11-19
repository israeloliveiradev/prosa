const { chromium } = require("playwright");

async function runVerification() {
  console.log("=== INITIATING PROSA SPEECH ENGINE VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("[SpeechService]")) {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
  console.log("App loaded at http://localhost:8081");

  // Step 1: Inject spy on window.speechSynthesis.speak to ensure ZERO calls
  const spyInstalled = await page.evaluate(() => {
    window.__speechSynthesisCallCount = 0;
    if ("speechSynthesis" in window) {
      const orig = window.speechSynthesis.speak;
      window.speechSynthesis.speak = function (...args) {
        window.__speechSynthesisCallCount++;
        return orig.apply(this, args);
      };
      return true;
    }
    return false;
  }).catch(() => false);
  console.log("SpeechSynthesis spy installed:", spyInstalled);

  // Step 2: Test speechService directly in browser runtime
  const directSpeechTest = await page.evaluate(async () => {
    return new Promise(async (resolve) => {
      try {
        const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
        worker.onmessage = (e) => {
          resolve({
            ok: true,
            type: e.data.type,
            samples: e.data.audioData ? e.data.audioData.length : 0,
            samplingRate: e.data.samplingRate,
            voiceToken: e.data.voiceToken,
            duration: e.data.duration,
          });
        };
        worker.onerror = (err) => resolve({ ok: false, error: err.message });

        worker.postMessage({
          type: "SYNTHESIZE",
          id: "verify-1",
          payload: {
            text: "Albert Einstein once said: Imagination is more important than knowledge.",
            lang: "en",
            mentorId: "einstein",
            speed: 1.0,
          },
        });

        setTimeout(() => resolve({ ok: false, error: "Timed out" }), 35000);
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  });

  console.log("Direct Neural Worker Speech Test:", directSpeechTest);

  // Step 3: Test voice mapping differentiation across 5 mentors
  const mentorVoiceChecks = await page.evaluate(async () => {
    const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
    const results = {};
    const mentors = ["einstein", "feynman", "curie", "lovelace", "aurelius"];

    for (const m of mentors) {
      const res = await new Promise((resWait) => {
        const handler = (e) => {
          if (e.data.id === `mentor-${m}`) {
            worker.removeEventListener("message", handler);
            resWait(e.data.voiceToken);
          }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({
          type: "SYNTHESIZE",
          id: `mentor-${m}`,
          payload: {
            text: "Test phrase",
            lang: "en",
            mentorId: m,
            speed: 1.0,
          },
        });
      });
      results[m] = res;
    }
    return results;
  });

  console.log("Mentor Voice Token Distinct Mappings:", mentorVoiceChecks);

  // Step 4: Verify zero calls to window.speechSynthesis
  const callCount = await page.evaluate(() => {
    return window.__speechSynthesisCallCount || 0;
  });
  console.log("Robotic window.speechSynthesis.speak call count:", callCount);

  // Assertions
  const success =
    directSpeechTest.ok &&
    directSpeechTest.samples > 0 &&
    callCount === 0 &&
    mentorVoiceChecks["einstein"] !== mentorVoiceChecks["feynman"] &&
    mentorVoiceChecks["curie"] !== mentorVoiceChecks["einstein"] &&
    mentorVoiceChecks["lovelace"] !== mentorVoiceChecks["einstein"];

  console.log("ALL VERIFICATION CHECKS PASSED:", success);

  await browser.close();
  process.exit(success ? 0 : 1);
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
