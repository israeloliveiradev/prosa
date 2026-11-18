import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyProfile } from "../src/services/learner-profile.js";
import {
  calculate360Status,
  getAllMilestones,
  getCefrLevel,
  logActiveTime,
  TARGET_FLUENCY_SECONDS,
} from "../src/services/fluency-360.js";

describe("360H Fluency Meter Engine", () => {
  it("calculates status correctly for fresh user profile (0 hours)", () => {
    const status = calculate360Status(0, 12600, new Date("2026-10-06T00:00:00Z"));
    assert.equal(status.totalActiveSeconds, 0);
    assert.equal(status.totalActiveHours, 0);
    assert.equal(status.remainingSeconds, TARGET_FLUENCY_SECONDS);
    assert.equal(status.remainingHours, 360);
    assert.equal(status.progressPercent, 0);
    assert.equal(status.cefrLevel, "A1 (Discovery)");
    assert.equal(status.nextMilestoneHours, 30);
    assert.deepEqual(status.unlockedMilestones, []);
    assert.equal(status.weeklyVelocityHours, 3.5);
    // 360h / 3.5h/week * 7 days = 720 days
    assert.equal(status.estimatedDaysToCompletion, 720);
  });

  it("calculates progress and milestones for intermediate profile (100 hours)", () => {
    const seconds100h = 100 * 3600;
    const status = calculate360Status(seconds100h, 18000, new Date("2026-10-06T00:00:00Z"));
    assert.equal(status.totalActiveHours, 100);
    assert.equal(status.remainingHours, 260);
    assert.equal(status.progressPercent, 27.8);
    assert.equal(status.cefrLevel, "B1 (Intermediate)");
    assert.deepEqual(status.unlockedMilestones, [30, 60, 90]);
    assert.equal(status.nextMilestoneHours, 120);
    assert.equal(status.weeklyVelocityHours, 5.0);
  });

  it("identifies CEFR bands correctly across thresholds", () => {
    assert.equal(getCefrLevel(15), "A1 (Discovery)");
    assert.equal(getCefrLevel(45), "A2 (Elementary)");
    assert.equal(getCefrLevel(120), "B1 (Intermediate)");
    assert.equal(getCefrLevel(250), "B2 (Functional Fluency)");
    assert.equal(getCefrLevel(340), "B2+ (Advanced Fluency)");
    assert.equal(getCefrLevel(365), "C1 (Fluent Autonomous)");
  });

  it("returns 12 30h milestone badges with unlock states", () => {
    const badges = getAllMilestones(75);
    assert.equal(badges.length, 12);
    assert.equal(badges[0]?.hours, 30);
    assert.equal(badges[0]?.unlocked, true);
    assert.equal(badges[1]?.hours, 60);
    assert.equal(badges[1]?.unlocked, true);
    assert.equal(badges[2]?.hours, 90);
    assert.equal(badges[2]?.unlocked, false);
  });

  it("logs active time and unlocks milestone when 30h boundary is crossed", () => {
    const profile = emptyProfile();
    // Set active seconds to 29.5 hours (106,200s)
    profile.total_active_seconds = 29.5 * 3600;

    // Add 1 hour (3,600s) -> 30.5 hours
    const { updatedProfile, status, newlyUnlockedMilestone } = logActiveTime(profile, 3600);

    assert.equal(updatedProfile.total_active_seconds, 30.5 * 3600);
    assert.equal(status.totalActiveHours, 30.5);
    assert.equal(newlyUnlockedMilestone, 30);
    assert.deepEqual(updatedProfile.milestones_30h, [30]);
  });
});
