import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { practiceFocus } from "../src/services/dossier.ts";

describe("tutor dossier focus", () => {
  it("forces listening when hearing or the gap asks for it", () => {
    assert.equal(practiceFocus({ force: "listen", gap: 20, weak: "grammar" }, ["article"], ["th"]), "listening");
  });

  it("forces reading when reading sits far below", () => {
    assert.equal(practiceFocus({ force: "reading", gap: -20, weak: "listening" }, ["article"], []), "reading");
  });

  it("uses a recurring error before a weak sound", () => {
    assert.equal(practiceFocus({ force: "none", gap: 0, weak: "grammar" }, ["article"], ["th"]), "article");
  });

  it("falls back to the weak skill", () => {
    assert.equal(practiceFocus({ force: "none", gap: 0, weak: "grammar" }, [], []), "grammar");
  });
});
