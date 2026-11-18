/**
 * Dataset One: exatamente 1 item por coleção para testar pluralização,
 * grids unitários e layout sem irmãos.
 */

export const users = {
  single: {
    id: "usr_one_01",
    email: "single.item@example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "B1",
    plan: "free",
    role: "learner",
    display_name: "Único Item",
    display_locale: "pt",
    streak_count: 1,
    streak_freeze_count: 1,
    reminder_enabled: true,
    reminder_hour: 18,
    interests: ["literatura"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
};

export const cards = [
  {
    client_id: "card_one_01",
    front_phrase: "at once",
    back_translation: "imediatamente / ao mesmo tempo",
    context_sentence: "Please come to the reception desk at once.",
    quality: 4,
  },
];

export const lessons = [
  {
    title: "O Ponto de Partida",
    story_text: "A single step begins the journey across the mountains.",
    translation: "Um único passo inicia a jornada através das montanhas.",
    vocabulary: [
      { word: "step", translation: "passo", context: "A single step" },
    ],
    journal_prompt: "Qual foi a primeira decisão importante que você tomou nesta semana?",
    anchors: [
      { word: "step", familiar: "passo", gloss: "passo", kind: "true" },
    ],
  },
];

export const news = [
  {
    id: "news_one_01",
    title: "Astronomy Team Records Singular Comet Flyby",
    summary: "A lone observatory in the Atacama captured ultra-sharp spectra of the passing celestial body.",
    published_at: "2026-10-27T08:00:00.000Z",
    words: 95,
  },
];

export const scores = [
  { user_name: "Único Item", score: 100, combo: 1 },
];

export const totals = {
  users: Object.keys(users).length,
  cards: cards.length,
  lessons: lessons.length,
  news: news.length,
  scores: scores.length,
};

console.assert(totals.users === 1, "totals.users deve ser 1 no dataset one");
console.assert(totals.cards === 1, "totals.cards deve ser 1 no dataset one");
console.assert(totals.lessons === 1, "totals.lessons deve ser 1 no dataset one");
console.assert(totals.news === 1, "totals.news deve ser 1 no dataset one");
console.assert(totals.scores === 1, "totals.scores deve ser 1 no dataset one");
