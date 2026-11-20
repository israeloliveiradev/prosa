import type { DisplayLocale } from "@/lib/i18n";

/**
 * Descritores "eu consigo…" do CEFR por faixa, nos 7 idiomas de interface.
 *
 * Servem para o aluno ver o que o nível medido significa na prática e, se quiser,
 * marcar o que já faz (autoavaliação das habilidades produtivas, que a prova de
 * múltipla escolha não mede).
 */
export const CEFR_BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrBand = (typeof CEFR_BANDS)[number];

export type CanDoSkill = "reading" | "listening" | "speaking" | "writing";

export type CanDoText = Record<DisplayLocale, string>;

export interface CanDoItem {
  id: string;
  skill: CanDoSkill;
  text: CanDoText;
}

const DESCRIPTORS: Record<CefrBand, CanDoItem[]> = {
  A1: [
    {
      id: "a1-read",
      skill: "reading",
      text: {
        pt: "Leio avisos curtos e nomes no cotidiano.",
        en: "I can read short everyday notices and names.",
        de: "Ich kann kurze Hinweise und Namen im Alltag lesen.",
        fr: "Je peux lire de courts avis et des noms du quotidien.",
        es: "Puedo leer avisos cortos y nombres del día a día.",
        it: "So leggere brevi avvisi e nomi della vita quotidiana.",
        ja: "日常の短い掲示や名前を読める。",
      },
    },
    {
      id: "a1-listen",
      skill: "listening",
      text: {
        pt: "Entendo saudações e números falados devagar.",
        en: "I can follow greetings and numbers said slowly.",
        de: "Ich verstehe Begrüßungen und Zahlen, wenn langsam gesprochen wird.",
        fr: "Je comprends les salutations et les nombres dits lentement.",
        es: "Entiendo saludos y números dichos despacio.",
        it: "Capisco saluti e numeri detti lentamente.",
        ja: "ゆっくり話されたあいさつや数字が分かる。",
      },
    },
    {
      id: "a1-speak",
      skill: "speaking",
      text: {
        pt: "Consigo me apresentar e pedir uma coisa simples.",
        en: "I can introduce myself and ask for one simple thing.",
        de: "Ich kann mich vorstellen und um eine einfache Sache bitten.",
        fr: "Je peux me présenter et demander une chose simple.",
        es: "Puedo presentarme y pedir una cosa sencilla.",
        it: "So presentarmi e chiedere una cosa semplice.",
        ja: "自己紹介をして、簡単なものを一つ頼める。",
      },
    },
    {
      id: "a1-write",
      skill: "writing",
      text: {
        pt: "Escrevo um recado curto com nome e data.",
        en: "I can write a short note with a name and a date.",
        de: "Ich kann eine kurze Notiz mit Namen und Datum schreiben.",
        fr: "Je peux écrire un petit mot avec un nom et une date.",
        es: "Puedo escribir una nota corta con un nombre y una fecha.",
        it: "So scrivere un breve messaggio con un nome e una data.",
        ja: "名前と日付を入れた短いメモを書ける。",
      },
    },
  ],
  A2: [
    {
      id: "a2-read",
      skill: "reading",
      text: {
        pt: "Leio e-mails curtos sobre planos do dia.",
        en: "I can read short emails about the day's plans.",
        de: "Ich kann kurze E-Mails über die Pläne des Tages lesen.",
        fr: "Je peux lire de courts e-mails sur le programme de la journée.",
        es: "Puedo leer correos cortos sobre los planes del día.",
        it: "So leggere brevi e-mail sui programmi della giornata.",
        ja: "その日の予定についての短いメールを読める。",
      },
    },
    {
      id: "a2-listen",
      skill: "listening",
      text: {
        pt: "Entendo o essencial de um aviso na estação.",
        en: "I can catch the gist of an announcement at a station.",
        de: "Ich verstehe das Wesentliche einer Durchsage am Bahnhof.",
        fr: "Je saisis l'essentiel d'une annonce en gare.",
        es: "Entiendo lo esencial de un aviso en la estación.",
        it: "Colgo l'essenziale di un annuncio in stazione.",
        ja: "駅のアナウンスの要点が分かる。",
      },
    },
    {
      id: "a2-speak",
      skill: "speaking",
      text: {
        pt: "Peço comida e troco uma informação simples.",
        en: "I can order food and exchange one simple fact.",
        de: "Ich kann Essen bestellen und eine einfache Information austauschen.",
        fr: "Je peux commander à manger et échanger une information simple.",
        es: "Puedo pedir comida e intercambiar un dato sencillo.",
        it: "So ordinare da mangiare e scambiare un'informazione semplice.",
        ja: "料理を注文し、簡単な情報をやり取りできる。",
      },
    },
    {
      id: "a2-write",
      skill: "writing",
      text: {
        pt: "Escrevo um recado de algumas frases.",
        en: "I can write a note of a few sentences.",
        de: "Ich kann eine Nachricht aus ein paar Sätzen schreiben.",
        fr: "Je peux écrire un message de quelques phrases.",
        es: "Puedo escribir una nota de unas pocas frases.",
        it: "So scrivere un messaggio di qualche frase.",
        ja: "数文のメッセージを書ける。",
      },
    },
  ],
  B1: [
    {
      id: "b1-read",
      skill: "reading",
      text: {
        pt: "Leio uma prosa curta e extraio o ponto principal.",
        en: "I can read a short prose piece and get the main point.",
        de: "Ich kann einen kurzen Prosatext lesen und die Hauptaussage erfassen.",
        fr: "Je peux lire un court texte en prose et en dégager l'idée principale.",
        es: "Puedo leer un texto breve en prosa y sacar la idea principal.",
        it: "So leggere un breve testo in prosa e coglierne il punto principale.",
        ja: "短い文章を読んで要点をつかめる。",
      },
    },
    {
      id: "b1-listen",
      skill: "listening",
      text: {
        pt: "Entendo o fio de uma conversa sobre um tema conhecido.",
        en: "I can follow a conversation on a familiar topic.",
        de: "Ich kann einem Gespräch über ein vertrautes Thema folgen.",
        fr: "Je peux suivre une conversation sur un sujet familier.",
        es: "Puedo seguir una conversación sobre un tema conocido.",
        it: "So seguire una conversazione su un tema familiare.",
        ja: "身近な話題の会話についていける。",
      },
    },
    {
      id: "b1-speak",
      skill: "speaking",
      text: {
        pt: "Conto um acontecimento e digo o que acho.",
        en: "I can recount an event and say what I think.",
        de: "Ich kann von einem Ereignis erzählen und sagen, was ich denke.",
        fr: "Je peux raconter un événement et dire ce que j'en pense.",
        es: "Puedo contar algo que pasó y decir lo que pienso.",
        it: "So raccontare un fatto e dire cosa ne penso.",
        ja: "出来事を話し、自分の考えを言える。",
      },
    },
    {
      id: "b1-write",
      skill: "writing",
      text: {
        pt: "Escrevo um parágrafo ligado com conectivos simples.",
        en: "I can write a paragraph with simple connectors.",
        de: "Ich kann einen zusammenhängenden Absatz mit einfachen Konnektoren schreiben.",
        fr: "Je peux écrire un paragraphe lié par des connecteurs simples.",
        es: "Puedo escribir un párrafo hilado con conectores sencillos.",
        it: "So scrivere un paragrafo collegato con connettivi semplici.",
        ja: "簡単な接続詞を使って、まとまった段落を書ける。",
      },
    },
  ],
  B2: [
    {
      id: "b2-read",
      skill: "reading",
      text: {
        pt: "Leio um artigo e distingo fato de opinião.",
        en: "I can read an article and tell fact from opinion.",
        de: "Ich kann einen Artikel lesen und Fakten von Meinungen unterscheiden.",
        fr: "Je peux lire un article et distinguer les faits des opinions.",
        es: "Puedo leer un artículo y distinguir hechos de opiniones.",
        it: "So leggere un articolo e distinguere i fatti dalle opinioni.",
        ja: "記事を読み、事実と意見を区別できる。",
      },
    },
    {
      id: "b2-listen",
      skill: "listening",
      text: {
        pt: "Entendo uma discussão e o ponto de cada um.",
        en: "I can follow a discussion and each person's point.",
        de: "Ich kann einer Diskussion folgen und den Standpunkt jeder Person verstehen.",
        fr: "Je peux suivre une discussion et le point de vue de chacun.",
        es: "Puedo seguir una discusión y la postura de cada persona.",
        it: "So seguire una discussione e il punto di vista di ciascuno.",
        ja: "議論についていき、それぞれの主張が分かる。",
      },
    },
    {
      id: "b2-speak",
      skill: "speaking",
      text: {
        pt: "Argumento com algum detalhe e peço esclarecimento.",
        en: "I can argue in some detail and ask for clarification.",
        de: "Ich kann ausführlich argumentieren und um Klärung bitten.",
        fr: "Je peux argumenter avec un certain détail et demander des précisions.",
        es: "Puedo argumentar con cierto detalle y pedir aclaraciones.",
        it: "So argomentare con un certo dettaglio e chiedere chiarimenti.",
        ja: "ある程度詳しく意見を述べ、説明を求められる。",
      },
    },
    {
      id: "b2-write",
      skill: "writing",
      text: {
        pt: "Escrevo um texto com subordinação e um motivo claro.",
        en: "I can write a text with subordination and a clear reason.",
        de: "Ich kann einen Text mit Nebensätzen und einer klaren Begründung schreiben.",
        fr: "Je peux écrire un texte avec des subordonnées et une raison claire.",
        es: "Puedo escribir un texto con subordinadas y un motivo claro.",
        it: "So scrivere un testo con subordinate e una motivazione chiara.",
        ja: "従属節を使い、理由がはっきりした文章を書ける。",
      },
    },
  ],
  C1: [
    {
      id: "c1-read",
      skill: "reading",
      text: {
        pt: "Leio prosa densa e capto ironia ou ressalva.",
        en: "I can read dense prose and catch irony or a caveat.",
        de: "Ich kann dichte Prosa lesen und Ironie oder Einschränkungen erkennen.",
        fr: "Je peux lire une prose dense et saisir l'ironie ou une réserve.",
        es: "Puedo leer prosa densa y captar la ironía o un matiz.",
        it: "So leggere prosa densa e cogliere l'ironia o una riserva.",
        ja: "密度の高い文章を読み、皮肉や留保を読み取れる。",
      },
    },
    {
      id: "c1-listen",
      skill: "listening",
      text: {
        pt: "Entendo fala rápida sobre um tema abstrato.",
        en: "I can follow fast speech on an abstract topic.",
        de: "Ich verstehe schnelles Sprechen über ein abstraktes Thema.",
        fr: "Je comprends un discours rapide sur un sujet abstrait.",
        es: "Entiendo un habla rápida sobre un tema abstracto.",
        it: "Capisco un parlato veloce su un tema astratto.",
        ja: "抽象的な話題の速い話が分かる。",
      },
    },
    {
      id: "c1-speak",
      skill: "speaking",
      text: {
        pt: "Sustento uma posição e reformulo sem perder o fio.",
        en: "I can hold a position and rephrase without losing the thread.",
        de: "Ich kann einen Standpunkt vertreten und umformulieren, ohne den Faden zu verlieren.",
        fr: "Je peux défendre une position et reformuler sans perdre le fil.",
        es: "Puedo sostener una postura y reformular sin perder el hilo.",
        it: "So sostenere una posizione e riformulare senza perdere il filo.",
        ja: "立場を保ち、話の筋を失わずに言い換えられる。",
      },
    },
    {
      id: "c1-write",
      skill: "writing",
      text: {
        pt: "Escrevo com nuance e organizo um argumento longo.",
        en: "I can write with nuance and shape a longer argument.",
        de: "Ich kann nuanciert schreiben und eine längere Argumentation aufbauen.",
        fr: "Je peux écrire avec nuance et construire une argumentation longue.",
        es: "Puedo escribir con matices y organizar un argumento largo.",
        it: "So scrivere con sfumature e costruire un'argomentazione lunga.",
        ja: "ニュアンスを込めて書き、長い論証を組み立てられる。",
      },
    },
  ],
  C2: [
    {
      id: "c2-read",
      skill: "reading",
      text: {
        pt: "Leio qualquer prosa do curso e vejo o que ficou de fora.",
        en: "I can read any course prose and see what was left unsaid.",
        de: "Ich kann jeden Prosatext des Kurses lesen und sehe, was ungesagt bleibt.",
        fr: "Je peux lire n'importe quelle prose du cours et voir ce qui reste non dit.",
        es: "Puedo leer cualquier prosa del curso y ver lo que quedó sin decir.",
        it: "So leggere qualsiasi prosa del corso e vedere ciò che resta non detto.",
        ja: "コースのどの文章も読め、書かれていないことまで分かる。",
      },
    },
    {
      id: "c2-listen",
      skill: "listening",
      text: {
        pt: "Entendo fala idiomática e o tom por trás dela.",
        en: "I can follow idiomatic speech and the tone behind it.",
        de: "Ich verstehe idiomatische Sprache und den Ton dahinter.",
        fr: "Je comprends un langage idiomatique et le ton qui le sous-tend.",
        es: "Entiendo el habla idiomática y el tono que hay detrás.",
        it: "Capisco il parlato idiomatico e il tono che c'è dietro.",
        ja: "慣用的な話し方とその裏にある口調が分かる。",
      },
    },
    {
      id: "c2-speak",
      skill: "speaking",
      text: {
        pt: "Falo com precisão e ajusto o registro no momento.",
        en: "I can speak with precision and shift register on the spot.",
        de: "Ich spreche präzise und wechsle das Register spontan.",
        fr: "Je parle avec précision et change de registre sur le moment.",
        es: "Hablo con precisión y ajusto el registro sobre la marcha.",
        it: "Parlo con precisione e cambio registro sul momento.",
        ja: "正確に話し、その場で言葉の使い分けを調整できる。",
      },
    },
    {
      id: "c2-write",
      skill: "writing",
      text: {
        pt: "Escrevo no tom certo para o leitor e o propósito.",
        en: "I can write in the right tone for the reader and the purpose.",
        de: "Ich schreibe im passenden Ton für Leser und Zweck.",
        fr: "J'écris sur le ton juste selon le lecteur et le but.",
        es: "Escribo en el tono adecuado para el lector y el propósito.",
        it: "Scrivo nel tono giusto per il lettore e lo scopo.",
        ja: "読み手と目的に合った調子で書ける。",
      },
    },
  ],
};

export function isCefrBand(value: unknown): value is CefrBand {
  return typeof value === "string" && (CEFR_BANDS as readonly string[]).includes(value);
}

/** Descritores da faixa pedida; uma faixa desconhecida não devolve nada (nunca um nível inventado). */
export function canDoFor(level: string): CanDoItem[] {
  const band = level.trim().toUpperCase();
  if (!isCefrBand(band)) {
    return [];
  }
  return DESCRIPTORS[band].map((item) => ({ ...item, text: { ...item.text } }));
}

/** Texto do descritor no idioma de interface, com o inglês e o português como reserva. */
export function canDoText(item: CanDoItem, locale: DisplayLocale): string {
  return item.text[locale] || item.text.en || item.text.pt;
}

/** Parte (0–100) dos descritores da faixa que o aluno marcou. */
export function canDoScore(held: string[], level: string): number {
  const items = canDoFor(level);
  if (items.length === 0) {
    return 0;
  }
  const ids = new Set(held);
  const hits = items.filter((item) => ids.has(item.id)).length;
  return Math.round((hits / items.length) * 100);
}

/**
 * Sinais de perfil da autoavaliação: só as habilidades produtivas (fala → fluency,
 * escrita → writing), que a prova de múltipla escolha não mede. Cada sinal é a parte
 * dos descritores daquela habilidade, na faixa, que o aluno marcou.
 */
export function canDoSignals(held: string[], level: string): { fluency?: number; writing?: number } {
  const items = canDoFor(level);
  const ids = new Set(held);
  const share = (skill: CanDoSkill): number | undefined => {
    const inSkill = items.filter((item) => item.skill === skill);
    if (inSkill.length === 0) {
      return undefined;
    }
    const hits = inSkill.filter((item) => ids.has(item.id)).length;
    return Math.round((hits / inSkill.length) * 100);
  };
  const signals: { fluency?: number; writing?: number } = {};
  const fluency = share("speaking");
  const writing = share("writing");
  if (fluency !== undefined) {
    signals.fluency = fluency;
  }
  if (writing !== undefined) {
    signals.writing = writing;
  }
  return signals;
}
