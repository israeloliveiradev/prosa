import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Guarda contra texto fixo nas telas: roda o verificador em modo estrito.
 * Texto novo vai para uma tabela em src/lib/copy/<area>.ts (7 idiomas);
 * só marque `i18n-ignore` para o que não se traduz (marca, símbolos).
 */
test("nenhuma tela alcançável tem texto fixo fora das tabelas de idioma", () => {
  const root = path.resolve(__dirname, "../..");
  const run = spawnSync(process.execPath, ["scripts/check-hardcoded-strings.mjs", "--strict"], { cwd: root, encoding: "utf8" });
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
});
