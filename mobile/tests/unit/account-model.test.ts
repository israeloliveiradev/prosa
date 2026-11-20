import { test, expect } from "@playwright/test";
import { ApiError } from "@/api/errors";
import {
  STUDY_TARGETS,
  SUPPORT_LANGS,
  accountErrorMessage,
  changePair,
  classifySignIn,
  cooldownLeft,
  defaultPair,
  isEmail,
  passwordAccepted,
  passwordStrengthOf,
  secondFactorCode,
  sixDigitCode,
} from "@/features/auth/model/account-model";
import { isAccountLocale, reconcileLocale, shouldAdoptServerLocale } from "@/features/auth/model/locale-sync";
import { ACCOUNT_COPY } from "@/lib/copy/account";

const copy = ACCOUNT_COPY.pt as unknown as Record<string, unknown>;

test.describe("conta: validação e par de idiomas", () => {
  test("português é só apoio; os 7 alvos não incluem pt", () => {
    expect(STUDY_TARGETS).not.toContain("pt");
    expect([...STUDY_TARGETS].sort()).toEqual(["de", "en", "es", "fr", "it", "ja", "ru"]);
    expect(SUPPORT_LANGS).toContain("pt");
  });

  test("e-mail e senha seguem as regras do servidor (8 a 72)", () => {
    expect(isEmail("ana@prosa.test")).toBe(true);
    expect(isEmail(" ana@prosa.test ")).toBe(true);
    expect(isEmail("ana@prosa")).toBe(false);
    expect(isEmail("ana prosa.test")).toBe(false);
    expect(passwordAccepted("1234567")).toBe(false);
    expect(passwordAccepted("12345678")).toBe(true);
    expect(passwordAccepted("x".repeat(73))).toBe(false);
    expect(passwordStrengthOf("curta")).toBe("weak");
    expect(passwordStrengthOf("senha12345")).toBe("ok");
    expect(passwordStrengthOf("Senha-Forte-2026")).toBe("strong");
  });

  test("códigos: 6 dígitos para e-mail; recuperação aceita letras e hífen", () => {
    expect(sixDigitCode(" 12-34 56 78")).toBe("123456");
    expect(secondFactorCode(" ab12-cd34 ")).toBe("ab12-cd34");
  });

  test("par inicial segue o idioma da tela", () => {
    expect(defaultPair("pt")).toEqual({ support: "pt", target: "en" });
    expect(defaultPair("en")).toEqual({ support: "en", target: "es" });
    expect(defaultPair("ja")).toEqual({ support: "ja", target: "en" });
  });

  test("trocar um lado nunca deixa alvo e apoio iguais", () => {
    const start = { target: "en", support: "pt" };
    expect(changePair(start, "target", "de")).toEqual({ target: "de", support: "pt" });
    expect(changePair({ target: "en", support: "de" }, "target", "de")).toEqual({ target: "de", support: "en" });
    expect(changePair(start, "support", "fr")).toEqual({ target: "en", support: "fr" });
  });

  test("apoio igual ao alvo: o alvo vira o apoio antigo, ou um padrão válido se o antigo for pt", () => {
    expect(changePair({ target: "en", support: "pt" }, "support", "en")).toEqual({ target: "es", support: "en" });
    expect(changePair({ target: "es", support: "de" }, "support", "es")).toEqual({ target: "de", support: "es" });
    expect(changePair({ target: "en", support: "pt" }, "target", "pt")).toEqual({ target: "en", support: "pt" });
  });
});

test.describe("conta: respostas do login", () => {
  test("sessão, verificação de e-mail e segundo fator", () => {
    expect(classifySignIn({ id: "u", email: "a@b.c" }, "a@b.c")).toEqual({ kind: "session" });
    expect(classifySignIn({ requires_verify: true, email: "x@y.z" }, "a@b.c")).toEqual({ kind: "verify", email: "x@y.z" });
    expect(classifySignIn({ requires_verify: true }, "a@b.c")).toEqual({ kind: "verify", email: "a@b.c" });
    expect(classifySignIn({ requires_2fa: true, ticket: "t", methods: ["email", "sms"] }, "a@b.c")).toEqual({
      kind: "twoFactor",
      ticket: "t",
      methods: ["email"],
    });
    expect(classifySignIn({ requires_2fa: true, ticket: "t", methods: [] }, "a@b.c")).toEqual({ kind: "twoFactor", ticket: "t", methods: ["totp"] });
  });

  test("erros reais da API viram mensagens no idioma da tela", () => {
    expect(accountErrorMessage(new ApiError("http", 401, "Invalid credentials"), copy)).toBe(ACCOUNT_COPY.pt.invalidCredentials);
    expect(accountErrorMessage(new ApiError("http", 401, "Invalid second factor"), copy)).toBe(ACCOUNT_COPY.pt.secondFactorInvalid);
    expect(accountErrorMessage(new ApiError("http", 401, "Second factor expired"), copy)).toBe(ACCOUNT_COPY.pt.secondFactorExpired);
    expect(accountErrorMessage(new ApiError("http", 400, "Reset code expired"), copy)).toBe(ACCOUNT_COPY.pt.resetExpired);
    expect(accountErrorMessage(new ApiError("http", 429, "Too many attempts"), copy)).toBe(ACCOUNT_COPY.pt.tooManyTries);
    expect(accountErrorMessage(new ApiError("http", 409, "Email already registered"), copy)).toBe(ACCOUNT_COPY.pt.emailRegistered);
    expect(accountErrorMessage(new ApiError("network", null, "Failed to fetch"), copy)).toBe(ACCOUNT_COPY.pt.apiDown);
    expect(accountErrorMessage(new ApiError("http", 503, "Mail is not configured"), copy)).toBe(ACCOUNT_COPY.pt.mailDidNotLeave);
    expect(accountErrorMessage(new ApiError("http", 400, "Invalid request"), copy)).toBe(ACCOUNT_COPY.pt.checkEmailPassword);
  });

  test("contagem do reenvio", () => {
    expect(cooldownLeft(null, 1000)).toBe(0);
    expect(cooldownLeft(0, 0)).toBe(30);
    expect(cooldownLeft(0, 29_500)).toBe(1);
    expect(cooldownLeft(0, 31_000)).toBe(0);
  });
});

test.describe("conta: idioma da tela guardado no servidor (7 idiomas, M2)", () => {
  test("a conta guarda os 7 idiomas de interface", () => {
    for (const locale of ["pt", "en", "de", "fr", "es", "it", "ja"]) {
      expect(isAccountLocale(locale)).toBe(true);
    }
    expect(isAccountLocale("ru")).toBe(false);
    expect(isAccountLocale(undefined)).toBe(false);
  });

  test("aparelho novo para a conta: o idioma da conta vale", () => {
    expect(reconcileLocale({ local: "pt", server: "de", synced: null })).toEqual({ adopt: "de", push: null, synced: "de" });
    expect(reconcileLocale({ local: "en", server: "ja", synced: null })).toEqual({ adopt: "ja", push: null, synced: "ja" });
    expect(reconcileLocale({ local: "fr", server: "de", synced: null })).toEqual({ adopt: "de", push: null, synced: "de" });
  });

  test("conta do M1 com o substituto pt/en não desfaz o idioma do aparelho e é corrigida", () => {
    expect(reconcileLocale({ local: "de", server: "en", synced: null })).toEqual({ adopt: null, push: "de", synced: null });
    expect(reconcileLocale({ local: "ja", server: "pt", synced: null })).toEqual({ adopt: null, push: "ja", synced: null });
  });

  test("escolha recente no aparelho vence uma resposta velha e sobe para a conta", () => {
    // Acordo em pt; o aluno trocou para de; chega um /auth/me pedido antes do PATCH, ainda com pt.
    expect(reconcileLocale({ local: "de", server: "pt", synced: "pt" })).toEqual({ adopt: null, push: "de", synced: "pt" });
    // A conta confirmou de.
    expect(reconcileLocale({ local: "de", server: "de", synced: "pt" })).toEqual({ adopt: null, push: null, synced: "de" });
  });

  test("mudança feita em outro aparelho chega aqui", () => {
    expect(reconcileLocale({ local: "de", server: "fr", synced: "de" })).toEqual({ adopt: "fr", push: null, synced: "fr" });
  });

  test("os dois lados mudaram: vale o aparelho (a escolha que o aluno vê agora)", () => {
    expect(reconcileLocale({ local: "it", server: "fr", synced: "de" })).toEqual({ adopt: null, push: "it", synced: "de" });
  });

  test("sem idioma válido na resposta, nada muda", () => {
    expect(reconcileLocale({ local: "de", server: undefined, synced: "de" })).toEqual({ adopt: null, push: null, synced: "de" });
    expect(reconcileLocale({ local: "de", server: "xx", synced: null })).toEqual({ adopt: null, push: null, synced: null });
  });

  test("atalho sem histórico: adota salvo o caso do substituto do M1", () => {
    expect(shouldAdoptServerLocale("pt", "en")).toBe(true);
    expect(shouldAdoptServerLocale("en", "pt")).toBe(true);
    expect(shouldAdoptServerLocale("de", "en")).toBe(false);
    expect(shouldAdoptServerLocale("ja", "pt")).toBe(false);
    expect(shouldAdoptServerLocale("pt", "fr")).toBe(true);
    expect(shouldAdoptServerLocale("de", "fr")).toBe(true);
    expect(shouldAdoptServerLocale("pt", "pt")).toBe(false);
    expect(shouldAdoptServerLocale("pt", "xx")).toBe(false);
    expect(shouldAdoptServerLocale("pt", undefined)).toBe(false);
  });
});
