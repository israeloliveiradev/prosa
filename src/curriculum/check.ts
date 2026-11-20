// Valida arquivos de currículo. Uso (na raiz do repo):
//   npx tsx src/curriculum/check.ts en es        -> valida src/curriculum/en.ts e es.ts
//   npx tsx src/curriculum/check.ts syllabus     -> valida src/curriculum/syllabus.ts
// Cada arquivo de idioma exporta `default` (LanguageCurriculum); syllabus.ts exporta `default` (Syllabus).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { validateLanguage, validateSyllabus } from "./validate.js";

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("Uso: npx tsx src/curriculum/check.ts <lang|syllabus> [...]");
  process.exit(2);
}
let failed = false;
for (const target of targets) {
  const file = resolve(process.cwd(), "src/curriculum", `${target}.ts`);
  const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
  if (!mod.default) {
    console.error(`${target}: o arquivo precisa de "export default"`);
    failed = true;
    continue;
  }
  const problems =
    target === "syllabus" ? validateSyllabus(mod.default as never) : validateLanguage(target, mod.default as never);
  if (problems.length) {
    failed = true;
    console.error(`${target}: ${problems.length} problema(s)`);
    for (const problem of problems.slice(0, 60)) console.error(`  - ${problem}`);
  } else {
    console.log(`${target}: ok`);
  }
}
process.exit(failed ? 1 : 0);
