import { test, expect } from "@playwright/test";
import {
  authFlowReducer,
  initialAuthFlowState,
} from "@/features/auth/model/auth-flow";

test.describe("AuthFlow State Machine (Unit)", () => {
  test("inicia em signIn quando não autenticado e signedIn quando autenticado", () => {
    const unauth = initialAuthFlowState({ signedIn: false });
    expect(unauth.mode).toBe("signIn");
    expect(unauth.pending).toBe(false);

    const auth = initialAuthFlowState({ signedIn: true });
    expect(auth.mode).toBe("signedIn");
  });

  test("alterna entre signIn, signUp e forgot limpando senhas e erros", () => {
    let state = initialAuthFlowState();
    state = authFlowReducer(state, { type: "SET_FIELD", field: "password", value: "segredo123" });
    state = authFlowReducer(state, { type: "SET_ERROR", error: "Erro de teste" });
    expect(state.error).toBe("Erro de teste");

    state = authFlowReducer(state, { type: "SWITCH_TO_SIGN_UP" });
    expect(state.mode).toBe("signUp");
    expect(state.error).toBeNull();
    expect(state.password).toBe("");

    state = authFlowReducer(state, { type: "SWITCH_TO_FORGOT" });
    expect(state.mode).toBe("forgot");
    expect(state.error).toBeNull();

    state = authFlowReducer(state, { type: "SWITCH_TO_SIGN_IN" });
    expect(state.mode).toBe("signIn");
  });

  test("transiciona para verify com cooldown de 30s ao requerer confirmação de email", () => {
    let state = initialAuthFlowState({ initialEmail: "ana@exemplo.com" });
    state = authFlowReducer(state, { type: "REQUIRE_VERIFY" });

    expect(state.mode).toBe("verify");
    expect(state.email).toBe("ana@exemplo.com");
    expect(state.resendCooldown).toBe(30);

    state = authFlowReducer(state, { type: "TICK_COOLDOWN" });
    expect(state.resendCooldown).toBe(29);
  });

  test("transiciona para twoFactor configurando ticket e métodos disponíveis", () => {
    let state = initialAuthFlowState();
    state = authFlowReducer(state, {
      type: "REQUIRE_2FA",
      ticket: "ticket_temp_xyz",
      methods: ["totp", "email"],
    });

    expect(state.mode).toBe("twoFactor");
    expect(state.ticket).toBe("ticket_temp_xyz");
    expect(state.methods).toEqual(["totp", "email"]);
    expect(state.selectedMethod).toBe("totp");
  });
});
