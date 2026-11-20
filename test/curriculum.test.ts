import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { CURRICULUM_LANGS, type LanguageCurriculum, type Syllabus } from "../src/curriculum/types.ts";
import { UNIT_IDS, UNITS } from "../src/curriculum/units.ts";
import { validateLanguage, validateSyllabus } from "../src/curriculum/validate.ts";

/** Carrega um arquivo do currículo sozinho, para que um arquivo ausente falhe com nome e motivo. */
async function loadDefault(file: string): Promise<unknown> {
  const path = resolve(process.cwd(), "src/curriculum", `${file}.ts`);
  try {
    const mod = (await import(pathToFileURL(path).href)) as { default?: unknown };
    return mod.default ?? null;
  } catch (error) {
    assert.fail(`src/curriculum/${file}.ts could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
  }
}

test("curriculum skeleton", async (t) => {
  await t.test("has 32 units with stable, unique ids and orders 1..32", () => {
    assert.equal(UNITS.length, 32);
    assert.equal(new Set(UNIT_IDS).size, 32);
    assert.deepEqual(
      [...UNITS].map((unit) => unit.order).sort((a, b) => a - b),
      Array.from({ length: 32 }, (_, index) => index + 1),
    );
    const perBand = Object.fromEntries(
      ["A1", "A2", "B1", "B2", "C1"].map((band) => [band, UNITS.filter((unit) => unit.band === band).length]),
    );
    assert.deepEqual(perBand, { A1: 8, A2: 8, B1: 8, B2: 5, C1: 3 });
  });
});

test("curriculum files", async (t) => {
  for (const lang of CURRICULUM_LANGS) {
    await t.test(`src/curriculum/${lang}.ts exists and passes validate.ts`, async () => {
      const value = await loadDefault(lang);
      assert.ok(value, `src/curriculum/${lang}.ts has no "export default" (LanguageCurriculum)`);
      const problems = validateLanguage(lang, value as LanguageCurriculum);
      assert.deepEqual(problems, [], `${lang}: ${problems.length} problem(s)\n  - ${problems.slice(0, 30).join("\n  - ")}`);
    });
  }

  await t.test("src/curriculum/syllabus.ts exists and passes validate.ts", async () => {
    const value = await loadDefault("syllabus");
    assert.ok(value, 'src/curriculum/syllabus.ts has no "export default" (Syllabus)');
    const problems = validateSyllabus(value as Syllabus);
    assert.deepEqual(problems, [], `syllabus: ${problems.length} problem(s)\n  - ${problems.slice(0, 30).join("\n  - ")}`);
  });

  await t.test("the registry wires every file (7 languages + syllabus)", async () => {
    const { CURRICULUM, CURRICULUM_FILES, languageUnitOf, syllabusEntryOf } = await import("../src/curriculum/index.ts");
    assert.equal(CURRICULUM_FILES.length, 8);
    assert.deepEqual(Object.keys(CURRICULUM.languages).sort(), [...CURRICULUM_LANGS].sort());
    for (const lang of CURRICULUM_LANGS) {
      for (const id of UNIT_IDS) {
        assert.ok(languageUnitOf(CURRICULUM, lang, id), `${lang}/${id} reachable through the registry`);
      }
    }
    for (const id of UNIT_IDS) {
      assert.ok(syllabusEntryOf(CURRICULUM, id), `syllabus/${id} reachable through the registry`);
    }
  });
});
