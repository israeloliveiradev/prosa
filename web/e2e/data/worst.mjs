/**
 * Dataset Worst: casos extremos e de estresse visual baseados no CATALOG.md
 * Testa overflow, quebra de linha em nomes longos, emails sem espaços, CJK,
 * caracteres RTL, tags de script e números limítrofes.
 */

export const users = {
  long_compound: {
    id: "usr_worst_01",
    email: "bartholomew.fitzgerald@northwind-industries-holdings.example.com",
    native_lang: "pt",
    target_lang: "en",
    level: "C2",
    plan: "pro",
    role: "learner",
    display_name: "Aleksandra Wiśniewska-Kowalczyk",
    display_locale: "pt",
    streak_count: 1284,
    streak_freeze_count: 0,
    reminder_enabled: true,
    reminder_hour: 23,
    interests: ["Paramètres de confidentialité et de sécurité", "Benachrichtigungseinstellungen"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
  short_edge: {
    id: "usr_worst_02",
    email: "a@b.co",
    native_lang: "pt",
    target_lang: "en",
    level: "A1",
    plan: "free",
    role: "learner",
    display_name: "J",
    display_locale: "en",
    streak_count: 0,
    streak_freeze_count: 0,
    reminder_enabled: false,
    reminder_hour: 0,
    interests: [],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
  cjk_rtl_emoji: {
    id: "usr_worst_03",
    email: "ops@sub.department.region.example.co.uk",
    native_lang: "pt",
    target_lang: "en",
    level: "B1",
    plan: "pro",
    role: "learner",
    display_name: "Đặng Thị Ngọc Hân — 🦊 Fox",
    display_locale: "pt",
    streak_count: 1000000,
    streak_freeze_count: 5,
    reminder_enabled: true,
    reminder_hour: 12,
    interests: ["王秀英", "نور الهدى عبد الرحمن", "<script>alert(1)</script>"],
    mind_reading: "Machado de Assis",
    mind_memory: "Guimarães Rosa",
    mind_speech: "Clarice Lispector",
    mind_journal: "Graciliano Ramos",
  },
};

export const cards = [
  {
    client_id: "card_worst_01",
    front_phrase: "Benachrichtigungseinstellungen und Datenschutzvereinbarungen",
    back_translation: "Configurações de notificação e termos de privacidade para usuários avançados",
    context_sentence: "Der Benutzer prüfte die Benachrichtigungseinstellungen im System.",
    quality: 0,
  },
  {
    client_id: "card_worst_02",
    front_phrase: "Đặng Thị Ngọc Hân / Seán O'Brien-Ó Súilleabháin",
    back_translation: "Nomes com diacríticos empilhados e apóstrofos irlandeses",
    context_sentence: "Seán O'Brien-Ó Súilleabháin spoke with Đặng Thị Ngọc Hân yesterday.",
    quality: 3,
  },
];

export const lessons = [
  {
    title: "<script>alert(1)</script> &amp; Senior Product Design Engineer",
    story_text: "Konstantin Oberhauser-Wettstein reviewed the twenty-page blueprint for the platform infrastructure while Christopher Alexander Montgomery III examined the structural load bearings.",
    translation: "Konstantin Oberhauser-Wettstein revisou a planta de vinte páginas para a infraestrutura de plataforma enquanto Christopher Alexander Montgomery III examinava as vigas de carga estrutural.",
    vocabulary: [
      {
        word: "platform infrastructure",
        translation: "infraestrutura de plataforma",
        context: "blueprint for the platform infrastructure",
      },
    ],
    journal_prompt: "Explique como lidar com restrições arquiteturais extremas e nomes com caracteres compostos.",
    anchors: [
      { word: "infrastructure", familiar: "infraestrutura", gloss: "infraestrutura", kind: "true" },
    ],
  },
];

export const news = [
  {
    id: "news_worst_01",
    title: "https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved",
    summary: "Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf reports a deficit of -42.5% in unhedged currency swaps of $12,345,678.90.",
    published_at: "1970-01-01T00:00:00.000Z",
    words: 1284,
  },
];

export const scores = [
  { user_name: "Christopher Alexander Montgomery III", score: 1000000, combo: 99 },
  { user_name: "Jo", score: 0, combo: 0 },
];

export const totals = {
  users: Object.keys(users).length,
  cards: cards.length,
  lessons: lessons.length,
  news: news.length,
  scores: scores.length,
};

console.assert(totals.users === 3, "totals.users deve ser 3 no dataset worst");
console.assert(totals.cards === 2, "totals.cards deve ser 2 no dataset worst");
console.assert(totals.lessons === 1, "totals.lessons deve ser 1 no dataset worst");
console.assert(totals.news === 1, "totals.news deve ser 1 no dataset worst");
console.assert(totals.scores === 2, "totals.scores deve ser 2 no dataset worst");
