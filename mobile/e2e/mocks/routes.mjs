/**
 * Tabela de rotas da API simulada para E2E e build de inspeção.
 * Arquivo ESM puro com JSDoc.
 */

export const mockUsers = {
  learner: {
    id: "usr_learner_101",
    email: "learner@prosa.test",
    name: "Ana Silva",
    display_name: "Ana Silva",
    plan: "free",
    created_at: "2026-01-15T10:00:00.000Z",
    target_lang: "en",
    through_lang: "pt",
    native_lang: "pt",
    level: "B1",
  },
  pro: {
    id: "usr_pro_202",
    email: "pro@prosa.test",
    name: "Carlos Mendes",
    display_name: "Carlos Mendes",
    plan: "pro",
    created_at: "2025-11-20T10:00:00.000Z",
    target_lang: "en",
    through_lang: "pt",
    native_lang: "pt",
    level: "B2",
  },
  admin: {
    id: "usr_admin_303",
    email: "qa.admin@local.test",
    name: "Administrador",
    display_name: "Administrador",
    plan: "pro",
    is_admin: true,
    created_at: "2025-01-01T10:00:00.000Z",
    target_lang: "en",
    through_lang: "pt",
    native_lang: "pt",
    level: "C1",
  },
};

/**
 * @typedef {Object} MockRequest
 * @property {string} method
 * @property {string} path
 * @property {Object} params
 * @property {URLSearchParams} query
 * @property {any} body
 * @property {Headers} headers
 */

/**
 * @typedef {Object} MockResponse
 * @property {number} [status]
 * @property {Object} [headers]
 * @property {any} [body]
 */

/**
 * @typedef {Object} RouteDefinition
 * @property {string} method
 * @property {string} path Pattern path like "/api/v1/auth/me" or "/api/v1/dossier/:token"
 * @property {(req: MockRequest, ctx: { persona: string, dataset: string }) => MockResponse | Promise<MockResponse>} handler
 */

/** @type {RouteDefinition[]} */
export const routes = [
  // Health
  {
    method: "GET",
    path: "/health",
    handler: () => ({
      status: 200,
      body: { status: "ok", schema: "029_news_native" },
    }),
  },

  // Auth / Me
  {
    method: "GET",
    path: "/api/v1/auth/me",
    handler: (_req, { persona }) => {
      const user = mockUsers[persona] || mockUsers.learner;
      return {
        status: 200,
        body: { user },
      };
    },
  },

  // Auth / Login
  {
    method: "POST",
    path: "/api/v1/auth/login",
    handler: (req) => {
      const email = req.body?.email;
      const password = req.body?.password;
      if (email === "learner@prosa.test" && password === "senha123") {
        return {
          status: 200,
          body: {
            token: "mock-bearer-token-learner-123",
            user: mockUsers.learner,
          },
        };
      }
      return {
        status: 401,
        body: { error: "Invalid credentials" },
      };
    },
  },

  // Auth / Register
  {
    method: "POST",
    path: "/api/v1/auth/register",
    handler: (req) => {
      const email = req.body?.email || "novo@prosa.test";
      const level = req.body?.level || "A2";
      if (email.includes("existente")) {
        return {
          status: 409,
          body: { error: "Email already registered" },
        };
      }
      if (email.includes("verify")) {
        return {
          status: 200,
          body: {
            requires_verify: true,
            email,
          },
        };
      }
      return {
        status: 200,
        body: {
          token: "mock-token-registered",
          user: {
            ...mockUsers.learner,
            id: "usr_new_999",
            email,
            level,
          },
        },
      };
    },
  },

  // Auth / Verify
  {
    method: "POST",
    path: "/api/v1/auth/verify",
    handler: (req) => {
      const code = req.body?.code;
      if (code === "000000" || code === "123456") {
        return {
          status: 200,
          body: {
            token: "mock-token-verified",
            user: mockUsers.learner,
          },
        };
      }
      return {
        status: 400,
        body: { error: "Verify code expired" },
      };
    },
  },

  // Auth / Resend Verify
  {
    method: "POST",
    path: "/api/v1/auth/verify/resend",
    handler: () => ({
      status: 200,
      body: { status: "ok" },
    }),
  },

  // Auth / 2FA
  {
    method: "POST",
    path: "/api/v1/auth/2fa",
    handler: (req) => {
      const code = req.body?.code;
      if (code === "000000" || code === "123456") {
        return {
          status: 200,
          body: {
            token: "mock-token-2fa-verified",
            user: mockUsers.learner,
          },
        };
      }
      return {
        status: 401,
        body: { error: "Invalid second factor" },
      };
    },
  },

  // Auth / Forgot
  {
    method: "POST",
    path: "/api/v1/auth/forgot",
    handler: () => ({
      status: 200,
      body: { status: "ok" },
    }),
  },

  // Auth / Reset
  {
    method: "POST",
    path: "/api/v1/auth/reset",
    handler: (req) => {
      const code = req.body?.code;
      if (code === "000000" || code === "123456") {
        return {
          status: 200,
          body: { status: "ok" },
        };
      }
      return {
        status: 400,
        body: { error: "Reset code expired" },
      };
    },
  },

  // Auth / Mail Inbox
  {
    method: "GET",
    path: "/api/v1/auth/mail",
    handler: () => ({
      status: 200,
      body: { inbox_url: "http://localhost:8025" },
    }),
  },

  // Auth / Logout
  {
    method: "POST",
    path: "/api/v1/auth/logout",
    handler: () => ({
      status: 200,
      body: { status: "ok" },
    }),
  },

  // SRS Sync
  {
    method: "POST",
    path: "/api/v1/srs/sync",
    handler: (req) => {
      const items = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
      return {
        status: 200,
        body: {
          synced_ids: items.map((r) => r.id || "card_1"),
        },
      };
    },
  },

  // SRS Retention
  {
    method: "GET",
    path: "/api/v1/srs/retention",
    handler: () => ({
      status: 200,
      body: {
        deck_count: 128,
        at_risk_today: 9,
        retention_rate: 0.88,
        cells: [
          { status: "risk", phrase: "to count on someone" },
          { status: "fragile", phrase: "break down into pieces" },
          { status: "solid", phrase: "make ends meet" },
        ],
      },
    }),
  },

  // Profile
  {
    method: "GET",
    path: "/api/v1/profile",
    handler: (_req, { persona }) => ({
      status: 200,
      body: {
        user: mockUsers[persona] || mockUsers.learner,
        streak_days: 14,
        week_dots: [true, true, true, true, true, true, false],
        hours_studied: 42,
      },
    }),
  },

  // Study tracks
  {
    method: "GET",
    path: "/api/v1/study/tracks",
    handler: () => ({
      status: 200,
      body: {
        tracks: [
          { target_lang: "en", through_lang: "pt", level: "B1", active: true },
          { target_lang: "es", through_lang: "pt", level: "A2", active: false },
        ],
      },
    }),
  },

  // Placement status
  {
    method: "GET",
    path: "/api/v1/placement/status",
    handler: () => ({
      status: 200,
      body: {
        target_lang: "en",
        through_lang: "pt",
        current_level: "A2",
        last: null,
        due: true,
        due_reason: "never",
        days_until: 0,
        open_attempt_id: null,
        history: [],
      },
    }),
  },

  // Placement start
  {
    method: "POST",
    path: "/api/v1/placement/start",
    handler: () => ({
      status: 200,
      body: {
        attempt_id: "att_mock_123",
        target_lang: "en",
        through_lang: "pt",
        kind: "placement",
        items: [
          {
            id: "item_1",
            band: "A1",
            kind: "vocab",
            prompt: "Choose the word that means 'maçã':",
            hint: "A common fruit",
            options: ["Apple", "Book", "Car", "Door"],
          },
        ],
        answered: {},
        index: 0,
        adaptive: false,
        cap: 1,
      },
    }),
  },

  // Placement answer
  {
    method: "POST",
    path: "/api/v1/placement/answer",
    handler: () => ({
      status: 200,
      body: {
        saved: true,
        done: true,
        asked: 1,
        cap: 1,
        next: null,
      },
    }),
  },

  // Placement finish
  {
    method: "POST",
    path: "/api/v1/placement/finish",
    handler: () => ({
      status: 200,
      body: {
        attempt_id: "att_mock_123",
        target_lang: "en",
        through_lang: "pt",
        kind: "placement",
        level: "B1",
        previous_level: "A2",
        score: 90,
        correct: 1,
        total: 1,
        bands: [{ band: "A1", correct: 1, total: 1 }],
        skills: [{ skill: "vocab", correct: 1, total: 1 }],
        history: [],
      },
    }),
  },

  // Onboarding quiz
  {
    method: "POST",
    path: "/api/v1/onboarding/quiz",
    handler: (req) => ({
      status: 200,
      body: {
        interests: req.body?.interests || ["Tecnologia"],
        topics: ["Inovações em IA no cotidiano", "Como funciona a computação quântica"],
        target_lang: "en",
        native_lang: "pt",
        level: req.body?.level || "B1",
      },
    }),
  },

  // Account settings (goal, note, daily minutes)
  {
    method: "PATCH",
    path: "/api/v1/account/settings",
    handler: (req) => ({
      status: 200,
      body: {
        display_name: null,
        display_locale: "pt",
        reminder_enabled: false,
        reminder_hour: 20,
        totp_enabled: false,
        email_2fa: false,
        mind_reading: "einstein",
        mind_memory: "curie",
        mind_speech: "feynman",
        mind_journal: "davinci",
        mail_configured: false,
        mail_inbox_url: null,
        goal: req.body?.goal ?? null,
        goal_note: req.body?.goal_note ?? null,
        daily_minutes: req.body?.daily_minutes ?? 20,
      },
    }),
  },

  // Profile signals
  {
    method: "POST",
    path: "/api/v1/profile/signals",
    handler: () => ({
      status: 200,
      body: {
        saved: true,
      },
    }),
  },
];

/**
 * Encontra a rota correspondente a um método e pathname
 * @param {string} method
 * @param {string} pathname
 * @returns {{ route: RouteDefinition, params: Object } | null}
 */
export function matchRoute(method, pathname) {
  const normPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue;
    const rSegments = r.path.split("/").filter(Boolean);
    const pSegments = normPath.split("/").filter(Boolean);
    if (rSegments.length !== pSegments.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < rSegments.length; i++) {
      if (rSegments[i].startsWith(":")) {
        params[rSegments[i].slice(1)] = decodeURIComponent(pSegments[i]);
      } else if (rSegments[i] !== pSegments[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { route: r, params };
    }
  }
  return null;
}
