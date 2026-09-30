import assert from "node:assert/strict";
import test from "node:test";
import { findPersonaScene, personaScenes } from "../src/services/persona-scenes.ts";

test("persona scenes follow the learner interests", () => {
  const berlin = personaScenes("de", ["Inteligência Artificial"]);
  assert.deepEqual(
    berlin.map((item) => item.id),
    ["de-berlin-founder"],
  );
  const madrid = personaScenes("es", ["Tecnologia", "Viagens"]);
  assert.equal(madrid.length, 3);
  assert.ok(madrid.some((item) => item.id === "es-madrid-cafe"));
  const everyday = personaScenes("en", []);
  assert.ok(everyday.every((item) => item.family === "travel"));
  assert.equal(personaScenes("pt", ["tech"]).length, 0);
  assert.equal(findPersonaScene("ru", ["Cultura"], "ru-moscow-station")?.place, "Moscou");
  assert.match(findPersonaScene("en", [], "en-london-cafe")?.hitch ?? "", /ran out/);
  assert.equal(findPersonaScene("ru", ["Tecnologia"], "ru-moscow-cafe"), null);
});
