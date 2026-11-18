/**
 * Dataset Empty: coleções zeradas para validação de Empty States e ausência de dados.
 */

export const users = {
  fresh: {
    id: "usr_empty_01",
    email: "fresh@example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "A1",
    plan: "free",
    role: "learner",
    display_name: "Novo Usuário",
    display_locale: "pt",
    streak_count: 0,
    streak_freeze_count: 1,
    reminder_enabled: false,
    reminder_hour: 20,
    interests: [],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
};

export const cards = [];

export const lessons = [];

export const news = [];

export const scores = [];

export const totals = {
  users: Object.keys(users).length,
  cards: cards.length,
  lessons: lessons.length,
  news: news.length,
  scores: scores.length,
};

console.assert(totals.users === 1, "totals.users deve ser 1 no dataset empty");
console.assert(totals.cards === 0, "totals.cards deve ser 0 no dataset empty");
console.assert(totals.lessons === 0, "totals.lessons deve ser 0 no dataset empty");
console.assert(totals.news === 0, "totals.news deve ser 0 no dataset empty");
console.assert(totals.scores === 0, "totals.scores deve ser 0 no dataset empty");
