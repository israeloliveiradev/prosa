import type { AccountUser } from "@/api/schemas/auth";

export type AuthMode =
  | "signIn"
  | "signUp"
  | "verify"
  | "twoFactor"
  | "forgot"
  | "signedIn";

export interface AuthFlowState {
  mode: AuthMode;
  email: string;
  password: string;
  level: AccountUser["level"];
  otp: string;
  ticket: string | null;
  methods: Array<"totp" | "email">;
  selectedMethod: "totp" | "email";
  pending: boolean;
  error: string | null;
  resendCooldown: number;
  inboxUrl: string | null;
}

export type AuthFlowEvent =
  | { type: "SWITCH_TO_SIGN_UP" }
  | { type: "SWITCH_TO_SIGN_IN" }
  | { type: "SWITCH_TO_FORGOT" }
  | { type: "REQUIRE_VERIFY"; email?: string }
  | { type: "REQUIRE_2FA"; ticket: string; methods: Array<"totp" | "email"> }
  | { type: "SET_FIELD"; field: "email" | "password" | "otp" | "level" | "selectedMethod"; value: any }
  | { type: "SET_PENDING"; pending: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_INBOX_URL"; url: string | null }
  | { type: "TICK_COOLDOWN" }
  | { type: "TRIGGER_RESEND_COOLDOWN" }
  | { type: "RESET_FORM" };

export function initialAuthFlowState(options: {
  signedIn?: boolean;
  initialMode?: AuthMode;
  initialEmail?: string;
} = {}): AuthFlowState {
  return {
    mode: options.signedIn ? "signedIn" : options.initialMode ?? "signIn",
    email: options.initialEmail ?? "",
    password: "",
    level: "A2",
    otp: "",
    ticket: null,
    methods: ["totp"],
    selectedMethod: "totp",
    pending: false,
    error: null,
    resendCooldown: 0,
    inboxUrl: null,
  };
}

export function authFlowReducer(
  state: AuthFlowState,
  event: AuthFlowEvent,
): AuthFlowState {
  switch (event.type) {
    case "SWITCH_TO_SIGN_UP":
      return {
        ...state,
        mode: "signUp",
        error: null,
        pending: false,
        password: "",
        otp: "",
      };

    case "SWITCH_TO_SIGN_IN":
      return {
        ...state,
        mode: "signIn",
        error: null,
        pending: false,
        password: "",
        otp: "",
      };

    case "SWITCH_TO_FORGOT":
      return {
        ...state,
        mode: "forgot",
        error: null,
        pending: false,
        password: "",
        otp: "",
      };

    case "REQUIRE_VERIFY":
      return {
        ...state,
        mode: "verify",
        email: event.email ?? state.email,
        password: "",
        otp: "",
        error: null,
        pending: false,
        resendCooldown: 30,
      };

    case "REQUIRE_2FA":
      return {
        ...state,
        mode: "twoFactor",
        ticket: event.ticket,
        methods: event.methods.length > 0 ? event.methods : ["totp"],
        selectedMethod: event.methods[0] ?? "totp",
        password: "",
        otp: "",
        error: null,
        pending: false,
      };

    case "SET_FIELD":
      return {
        ...state,
        [event.field]: event.value,
        error: event.field === "email" || event.field === "password" ? null : state.error,
      };

    case "SET_PENDING":
      return {
        ...state,
        pending: event.pending,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: event.error,
        pending: false,
      };

    case "SET_INBOX_URL":
      return {
        ...state,
        inboxUrl: event.url,
      };

    case "TICK_COOLDOWN":
      return {
        ...state,
        resendCooldown: state.resendCooldown > 0 ? state.resendCooldown - 1 : 0,
      };

    case "TRIGGER_RESEND_COOLDOWN":
      return {
        ...state,
        resendCooldown: 30,
      };

    case "RESET_FORM":
      return {
        ...state,
        password: "",
        otp: "",
        error: null,
        pending: false,
      };

    default:
      return state;
  }
}
