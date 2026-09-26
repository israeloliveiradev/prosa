import assert from "node:assert/strict";
import test from "node:test";
import { cognateLessonOpen } from "../src/services/cognates.ts";

test("cognateLessonOpen", () => {
  assert.equal(cognateLessonOpen("A1", 0), true);
  assert.equal(cognateLessonOpen("A1", 4), true);
  assert.equal(cognateLessonOpen("A1", 5), false);
  assert.equal(cognateLessonOpen("A2", 0), false);
});
