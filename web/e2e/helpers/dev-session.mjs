// Injeta uma sessão (real, de scripts/dev-login.mjs, ou de mock) no localStorage
// antes de a página carregar. Chaves com o prefixo do react-native-mmkv no web ("prosa\").

/**
 * @param {import("@playwright/test").Page} page
 * @param {{ token: string, user: { id: string } }} session
 * @param {{ journeyDone?: boolean, locale?: string }} [options]
 */
export async function seedDevSession(page, session, options = {}) {
  const journeyDone = options.journeyDone ?? true;
  await page.addInitScript(
    ({ session, journeyDone, locale }) => {
      try {
        localStorage.setItem("prosa\\prosa.session.v1", JSON.stringify(session));
        localStorage.setItem(
          "prosa\\prosa.journey.v1",
          JSON.stringify({ userId: session.user.id, done: journeyDone, step: journeyDone ? "ready" : "welcome" }),
        );
        localStorage.setItem("prosa\\prosa.guide.v1", JSON.stringify({ seen: ["daily", "memory", "news", "practice"] }));
        if (locale) localStorage.setItem("prosa\\prosa.locale.v1", locale);
      } catch (error) {
        console.error("seedDevSession falhou", error);
      }
    },
    { session, journeyDone, locale: options.locale ?? null },
  );
}
