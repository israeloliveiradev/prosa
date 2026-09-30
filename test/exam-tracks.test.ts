import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blendForecast,
  examBand,
  examFits,
  examsFor,
  EXAMS,
  formatExamScore,
  publicMock,
  scoreMock,
  skillSeed,
  speakingScore,
  toScale,
  writingScore,
} from "../src/services/exam-tracks.ts";

describe("exam tracks", () => {
  it("lists English exams and keeps Italian empty", () => {
    const english = examsFor("en").map((exam) => exam.id);
    assert.deepEqual(english, ["toefl", "ielts"]);
    assert.deepEqual(examsFor("it"), []);
    assert.equal(examFits("toefl", "en"), true);
    assert.equal(examFits("toefl", "es"), false);
  });

  it("maps a mid profile onto the public TOEFL and IELTS scales", () => {
    assert.equal(toScale(50, EXAMS.toefl), 60);
    assert.equal(toScale(50, EXAMS.ielts), 4.5);
    assert.equal(examBand("toefl", 72), "B2");
    assert.equal(examBand("ielts", 6), "B2");
    assert.equal(examBand("jlpt", 100), "N2");
    assert.equal(formatExamScore("ielts", 6.5), "6.5");
  });

  it("hides answers on the public mock", () => {
    const mock = publicMock("toefl");
    assert.equal(mock.items.length, 4);
    assert.equal("answer" in mock.items[0], false);
    assert.ok(mock.writing.length > 20);
  });

  it("scores a perfect mock and an empty constructed response", () => {
    const perfect = scoreMock(
      "toefl",
      { "toefl-r1": 0, "toefl-r2": 0, "toefl-l1": 0, "toefl-u1": 0 },
      "I would keep Saturday open because night-shift students lose the morning. For example the union desks already fill after six. However a later weekday opening still helps the workshop.",
      "The lab moved the quiet hours. People complained because the evening slot vanished. For example the design group lost its table.",
    );
    assert.equal(perfect.sections.reading, 100);
    assert.equal(perfect.sections.listening, 100);
    assert.ok(perfect.sections.writing >= 60);
    assert.ok(perfect.raw >= 80);

    const empty = scoreMock("toefl", {}, "", "");
    assert.equal(empty.sections.writing, 0);
    assert.equal(empty.sections.speaking, 0);
  });

  it("blends a new mock into the previous forecast", () => {
    const next = blendForecast(80, 50, 100, EXAMS.toefl);
    assert.equal(next, 96);
    assert.equal(skillSeed({ reading: 80, listening: 40, writing: 0, fluency: 0 }), 60);
  });

  it("rewards a reason in the writing rubric", () => {
    assert.ok(writingScore("I disagree because the later hour cuts the morning shift.") > writingScore("I disagree."));
    assert.ok(speakingScore("I go there because the fruit is fresh.") > 20);
  });
});
