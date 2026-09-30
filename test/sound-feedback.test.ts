import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { soundNotes } from "../src/services/sound-feedback.ts";

describe("sound feedback", () => {
  it("confirms the th that held and names the one that became t", () => {
    const notes = soundNotes("I think three", "I think tree", "en");
    const think = notes.find((note) => note.word === "think");
    const three = notes.find((note) => note.word === "three");
    assert.equal(think?.held, true);
    assert.equal(think?.sound.pt, "th");
    assert.equal(three?.held, false);
    assert.equal(three?.heard, "t");
    assert.match(three?.hint.pt ?? "", /dentes/);
  });

  it("hears an f when three comes out as free", () => {
    const notes = soundNotes("three", "free", "en");
    assert.equal(notes[0]?.held, false);
    assert.equal(notes[0]?.heard, "f");
  });

  it("names the other word when ship comes out as sheep", () => {
    const notes = soundNotes("ship", "sheep", "en");
    assert.equal(notes[0]?.held, false);
    assert.equal(notes[0]?.heard, "sheep");
  });

  it("keeps a later slip when the sentence is full of the", () => {
    const notes = soundNotes("the the the the three", "the the the the tree", "en");
    assert.equal(notes.some((note) => note.word === "three" && note.heard === "t"), true);
    assert.equal(notes.filter((note) => note.word === "the").length, 1);
  });

  it("hears the French u swap", () => {
    const notes = soundNotes("tu", "tout", "fr");
    assert.equal(notes[0]?.held, false);
    assert.equal(notes[0]?.heard, "tout");
  });

  it("stays quiet for a language outside the map", () => {
    assert.deepEqual(soundNotes("think", "sink", "ko"), []);
  });
});
