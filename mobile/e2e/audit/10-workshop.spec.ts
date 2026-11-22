import { SESSION_COPY } from "@/lib/copy/session";
import { WORKSHOP } from "@/lib/copy/workshop";
import { test, expect, seedSession, assertLayout } from "./fixtures";
import { AI_WAIT, createLearner, press, tid } from "./helpers-b";

const t = WORKSHOP.pt;
const s = SESSION_COPY.pt;

interface Block {
  role: string;
  text: string;
  options: string[];
}

test.describe("Bloco 10 · Oficina gramatical", () => {
  test("uma frase em inglês vira estrutura (4 blocos) na folha tátil", async ({ page }) => {
    const session = await createLearner({ prefix: "workshop-en", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/syntax-workshop");
    await expect(tid(page, "workshop-screen")).toBeVisible();
    await assertLayout(page, "Oficina");

    const sentence = "The young cook sells fresh bread every morning.";
    await tid(page, "workshop-input").fill(sentence);
    const deconstruct = page.waitForResponse((response) => response.url().includes("/api/v1/grammar/deconstruct"), { timeout: AI_WAIT });
    await press(page, "workshop-analyze");
    const analysis = await deconstruct;
    expect(analysis.status()).toBe(200);
    const body: { sentence: string; blocks: Block[] } = await analysis.json();
    expect(body.blocks.map((block) => block.role).sort()).toEqual(["connector", "object", "subject", "verb"]);
    expect(body.blocks.every((block) => block.text.trim().length > 0 && block.options.length >= 2)).toBe(true);

    // A folha mostra a frase e cada bloco do servidor, com o papel traduzido.
    const sheet = tid(page, "session-glass-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(s.grammarTitle, { exact: true })).toBeVisible();
    const subject = body.blocks.find((block) => block.role === "subject")!;
    const verb = body.blocks.find((block) => block.role === "verb")!;
    await expect(sheet.getByRole("button", { name: `${s.roleSubject}: ${subject.text}` })).toBeVisible();
    await expect(sheet.getByRole("button", { name: `${s.roleVerb}: ${verb.text}` })).toBeVisible();
    await expect(sheet.getByRole("button", { name: new RegExp(`^${s.roleObject}: `) })).toBeVisible();
    await expect(sheet.getByRole("button", { name: new RegExp(`^${s.roleConnector}: `) })).toBeVisible();
    await expect(sheet.getByText(body.sentence, { exact: false }).first()).toBeVisible();

    // Estilo tátil: papel creme (#FDFBF7) na folha, não o cinza do tema padrão.
    const background = await sheet.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe("rgb(253, 251, 247)");

  });

  test("escolher outra opção de um bloco faz a IA remontar a frase (variação)", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "workshop-vary", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/syntax-workshop");
    await tid(page, "workshop-input").fill("The young cook sells fresh bread every morning.");
    const deconstruct = page.waitForResponse((response) => response.url().includes("/api/v1/grammar/deconstruct"), { timeout: AI_WAIT });
    await press(page, "workshop-analyze");
    const body: { sentence: string; blocks: Block[] } = await (await deconstruct).json();
    const sheet = tid(page, "session-glass-sheet");
    const subject = body.blocks.find((block) => block.role === "subject")!;
    await expect(sheet.getByRole("button", { name: `${s.roleSubject}: ${subject.text}` })).toBeVisible();
    // Variações: abrir o sujeito, escolher outra opção e a IA remonta a frase.
    await sheet.getByRole("button", { name: `${s.roleSubject}: ${subject.text}` }).click();
    const other = subject.options.find((option) => option !== subject.text)!;
    expect(other).toBeTruthy();
    const vary = page.waitForResponse((response) => response.url().includes("/api/v1/grammar/vary"), { timeout: AI_WAIT });
    await sheet.getByRole("button", { name: other, exact: true }).click();
    const varied = await vary;
    expect(varied.status()).toBe(200);
    const variedBody: { sentence: string; blocks: Block[] } = await varied.json();
    expect(variedBody.sentence).not.toBe(body.sentence);
    expect(variedBody.blocks.find((block) => block.role === "subject")!.text).toContain(other.split(" ")[0]!);
    await expect(sheet.getByText(variedBody.sentence, { exact: false }).first()).toBeVisible();
    // A voz neural pode estar indisponível neste ambiente; o que se audita é a análise.
    guard.allow(/\/api\/v1\/audio|\/api\/v1\/speech|tts/i);
  });

  test("entrada curta demais mostra o erro traduzido e não chama a IA", async ({ page }) => {
    const session = await createLearner({ prefix: "workshop-short", target: "de", native: "pt", level: "A1", locale: "de" });
    await seedSession(page, session, { locale: "de" });
    let called = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/grammar/")) called += 1;
    });
    await page.goto("/syntax-workshop");
    await expect(tid(page, "workshop-screen")).toBeVisible();
    await expect(page.getByText(WORKSHOP.de.kicker).first()).toBeVisible();
    await tid(page, "workshop-input").fill("ab");
    await expect(page.getByText(WORKSHOP.de.sentenceTooShort)).toBeVisible();
    expect(WORKSHOP.de.sentenceTooShort).not.toBe(WORKSHOP.pt.sentenceTooShort);
    await expect(tid(page, "workshop-analyze")).toBeDisabled();
    // Espaços não contam como caracteres.
    await tid(page, "workshop-input").fill("   a   ");
    await expect(page.getByText(WORKSHOP.de.sentenceTooShort)).toBeVisible();
    // Com 3 caracteres úteis o erro some e o botão libera.
    await tid(page, "workshop-input").fill("Ich");
    await expect(page.getByText(WORKSHOP.de.sentenceTooShort)).toHaveCount(0);
    await expect(tid(page, "workshop-analyze")).toBeEnabled();
    expect(called, "nenhuma chamada à IA para entrada curta").toBe(0);
    await assertLayout(page, "Oficina · alemão");
  });

  test("a Oficina cabe no celular @mobile", async ({ page }) => {
    const session = await createLearner({ prefix: "workshop-mobile", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/syntax-workshop");
    await expect(tid(page, "workshop-screen")).toBeVisible();
    await assertLayout(page, "Oficina 390");
    await tid(page, "workshop-input").fill("I drink tea.");
    await press(page, "workshop-analyze");
    await expect(tid(page, "session-glass-sheet")).toBeVisible();
    await expect(tid(page, "session-glass-sheet").getByRole("button", { name: new RegExp(`^${s.roleVerb}: `) })).toBeVisible({ timeout: AI_WAIT });
    await assertLayout(page, "Oficina 390 · folha");
    const background = await tid(page, "session-glass-sheet").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe("rgb(253, 251, 247)");
  });
});
