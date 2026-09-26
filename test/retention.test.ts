import assert from "node:assert/strict";
import test from "node:test";
import { retentionBand as clientBand, retentionSnapshot as clientSnapshot } from "../mobile/src/lib/retention.ts";
import { retentionBand, retentionSnapshot, type RetentionInput } from "../src/services/retention.ts";

const deck: RetentionInput[] = [
  { phrase: "nova", intervalDays: 0, status: "learning" },
  { phrase: "falhou", intervalDays: 1, status: "learning" },
  { phrase: "curta", intervalDays: 3, status: "reviewing" },
  { phrase: "meio", intervalDays: 10, status: "reviewing" },
  { phrase: "longa", intervalDays: 22, status: "mastered" },
  { phrase: "atrasada", intervalDays: 40, status: "mastered", due: true },
];

test("retention bands follow the forgetting curve", () => {
  assert.equal(retentionBand(deck[0]!), "critical");
  assert.equal(retentionBand(deck[1]!), "critical");
  assert.equal(retentionBand(deck[2]!), "decaying");
  assert.equal(retentionBand(deck[3]!), "settling");
  assert.equal(retentionBand(deck[4]!), "fixed");
  assert.equal(retentionBand(deck[5]!), "critical");
  assert.deepEqual(clientSnapshot(deck), retentionSnapshot(deck));
  assert.equal(clientBand(deck[4]!), retentionBand(deck[4]!));
});

test("retention cells group four phrases and score long-term memory", () => {
  const snapshot = retentionSnapshot(deck);
  assert.equal(snapshot.critical, 3);
  assert.equal(snapshot.decaying, 1);
  assert.equal(snapshot.mastered, 1);
  assert.equal(snapshot.score, 17);
  assert.deepEqual(
    snapshot.cells.map((cell) => cell.band),
    ["critical", "decaying", "settling", "fixed"],
  );
  assert.equal(snapshot.cells[0]?.phrases.length, 3);
  const many = retentionSnapshot(
    Array.from({ length: 5 }, (_, index) => ({
      phrase: `w${index}`,
      intervalDays: 2,
      status: "reviewing" as const,
    })),
  );
  assert.deepEqual(
    many.cells.map((cell) => cell.phrases.length),
    [4, 1],
  );
  assert.equal(retentionSnapshot([]).score, 100);
});
