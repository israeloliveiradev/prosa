import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAdaptiveCognitiveLoad,
  buildInterleavingSession,
  evaluateCognitiveFatigue,
  getSessionDurationSeconds,
} from "../src/services/interleaving-engine.js";

describe("Interleaving Engine Anti-Fadiga", () => {
  it("computes duration seconds accurately per mode", () => {
    assert.equal(getSessionDurationSeconds("lite_20"), 1200);
    assert.equal(getSessionDurationSeconds("pro_40"), 2400);
    assert.equal(getSessionDurationSeconds("sprint_60"), 3600);
  });

  it("allocates interleaved blocks correctly for 20m Lite mode", () => {
    const plan = buildInterleavingSession("lite_20", 3);
    assert.equal(plan.mode, "lite_20");
    assert.equal(plan.totalSeconds, 1200);
    assert.equal(plan.blocks.length, 5);
    // Verify block continuity
    let currentStart = 0;
    for (const block of plan.blocks) {
      assert.equal(block.startSeconds, currentStart);
      currentStart += block.durationSeconds;
    }
    assert.equal(currentStart, 1200);
  });

  it("allocates interleaved blocks correctly for 60m Polyglot Sprint mode", () => {
    const plan = buildInterleavingSession("sprint_60", 10);
    assert.equal(plan.mode, "sprint_60");
    assert.equal(plan.totalSeconds, 3600);
    assert.equal(plan.blocks.length, 6);
    // Check block kinds presence
    const kinds = plan.blocks.map((b) => b.kind);
    assert.ok(kinds.includes("speed_drills"));
    assert.ok(kinds.includes("micro_immersion"));
    assert.ok(kinds.includes("reverse_writing"));
    assert.ok(kinds.includes("shadowing_studio"));
    assert.ok(kinds.includes("cultural_roleplay"));
  });

  it("detects cognitive fatigue when response latency and error rates spike", () => {
    const freshState = evaluateCognitiveFatigue({
      avgResponseMs: 1500,
      baselineMs: 1400,
      recentErrorRate: 0.1,
      sessionElapsedSeconds: 600,
    });
    assert.equal(freshState.fatigueDetected, false);
    assert.equal(freshState.suggestedAction, "continue_active");

    const fatiguedState = evaluateCognitiveFatigue({
      avgResponseMs: 3500, // > 2x baseline
      baselineMs: 1400,
      recentErrorRate: 0.45, // > 35% error rate
      sessionElapsedSeconds: 1200,
    });
    assert.equal(fatiguedState.fatigueDetected, true);
    assert.equal(fatiguedState.suggestedAction, "switch_to_passive_audio");
  });

  it("applies adaptive cognitive load fallback to convert high intensity blocks to passive audio", () => {
    const initialPlan = buildInterleavingSession("pro_40", 5);
    const adaptedPlan = applyAdaptiveCognitiveLoad(initialPlan);

    assert.equal(adaptedPlan.adaptiveAudioActive, true);
    const writingBlock = adaptedPlan.blocks.find((b) => b.kind === "reverse_writing");
    assert.equal(writingBlock?.passiveAudioMode, true);
    assert.ok(writingBlock?.title.includes("Modo Áudio Suave"));
  });
});
