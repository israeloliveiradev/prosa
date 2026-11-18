/**
 * Dataset Demo: valores típicos e realistas de demonstração para o Prosa.
 */

export const users = {
  learner: {
    id: "usr_learner_101",
    email: "ana.silva@example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "B1",
    plan: "free",
    role: "learner",
    display_name: "Ana Silva",
    display_locale: "pt",
    streak_count: 5,
    streak_freeze_count: 1,
    reminder_enabled: true,
    reminder_hour: 19,
    interests: ["tecnologia", "literatura", "viagens"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
  pro: {
    id: "usr_pro_202",
    email: "carlos.mendes@example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "B2",
    plan: "pro",
    role: "learner",
    display_name: "Carlos Mendes",
    display_locale: "pt",
    streak_count: 24,
    streak_freeze_count: 2,
    reminder_enabled: true,
    reminder_hour: 8,
    interests: ["arquitetura", "história", "cinema"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
};

export const cards = [
  {
    client_id: "card_demo_01",
    front_phrase: "take for granted",
    back_translation: "dar como certo / não valorizar",
    context_sentence: "We often take clean water for granted until it's scarce.",
    quality: 4,
  },
  {
    client_id: "card_demo_02",
    front_phrase: "run out of",
    back_translation: "ficar sem / esgotar",
    context_sentence: "We ran out of coffee before the meeting started.",
    quality: 3,
  },
  {
    client_id: "card_demo_03",
    front_phrase: "make up for",
    back_translation: "compensar por",
    context_sentence: "She worked late to make up for lost time.",
    quality: 5,
  },
];

export const lessons = [
  {
    title: "O Café da Esquina",
    story_text: "Every morning, Helena walked to the corner cafe to order an espresso. The barista greeted her by name, setting a calm tone for the workday.",
    translation: "Toda manhã, Helena caminhava até o café da esquina para pedir um expresso. O barista a cumprimentava pelo nome, definindo um tom calmo para o dia de trabalho.",
    vocabulary: [
      { word: "barista", translation: "atendente especialista em café", context: "The barista greeted her" },
      { word: "calm tone", translation: "tom tranquilo", context: "setting a calm tone" },
    ],
    journal_prompt: "Descreva seu ritual matinal favorito e como ele te prepara para o dia.",
    anchors: [
      { word: "corner", familiar: "esquina", gloss: "canto/esquina", kind: "true" },
    ],
  },
];

export const news = [
  {
    id: "news_demo_01",
    title: "Global Summit Agrees on Renewable Energy Pacts",
    summary: "Delegates from sixty countries reached an agreement on shared investments in clean power networks.",
    published_at: "2026-10-25T14:00:00.000Z",
    words: 180,
  },
  {
    id: "news_demo_02",
    title: "Urban Architecture Shifts Toward Daylight Optimization",
    summary: "New residential buildings in Lisbon combine courtyard geometries to reduce reliance on artificial lighting.",
    published_at: "2026-10-26T09:30:00.000Z",
    words: 215,
  },
];

export const scores = [
  { user_name: "Ana Silva", score: 920, combo: 12 },
  { user_name: "Carlos Mendes", score: 880, combo: 9 },
  { user_name: "Helena Prado", score: 810, combo: 8 },
];

export const totals = {
  users: Object.keys(users).length,
  cards: cards.length,
  lessons: lessons.length,
  news: news.length,
  scores: scores.length,
};

console.assert(totals.users === 2, "totals.users deve ser 2 no dataset demo");
console.assert(totals.cards === 3, "totals.cards deve ser 3 no dataset demo");
console.assert(totals.lessons === 1, "totals.lessons deve ser 1 no dataset demo");
console.assert(totals.news === 2, "totals.news deve ser 2 no dataset demo");
console.assert(totals.scores === 3, "totals.scores deve ser 3 no dataset demo");
