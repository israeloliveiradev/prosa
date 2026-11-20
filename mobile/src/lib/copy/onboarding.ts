import type { GoalId, CefrLevel } from "@/features/onboarding/model/journey-flow";
import type { NewsTheme } from "@/lib/themes";
import { defineArea } from "./area";

/**
 * Textos do primeiro dia (/start) e do editor de temas e objetivo (/quiz),
 * nos 7 idiomas de interface.
 */
export interface OnboardingCopy extends Record<string, unknown> {
  stepOf: (current: number, total: number) => string;
  continue: string;
  saving: string;
  retry: string;
  errorOffline: string;
  errorBusy: string;
  errorFailed: string;

  welcomeKicker: string;
  welcomeTitle: string;
  welcomeBody: string;
  welcomeSession: (minutes: number) => string;
  welcomeMentors: string;
  welcomeCta: string;
  roles: { reading: string; memory: string; speech: string; journal: string };

  pairTitle: string;
  pairDek: string;
  targetLabel: string;
  supportLabel: string;
  supportHint: string;
  pairSaving: string;

  goalTitle: string;
  goalDek: string;
  goals: Record<GoalId, { title: string; caption: string }>;
  goalNoteLabel: string;
  goalNoteHint: string;

  themesTitle: string;
  themesDek: (max: number) => string;
  themesCount: (count: number, max: number) => string;
  themesFull: (max: number) => string;
  themesDuplicate: string;
  customLabel: string;
  customHint: string;
  customAdd: string;
  removeTheme: (theme: string) => string;
  yourThemes: string;
  themes: Record<NewsTheme, string>;

  timeTitle: string;
  timeDek: string;
  minutesValue: (minutes: number) => string;
  minutesCaption: Record<"10" | "20" | "30", string>;
  recommended: string;
  weeklyAim: (duration: string) => string;
  duration: (hours: number, minutes: number) => string;

  levelTitle: string;
  levelDek: string;
  testTitle: string;
  testBody: string;
  testCta: string;
  selfTitle: string;
  selfBody: string;
  selfCta: string;
  pickTitle: string;
  pickDek: string;
  confirmLevel: (level: string) => string;
  backToOptions: string;
  savingPlan: string;
  levels: Record<CefrLevel, { name: string; description: string }>;

  planKicker: string;
  planTitle: string;
  planStudy: string;
  planSupport: string;
  planLevelPlacement: string;
  planLevelSelf: string;
  planCanDo: (level: string) => string;
  planGoal: string;
  planThemes: string;
  planDaily: string;
  planDailyValue: (minutes: number, weekly: string) => string;
  planFirstTitle: string;
  planFirstBody: string;
  planStart: string;
  planEdit: string;

  quizTitle: string;
  quizDek: string;
  quizCourse: string;
  quizSave: string;
  quizCancel: string;
  quizExitTitle: string;
  quizExitMessage: string;
  quizLevel: (level: string) => string;
  quizRetake: string;
  quizNewCourse: string;
  quizLoading: string;
}

/** "2 h 20 min" para as línguas que usam h/min. */
function hm(hours: number, minutes: number, h = "h", min = "min"): string {
  if (hours > 0 && minutes > 0) return `${hours} ${h} ${minutes} ${min}`;
  if (hours > 0) return `${hours} ${h}`;
  return `${minutes} ${min}`;
}

export const ONBOARDING_COPY = defineArea<OnboardingCopy>({
  pt: {
    stepOf: (current, total) => `Passo ${current} de ${total}`,
    continue: "Continuar",
    saving: "Salvando…",
    retry: "Tentar de novo",
    errorOffline: "Sem conexão com o servidor. Verifique a internet e tente de novo.",
    errorBusy: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
    errorFailed: "Não foi possível salvar agora. Tente de novo.",

    welcomeKicker: "Primeiro dia",
    welcomeTitle: "Vamos montar o seu plano de estudo.",
    welcomeBody:
      "Você escolhe o idioma, o objetivo, os temas e o tempo por dia. Depois definimos o seu nível, e a primeira sessão é gerada a partir dessas escolhas.",
    welcomeSession: (minutes) => `A sessão completa tem ${minutes} minutos: revisão, escuta, leitura, fala e escrita.`,
    welcomeMentors: "Quem acompanha cada parte",
    welcomeCta: "Começar",
    roles: { reading: "Leitura", memory: "Memória", speech: "Fala", journal: "Diário" },

    pairTitle: "Qual idioma você quer aprender?",
    pairDek: "Cada idioma é um curso com progresso próprio. Dá para trocar depois.",
    targetLabel: "Quero aprender",
    supportLabel: "Explicações e traduções em",
    supportHint: "O idioma de apoio é sempre diferente do idioma que você estuda.",
    pairSaving: "Abrindo o curso…",

    goalTitle: "Para que você quer esse idioma?",
    goalDek: "Escolha o principal. Ele orienta as cenas e os assuntos das suas lições.",
    goals: {
      career: { title: "Carreira e trabalho", caption: "Reuniões, e-mails e entrevistas." },
      travel: { title: "Viagens", caption: "Pedir, perguntar e se virar fora do país." },
      studies: { title: "Estudos e exames", caption: "Provas, intercâmbio e leitura acadêmica." },
      culture: { title: "Cultura e entretenimento", caption: "Filmes, séries, música e livros no original." },
      family: { title: "Família e amigos", caption: "Conversar com quem você gosta." },
      relocation: { title: "Morar fora", caption: "Rotina, burocracia e vida nova em outro país." },
    },
    goalNoteLabel: "Quer contar mais? (opcional)",
    goalNoteHint: "Ex.: apresentar projetos em reuniões",

    themesTitle: "Sobre o que você gosta de ler?",
    themesDek: (max) => `Escolha de 1 a ${max} temas. As notícias e as lições partem deles.`,
    themesCount: (count, max) => `${count} de ${max}`,
    themesFull: (max) => `Limite de ${max} temas. Remova um para adicionar outro.`,
    themesDuplicate: "Esse tema já está na lista.",
    customLabel: "Outro tema (opcional)",
    customHint: "Ex.: fotografia, xadrez",
    customAdd: "Adicionar",
    removeTheme: (theme) => `Remover ${theme}`,
    yourThemes: "Temas que você escreveu",
    themes: {
      "Tecnologia e IA": "Tecnologia e IA",
      Filosofia: "Filosofia",
      Viagens: "Viagens",
      Negócios: "Negócios",
      "Cultura pop": "Cultura pop",
      Cozinha: "Cozinha",
      Ciência: "Ciência",
      Música: "Música",
    },

    timeTitle: "Quanto tempo por dia?",
    timeDek: "Isso define a sua meta diária. Dá para mudar quando quiser.",
    minutesValue: (minutes) => `${minutes} min`,
    minutesCaption: { "10": "Para dias corridos", "20": "A sessão completa", "30": "Sessão completa e prática extra" },
    recommended: "Recomendado",
    weeklyAim: (duration) => `Meta semanal: ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes),

    levelTitle: "Qual é o seu nível?",
    levelDek: "Faça o nivelamento adaptativo ou escolha o nível, se você já sabe.",
    testTitle: "Fazer o nivelamento",
    testBody: "Perguntas de leitura e escuta que se ajustam às suas respostas.",
    testCta: "Começar o nivelamento",
    selfTitle: "Já sei o meu nível",
    selfBody: "Escolha uma faixa de A1 a C2.",
    selfCta: "Escolher o nível",
    pickTitle: "Escolha o seu nível",
    pickDek: "Os níveis seguem o Quadro Europeu Comum de Referência (QECR).",
    confirmLevel: (level) => `Confirmar ${level}`,
    backToOptions: "Voltar às opções",
    savingPlan: "Salvando o seu plano…",
    levels: {
      A1: { name: "Iniciante", description: "Começando do zero ou com poucas palavras." },
      A2: { name: "Básico", description: "Entendo frases do dia a dia e me viro em situações simples." },
      B1: { name: "Intermediário", description: "Converso sobre trabalho, viagens e rotina com alguma independência." },
      B2: { name: "Intermediário avançado", description: "Entendo textos e conversas complexas e falo com fluência." },
      C1: { name: "Avançado", description: "Percebo nuances e me expresso de forma espontânea." },
      C2: { name: "Proficiente", description: "Uso o idioma com precisão próxima à de um nativo." },
    },

    planKicker: "Seu plano",
    planTitle: "Tudo pronto para começar.",
    planStudy: "Estudo",
    planSupport: "Apoio",
    planLevelPlacement: "Medido pelo nivelamento",
    planLevelSelf: "Escolhido por você",
    planCanDo: (level) => `O que o nível ${level} descreve`,
    planGoal: "Objetivo",
    planThemes: "Temas",
    planDaily: "Meta diária",
    planDailyValue: (minutes, weekly) => `${minutes} min por dia · ${weekly} por semana`,
    planFirstTitle: "Primeira sessão",
    planFirstBody: "A lição de hoje é gerada a partir dos seus temas e do seu nível.",
    planStart: "Começar a primeira sessão",
    planEdit: "Mudar escolhas",

    quizTitle: "Seus temas e objetivo",
    quizDek: "As mudanças valem a partir da próxima lição e da próxima notícia.",
    quizCourse: "Curso",
    quizSave: "Salvar",
    quizCancel: "Cancelar",
    quizExitTitle: "Sair sem salvar?",
    quizExitMessage: "As mudanças desta tela serão descartadas.",
    quizLevel: (level) => `Nível atual: ${level}`,
    quizRetake: "Refazer o nivelamento",
    quizNewCourse: "Curso novo: começa em A1. Depois, faça o nivelamento para ajustar.",
    quizLoading: "Carregando as suas escolhas…",
  },

  en: {
    stepOf: (current, total) => `Step ${current} of ${total}`,
    continue: "Continue",
    saving: "Saving…",
    retry: "Try again",
    errorOffline: "Can't reach the server. Check your connection and try again.",
    errorBusy: "Too many attempts in a row. Wait a minute and try again.",
    errorFailed: "Couldn't save right now. Please try again.",

    welcomeKicker: "First day",
    welcomeTitle: "Let's build your study plan.",
    welcomeBody:
      "You choose the language, your goal, your themes and your time per day. Then we set your level, and your first session is generated from those choices.",
    welcomeSession: (minutes) => `The full session takes ${minutes} minutes: review, listening, reading, speaking and writing.`,
    welcomeMentors: "Who guides each part",
    welcomeCta: "Get started",
    roles: { reading: "Reading", memory: "Memory", speech: "Speech", journal: "Journal" },

    pairTitle: "Which language do you want to learn?",
    pairDek: "Each language is a course with its own progress. You can switch later.",
    targetLabel: "I want to learn",
    supportLabel: "Explanations and translations in",
    supportHint: "The support language is always different from the one you study.",
    pairSaving: "Opening the course…",

    goalTitle: "What do you want this language for?",
    goalDek: "Pick the main one. It shapes the scenes and topics of your lessons.",
    goals: {
      career: { title: "Career and work", caption: "Meetings, emails and interviews." },
      travel: { title: "Travel", caption: "Order, ask and get around abroad." },
      studies: { title: "Studies and exams", caption: "Tests, exchange programs and academic reading." },
      culture: { title: "Culture and entertainment", caption: "Films, series, music and books in the original." },
      family: { title: "Family and friends", caption: "Talk with the people you care about." },
      relocation: { title: "Moving abroad", caption: "Daily life, paperwork and a new home." },
    },
    goalNoteLabel: "Want to add detail? (optional)",
    goalNoteHint: "E.g. presenting projects in meetings",

    themesTitle: "What do you like to read about?",
    themesDek: (max) => `Pick 1 to ${max} themes. Your news and lessons start from them.`,
    themesCount: (count, max) => `${count} of ${max}`,
    themesFull: (max) => `That's the limit of ${max} themes. Remove one to add another.`,
    themesDuplicate: "That theme is already on the list.",
    customLabel: "Another theme (optional)",
    customHint: "E.g. photography, chess",
    customAdd: "Add",
    removeTheme: (theme) => `Remove ${theme}`,
    yourThemes: "Themes you wrote",
    themes: {
      "Tecnologia e IA": "Technology & AI",
      Filosofia: "Philosophy",
      Viagens: "Travel",
      Negócios: "Business",
      "Cultura pop": "Pop culture",
      Cozinha: "Cooking",
      Ciência: "Science",
      Música: "Music",
    },

    timeTitle: "How much time per day?",
    timeDek: "This sets your daily goal. You can change it any time.",
    minutesValue: (minutes) => `${minutes} min`,
    minutesCaption: { "10": "For busy days", "20": "The full session", "30": "Full session plus extra practice" },
    recommended: "Recommended",
    weeklyAim: (duration) => `Weekly aim: ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes),

    levelTitle: "What's your level?",
    levelDek: "Take the adaptive placement test, or pick your level if you already know it.",
    testTitle: "Take the placement test",
    testBody: "Reading and listening questions that adapt to your answers.",
    testCta: "Start the placement test",
    selfTitle: "I already know my level",
    selfBody: "Pick a band from A1 to C2.",
    selfCta: "Choose my level",
    pickTitle: "Choose your level",
    pickDek: "Levels follow the Common European Framework of Reference (CEFR).",
    confirmLevel: (level) => `Confirm ${level}`,
    backToOptions: "Back to options",
    savingPlan: "Saving your plan…",
    levels: {
      A1: { name: "Beginner", description: "Starting from zero or with a few words." },
      A2: { name: "Elementary", description: "I understand everyday phrases and get by in simple situations." },
      B1: { name: "Intermediate", description: "I can talk about work, travel and routine with some independence." },
      B2: { name: "Upper intermediate", description: "I understand complex texts and conversations and speak fluently." },
      C1: { name: "Advanced", description: "I catch nuance and express myself spontaneously." },
      C2: { name: "Proficient", description: "I use the language with near-native precision." },
    },

    planKicker: "Your plan",
    planTitle: "All set to start.",
    planStudy: "Studying",
    planSupport: "Support",
    planLevelPlacement: "Measured by the placement test",
    planLevelSelf: "Chosen by you",
    planCanDo: (level) => `What ${level} describes`,
    planGoal: "Goal",
    planThemes: "Themes",
    planDaily: "Daily goal",
    planDailyValue: (minutes, weekly) => `${minutes} min a day · ${weekly} a week`,
    planFirstTitle: "First session",
    planFirstBody: "Today's lesson is generated from your themes and your level.",
    planStart: "Start your first session",
    planEdit: "Change choices",

    quizTitle: "Your themes and goal",
    quizDek: "Changes apply from your next lesson and your next news story.",
    quizCourse: "Course",
    quizSave: "Save",
    quizCancel: "Cancel",
    quizExitTitle: "Leave without saving?",
    quizExitMessage: "Changes on this screen will be discarded.",
    quizLevel: (level) => `Current level: ${level}`,
    quizRetake: "Retake the placement test",
    quizNewCourse: "New course: it starts at A1. Take the placement test afterwards to adjust.",
    quizLoading: "Loading your choices…",
  },

  de: {
    stepOf: (current, total) => `Schritt ${current} von ${total}`,
    continue: "Weiter",
    saving: "Wird gespeichert …",
    retry: "Erneut versuchen",
    errorOffline: "Keine Verbindung zum Server. Prüfe deine Internetverbindung und versuch es noch einmal.",
    errorBusy: "Zu viele Versuche hintereinander. Warte eine Minute und versuch es noch einmal.",
    errorFailed: "Speichern hat gerade nicht geklappt. Versuch es noch einmal.",

    welcomeKicker: "Erster Tag",
    welcomeTitle: "Lass uns deinen Lernplan erstellen.",
    welcomeBody:
      "Du wählst die Sprache, dein Ziel, deine Themen und deine Zeit pro Tag. Danach bestimmen wir dein Niveau, und deine erste Einheit entsteht aus diesen Angaben.",
    welcomeSession: (minutes) =>
      `Die vollständige Einheit dauert ${minutes} Minuten: Wiederholung, Hören, Lesen, Sprechen und Schreiben.`,
    welcomeMentors: "Wer dich in jedem Teil begleitet",
    welcomeCta: "Los geht's",
    roles: { reading: "Lesen", memory: "Gedächtnis", speech: "Sprechen", journal: "Tagebuch" },

    pairTitle: "Welche Sprache möchtest du lernen?",
    pairDek: "Jede Sprache ist ein eigener Kurs mit eigenem Fortschritt. Du kannst später wechseln.",
    targetLabel: "Ich möchte lernen",
    supportLabel: "Erklärungen und Übersetzungen auf",
    supportHint: "Die Hilfssprache ist immer eine andere als die, die du lernst.",
    pairSaving: "Kurs wird geöffnet …",

    goalTitle: "Wofür möchtest du diese Sprache?",
    goalDek: "Wähle das Wichtigste. Es prägt die Szenen und Themen deiner Lektionen.",
    goals: {
      career: { title: "Beruf und Arbeit", caption: "Meetings, E-Mails und Vorstellungsgespräche." },
      travel: { title: "Reisen", caption: "Bestellen, fragen und sich im Ausland zurechtfinden." },
      studies: { title: "Studium und Prüfungen", caption: "Prüfungen, Austausch und Fachtexte." },
      culture: { title: "Kultur und Unterhaltung", caption: "Filme, Serien, Musik und Bücher im Original." },
      family: { title: "Familie und Freunde", caption: "Mit den Menschen sprechen, die dir wichtig sind." },
      relocation: { title: "Auswandern", caption: "Alltag, Behörden und ein neues Zuhause." },
    },
    goalNoteLabel: "Möchtest du mehr erzählen? (optional)",
    goalNoteHint: "Z. B. Projekte in Meetings vorstellen",

    themesTitle: "Worüber liest du gern?",
    themesDek: (max) => `Wähle 1 bis ${max} Themen. Deine Nachrichten und Lektionen bauen darauf auf.`,
    themesCount: (count, max) => `${count} von ${max}`,
    themesFull: (max) => `Maximal ${max} Themen. Entferne eins, um ein anderes hinzuzufügen.`,
    themesDuplicate: "Dieses Thema ist schon in der Liste.",
    customLabel: "Anderes Thema (optional)",
    customHint: "Z. B. Fotografie, Schach",
    customAdd: "Hinzufügen",
    removeTheme: (theme) => `${theme} entfernen`,
    yourThemes: "Deine eigenen Themen",
    themes: {
      "Tecnologia e IA": "Technik & KI",
      Filosofia: "Philosophie",
      Viagens: "Reisen",
      Negócios: "Wirtschaft",
      "Cultura pop": "Popkultur",
      Cozinha: "Kochen",
      Ciência: "Wissenschaft",
      Música: "Musik",
    },

    timeTitle: "Wie viel Zeit pro Tag?",
    timeDek: "Das legt dein Tagesziel fest. Du kannst es jederzeit ändern.",
    minutesValue: (minutes) => `${minutes} Min.`,
    minutesCaption: { "10": "Für volle Tage", "20": "Die vollständige Einheit", "30": "Vollständige Einheit plus Extra-Übung" },
    recommended: "Empfohlen",
    weeklyAim: (duration) => `Wochenziel: ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes, "Std.", "Min."),

    levelTitle: "Wie ist dein Niveau?",
    levelDek: "Mach den adaptiven Einstufungstest oder wähle dein Niveau, wenn du es schon kennst.",
    testTitle: "Einstufungstest machen",
    testBody: "Lese- und Hörfragen, die sich an deine Antworten anpassen.",
    testCta: "Test starten",
    selfTitle: "Ich kenne mein Niveau",
    selfBody: "Wähle eine Stufe von A1 bis C2.",
    selfCta: "Niveau wählen",
    pickTitle: "Wähle dein Niveau",
    pickDek: "Die Stufen folgen dem Gemeinsamen Europäischen Referenzrahmen (GER).",
    confirmLevel: (level) => `${level} bestätigen`,
    backToOptions: "Zurück zur Auswahl",
    savingPlan: "Dein Plan wird gespeichert …",
    levels: {
      A1: { name: "Anfänger", description: "Ich fange bei null an oder kenne nur ein paar Wörter." },
      A2: { name: "Grundkenntnisse", description: "Ich verstehe Alltagssätze und komme in einfachen Situationen zurecht." },
      B1: { name: "Mittelstufe", description: "Ich unterhalte mich recht selbstständig über Arbeit, Reisen und Alltag." },
      B2: { name: "Gute Mittelstufe", description: "Ich verstehe komplexe Texte und Gespräche und spreche flüssig." },
      C1: { name: "Fortgeschritten", description: "Ich erfasse Nuancen und drücke mich spontan aus." },
      C2: { name: "Kompetente Sprachverwendung", description: "Ich verwende die Sprache fast so präzise wie Muttersprachler." },
    },

    planKicker: "Dein Plan",
    planTitle: "Alles bereit zum Start.",
    planStudy: "Du lernst",
    planSupport: "Hilfssprache",
    planLevelPlacement: "Per Einstufungstest ermittelt",
    planLevelSelf: "Von dir gewählt",
    planCanDo: (level) => `Was ${level} beschreibt`,
    planGoal: "Ziel",
    planThemes: "Themen",
    planDaily: "Tagesziel",
    planDailyValue: (minutes, weekly) => `${minutes} Min. pro Tag · ${weekly} pro Woche`,
    planFirstTitle: "Erste Einheit",
    planFirstBody: "Die heutige Lektion entsteht aus deinen Themen und deinem Niveau.",
    planStart: "Erste Einheit starten",
    planEdit: "Auswahl ändern",

    quizTitle: "Deine Themen und dein Ziel",
    quizDek: "Änderungen gelten ab der nächsten Lektion und der nächsten Nachricht.",
    quizCourse: "Kurs",
    quizSave: "Speichern",
    quizCancel: "Abbrechen",
    quizExitTitle: "Ohne Speichern verlassen?",
    quizExitMessage: "Die Änderungen auf dieser Seite gehen verloren.",
    quizLevel: (level) => `Aktuelles Niveau: ${level}`,
    quizRetake: "Einstufungstest wiederholen",
    quizNewCourse: "Neuer Kurs: Er beginnt bei A1. Mach danach den Einstufungstest, um ihn anzupassen.",
    quizLoading: "Deine Auswahl wird geladen …",
  },

  fr: {
    stepOf: (current, total) => `Étape ${current} sur ${total}`,
    continue: "Continuer",
    saving: "Enregistrement…",
    retry: "Réessayer",
    errorOffline: "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
    errorBusy: "Trop de tentatives d'affilée. Attendez une minute et réessayez.",
    errorFailed: "Impossible d'enregistrer pour le moment. Réessayez.",

    welcomeKicker: "Premier jour",
    welcomeTitle: "Construisons votre plan d'étude.",
    welcomeBody:
      "Vous choisissez la langue, votre objectif, vos thèmes et votre temps par jour. Ensuite, nous définissons votre niveau, et votre première séance est créée à partir de ces choix.",
    welcomeSession: (minutes) =>
      `La séance complète dure ${minutes} minutes : révision, écoute, lecture, expression orale et écrite.`,
    welcomeMentors: "Qui vous accompagne à chaque étape",
    welcomeCta: "Commencer",
    roles: { reading: "Lecture", memory: "Mémoire", speech: "Parole", journal: "Journal" },

    pairTitle: "Quelle langue voulez-vous apprendre ?",
    pairDek: "Chaque langue est un cours avec sa propre progression. Vous pourrez changer plus tard.",
    targetLabel: "Je veux apprendre",
    supportLabel: "Explications et traductions en",
    supportHint: "La langue d'appui est toujours différente de celle que vous étudiez.",
    pairSaving: "Ouverture du cours…",

    goalTitle: "Pourquoi voulez-vous apprendre cette langue ?",
    goalDek: "Choisissez l'objectif principal. Il oriente les scènes et les sujets de vos leçons.",
    goals: {
      career: { title: "Carrière et travail", caption: "Réunions, e-mails et entretiens." },
      travel: { title: "Voyages", caption: "Commander, demander et se débrouiller à l'étranger." },
      studies: { title: "Études et examens", caption: "Examens, échanges et lectures universitaires." },
      culture: { title: "Culture et divertissement", caption: "Films, séries, musique et livres en version originale." },
      family: { title: "Famille et amis", caption: "Parler avec les personnes qui comptent pour vous." },
      relocation: { title: "S'installer à l'étranger", caption: "Quotidien, démarches et nouvelle vie." },
    },
    goalNoteLabel: "Envie de préciser ? (facultatif)",
    goalNoteHint: "Ex. : présenter des projets en réunion",

    themesTitle: "Qu'aimez-vous lire ?",
    themesDek: (max) => `Choisissez de 1 à ${max} thèmes. Vos actualités et vos leçons en partent.`,
    themesCount: (count, max) => `${count} sur ${max}`,
    themesFull: (max) => `Limite de ${max} thèmes atteinte. Retirez-en un pour en ajouter un autre.`,
    themesDuplicate: "Ce thème est déjà dans la liste.",
    customLabel: "Autre thème (facultatif)",
    customHint: "Ex. : photographie, échecs",
    customAdd: "Ajouter",
    removeTheme: (theme) => `Retirer ${theme}`,
    yourThemes: "Vos thèmes personnels",
    themes: {
      "Tecnologia e IA": "Technologie et IA",
      Filosofia: "Philosophie",
      Viagens: "Voyages",
      Negócios: "Affaires",
      "Cultura pop": "Culture pop",
      Cozinha: "Cuisine",
      Ciência: "Sciences",
      Música: "Musique",
    },

    timeTitle: "Combien de temps par jour ?",
    timeDek: "Cela fixe votre objectif quotidien. Vous pouvez le changer à tout moment.",
    minutesValue: (minutes) => `${minutes} min`,
    minutesCaption: { "10": "Pour les journées chargées", "20": "La séance complète", "30": "Séance complète et pratique en plus" },
    recommended: "Recommandé",
    weeklyAim: (duration) => `Objectif hebdomadaire : ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes),

    levelTitle: "Quel est votre niveau ?",
    levelDek: "Passez le test de positionnement adaptatif, ou choisissez votre niveau si vous le connaissez déjà.",
    testTitle: "Passer le test de niveau",
    testBody: "Des questions de lecture et d'écoute qui s'adaptent à vos réponses.",
    testCta: "Commencer le test",
    selfTitle: "Je connais mon niveau",
    selfBody: "Choisissez un niveau de A1 à C2.",
    selfCta: "Choisir mon niveau",
    pickTitle: "Choisissez votre niveau",
    pickDek: "Les niveaux suivent le Cadre européen commun de référence (CECR).",
    confirmLevel: (level) => `Confirmer ${level}`,
    backToOptions: "Retour aux options",
    savingPlan: "Enregistrement de votre plan…",
    levels: {
      A1: { name: "Débutant", description: "Je pars de zéro ou je connais quelques mots." },
      A2: { name: "Élémentaire", description: "Je comprends des phrases du quotidien et je me débrouille dans des situations simples." },
      B1: { name: "Intermédiaire", description: "Je parle de travail, de voyages et de ma routine avec une certaine autonomie." },
      B2: { name: "Intermédiaire avancé", description: "Je comprends des textes et des conversations complexes et je m'exprime avec aisance." },
      C1: { name: "Avancé", description: "Je saisis les nuances et je m'exprime spontanément." },
      C2: { name: "Maîtrise", description: "J'utilise la langue avec une précision proche de celle d'un natif." },
    },

    planKicker: "Votre plan",
    planTitle: "Tout est prêt.",
    planStudy: "Vous étudiez",
    planSupport: "Langue d'appui",
    planLevelPlacement: "Mesuré par le test de niveau",
    planLevelSelf: "Choisi par vous",
    planCanDo: (level) => `Ce que décrit le niveau ${level}`,
    planGoal: "Objectif",
    planThemes: "Thèmes",
    planDaily: "Objectif quotidien",
    planDailyValue: (minutes, weekly) => `${minutes} min par jour · ${weekly} par semaine`,
    planFirstTitle: "Première séance",
    planFirstBody: "La leçon du jour est créée à partir de vos thèmes et de votre niveau.",
    planStart: "Commencer la première séance",
    planEdit: "Modifier mes choix",

    quizTitle: "Vos thèmes et votre objectif",
    quizDek: "Les changements s'appliquent dès la prochaine leçon et la prochaine actualité.",
    quizCourse: "Cours",
    quizSave: "Enregistrer",
    quizCancel: "Annuler",
    quizExitTitle: "Quitter sans enregistrer ?",
    quizExitMessage: "Les modifications de cet écran seront perdues.",
    quizLevel: (level) => `Niveau actuel : ${level}`,
    quizRetake: "Refaire le test de niveau",
    quizNewCourse: "Nouveau cours : il commence en A1. Passez ensuite le test pour l'ajuster.",
    quizLoading: "Chargement de vos choix…",
  },

  es: {
    stepOf: (current, total) => `Paso ${current} de ${total}`,
    continue: "Continuar",
    saving: "Guardando…",
    retry: "Reintentar",
    errorOffline: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.",
    errorBusy: "Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.",
    errorFailed: "No se pudo guardar ahora. Inténtalo de nuevo.",

    welcomeKicker: "Primer día",
    welcomeTitle: "Armemos tu plan de estudio.",
    welcomeBody:
      "Eliges el idioma, tu objetivo, tus temas y tu tiempo diario. Después definimos tu nivel, y tu primera sesión se genera a partir de esas elecciones.",
    welcomeSession: (minutes) => `La sesión completa dura ${minutes} minutos: repaso, escucha, lectura, habla y escritura.`,
    welcomeMentors: "Quién te acompaña en cada parte",
    welcomeCta: "Empezar",
    roles: { reading: "Lectura", memory: "Memoria", speech: "Habla", journal: "Diario" },

    pairTitle: "¿Qué idioma quieres aprender?",
    pairDek: "Cada idioma es un curso con su propio progreso. Puedes cambiarlo después.",
    targetLabel: "Quiero aprender",
    supportLabel: "Explicaciones y traducciones en",
    supportHint: "El idioma de apoyo siempre es distinto del que estudias.",
    pairSaving: "Abriendo el curso…",

    goalTitle: "¿Para qué quieres este idioma?",
    goalDek: "Elige el principal. Orienta las escenas y los temas de tus lecciones.",
    goals: {
      career: { title: "Carrera y trabajo", caption: "Reuniones, correos y entrevistas." },
      travel: { title: "Viajes", caption: "Pedir, preguntar y moverte en el extranjero." },
      studies: { title: "Estudios y exámenes", caption: "Exámenes, intercambios y lectura académica." },
      culture: { title: "Cultura y entretenimiento", caption: "Películas, series, música y libros en versión original." },
      family: { title: "Familia y amigos", caption: "Hablar con las personas que te importan." },
      relocation: { title: "Vivir en el extranjero", caption: "Rutina, trámites y una vida nueva." },
    },
    goalNoteLabel: "¿Quieres contar más? (opcional)",
    goalNoteHint: "Ej.: presentar proyectos en reuniones",

    themesTitle: "¿Sobre qué te gusta leer?",
    themesDek: (max) => `Elige de 1 a ${max} temas. Tus noticias y lecciones parten de ellos.`,
    themesCount: (count, max) => `${count} de ${max}`,
    themesFull: (max) => `Llegaste al límite de ${max} temas. Quita uno para añadir otro.`,
    themesDuplicate: "Ese tema ya está en la lista.",
    customLabel: "Otro tema (opcional)",
    customHint: "Ej.: fotografía, ajedrez",
    customAdd: "Añadir",
    removeTheme: (theme) => `Quitar ${theme}`,
    yourThemes: "Temas que escribiste",
    themes: {
      "Tecnologia e IA": "Tecnología e IA",
      Filosofia: "Filosofía",
      Viagens: "Viajes",
      Negócios: "Negocios",
      "Cultura pop": "Cultura pop",
      Cozinha: "Cocina",
      Ciência: "Ciencia",
      Música: "Música",
    },

    timeTitle: "¿Cuánto tiempo al día?",
    timeDek: "Esto define tu meta diaria. Puedes cambiarla cuando quieras.",
    minutesValue: (minutes) => `${minutes} min`,
    minutesCaption: { "10": "Para días ocupados", "20": "La sesión completa", "30": "Sesión completa y práctica extra" },
    recommended: "Recomendado",
    weeklyAim: (duration) => `Meta semanal: ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes),

    levelTitle: "¿Cuál es tu nivel?",
    levelDek: "Haz la prueba de nivel adaptativa o elige tu nivel si ya lo sabes.",
    testTitle: "Hacer la prueba de nivel",
    testBody: "Preguntas de lectura y escucha que se ajustan a tus respuestas.",
    testCta: "Empezar la prueba",
    selfTitle: "Ya sé mi nivel",
    selfBody: "Elige un nivel de A1 a C2.",
    selfCta: "Elegir mi nivel",
    pickTitle: "Elige tu nivel",
    pickDek: "Los niveles siguen el Marco Común Europeo de Referencia (MCER).",
    confirmLevel: (level) => `Confirmar ${level}`,
    backToOptions: "Volver a las opciones",
    savingPlan: "Guardando tu plan…",
    levels: {
      A1: { name: "Principiante", description: "Empiezo desde cero o sé algunas palabras." },
      A2: { name: "Básico", description: "Entiendo frases cotidianas y me defiendo en situaciones simples." },
      B1: { name: "Intermedio", description: "Hablo de trabajo, viajes y rutina con cierta autonomía." },
      B2: { name: "Intermedio alto", description: "Entiendo textos y conversaciones complejas y hablo con fluidez." },
      C1: { name: "Avanzado", description: "Capto matices y me expreso con espontaneidad." },
      C2: { name: "Maestría", description: "Uso el idioma con una precisión casi nativa." },
    },

    planKicker: "Tu plan",
    planTitle: "Todo listo para empezar.",
    planStudy: "Estudias",
    planSupport: "Apoyo",
    planLevelPlacement: "Medido por la prueba de nivel",
    planLevelSelf: "Elegido por ti",
    planCanDo: (level) => `Lo que describe el nivel ${level}`,
    planGoal: "Objetivo",
    planThemes: "Temas",
    planDaily: "Meta diaria",
    planDailyValue: (minutes, weekly) => `${minutes} min al día · ${weekly} a la semana`,
    planFirstTitle: "Primera sesión",
    planFirstBody: "La lección de hoy se genera a partir de tus temas y tu nivel.",
    planStart: "Empezar la primera sesión",
    planEdit: "Cambiar elecciones",

    quizTitle: "Tus temas y objetivo",
    quizDek: "Los cambios se aplican desde la próxima lección y la próxima noticia.",
    quizCourse: "Curso",
    quizSave: "Guardar",
    quizCancel: "Cancelar",
    quizExitTitle: "¿Salir sin guardar?",
    quizExitMessage: "Los cambios de esta pantalla se descartarán.",
    quizLevel: (level) => `Nivel actual: ${level}`,
    quizRetake: "Repetir la prueba de nivel",
    quizNewCourse: "Curso nuevo: empieza en A1. Después haz la prueba de nivel para ajustarlo.",
    quizLoading: "Cargando tus elecciones…",
  },

  it: {
    stepOf: (current, total) => `Passo ${current} di ${total}`,
    continue: "Continua",
    saving: "Salvataggio…",
    retry: "Riprova",
    errorOffline: "Impossibile raggiungere il server. Controlla la connessione e riprova.",
    errorBusy: "Troppi tentativi di fila. Aspetta un minuto e riprova.",
    errorFailed: "Impossibile salvare adesso. Riprova.",

    welcomeKicker: "Primo giorno",
    welcomeTitle: "Costruiamo il tuo piano di studio.",
    welcomeBody:
      "Scegli la lingua, il tuo obiettivo, i tuoi temi e il tempo al giorno. Poi definiamo il tuo livello, e la prima sessione nasce da queste scelte.",
    welcomeSession: (minutes) => `La sessione completa dura ${minutes} minuti: ripasso, ascolto, lettura, parlato e scrittura.`,
    welcomeMentors: "Chi ti accompagna in ogni parte",
    welcomeCta: "Inizia",
    roles: { reading: "Lettura", memory: "Memoria", speech: "Parlato", journal: "Diario" },

    pairTitle: "Quale lingua vuoi imparare?",
    pairDek: "Ogni lingua è un corso con i propri progressi. Puoi cambiare più tardi.",
    targetLabel: "Voglio imparare",
    supportLabel: "Spiegazioni e traduzioni in",
    supportHint: "La lingua di supporto è sempre diversa da quella che studi.",
    pairSaving: "Apertura del corso…",

    goalTitle: "Perché vuoi imparare questa lingua?",
    goalDek: "Scegli l'obiettivo principale. Orienta le scene e gli argomenti delle tue lezioni.",
    goals: {
      career: { title: "Carriera e lavoro", caption: "Riunioni, e-mail e colloqui." },
      travel: { title: "Viaggi", caption: "Ordinare, chiedere e orientarsi all'estero." },
      studies: { title: "Studio ed esami", caption: "Esami, scambi e letture accademiche." },
      culture: { title: "Cultura e intrattenimento", caption: "Film, serie, musica e libri in lingua originale." },
      family: { title: "Famiglia e amici", caption: "Parlare con le persone a cui tieni." },
      relocation: { title: "Trasferirsi all'estero", caption: "Quotidianità, burocrazia e una nuova vita." },
    },
    goalNoteLabel: "Vuoi aggiungere dettagli? (facoltativo)",
    goalNoteHint: "Es.: presentare progetti nelle riunioni",

    themesTitle: "Di cosa ti piace leggere?",
    themesDek: (max) => `Scegli da 1 a ${max} temi. Notizie e lezioni partono da qui.`,
    themesCount: (count, max) => `${count} su ${max}`,
    themesFull: (max) => `Hai raggiunto il limite di ${max} temi. Rimuovine uno per aggiungerne un altro.`,
    themesDuplicate: "Questo tema è già nella lista.",
    customLabel: "Altro tema (facoltativo)",
    customHint: "Es.: fotografia, scacchi",
    customAdd: "Aggiungi",
    removeTheme: (theme) => `Rimuovi ${theme}`,
    yourThemes: "I temi che hai scritto",
    themes: {
      "Tecnologia e IA": "Tecnologia e IA",
      Filosofia: "Filosofia",
      Viagens: "Viaggi",
      Negócios: "Affari",
      "Cultura pop": "Cultura pop",
      Cozinha: "Cucina",
      Ciência: "Scienza",
      Música: "Musica",
    },

    timeTitle: "Quanto tempo al giorno?",
    timeDek: "Questo definisce il tuo obiettivo giornaliero. Puoi cambiarlo quando vuoi.",
    minutesValue: (minutes) => `${minutes} min`,
    minutesCaption: { "10": "Per le giornate piene", "20": "La sessione completa", "30": "Sessione completa e pratica extra" },
    recommended: "Consigliato",
    weeklyAim: (duration) => `Obiettivo settimanale: ${duration}`,
    duration: (hours, minutes) => hm(hours, minutes),

    levelTitle: "Qual è il tuo livello?",
    levelDek: "Fai il test di livello adattivo o scegli il livello se lo conosci già.",
    testTitle: "Fare il test di livello",
    testBody: "Domande di lettura e ascolto che si adattano alle tue risposte.",
    testCta: "Inizia il test",
    selfTitle: "Conosco già il mio livello",
    selfBody: "Scegli un livello da A1 a C2.",
    selfCta: "Scegli il livello",
    pickTitle: "Scegli il tuo livello",
    pickDek: "I livelli seguono il Quadro comune europeo di riferimento (QCER).",
    confirmLevel: (level) => `Conferma ${level}`,
    backToOptions: "Torna alle opzioni",
    savingPlan: "Salvataggio del tuo piano…",
    levels: {
      A1: { name: "Principiante", description: "Parto da zero o conosco poche parole." },
      A2: { name: "Elementare", description: "Capisco frasi quotidiane e me la cavo in situazioni semplici." },
      B1: { name: "Intermedio", description: "Parlo di lavoro, viaggi e routine con una certa autonomia." },
      B2: { name: "Intermedio superiore", description: "Capisco testi e conversazioni complesse e parlo con scioltezza." },
      C1: { name: "Avanzato", description: "Colgo le sfumature e mi esprimo in modo spontaneo." },
      C2: { name: "Padronanza", description: "Uso la lingua con una precisione quasi da madrelingua." },
    },

    planKicker: "Il tuo piano",
    planTitle: "Tutto pronto per iniziare.",
    planStudy: "Studi",
    planSupport: "Supporto",
    planLevelPlacement: "Misurato dal test di livello",
    planLevelSelf: "Scelto da te",
    planCanDo: (level) => `Cosa descrive il livello ${level}`,
    planGoal: "Obiettivo",
    planThemes: "Temi",
    planDaily: "Obiettivo giornaliero",
    planDailyValue: (minutes, weekly) => `${minutes} min al giorno · ${weekly} a settimana`,
    planFirstTitle: "Prima sessione",
    planFirstBody: "La lezione di oggi nasce dai tuoi temi e dal tuo livello.",
    planStart: "Inizia la prima sessione",
    planEdit: "Modifica le scelte",

    quizTitle: "I tuoi temi e obiettivo",
    quizDek: "Le modifiche valgono dalla prossima lezione e dalla prossima notizia.",
    quizCourse: "Corso",
    quizSave: "Salva",
    quizCancel: "Annulla",
    quizExitTitle: "Uscire senza salvare?",
    quizExitMessage: "Le modifiche di questa schermata andranno perse.",
    quizLevel: (level) => `Livello attuale: ${level}`,
    quizRetake: "Rifai il test di livello",
    quizNewCourse: "Nuovo corso: parte da A1. Poi fai il test di livello per regolarlo.",
    quizLoading: "Caricamento delle tue scelte…",
  },

  ja: {
    stepOf: (current, total) => `ステップ ${current} / ${total}`,
    continue: "次へ",
    saving: "保存中…",
    retry: "再試行",
    errorOffline: "サーバーに接続できません。インターネット接続を確認して、もう一度お試しください。",
    errorBusy: "短時間に試行が多すぎます。1分待ってからもう一度お試しください。",
    errorFailed: "今は保存できませんでした。もう一度お試しください。",

    welcomeKicker: "1日目",
    welcomeTitle: "あなたの学習プランを作りましょう。",
    welcomeBody:
      "学ぶ言語、目的、テーマ、1日の学習時間を選んでください。そのあとレベルを決めると、最初のセッションがその選択から作られます。",
    welcomeSession: (minutes) => `フルセッションは${minutes}分です：復習、リスニング、リーディング、スピーキング、ライティング。`,
    welcomeMentors: "各パートを担当するメンター",
    welcomeCta: "始める",
    roles: { reading: "読解", memory: "記憶", speech: "発話", journal: "日記" },

    pairTitle: "どの言語を学びたいですか？",
    pairDek: "言語ごとに別のコースとして進捗が記録されます。あとで変更できます。",
    targetLabel: "学びたい言語",
    supportLabel: "説明と翻訳の言語",
    supportHint: "サポート言語は学習する言語と同じにはできません。",
    pairSaving: "コースを開いています…",

    goalTitle: "この言語を何のために学びますか？",
    goalDek: "いちばん大切な目的を選んでください。レッスンの場面や話題に反映されます。",
    goals: {
      career: { title: "キャリア・仕事", caption: "会議、メール、面接。" },
      travel: { title: "旅行", caption: "海外で注文し、尋ね、移動する。" },
      studies: { title: "勉強・試験", caption: "試験、留学、学術的な読解。" },
      culture: { title: "文化・エンタメ", caption: "映画、ドラマ、音楽、本を原語で。" },
      family: { title: "家族・友人", caption: "大切な人と話す。" },
      relocation: { title: "海外移住", caption: "生活、手続き、新しい暮らし。" },
    },
    goalNoteLabel: "詳しく書きますか？（任意）",
    goalNoteHint: "例：会議でプロジェクトを発表する",

    themesTitle: "どんな話題を読みたいですか？",
    themesDek: (max) => `テーマを1〜${max}個選んでください。ニュースとレッスンはここから作られます。`,
    themesCount: (count, max) => `${count} / ${max}`,
    themesFull: (max) => `テーマは${max}個までです。追加するにはどれかを外してください。`,
    themesDuplicate: "そのテーマはすでにリストにあります。",
    customLabel: "その他のテーマ（任意）",
    customHint: "例：写真、チェス",
    customAdd: "追加",
    removeTheme: (theme) => `${theme}を外す`,
    yourThemes: "自分で追加したテーマ",
    themes: {
      "Tecnologia e IA": "テクノロジー・AI",
      Filosofia: "哲学",
      Viagens: "旅行",
      Negócios: "ビジネス",
      "Cultura pop": "ポップカルチャー",
      Cozinha: "料理",
      Ciência: "科学",
      Música: "音楽",
    },

    timeTitle: "1日にどれくらい学習しますか？",
    timeDek: "1日の目標になります。いつでも変更できます。",
    minutesValue: (minutes) => `${minutes}分`,
    minutesCaption: { "10": "忙しい日に", "20": "フルセッション", "30": "フルセッション＋追加練習" },
    recommended: "おすすめ",
    weeklyAim: (duration) => `週の目標：${duration}`,
    duration: (hours, minutes) => {
      if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
      if (hours > 0) return `${hours}時間`;
      return `${minutes}分`;
    },

    levelTitle: "あなたのレベルは？",
    levelDek: "アダプティブなレベル診断を受けるか、すでにわかっていればレベルを選んでください。",
    testTitle: "レベル診断を受ける",
    testBody: "回答に合わせて難易度が変わる読解・リスニング問題です。",
    testCta: "診断を始める",
    selfTitle: "自分のレベルを知っている",
    selfBody: "A1〜C2から選びます。",
    selfCta: "レベルを選ぶ",
    pickTitle: "レベルを選んでください",
    pickDek: "レベルはヨーロッパ言語共通参照枠（CEFR）に基づきます。",
    confirmLevel: (level) => `${level}で確定`,
    backToOptions: "選択肢に戻る",
    savingPlan: "プランを保存しています…",
    levels: {
      A1: { name: "入門", description: "ゼロから始める、または単語を少し知っている。" },
      A2: { name: "初級", description: "日常的な表現がわかり、簡単な場面で対応できる。" },
      B1: { name: "中級", description: "仕事や旅行、日常生活についてある程度自分で話せる。" },
      B2: { name: "中上級", description: "複雑な文章や会話を理解し、流暢に話せる。" },
      C1: { name: "上級", description: "ニュアンスをつかみ、自然に自分を表現できる。" },
      C2: { name: "熟達", description: "ネイティブに近い正確さで言語を使える。" },
    },

    planKicker: "あなたのプラン",
    planTitle: "準備ができました。",
    planStudy: "学習言語",
    planSupport: "サポート言語",
    planLevelPlacement: "レベル診断で測定",
    planLevelSelf: "自分で選択",
    planCanDo: (level) => `${level}レベルの目安`,
    planGoal: "目的",
    planThemes: "テーマ",
    planDaily: "1日の目標",
    planDailyValue: (minutes, weekly) => `1日${minutes}分・週${weekly}`,
    planFirstTitle: "最初のセッション",
    planFirstBody: "今日のレッスンはあなたのテーマとレベルから作られます。",
    planStart: "最初のセッションを始める",
    planEdit: "選択を変更する",

    quizTitle: "テーマと目的",
    quizDek: "変更は次のレッスンと次のニュースから反映されます。",
    quizCourse: "コース",
    quizSave: "保存",
    quizCancel: "キャンセル",
    quizExitTitle: "保存せずに終了しますか？",
    quizExitMessage: "この画面での変更は破棄されます。",
    quizLevel: (level) => `現在のレベル：${level}`,
    quizRetake: "レベル診断をやり直す",
    quizNewCourse: "新しいコースはA1から始まります。あとでレベル診断を受けて調整してください。",
    quizLoading: "選択内容を読み込んでいます…",
  },
});
