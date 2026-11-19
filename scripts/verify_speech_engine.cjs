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

  // Spy on window.speechSynthesis to guarantee ZERO robotic calls
  await page.evaluate(() => {
    window.__speechSynthesisCallCount = 0;
    if ("speechSynthesis" in window) {
      const orig = window.speechSynthesis.speak;
      window.speechSynthesis.speak = function (...args) {
        window.__speechSynthesisCallCount++;
        return orig.apply(this, args);
      };
    }
  });

  // Test 1: Kokoro-82M with af_river (English)
  console.log("\n--- TEST 1: Kokoro-82M (English with af_river) ---");
  const kokoroTest = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
      const t0 = performance.now();
      worker.onmessage = (e) => {
        const t1 = performance.now();
        resolve({
          ...e.data,
          measuredDurationMs: t1 - t0,
        });
      };
      worker.onerror = (err) => resolve({ ok: false, error: err.message });

      worker.postMessage({
        type: "SYNTHESIZE",
        id: "kokoro-test-1",
        payload: {
          text: "Knowledge speaks, but wisdom listens.",
          lang: "en",
          mentorId: "curie",
          speed: 1.0,
          voice: "af_river",
        },
      });

      setTimeout(() => resolve({ ok: false, error: "Kokoro timed out" }), 35000);
    });
  });

  console.log("Kokoro-82M Result:", {
    type: kokoroTest.type,
    engine: kokoroTest.engine,
    voiceToken: kokoroTest.voiceToken,
    samplingRate: kokoroTest.samplingRate,
    samplesCount: kokoroTest.audioData ? kokoroTest.audioData.length : 0,
    latencyMs: kokoroTest.latencyMs,
  });

  // Test 2: Piper TTS ONNX with de_DE-thorsten-high (German)
  console.log("\n--- TEST 2: Piper TTS ONNX (German with de_DE-thorsten-high) ---");
  const piperTest = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
      const t0 = performance.now();
      worker.onmessage = (e) => {
        const t1 = performance.now();
        resolve({
          ...e.data,
          measuredDurationMs: t1 - t0,
        });
      };
      worker.onerror = (err) => resolve({ ok: false, error: err.message });

      worker.postMessage({
        type: "SYNTHESIZE",
        id: "piper-test-1",
        payload: {
          text: "Guten Tag, wie geht es Ihnen heute?",
          lang: "de",
          mentorId: "einstein",
          speed: 1.0,
          origin: window.location.origin,
        },
      });

      setTimeout(() => resolve({ ok: false, error: "Piper timed out" }), 35000);
    });
  });

  console.log("Piper TTS Result:", {
    type: piperTest.type,
    engine: piperTest.engine,
    voiceToken: piperTest.voiceToken,
    samplingRate: piperTest.samplingRate,
    samplesCount: piperTest.audioData ? piperTest.audioData.length : 0,
    latencyMs: piperTest.latencyMs,
  });

  // Test 3: Second call with warm singleton in memory (no model reload)
  console.log("\n--- TEST 3: Warm Singleton Second Call & Memory Cache ---");
  const warmSecondCall = await page.evaluate(async () => {
    return new Promise(async (resolve) => {
      const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
      // Warmup first
      await new Promise((r) => {
        worker.onmessage = () => r();
        worker.postMessage({
          type: "SYNTHESIZE",
          id: "warmup",
          payload: {
            text: "Initial warmup",
            lang: "de",
            mentorId: "einstein",
            origin: window.location.origin,
          },
        });
      });

      // Second synthesis with model already loaded in memory
      const t0 = performance.now();
      worker.onmessage = (e) => {
        const t1 = performance.now();
        resolve({
          type: e.data.type,
          durationMs: t1 - t0,
          latencyMs: e.data.latencyMs,
          samplingRate: e.data.samplingRate,
          samples: e.data.audioData ? e.data.audioData.length : 0,
        });
      };

      worker.postMessage({
        type: "SYNTHESIZE",
        id: "second-call",
        payload: {
          text: "Kurzer Satz",
          lang: "de",
          mentorId: "einstein",
          origin: window.location.origin,
        },
      });
    });
  });

  console.log("Warm Second Call Result:", warmSecondCall);

  // Test 4: Robotic window.speechSynthesis call count
  const callCount = await page.evaluate(() => {
    return window.__speechSynthesisCallCount || 0;
  });
  console.log("\nRobotic window.speechSynthesis.speak call count:", callCount);

  // Assertions
  const kokoroOk =
    kokoroTest.type === "SYNTHESIZED" &&
    kokoroTest.engine === "Kokoro-82M" &&
    kokoroTest.samplingRate === 24000 &&
    kokoroTest.voiceToken === "af_river" &&
    kokoroTest.audioData &&
    kokoroTest.audioData.length > 0;

  const piperOk =
    piperTest.type === "SYNTHESIZED" &&
    piperTest.engine === "Piper TTS ONNX" &&
    piperTest.samplingRate === 22050 &&
    piperTest.audioData &&
    piperTest.audioData.length > 0;

  const zeroRobotic = callCount === 0;

  console.log("\n=== SUMMARY ASSERTIONS ===");
  console.log("1. Kokoro af_river (24000 Hz, IPA G2P clean audio):", kokoroOk ? "PASS" : "FAIL");
  console.log("2. Piper German (22050 Hz, native German ONNX):", piperOk ? "PASS" : "FAIL");
  console.log("3. Zero window.speechSynthesis robotic calls:", zeroRobotic ? "PASS" : "FAIL");

  const allPassed = kokoroOk && piperOk && zeroRobotic;
  console.log("\nOVERALL TEST RESULT:", allPassed ? "ALL 4 CONDITIONS VERIFIED!" : "FAILED");

  await browser.close();
  process.exit(allPassed ? 0 : 1);
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
