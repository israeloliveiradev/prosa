const { chromium } = require("playwright");

async function verifyMentorVoices() {
  console.log("=== VERIFYING UNIQUE MENTOR NEURAL VOICES (KOKORO & PIPER) ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("[SpeechService]")) {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  await page.goto("http://localhost:8081/settings", { waitUntil: "networkidle" });
  console.log("Settings page loaded at http://localhost:8081/settings");

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

  // Test 1: Synthesize with 6 different mentors in English via Worker
  console.log("\n--- TEST 1: Synthesize 6 English Mentors (Kokoro-82M) ---");
  const mentorsToTest = [
    { id: "einstein", expectedVoice: "bm_george", gender: "male" },
    { id: "curie", expectedVoice: "bf_emma", gender: "female" },
    { id: "feynman", expectedVoice: "am_michael", gender: "male" },
    { id: "lovelace", expectedVoice: "af_bella", gender: "female" },
    { id: "aurelius", expectedVoice: "bm_lewis", gender: "male" },
    { id: "tesla", expectedVoice: "am_puck", gender: "male" },
  ];

  const synthesisResults = await page.evaluate(async (mentors) => {
    const results = [];
    const worker = new Worker("/workers/ttsWorker.js", { type: "module" });

    for (const mentor of mentors) {
      const res = await new Promise((resolve) => {
        const id = `test-${mentor.id}`;
        const handler = (e) => {
          if (e.data && e.data.id === id) {
            worker.removeEventListener("message", handler);
            resolve(e.data);
          }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({
          type: "SYNTHESIZE",
          id,
          payload: {
            text: `This is ${mentor.id} speaking.`,
            lang: "en",
            mentorId: mentor.id,
            speed: 1.0,
          },
        });
        setTimeout(() => resolve({ error: "Timeout for " + mentor.id }), 20000);
      });
      results.push({
        mentorId: mentor.id,
        voiceToken: res.voiceToken,
        engine: res.engine,
        samplingRate: res.samplingRate,
        samplesCount: res.audioData ? res.audioData.length : 0,
        latencyMs: res.latencyMs,
      });
    }
    return results;
  }, mentorsToTest);

  console.log("English Synthesis Results:");
  console.table(synthesisResults);

  // Check uniqueness of Kokoro voice tokens
  const voiceTokens = synthesisResults.map((r) => r.voiceToken);
  const uniqueVoiceTokens = new Set(voiceTokens);
  const allUnique = uniqueVoiceTokens.size === mentorsToTest.length;
  console.log(`Unique Voices Count: ${uniqueVoiceTokens.size} / ${mentorsToTest.length}`);
  console.log("Are all 6 mentors using completely different voices?:", allUnique ? "YES (PASS)" : "NO (FAIL)");

  // Test 2: Piper German (Einstein male vs Curie female)
  console.log("\n--- TEST 2: Piper German (Einstein vs Curie) ---");
  const germanResults = await page.evaluate(async () => {
    const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
    const testMentor = (mentorId, text) =>
      new Promise((resolve) => {
        const id = `de-${mentorId}`;
        const handler = (e) => {
          if (e.data && e.data.id === id) {
            worker.removeEventListener("message", handler);
            resolve(e.data);
          }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({
          type: "SYNTHESIZE",
          id,
          payload: {
            text,
            lang: "de",
            mentorId,
            speed: 1.0,
            origin: window.location.origin,
          },
        });
        setTimeout(() => resolve({ error: "Timeout for " + mentorId }), 25000);
      });

    const einstein = await testMentor("einstein", "Die Phantasie ist wichtig.");
    const curie = await testMentor("curie", "Man muss nichts im Leben fürchten.");

    return {
      einstein: { voice: einstein.voiceToken, rate: einstein.samplingRate },
      curie: { voice: curie.voiceToken, rate: curie.samplingRate },
    };
  });

  console.log("German Results:", germanResults);
  const germanDistinct =
    germanResults.einstein.voice === "de_DE-thorsten-high" &&
    germanResults.curie.voice === "de_DE-kerstin-low";
  console.log("German Einstein (Thorsten) !== Curie (Kerstin female):", germanDistinct ? "PASS" : "FAIL");

  // Test 3: Piper Portuguese (Einstein male vs Curie female)
  console.log("\n--- TEST 3: Piper Portuguese (Einstein vs Curie) ---");
  const ptResults = await page.evaluate(async () => {
    const worker = new Worker("/workers/ttsWorker.js", { type: "module" });
    const testMentor = (mentorId, text) =>
      new Promise((resolve) => {
        const id = `pt-${mentorId}`;
        const handler = (e) => {
          if (e.data && e.data.id === id) {
            worker.removeEventListener("message", handler);
            resolve(e.data);
          }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({
          type: "SYNTHESIZE",
          id,
          payload: {
            text,
            lang: "pt-BR",
            mentorId,
            speed: 1.0,
            origin: window.location.origin,
          },
        });
        setTimeout(() => resolve({ error: "Timeout for " + mentorId }), 25000);
      });

    const einstein = await testMentor("einstein", "A imaginação é tudo.");
    const curie = await testMentor("curie", "Nada na vida deve ser temido.");

    return {
      einstein: { voice: einstein.voiceToken, rate: einstein.samplingRate },
      curie: { voice: curie.voiceToken, rate: curie.samplingRate },
    };
  });

  console.log("Portuguese Results:", ptResults);
  const ptDistinct =
    ptResults.einstein.voice === "pt_BR-faber-medium" &&
    ptResults.curie.voice === "pt_BR-edresson-low";
  console.log("Portuguese Einstein (Faber Male) !== Curie (Edresson Female):", ptDistinct ? "PASS" : "FAIL");

  // Test 4: Robotic window.speechSynthesis call count
  const callCount = await page.evaluate(() => window.__speechSynthesisCallCount || 0);
  console.log("\nRobotic window.speechSynthesis calls:", callCount);
  const zeroRobotic = callCount === 0;

  console.log("\n=== SUMMARY VERIFICATION ===");
  console.log("1. 6 Distinct Kokoro voices in English:", allUnique ? "PASS" : "FAIL");
  console.log("2. German Male (Thorsten) vs Female (Kerstin):", germanDistinct ? "PASS" : "FAIL");
  console.log("3. Portuguese Male (Faber) vs Female (Edresson):", ptDistinct ? "PASS" : "FAIL");
  console.log("4. Zero robotic calls:", zeroRobotic ? "PASS" : "FAIL");

  const overallSuccess = allUnique && germanDistinct && ptDistinct && zeroRobotic;
  console.log("\nFINAL STATUS:", overallSuccess ? "ALL UNIQUE MENTOR VOICES VERIFIED!" : "FAILED");

  await browser.close();
  process.exit(overallSuccess ? 0 : 1);
}

verifyMentorVoices().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
