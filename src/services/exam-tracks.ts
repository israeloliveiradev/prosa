import type { TargetLang } from "../types/database.js";

export const EXAM_IDS = ["toefl", "ielts", "dele", "delf", "goethe", "jlpt", "torfl"] as const;
export type ExamId = (typeof EXAM_IDS)[number];

export interface ExamScale {
  min: number;
  max: number;
  step: number;
}

export interface ExamTrack {
  id: ExamId;
  langs: TargetLang[];
  title: string;
  scale: ExamScale;
}

export type ExamSection = "reading" | "listening" | "use";

export interface ExamChoice {
  id: string;
  section: ExamSection;
  prompt: string;
  passage?: string;
  audio?: string;
  options: [string, string, string, string];
  answer: number;
}

export interface ExamSections {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}

export const MOCK_SECONDS = 720;

export const EXAMS: Record<ExamId, ExamTrack> = {
  toefl: { id: "toefl", langs: ["en"], title: "TOEFL", scale: { min: 0, max: 120, step: 1 } },
  ielts: { id: "ielts", langs: ["en"], title: "IELTS", scale: { min: 0, max: 9, step: 0.5 } },
  dele: { id: "dele", langs: ["es"], title: "DELE", scale: { min: 0, max: 100, step: 1 } },
  delf: { id: "delf", langs: ["fr"], title: "DELF", scale: { min: 0, max: 100, step: 1 } },
  goethe: { id: "goethe", langs: ["de"], title: "Goethe", scale: { min: 0, max: 100, step: 1 } },
  jlpt: { id: "jlpt", langs: ["ja"], title: "JLPT", scale: { min: 0, max: 180, step: 1 } },
  torfl: { id: "torfl", langs: ["ru"], title: "TORFL", scale: { min: 0, max: 100, step: 1 } },
};

const BANK: Record<ExamId, { items: ExamChoice[]; writing: string; speaking: string }> = {
  toefl: {
    items: [
      {
        id: "toefl-r1",
        section: "reading",
        passage:
          "The campus library will open one hour later on weekdays next term. Staff say the change frees a morning slot for a citation workshop. Students who work before class asked for Saturday hours instead. The library kept Saturday closed and added two evening desks.",
        prompt: "What will change next term?",
        options: [
          "Weekday opening moves later.",
          "Saturday hours were added.",
          "The workshop was cancelled.",
          "Evening desks were removed.",
        ],
        answer: 0,
      },
      {
        id: "toefl-r2",
        section: "reading",
        passage:
          "A lab study asked first-year students to annotate a paper before class. Those who wrote questions in the margin recalled more of the method than those who only highlighted. The authors stop short of claiming the habit raises exam scores.",
        prompt: "What did the study actually show?",
        options: [
          "Margin questions helped memory of the method.",
          "Highlighting raised exam scores.",
          "The habit was required in every lab.",
          "First-year students rejected annotation.",
        ],
        answer: 0,
      },
      {
        id: "toefl-l1",
        section: "listening",
        audio:
          "The bike share by the south gate closes at dusk this week. If you still have a bike, leave it at the rack near the union before eight. After that, a late fee applies.",
        prompt: "What should a rider do this week?",
        options: [
          "Return the bike to the union rack before eight.",
          "Keep the bike after dusk without a fee.",
          "Collect a bike at the south gate after eight.",
          "Pay the fee before taking a bike.",
        ],
        answer: 0,
      },
      {
        id: "toefl-u1",
        section: "use",
        prompt: "The sample was small; ____, the pattern held across two campuses.",
        options: ["nevertheless", "because", "unless", "instead"],
        answer: 0,
      },
    ],
    writing:
      "A campus wants to move weekday library hours one hour later to run a morning workshop. Write a short opinion: who gains, who loses, and one change you would make.",
    speaking: "Describe a change on a campus or at work and say how people reacted. Give one reason and one example.",
  },
  ielts: {
    items: [
      {
        id: "ielts-r1",
        section: "reading",
        passage:
          "Several coastal towns now close the seafront road on Sundays. Shops near the pier say walkers stay longer. Drivers who commute along the shore must take the inland ring, which adds twelve minutes.",
        prompt: "What is a result of the Sunday closure?",
        options: [
          "Shore commuters take a longer inland route.",
          "Shops near the pier close on Sundays.",
          "The seafront road stays open for buses only.",
          "Walkers are asked to leave the pier.",
        ],
        answer: 0,
      },
      {
        id: "ielts-r2",
        section: "reading",
        passage:
          "A city trial paid residents to swap one car trip a week for a shared van. After six months, noise on the measured street fell, but Saturday traffic was unchanged because the vans did not run then.",
        prompt: "Why did Saturday traffic stay the same?",
        options: [
          "The shared vans did not run on Saturdays.",
          "Residents refused the payment.",
          "The trial lasted only one week.",
          "Noise rose on every street.",
        ],
        answer: 0,
      },
      {
        id: "ielts-l1",
        section: "listening",
        audio:
          "The 14:10 to Bath will leave from platform 3, not platform 1. Passengers who already scanned a ticket should stay by the stairs. A member of staff will walk you across.",
        prompt: "Where does the 14:10 leave from?",
        options: ["Platform 3", "Platform 1", "The ticket hall", "The bus stand"],
        answer: 0,
      },
      {
        id: "ielts-u1",
        section: "use",
        prompt: "I am writing to ask ____ the deposit can be returned by the 12th.",
        options: ["whether", "unless", "although", "despite"],
        answer: 0,
      },
    ],
    writing:
      "Some towns close a main road to cars on Sundays so people can walk. Write about one advantage, one drawback, and your view.",
    speaking: "Describe a place where you learned something useful. Say what you learned and why it stayed with you.",
  },
  dele: {
    items: [
      {
        id: "dele-r1",
        section: "reading",
        passage:
          "La biblioteca del barrio cierra los lunes por inventario. Quien tenga un libro vencido puede dejarlo en el buzón de la entrada. Las multas se congelan esa semana.",
        prompt: "¿Qué pueden hacer los lectores el lunes?",
        options: [
          "Dejar el libro vencido en el buzón.",
          "Entrar a consultar el inventario.",
          "Pagar la multa en la sala.",
          "Pedir un libro nuevo en la ventanilla.",
        ],
        answer: 0,
      },
      {
        id: "dele-r2",
        section: "reading",
        passage:
          "El mercado de San Blas cambia de hora en agosto: abre a las ocho y cierra a las una. Los puestos de fruta piden sombra extra porque el sol da de frente.",
        prompt: "¿Qué cambia en agosto?",
        options: [
          "El horario del mercado.",
          "El día de cierre semanal.",
          "El precio de la fruta.",
          "La dirección del mercado.",
        ],
        answer: 0,
      },
      {
        id: "dele-l1",
        section: "listening",
        audio:
          "Hola, soy Marta del tercero. El fontanero viene mañana a las diez. Si no estás, deja la llave con el portero y avísame por mensaje.",
        prompt: "¿Qué pide Marta?",
        options: [
          "Dejar la llave con el portero si no hay nadie.",
          "Llamar al fontanero a las diez.",
          "Abrir el piso del portero.",
          "Cancelar la visita de mañana.",
        ],
        answer: 0,
      },
      {
        id: "dele-u1",
        section: "use",
        prompt: "Te recomiendo que ____ el tren de las siete.",
        options: ["tomes", "tomas", "tomar", "tomaste"],
        answer: 0,
      },
    ],
    writing:
      "Escribe un correo al casero: el agua caliente falla por la noche. Explica el problema, pide una fecha de visita y ofrece un horario.",
    speaking: "Describe un mercado o una feria que conozcas. Di qué se vende y por qué vale la pena ir.",
  },
  delf: {
    items: [
      {
        id: "delf-r1",
        section: "reading",
        passage:
          "La mairie ferme le guichet des cartes le vendredi après-midi. Un dépôt de dossier reste possible dans la boîte de l'entrée jusqu'à 17 h. Les rendez-vous du samedi sont maintenus.",
        prompt: "Que peut-on encore faire le vendredi après-midi ?",
        options: [
          "Déposer un dossier dans la boîte.",
          "Retirer une carte au guichet.",
          "Annuler les rendez-vous du samedi.",
          "Ouvrir le guichet jusqu'à 19 h.",
        ],
        answer: 0,
      },
      {
        id: "delf-r2",
        section: "reading",
        passage:
          "Le club de lecture change de salle : on se retrouve désormais à l'étage, au fond du couloir. Les livres du mois restent en libre accès près de la fenêtre.",
        prompt: "Où se réunit le club maintenant ?",
        options: [
          "À l'étage, au fond du couloir.",
          "Près de la fenêtre du rez-de-chaussée.",
          "Devant la mairie.",
          "Dans la boîte de l'entrée.",
        ],
        answer: 0,
      },
      {
        id: "delf-l1",
        section: "listening",
        audio:
          "Salut, c'est Léa. Le cours de ce soir commence un quart d'heure plus tard. Apporte la fiche de la semaine dernière, on la corrige ensemble.",
        prompt: "Que dit Léa ?",
        options: [
          "Le cours commence un quart d'heure plus tard.",
          "Le cours est annulé.",
          "Il ne faut pas apporter la fiche.",
          "Le cours avance d'un quart d'heure.",
        ],
        answer: 0,
      },
      {
        id: "delf-u1",
        section: "use",
        prompt: "Quand j'étais petit, nous ____ souvent à la mer.",
        options: ["allions", "sommes allés", "irons", "allons"],
        answer: 0,
      },
    ],
    writing:
      "Écris un message à une famille d'accueil : tu arrives mardi soir, tu as une allergie aux noix, et tu demandes l'heure du dîner.",
    speaking: "Décris un quartier que tu aimes. Dis ce qu'on y trouve et pourquoi tu y retournes.",
  },
  goethe: {
    items: [
      {
        id: "goethe-r1",
        section: "reading",
        passage:
          "Der Verein schließt die Halle am Donnerstag für eine Prüfung. Wer einen Schlüssel hat, gibt ihn bis Mittwoch im Büro ab. Die Abendgruppe trifft sich stattdessen im Café nebenan.",
        prompt: "Was sollen Schlüsselinhaber tun?",
        options: [
          "Den Schlüssel bis Mittwoch im Büro abgeben.",
          "Die Halle am Donnerstag selbst öffnen.",
          "Die Prüfung in der Halle schreiben.",
          "Das Café am Mittwoch schließen.",
        ],
        answer: 0,
      },
      {
        id: "goethe-r2",
        section: "reading",
        passage:
          "Ab Mai fährt der Bus 12 nur noch bis zum Markt, nicht bis zum See. Wer zum See will, steigt am Markt in die Linie 4 um.",
        prompt: "Wie kommt man ab Mai zum See?",
        options: [
          "Am Markt in die Linie 4 umsteigen.",
          "Mit dem Bus 12 direkt zum See fahren.",
          "Die Linie 4 am See verlassen.",
          "Den Bus 12 am Donnerstag nehmen.",
        ],
        answer: 0,
      },
      {
        id: "goethe-l1",
        section: "listening",
        audio:
          "Der Zug nach Mainz fällt heute aus. Ein Ersatzbus wartet am Bahnhofsvorplatz. Bitte die Fahrkarte bereithalten.",
        prompt: "Was sollen die Fahrgäste tun?",
        options: [
          "Den Ersatzbus am Vorplatz nehmen.",
          "Im Zug nach Mainz bleiben.",
          "Die Fahrkarte weglegen.",
          "Den Bahnsteig wechseln und warten.",
        ],
        answer: 0,
      },
      {
        id: "goethe-u1",
        section: "use",
        prompt: "Ich bleibe zu Hause, ____ das Wetter schlecht ist.",
        options: ["weil", "obwohl", "damit", "ohne"],
        answer: 0,
      },
    ],
    writing:
      "Schreibe eine kurze Beschwerde an die Hausverwaltung: nach 22 Uhr ist es im Hof sehr laut. Nenne das Problem, eine Folge und eine Bitte.",
    speaking: "Beschreibe einen Weg von einem Bahnhof zu einem Café. Nenne zwei Orientierungspunkte.",
  },
  jlpt: {
    items: [
      {
        id: "jlpt-r1",
        section: "reading",
        passage: "駅の改札は二十二時に閉まります。それまでに切符を買ってください。閉じたあとは東口の案内所へ行ってください。",
        prompt: "改札が閉まったら、どうしますか。",
        options: ["東口の案内所へ行きます。", "切符を買いません。", "改札で待ちます。", "二十二時まで案内所にいます。"],
        answer: 0,
      },
      {
        id: "jlpt-r2",
        section: "reading",
        passage: "図書館は水曜日が休みです。本を返すときは、入口の箱に入れてください。",
        prompt: "水曜日に本を返すときは、どうしますか。",
        options: ["入口の箱に入れます。", "中で司書に渡します。", "次の週まで待ちます。", "箱を持って帰ります。"],
        answer: 0,
      },
      {
        id: "jlpt-l1",
        section: "listening",
        audio: "次の電車は三番線です。二番線ではありません。黄色い線のうしろで待ってください。",
        prompt: "電車はどこに来ますか。",
        options: ["三番線", "二番線", "黄色い線の前", "改札の外"],
        answer: 0,
      },
      {
        id: "jlpt-u1",
        section: "use",
        prompt: "駅____切符を買います。",
        options: ["で", "を", "が", "へ"],
        answer: 0,
      },
    ],
    writing: "駅や図書館の新しいルールについて、短い意見を書いてください。理由を一つ入れてください。",
    speaking: "よく行く場所を一つ話してください。そこで何をするか、なぜ行くかを言ってください。",
  },
  torfl: {
    items: [
      {
        id: "torfl-r1",
        section: "reading",
        passage:
          "Библиотека закрыта по понедельникам. Книги можно оставить в ящике у входа. Штраф на этой неделе не начисляют.",
        prompt: "Что можно сделать в понедельник?",
        options: [
          "Оставить книгу в ящике у входа.",
          "Взять новый абонемент в зале.",
          "Заплатить штраф в кассе.",
          "Заказать книгу у стойки.",
        ],
        answer: 0,
      },
      {
        id: "torfl-r2",
        section: "reading",
        passage: "В августе рынок открывается в восемь и закрывается в час. Фруктовые ряды просят дополнительную тень.",
        prompt: "Что меняется в августе?",
        options: ["Часы работы рынка.", "День закрытия.", "Цена фруктов.", "Адрес рынка."],
        answer: 0,
      },
      {
        id: "torfl-l1",
        section: "listening",
        audio:
          "Это Анна с третьего этажа. Сантехник придёт завтра в десять. Если вас не будет, оставьте ключ консьержу.",
        prompt: "Что просит Анна?",
        options: [
          "Оставить ключ консьержу, если никого нет.",
          "Позвонить сантехнику в десять.",
          "Открыть квартиру консьержа.",
          "Отменить визит.",
        ],
        answer: 0,
      },
      {
        id: "torfl-u1",
        section: "use",
        prompt: "Я уже ____ письмо.",
        options: ["написал", "писал", "пишу", "написать"],
        answer: 0,
      },
    ],
    writing:
      "Напишите короткое письмо хозяину квартиры: вечером нет горячей воды. Опишите проблему, попросите день визита и предложите время.",
    speaking: "Расскажите о рынке или ярмарке. Что там продают и почему туда стоит идти.",
  },
};

export function isExamId(value: string): value is ExamId {
  return (EXAM_IDS as readonly string[]).includes(value);
}

export function examOf(id: string): ExamTrack | null {
  return isExamId(id) ? EXAMS[id] : null;
}

export function examsFor(lang: string): ExamTrack[] {
  const code = lang.trim().toLowerCase();
  return EXAM_IDS.map((id) => EXAMS[id]).filter((exam) => exam.langs.includes(code as TargetLang));
}

export function examFits(id: string, lang: string): boolean {
  const exam = examOf(id);
  return Boolean(exam && exam.langs.includes(lang.trim().toLowerCase() as TargetLang));
}

export function examBank(id: ExamId) {
  return BANK[id];
}

export function publicMock(id: ExamId) {
  const bank = BANK[id];
  return {
    exam_id: id,
    seconds: MOCK_SECONDS,
    items: bank.items.map((item) => ({
      id: item.id,
      section: item.section,
      prompt: item.prompt,
      options: [...item.options],
      ...(item.passage ? { passage: item.passage } : {}),
      ...(item.audio ? { audio: item.audio } : {}),
    })),
    writing: bank.writing,
    speaking: bank.speaking,
  };
}

export function skillSeed(profile: { reading: number; listening: number; writing: number; fluency: number }): number {
  const held = [profile.reading, profile.listening, profile.writing, profile.fluency].filter((value) => value > 0);
  if (held.length === 0) {
    return 0;
  }
  return Math.round(held.reduce((sum, value) => sum + value, 0) / held.length);
}

export function toScale(percent: number, exam: ExamTrack): number {
  const clamped = Math.max(0, Math.min(100, percent));
  const raw = exam.scale.min + (clamped / 100) * (exam.scale.max - exam.scale.min);
  return snap(raw, exam.scale.step);
}

export function examBand(id: ExamId, scaled: number): string {
  if (id === "toefl") {
    if (scaled < 42) return "A2";
    if (scaled < 72) return "B1";
    if (scaled < 95) return "B2";
    if (scaled < 114) return "C1";
    return "C2";
  }
  if (id === "ielts") {
    if (scaled < 4) return "A2";
    if (scaled < 5.5) return "B1";
    if (scaled < 7) return "B2";
    if (scaled < 8.5) return "C1";
    return "C2";
  }
  if (id === "jlpt") {
    if (scaled < 45) return "N5";
    if (scaled < 72) return "N4";
    if (scaled < 99) return "N3";
    if (scaled < 135) return "N2";
    return "N1";
  }
  if (scaled < 20) return "A1";
  if (scaled < 40) return "A2";
  if (scaled < 55) return "B1";
  if (scaled < 75) return "B2";
  if (scaled < 90) return "C1";
  return "C2";
}

export function blendForecast(previous: number | null, seedPercent: number, mockPercent: number, exam: ExamTrack): number {
  const incoming = toScale(mockPercent, exam);
  const base = previous && previous > 0 ? previous : toScale(seedPercent, exam);
  if (base === 0) {
    return incoming;
  }
  return snap(base * 0.6 + incoming * 0.4, exam.scale.step);
}

export function writingScore(text: string): number {
  return constructedScore(text, [20, 50, 90]);
}

export function speakingScore(text: string): number {
  return constructedScore(text, [12, 30, 50]);
}

export function scoreMock(
  id: ExamId,
  answers: Record<string, number>,
  writing: string,
  speaking: string,
): { raw: number; sections: ExamSections } {
  const bank = BANK[id];
  const readingHits = percents(bank.items.filter((item) => item.section === "reading" || item.section === "use"), answers);
  const listeningHits = percents(bank.items.filter((item) => item.section === "listening"), answers);
  const sections = {
    reading: readingHits,
    listening: listeningHits,
    writing: writingScore(writing),
    speaking: speakingScore(speaking),
  };
  const raw = Math.round((sections.reading + sections.listening + sections.writing + sections.speaking) / 4);
  return { raw, sections };
}

export function formatExamScore(id: ExamId, value: number): string {
  return id === "ielts" ? value.toFixed(1) : String(Math.round(value));
}

function percents(items: ExamChoice[], answers: Record<string, number>): number {
  if (items.length === 0) {
    return 0;
  }
  const hits = items.filter((item) => answers[item.id] === item.answer).length;
  return Math.round((hits / items.length) * 100);
}

function constructedScore(text: string, cuts: [number, number, number]): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }
  let score = words.length < cuts[0] ? 20 : words.length < cuts[1] ? 40 : words.length < cuts[2] ? 60 : 75;
  if (REASON.test(text)) {
    score += 10;
  }
  if (EXAMPLE.test(text)) {
    score += 10;
  }
  if (CONTRAST.test(text)) {
    score += 5;
  }
  return Math.min(100, score);
}

function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

const REASON = /\b(because|since|aunque|porque|weil|denn|car|parce|потому|так как|なので|から|reason|motivo|raison|grund|причина)\b/i;
const EXAMPLE = /\b(for example|for instance|por ejemplo|par exemple|zum beispiel|например|例えば|example|ejemplo|exemple|beispiel|пример)\b/i;
const CONTRAST = /\b(however|although|aunque|cependant|obwohl|однако|しかし|but|pero|mais|aber|но)\b/i;
