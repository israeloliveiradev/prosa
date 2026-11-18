import { test, expect } from "@playwright/test";
import { AccountUserSchema } from "@/api/schemas/auth";
import * as demoData from "@/../e2e/data/demo.mjs";
import * as worstData from "@/../e2e/data/worst.mjs";
import * as emptyData from "@/../e2e/data/empty.mjs";
import * as oneData from "@/../e2e/data/one.mjs";
import * as hugeData from "@/../e2e/data/huge.mjs";

test.describe("Camada de dados: validação de fixtures contra schemas Zod", () => {
  const datasets = [
    { name: "demo", data: demoData },
    { name: "worst", data: worstData },
    { name: "empty", data: emptyData },
    { name: "one", data: oneData },
    { name: "huge", data: hugeData },
  ];

  for (const { name, data } of datasets) {
    test(`todos os usuários do dataset '${name}' passam no AccountUserSchema`, () => {
      const users = Object.values(data.users);
      expect(users.length).toBeGreaterThanOrEqual(1);

      for (const user of users) {
        const result = AccountUserSchema.safeParse(user);
        if (!result.success) {
          console.error(`Erro de schema no usuário do dataset ${name}:`, result.error.format());
        }
        expect(result.success).toBe(true);
      }
    });

    test(`os totais do dataset '${name}' batem matematicamente com os tamanhos das listas`, () => {
      expect(data.totals.users).toBe(Object.keys(data.users).length);
      expect(data.totals.cards).toBe(data.cards.length);
      expect(data.totals.lessons).toBe(data.lessons.length);
      expect(data.totals.news).toBe(data.news.length);
      expect(data.totals.scores).toBe(data.scores.length);
    });
  }
});
