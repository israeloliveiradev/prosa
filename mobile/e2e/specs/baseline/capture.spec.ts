/// <reference types="node" />
import { test, expect } from "../../fixtures";
import fs from "node:fs";
import path from "node:path";

const routesToCapture = [
  { path: "/account", name: "account", persona: "new" },
  { path: "/", name: "home", persona: "learner" },
  { path: "/start", name: "start", persona: "firstDay" },
  { path: "/quiz", name: "quiz", persona: "learner" },
  { path: "/placement", name: "placement", persona: "learner" },
  { path: "/daily", name: "daily", persona: "learner" },
  { path: "/memory", name: "memory", persona: "learner" },
  { path: "/news", name: "news", persona: "learner" },
  { path: "/practice", name: "practice", persona: "learner" },
  { path: "/duel", name: "duel", persona: "learner" },
  { path: "/persona", name: "persona", persona: "learner" },
  { path: "/prose", name: "prose", persona: "learner" },
  { path: "/exam", name: "exam", persona: "learner" },
  { path: "/score", name: "score", persona: "learner" },
  { path: "/pairs", name: "pairs", persona: "learner" },
  { path: "/life", name: "life", persona: "learner" },
  { path: "/org", name: "org", persona: "learner" },
  { path: "/dossier", name: "dossier", persona: "learner" },
  { path: "/paywall", name: "paywall", persona: "learner" },
  { path: "/settings", name: "settings", persona: "learner" },
  { path: "/profile", name: "profile", persona: "learner" },
  { path: "/admin", name: "admin", persona: "admin" },
  { path: "/guide", name: "guide", persona: "learner" },
  { path: "/dev/ui", name: "dev-ui", persona: "new" },
];

const apiCallsMap: Record<string, string[]> = {};

test.describe("Captura de Baseline Visual e Descoberta de APIs @baseline", () => {
  const antesDir = path.resolve(process.cwd(), "../docs/qa/baseline/antes");

  test.beforeAll(() => {
    fs.mkdirSync(antesDir, { recursive: true });
  });

  for (const r of routesToCapture) {
    for (const theme of ["light", "dark"] as const) {
      for (const width of [375, 1280] as const) {
        test(`Capturar ${r.name} - ${width}px - ${theme}`, async ({ page, mockApi }) => {
          // Viewport and theme
          await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
          await page.emulateMedia({ colorScheme: theme });

          // Seed if not "new"
          if (r.persona !== "new") {
            const user = {
              id: "usr_learner_101",
              email: "learner@prosa.test",
              name: "Ana Silva",
              plan: r.persona === "pro" ? "pro" : "free",
              role: r.persona === "admin" ? "admin" : "user",
              target_lang: "en",
              through_lang: "pt",
              level: "B1",
            };
            const session = JSON.stringify({ token: "mock-token-123", user });
            const journey = JSON.stringify({
              userId: user.id,
              done: r.persona !== "firstDay",
              step: r.persona === "firstDay" ? "pair" : "ready",
            });
            const guide = JSON.stringify({ seen: ["daily", "memory", "news", "practice"] });
            const themeVal = JSON.stringify(theme);

            await page.addInitScript(
              ({ session, journey, guide, themeVal }) => {
                localStorage.setItem("prosa\\prosa.session.v1", session);
                localStorage.setItem("prosa\\prosa.journey.v1", journey);
                localStorage.setItem("prosa\\prosa.guide.v1", guide);
                localStorage.setItem("prosa\\prosa.theme.v2", themeVal);
              },
              { session, journey, guide, themeVal }
            );
          }

          await page.goto(r.path, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(500); // breve acomodação para o render visual

          // Coleta chamadas de API feitas nesta rota
          const calls = mockApi.getCalls().map((c) => `${c.method} ${c.pathname}`);
          if (!apiCallsMap[r.path]) {
            apiCallsMap[r.path] = [];
          }
          for (const call of calls) {
            if (!apiCallsMap[r.path].includes(call)) {
              apiCallsMap[r.path].push(call);
            }
          }

          // Salva screenshot
          const filename = `${r.name}-${width}-${theme}.png`;
          const filePath = path.join(antesDir, filename);
          await page.screenshot({ path: filePath, fullPage: true });
        });
      }
    }
  }

  test.afterAll(() => {
    // Grava docs/qa/api-calls-por-rota.md
    const qaDir = path.resolve(process.cwd(), "../docs/qa");
    fs.mkdirSync(qaDir, { recursive: true });

    let md = `# Chamadas de API por Rota (Descoberta da Baseline)\n\n`;
    md += `*Gerado automaticamente pelo spec de captura de baseline da Task 1 em ${new Date().toISOString()}*\n\n`;

    for (const [routePath, calls] of Object.entries(apiCallsMap)) {
      md += `## \`${routePath}\`\n\n`;
      if (calls.length === 0) {
        md += `*Nenhuma chamada de API interceptada no carregamento inicial.*\n\n`;
      } else {
        md += `| Método | Endpoint |\n|---|---|\n`;
        for (const call of calls) {
          const [method, ep] = call.split(" ");
          md += `| ${method} | \`${ep}\` |\n`;
        }
        md += `\n`;
      }
    }

    fs.writeFileSync(path.join(qaDir, "api-calls-por-rota.md"), md, "utf8");
  });
});
