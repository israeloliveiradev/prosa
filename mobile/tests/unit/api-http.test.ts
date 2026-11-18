import { test, expect } from "@playwright/test";
import { z } from "zod";
import { request, setUnauthorizedHandler } from "@/api/http";
import { ApiError } from "@/api/errors";
import { kv } from "@/lib/kv";
import { hydrateSession } from "@/lib/session";

test.describe("Camada de dados: cliente http request<T>", () => {
  const originalFetch = globalThis.fetch;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    setUnauthorizedHandler(null);
    kv.delete("prosa.session.v1");
    hydrateSession();
  });

  test("injeta cabeçalho de autorização Bearer quando sessão existe", async () => {
    kv.set(
      "prosa.session.v1",
      JSON.stringify({
        token: "fake-jwt-token-123",
        user: { id: "usr_1", email: "test@prosa.test", plan: "free", level: "B1", native_lang: "pt", target_lang: "en" },
      }),
    );
    hydrateSession();

    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const res = await request<{ success: boolean }>("/api/v1/test", { auth: "optional" });
    expect(res.success).toBe(true);
    expect(capturedHeaders["Authorization"]).toBe("Bearer fake-jwt-token-123");
  });

  test("exige sessão e lança ApiError tipo auth quando auth: 'required' e sessão ausente", async () => {
    await expect(
      request("/api/v1/protected", { auth: "required" }),
    ).rejects.toThrow(ApiError);

    try {
      await request("/api/v1/protected", { auth: "required" });
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.kind).toBe("auth");
    }
  });

  test("valida resposta com schema Zod e lança ApiError 'schema' se inválida", async () => {
    const TestSchema = z.object({
      id: z.string(),
      count: z.number(),
    });

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ id: "item_1", count: "não é um número" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    await expect(
      request("/api/v1/check", { schema: TestSchema, auth: "none" }),
    ).rejects.toThrow(ApiError);

    try {
      await request("/api/v1/check", { schema: TestSchema, auth: "none" });
    } catch (e: any) {
      expect(e.kind).toBe("schema");
      expect(e.status).toBe(200);
      expect(e.raw).toContain("count");
    }
  });

  test("retorna undefined em resposta 204 No Content", async () => {
    globalThis.fetch = (async () => {
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const res = await request("/api/v1/empty", { auth: "none" });
    expect(res).toBeUndefined();
  });

  test("aciona callback onUnauthorized em resposta 401", async () => {
    kv.set(
      "prosa.session.v1",
      JSON.stringify({
        token: "expired-token",
        user: { id: "usr_exp", email: "exp@prosa.test", plan: "free", level: "B1", native_lang: "pt", target_lang: "en" },
      }),
    );
    hydrateSession();

    let unauthorizedTriggered = false;
    setUnauthorizedHandler(() => {
      unauthorizedTriggered = true;
    });

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "Token expired" }), { status: 401 });
    }) as typeof fetch;

    await expect(
      request("/api/v1/me", { auth: "required" }),
    ).rejects.toThrow(ApiError);

    expect(unauthorizedTriggered).toBe(true);
  });

  test("aborta e lança ApiError tipo timeout quando excede timeoutMs", async () => {
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortErr = new Error("The operation was aborted");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      });
    }) as typeof fetch;

    await expect(
      request("/api/v1/slow", { timeoutMs: 30, auth: "none" }),
    ).rejects.toThrow(ApiError);

    try {
      await request("/api/v1/slow", { timeoutMs: 30, auth: "none" });
    } catch (e: any) {
      expect(e.kind).toBe("timeout");
    }
  });

  test("suporta FormData sem forçar Content-Type json", async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = init?.body;
      return new Response(JSON.stringify({ uploaded: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const form = new FormData();
    form.append("field", "value");

    const res = await request<{ uploaded: boolean }>("/api/v1/upload", {
      method: "POST",
      form,
      auth: "none",
    });

    expect(res.uploaded).toBe(true);
    expect(capturedHeaders["Content-Type"]).toBeUndefined();
    expect(capturedBody).toBe(form);
  });
});
