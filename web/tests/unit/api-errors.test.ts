import { test, expect } from "@playwright/test";
import { ApiError, toUserMessage } from "@/api/errors";
import { MESSAGES } from "@/lib/messages";

const copyPt = MESSAGES.pt;
const copyEn = MESSAGES.en;

test.describe("Camada de dados: ApiError e toUserMessage", () => {
  test("instancia ApiError com os tipos e propriedades corretas", () => {
    const err = new ApiError("network", null, "Falha de conexão");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe("network");
    expect(err.status).toBeNull();
    expect(err.raw).toBe("Falha de conexão");
    expect(err.message).toBe("Falha de conexão");
  });

  test("mapeia erro de rede (network) para apiDown", () => {
    const err = new ApiError("network", null, "Failed to fetch");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.apiDown);
    expect(toUserMessage(err, copyEn)).toBe(copyEn.apiDown);
  });

  test("mapeia timeout para apiSlow", () => {
    const err = new ApiError("timeout", null, "Timeout 20000ms");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.apiSlow);
    expect(toUserMessage(err, copyEn)).toBe(copyEn.apiSlow);
  });

  test("mapeia quebra de schema para apiShapeChanged", () => {
    const err = new ApiError("schema", 200, "Invalid object");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.apiShapeChanged);
    expect(toUserMessage(err, copyEn)).toBe(copyEn.apiShapeChanged);
  });

  test("mapeia rate limit (429) para tooManyTries", () => {
    const err = new ApiError("http", 429, "Too many requests");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.tooManyTries);
    expect(toUserMessage(err, copyEn)).toBe(copyEn.tooManyTries);
  });

  test("mapeia conflito de e-mail registrado (409) para emailRegistered", () => {
    const err = new ApiError("http", 409, "Email already registered");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.emailRegistered);
    expect(toUserMessage(err, copyEn)).toBe(copyEn.emailRegistered);
  });

  test("mapeia modelo ocupado para modelBusy", () => {
    const err1 = new ApiError("http", 503, "The model is busy");
    const err2 = new ApiError("http", 503, "UNAVAILABLE: high demand");
    expect(toUserMessage(err1, copyPt)).toBe(copyPt.modelBusy);
    expect(toUserMessage(err2, copyPt)).toBe(copyPt.modelBusy);
  });

  test("mapeia falha de lição do Gemini (502) para lessonFailed", () => {
    const err = new ApiError("http", 502, "Model request failed: empty structured");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.lessonFailed);
  });

  test("mapeia geração desligada para generationOff", () => {
    const err = new ApiError("http", 503, "Lesson generation is unavailable");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.generationOff);
  });

  test("mapeia credenciais inválidas para invalidCredentials", () => {
    const err = new ApiError("http", 401, "Invalid credentials");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.invalidCredentials);
  });

  test("mapeia código expirado para verifyExpired", () => {
    const err = new ApiError("http", 400, "Verify code expired");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.verifyExpired);
  });

  test("mapeia falha de envio de email para mailDidNotLeave", () => {
    const err = new ApiError("http", 503, "The verification letter did not leave");
    expect(toUserMessage(err, copyPt)).toBe(copyPt.mailDidNotLeave);
  });

  test("retorna mensagem crua ou fallback para erros não catalogados", () => {
    const err = new ApiError("http", 500, "Falha interna desconhecida");
    expect(toUserMessage(err, copyPt)).toBe("Falha interna desconhecida");

    const errEmpty = new ApiError("http", 500, "");
    expect(toUserMessage(errEmpty, copyPt)).toBe(copyPt.apiSilent);
  });
});
