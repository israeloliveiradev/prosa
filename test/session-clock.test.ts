import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countDue, listenChecks, phaseAt, sessionPhases, SESSION_SECONDS } from "../mobile/src/lib/session-clock.ts";

function ends(phases: Array<{ start: number }>): number {
  return phases.reduce((last, phase, index) => {
    const next = phases[index + 1]?.start ?? SESSION_SECONDS;
    return next;
  }, 0);
}

describe("session clock", () => {
  it("keeps the published twenty minutes when a few cards are due", () => {
    const phases = sessionPhases({ dueCount: 3 });
    assert.deepEqual(
      phases.map((phase) => phase.start),
      [0, 180, 300, 600, 840, 1140],
    );
    assert.equal(phases.at(-1)?.start, 1140);
    assert.equal(ends(phases), SESSION_SECONDS);
    assert.equal(phaseAt(0, phases), "review");
    assert.equal(phaseAt(180, phases), "listen");
    assert.equal(phaseAt(300, phases), "reading");
    assert.equal(phaseAt(1140, phases), "note");
    assert.equal(phaseAt(SESSION_SECONDS, phases), "note");
  });

  it("shrinks review when nothing is due and gives the time to reading", () => {
    const phases = sessionPhases({ dueCount: 0 });
    assert.equal(phases[0]?.start, 0);
    assert.equal(phases[1]?.start, 90);
    assert.equal(phases.at(-1)?.start, 1140);
    assert.equal(ends(phases), SESSION_SECONDS);
  });

  it("grows review with the due queue up to half the session", () => {
    const phases = sessionPhases({ dueCount: 20 });
    assert.equal(phases[1]?.start, 600);
    assert.equal(phases.at(-1)?.start, 1140);
    assert.equal(ends(phases), SESSION_SECONDS);
  });

  it("gives listening one extra minute when hearing is still weak", () => {
    const phases = sessionPhases({ dueCount: 3, slowStart: true });
    assert.equal(phases.find((phase) => phase.id === "listen")?.start, 180);
    assert.equal(phases.find((phase) => phase.id === "reading")?.start, 360);
    assert.equal(phases.at(-1)?.start, 1140);
  });

  it("gives listening two extra minutes when it trails reading by twenty points", () => {
    const phases = sessionPhases({ dueCount: 3, listeningGap: 25 });
    assert.equal(phases.find((phase) => phase.id === "listen")?.start, 180);
    assert.equal(phases.find((phase) => phase.id === "reading")?.start, 420);
    assert.equal(phases.at(-1)?.start, 1140);
    assert.equal(ends(phases), SESSION_SECONDS);
  });

  it("counts only cards that are already due", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    assert.equal(
      countDue(
        [{ due: "2026-09-29T11:00:00Z" }, { due: "2026-09-30T11:00:00Z" }, {}],
        now,
      ),
      1,
    );
  });

  it("builds two listen-and-select checks without showing the spoken line as text", () => {
    const checks = listenChecks("She sat down. The coffee was cold.", "Ela sentou. O café estava frio.");
    assert.equal(checks.length, 2);
    assert.equal(checks[0]?.options.includes("Ela sentou."), true);
    assert.equal(checks[0]?.options[checks[0].answer], "Ela sentou.");
    assert.equal(checks[0]?.audio.includes("She sat"), true);
  });
});
