/**
 * Dataset Huge: listas densas e volumosas para validação de paginação,
 * scroll e descarte de nós fora de tela.
 */

export const users = {
  pro_user: {
    id: "usr_huge_01",
    email: "heavy.reader@example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "C1",
    plan: "pro",
    role: "learner",
    display_name: "Leitor Assíduo",
    display_locale: "pt",
    streak_count: 365,
    streak_freeze_count: 5,
    reminder_enabled: true,
    reminder_hour: 21,
    interests: ["literatura", "ciência", "música", "economia", "filosofia"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
};

export const cards = Array.from({ length: 60 }, (_, i) => ({
  client_id: `card_huge_${String(i + 1).padStart(3, "0")}`,
  front_phrase: `phrase-${i + 1} in study deck`,
  back_translation: `frase traduzida número ${i + 1}`,
  context_sentence: `This is the context sentence demonstrating vocabulary item ${i + 1}.`,
  quality: (i % 4) + 2,
}));

export const lessons = Array.from({ length: 10 }, (_, i) => ({
  title: `História Curta nº ${i + 1}`,
  story_text: `Chapter ${i + 1} begins with a deep inquiry into the mechanics of memory and retention across languages.`,
  translation: `O capítulo ${i + 1} começa com uma investigação profunda sobre a mecânica de memória e retenção entre idiomas.`,
  vocabulary: [
    { word: `inquiry-${i + 1}`, translation: `investigação-${i + 1}`, context: `deep inquiry ${i + 1}` },
  ],
  journal_prompt: `Reflita sobre os desdobramentos do capítulo ${i + 1}.`,
  anchors: [],
}));

export const news = Array.from({ length: 25 }, (_, i) => ({
  id: `news_huge_${String(i + 1).padStart(3, "0")}`,
  title: `Headline story ${i + 1}: Global Trends in Applied Linguistics`,
  summary: `Summary of findings published in journal volume ${i + 1} regarding adult second-language acquisition speed.`,
  published_at: "2026-10-27T10:00:00.000Z",
  words: 150 + i * 5,
}));

export const scores = Array.from({ length: 35 }, (_, i) => ({
  user_name: `Jogador ${i + 1}`,
  score: 1200 - i * 20,
  combo: Math.max(1, 15 - Math.floor(i / 2)),
}));

export const totals = {
  users: Object.keys(users).length,
  cards: cards.length,
  lessons: lessons.length,
  news: news.length,
  scores: scores.length,
};

console.assert(totals.users === 1, "totals.users deve ser 1 no dataset huge");
console.assert(totals.cards === 60, "totals.cards deve ser 60 no dataset huge");
console.assert(totals.lessons === 10, "totals.lessons deve ser 10 no dataset huge");
console.assert(totals.news === 25, "totals.news deve ser 25 no dataset huge");
console.assert(totals.scores === 35, "totals.scores deve ser 35 no dataset huge");
