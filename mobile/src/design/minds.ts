import { cast } from "@/design/tokens";
import type { DisplayLocale } from "@/lib/i18n";

export const CAST_SLOTS = ["reading", "memory", "speech", "journal"] as const;
export type CastSlot = (typeof CAST_SLOTS)[number];

export type MindId =
  | "einstein"
  | "plato"
  | "newton"
  | "galileo"
  | "curie"
  | "aristotle"
  | "lovelace"
  | "darwin"
  | "feynman"
  | "socrates"
  | "tesla"
  | "cicero"
  | "davinci"
  | "confucius"
  | "hypatia"
  | "aurelius";

export interface Mind {
  id: MindId;
  slot: CastSlot;
  name: string;
  years: string;
  slotTint: { light: string; dark: string };
  line: Record<DisplayLocale, string>;
  bio: Record<DisplayLocale, string>;
}

export const DEFAULT_CAST: Record<CastSlot, MindId> = {
  reading: "einstein",
  memory: "curie",
  speech: "feynman",
  journal: "davinci",
};

export const MINDS: readonly Mind[] = [
  {
    id: "einstein",
    slot: "reading",
    name: "Einstein",
    years: "1879–1955",
    slotTint: cast.reading,
    line: {
      pt: "Se não dá para desenhar, ainda não entendeu.",
      en: "If you cannot picture it, you do not yet understand.",
      de: "Wenn du es dir nicht vorstellen kannst, hast du es noch nicht verstanden.",
      fr: "Si vous ne pouvez pas vous le représenter, vous ne l'avez pas encore compris.",
      es: "Si no puedes imaginarlo, todavía no lo entiendes.",
      it: "Se non riesci a immaginarlo, non l'hai ancora capito.",
      ja: "思い描けないなら、まだ理解していない。",
    },
    bio: {
      pt: "Experimento mental. Trem, relógio, raio de luz.",
      en: "Thought experiments. A train, a clock, a beam of light.",
      de: "Gedankenexperimente. Ein Zug, eine Uhr, ein Lichtstrahl.",
      fr: "Expériences de pensée. Un train, une horloge, un rayon de lumière.",
      es: "Experimentos mentales. Un tren, un reloj, un rayo de luz.",
      it: "Esperimenti mentali. Un treno, un orologio, un raggio di luce.",
      ja: "思考実験。列車、時計、一筋の光。",
    },
  },
  {
    id: "plato",
    slot: "reading",
    name: "Platão",
    years: "c. 428–348 a.C.",
    slotTint: cast.reading,
    line: {
      pt: "A história é a parede da caverna. O que é real?",
      en: "The story is the cave wall. What is real?",
      de: "Die Geschichte ist die Wand der Höhle. Was ist wirklich?",
      fr: "L'histoire est la paroi de la caverne. Qu'est-ce qui est réel ?",
      es: "La historia es la pared de la caverna. ¿Qué es real?",
      it: "La storia è la parete della caverna. Che cosa è reale?",
      ja: "物語は洞窟の壁。本当のものは何か。",
    },
    bio: {
      pt: "Diálogo, não decreto. A forma da coisa, não a cópia.",
      en: "Dialogue, not decree. The form of the thing, not the copy.",
      de: "Dialog statt Dekret. Die Form der Sache, nicht die Kopie.",
      fr: "Le dialogue, pas le décret. La forme des choses, pas la copie.",
      es: "Diálogo, no decreto. La forma de las cosas, no la copia.",
      it: "Dialogo, non decreto. La forma delle cose, non la copia.",
      ja: "命令ではなく対話。写しではなく、ものの本質。",
    },
  },
  {
    id: "newton",
    slot: "reading",
    name: "Newton",
    years: "1643–1727",
    slotTint: cast.reading,
    line: {
      pt: "Se enxerguei longe, foi sobre os ombros de gigantes.",
      en: "If I have seen further, it is by standing on shoulders of giants.",
      de: "Wenn ich weiter gesehen habe, dann weil ich auf den Schultern von Riesen stand.",
      fr: "Si j'ai vu plus loin, c'est en me tenant sur les épaules de géants.",
      es: "Si he visto más lejos, es porque me subí a hombros de gigantes.",
      it: "Se ho visto più lontano, è perché stavo sulle spalle di giganti.",
      ja: "私が遠くを見渡せたのは、巨人の肩に乗っていたからだ。",
    },
    bio: {
      pt: "Óptica e cálculo. Prisma que separa as cores.",
      en: "Optics and calculus. The prism that divides color.",
      de: "Optik und Infinitesimalrechnung. Das Prisma, das die Farben trennt.",
      fr: "Optique et calcul infinitésimal. Le prisme qui sépare les couleurs.",
      es: "Óptica y cálculo. El prisma que separa los colores.",
      it: "Ottica e calcolo. Il prisma che separa i colori.",
      ja: "光学と微積分。色を分けるプリズム。",
    },
  },
  {
    id: "galileo",
    slot: "reading",
    name: "Galileu",
    years: "1564–1642",
    slotTint: cast.reading,
    line: {
      pt: "E, no entanto, ela se move.",
      en: "And yet it moves.",
      de: "Und sie bewegt sich doch.",
      fr: "Et pourtant elle tourne.",
      es: "Y sin embargo, se mueve.",
      it: "Eppur si muove.",
      ja: "それでも地球は動く。",
    },
    bio: {
      pt: "Telescópio na mão. Meça o que é mensurável.",
      en: "Telescope in hand. Measure what is measurable.",
      de: "Das Fernrohr in der Hand. Miss, was sich messen lässt.",
      fr: "Le télescope à la main. Mesurez ce qui est mesurable.",
      es: "Telescopio en mano. Mide lo que se puede medir.",
      it: "Telescopio in mano. Misura ciò che è misurabile.",
      ja: "手には望遠鏡。測れるものは測る。",
    },
  },
  {
    id: "curie",
    slot: "memory",
    name: "Curie",
    years: "1867–1934",
    slotTint: cast.memory,
    line: {
      pt: "Nada na vida deve ser temido, somente compreendido.",
      en: "Nothing in life is to be feared, it is only to be understood.",
      de: "Nichts im Leben muss man fürchten, man muss es nur verstehen.",
      fr: "Dans la vie, rien n'est à craindre, tout est à comprendre.",
      es: "Nada en la vida debe ser temido, solo comprendido.",
      it: "Nella vita non c'è nulla da temere, solo da capire.",
      ja: "人生に恐れるものは何もない。理解すべきものがあるだけだ。",
    },
    bio: {
      pt: "Toneladas de pechblenda para gramas de rádio.",
      en: "Tons of pitchblende for grams of radium.",
      de: "Tonnenweise Pechblende für ein paar Gramm Radium.",
      fr: "Des tonnes de pechblende pour quelques grammes de radium.",
      es: "Toneladas de pechblenda para unos gramos de radio.",
      it: "Tonnellate di pechblenda per pochi grammi di radio.",
      ja: "数グラムのラジウムのために、何トンものピッチブレンド。",
    },
  },
  {
    id: "aristotle",
    slot: "memory",
    name: "Aristóteles",
    years: "384–322 a.C.",
    slotTint: cast.memory,
    line: {
      pt: "Somos o que fazemos repetidamente.",
      en: "We are what we repeatedly do.",
      de: "Wir sind, was wir wiederholt tun.",
      fr: "Nous sommes ce que nous faisons de manière répétée.",
      es: "Somos lo que hacemos repetidamente.",
      it: "Siamo ciò che facciamo ripetutamente.",
      ja: "私たちは、繰り返し行うことでできている。",
    },
    bio: {
      pt: "Categorias, causa e hábito. Tudo tem lugar.",
      en: "Categories, cause and habit. Everything in its place.",
      de: "Kategorien, Ursache und Gewohnheit. Alles hat seinen Platz.",
      fr: "Catégories, cause et habitude. Chaque chose à sa place.",
      es: "Categorías, causa y hábito. Todo en su lugar.",
      it: "Categorie, causa e abitudine. Ogni cosa al suo posto.",
      ja: "範疇、原因、習慣。すべてには居場所がある。",
    },
  },
  {
    id: "lovelace",
    slot: "memory",
    name: "Ada Lovelace",
    years: "1815–1852",
    slotTint: cast.memory,
    line: {
      pt: "A máquina analítica tece padrões algébricos.",
      en: "The Analytical Engine weaves algebraic patterns.",
      de: "Die Analytische Maschine webt algebraische Muster.",
      fr: "La machine analytique tisse des motifs algébriques.",
      es: "La máquina analítica teje patrones algebraicos.",
      it: "La macchina analitica tesse motivi algebrici.",
      ja: "解析機関は代数の模様を織りなす。",
    },
    bio: {
      pt: "Ciência poética. O primeiro algoritmo do mundo.",
      en: "Poetical science. The world's first algorithm.",
      de: "Poetische Wissenschaft. Der erste Algorithmus der Welt.",
      fr: "Science poétique. Le tout premier algorithme du monde.",
      es: "Ciencia poética. El primer algoritmo del mundo.",
      it: "Scienza poetica. Il primo algoritmo del mondo.",
      ja: "詩的な科学。世界で最初のアルゴリズム。",
    },
  },
  {
    id: "darwin",
    slot: "memory",
    name: "Darwin",
    years: "1809–1882",
    slotTint: cast.memory,
    line: {
      pt: "Das menores variações surgem formas sem fim.",
      en: "Endless forms most beautiful from small variations.",
      de: "Aus kleinsten Abweichungen entstehen endlose Formen.",
      fr: "Des plus petites variations naissent des formes sans fin.",
      es: "De las variaciones más pequeñas surgen formas sin fin.",
      it: "Dalle più piccole variazioni nascono forme infinite.",
      ja: "小さな変異から、限りない形が生まれる。",
    },
    bio: {
      pt: "Caderno B: eu penso. Galápagos, tentilhões.",
      en: "Notebook B: I think. Galapagos, finches.",
      de: "Notizbuch B: Ich denke. Galápagos, Finken.",
      fr: "Carnet B : je pense. Galápagos, pinsons.",
      es: "Cuaderno B: yo pienso. Galápagos, pinzones.",
      it: "Taccuino B: io penso. Galápagos, fringuelli.",
      ja: "ノートB「私は考える」。ガラパゴス、フィンチ。",
    },
  },
  {
    id: "feynman",
    slot: "speech",
    name: "Feynman",
    years: "1918–1988",
    slotTint: cast.speech,
    line: {
      pt: "O que não consigo criar, não compreendo.",
      en: "What I cannot create, I do not understand.",
      de: "Was ich nicht erschaffen kann, verstehe ich nicht.",
      fr: "Ce que je ne peux pas créer, je ne le comprends pas.",
      es: "Lo que no puedo crear, no lo entiendo.",
      it: "Ciò che non so creare, non lo capisco.",
      ja: "自分で作れないものは、理解していない。",
    },
    bio: {
      pt: "Bongô e eletrodinâmica quântica. Explique simples.",
      en: "Bongos and QED. Explain it simply.",
      de: "Bongos und Quantenelektrodynamik. Erkläre es einfach.",
      fr: "Bongos et électrodynamique quantique. Expliquez simplement.",
      es: "Bongós y electrodinámica cuántica. Explícalo con sencillez.",
      it: "Bongo ed elettrodinamica quantistica. Spiegalo in modo semplice.",
      ja: "ボンゴと量子電磁力学。やさしく説明する。",
    },
  },
  {
    id: "socrates",
    slot: "speech",
    name: "Sócrates",
    years: "c. 470–399 a.C.",
    slotTint: cast.speech,
    line: {
      pt: "Uma vida sem exame não vale a pena ser vivida.",
      en: "The unexamined life is not worth living.",
      de: "Ein Leben ohne Prüfung ist nicht lebenswert.",
      fr: "Une vie sans examen ne vaut pas d'être vécue.",
      es: "Una vida sin examen no merece ser vivida.",
      it: "Una vita senza ricerca non è degna di essere vissuta.",
      ja: "吟味されない人生は、生きるに値しない。",
    },
    bio: {
      pt: "Apenas perguntas na ágora. A parteira das ideias.",
      en: "Only questions in the agora. Midwife of ideas.",
      de: "Auf der Agora nur Fragen. Die Hebamme der Ideen.",
      fr: "Seulement des questions sur l'agora. L'accoucheur d'idées.",
      es: "Solo preguntas en el ágora. La partera de las ideas.",
      it: "Solo domande nell'agorà. L'ostetrico delle idee.",
      ja: "広場では問いかけだけ。考えを産み出す助産師。",
    },
  },
  {
    id: "tesla",
    slot: "speech",
    name: "Tesla",
    years: "1856–1943",
    slotTint: cast.speech,
    line: {
      pt: "O presente é deles; o futuro é meu.",
      en: "The present is theirs; the future is mine.",
      de: "Die Gegenwart gehört ihnen; die Zukunft gehört mir.",
      fr: "Le présent est à eux ; l'avenir est à moi.",
      es: "El presente es de ellos; el futuro es mío.",
      it: "Il presente è loro; il futuro è mio.",
      ja: "現在は彼らのもの。未来は私のものだ。",
    },
    bio: {
      pt: "Corrente alternada, motores, relâmpagos em Colorado.",
      en: "Alternating current, motors, lightning in Colorado.",
      de: "Wechselstrom, Motoren, Blitze in Colorado.",
      fr: "Courant alternatif, moteurs, éclairs au Colorado.",
      es: "Corriente alterna, motores, rayos en Colorado.",
      it: "Corrente alternata, motori, fulmini in Colorado.",
      ja: "交流、モーター、コロラドの稲妻。",
    },
  },
  {
    id: "cicero",
    slot: "speech",
    name: "Cícero",
    years: "106–43 a.C.",
    slotTint: cast.speech,
    line: {
      pt: "Se tens um jardim e uma biblioteca, tens tudo.",
      en: "If you have a garden and a library, you have everything.",
      de: "Wer einen Garten und eine Bibliothek hat, dem fehlt es an nichts.",
      fr: "Si vous avez un jardin et une bibliothèque, vous avez tout.",
      es: "Si tienes un jardín y una biblioteca, lo tienes todo.",
      it: "Se hai un giardino e una biblioteca, hai tutto.",
      ja: "庭と書斎があれば、すべてがそろっている。",
    },
    bio: {
      pt: "Retórica romana. Ritmo, pausa e clareza.",
      en: "Roman rhetoric. Rhythm, pause and clarity.",
      de: "Römische Rhetorik. Rhythmus, Pause und Klarheit.",
      fr: "Rhétorique romaine. Rythme, pause et clarté.",
      es: "Retórica romana. Ritmo, pausa y claridad.",
      it: "Retorica romana. Ritmo, pausa e chiarezza.",
      ja: "ローマの弁論術。リズム、間、明晰さ。",
    },
  },
  {
    id: "davinci",
    slot: "journal",
    name: "Leonardo",
    years: "1452–1519",
    slotTint: cast.journal,
    line: {
      pt: "Aprender nunca esgota a mente.",
      en: "Learning never exhausts the mind.",
      de: "Lernen erschöpft den Geist nie.",
      fr: "Apprendre n'épuise jamais l'esprit.",
      es: "Aprender nunca agota la mente.",
      it: "Imparare non stanca mai la mente.",
      ja: "学ぶことは、決して心を疲れさせない。",
    },
    bio: {
      pt: "Cadernos espelhados, turbulência da água, asas.",
      en: "Mirror notebooks, water turbulence, wings.",
      de: "Spiegelschrift-Notizbücher, Wasserwirbel, Flügel.",
      fr: "Carnets en miroir, turbulences de l'eau, ailes.",
      es: "Cuadernos en espejo, turbulencias del agua, alas.",
      it: "Taccuini a specchio, turbolenze dell'acqua, ali.",
      ja: "鏡文字のノート、水の渦、翼。",
    },
  },
  {
    id: "confucius",
    slot: "journal",
    name: "Confúcio",
    years: "551–479 a.C.",
    slotTint: cast.journal,
    line: {
      pt: "Aquele que aprende mas não pensa está perdido.",
      en: "Learning without thought is labor lost.",
      de: "Lernen ohne Denken ist verlorene Mühe.",
      fr: "Apprendre sans réfléchir est peine perdue.",
      es: "Aprender sin pensar es esfuerzo perdido.",
      it: "Imparare senza pensare è fatica sprecata.",
      ja: "学びて思わざれば則ち罔し。",
    },
    bio: {
      pt: "Analectos. Retidão, piedade filial e estudo diário.",
      en: "Analects. Righteousness, filial piety and daily study.",
      de: "Gespräche. Rechtschaffenheit, Pietät und tägliches Lernen.",
      fr: "Les Entretiens. Droiture, piété filiale et étude quotidienne.",
      es: "Analectas. Rectitud, piedad filial y estudio diario.",
      it: "Analecta. Rettitudine, pietà filiale e studio quotidiano.",
      ja: "論語。正しさ、孝、そして毎日の学び。",
    },
  },
  {
    id: "hypatia",
    slot: "journal",
    name: "Hipátia",
    years: "c. 360–415",
    slotTint: cast.journal,
    line: {
      pt: "Guarde o direito de pensar: errar é melhor que não pensar.",
      en: "Reserve your right to think, for even to think wrongly is better than not to think at all.",
      de: "Bewahre dir das Recht zu denken: Falsch zu denken ist besser, als gar nicht zu denken.",
      fr: "Gardez le droit de penser : penser de travers vaut mieux que ne pas penser du tout.",
      es: "Conserva tu derecho a pensar: pensar mal es mejor que no pensar.",
      it: "Conserva il diritto di pensare: pensare in modo sbagliato è meglio che non pensare affatto.",
      ja: "考える権利を手放すな。間違って考えるほうが、考えないよりよい。",
    },
    bio: {
      pt: "Matemática em Alexandria. Astrolábios e cônicas.",
      en: "Mathematics in Alexandria. Astrolabes and conics.",
      de: "Mathematik in Alexandria. Astrolabien und Kegelschnitte.",
      fr: "Mathématiques à Alexandrie. Astrolabes et coniques.",
      es: "Matemáticas en Alejandría. Astrolabios y cónicas.",
      it: "Matematica ad Alessandria. Astrolabi e coniche.",
      ja: "アレクサンドリアの数学。アストロラーベと円錐曲線。",
    },
  },
  {
    id: "aurelius",
    slot: "journal",
    name: "Marco Aurélio",
    years: "121–180",
    slotTint: cast.journal,
    line: {
      pt: "Escreva para si. O que está no seu controle hoje.",
      en: "Write to yourself. What is in your control today.",
      de: "Schreib für dich selbst. Was heute in deiner Hand liegt.",
      fr: "Écrivez pour vous-même. Ce qui dépend de vous aujourd'hui.",
      es: "Escribe para ti. Lo que hoy está bajo tu control.",
      it: "Scrivi per te stesso. Ciò che oggi è in tuo potere.",
      ja: "自分のために書け。今日、自分の力で変えられることを。",
    },
    bio: {
      pt: "Meditações. Manhã de intenção, noite de revisão.",
      en: "Meditations. Morning intention, evening review.",
      de: "Selbstbetrachtungen. Morgens die Absicht, abends der Rückblick.",
      fr: "Pensées pour moi-même. Intention le matin, bilan le soir.",
      es: "Meditaciones. Intención por la mañana, repaso por la noche.",
      it: "Pensieri. Intenzione al mattino, revisione alla sera.",
      ja: "自省録。朝に意図を、夜に振り返りを。",
    },
  },
];

const BY_ID = new Map(MINDS.map((mind) => [mind.id, mind]));

export function mindById(id: string): Mind {
  return BY_ID.get(id as MindId) ?? BY_ID.get("einstein")!;
}

export function mindsForSlot(slot: CastSlot): Mind[] {
  return MINDS.filter((mind) => mind.slot === slot);
}

export function parseCast(input: Partial<Record<CastSlot, string>> | undefined): Record<CastSlot, MindId> {
  const next = { ...DEFAULT_CAST };
  for (const slot of CAST_SLOTS) {
    const raw = input?.[slot];
    const mind = raw ? BY_ID.get(raw as MindId) : undefined;
    if (mind && mind.slot === slot) {
      next[slot] = mind.id;
    }
  }
  return next;
}

export function slotForPhase(phase: string): CastSlot {
  if (phase === "review") {
    return "memory";
  }
  if (phase === "shadow") {
    return "speech";
  }
  if (phase === "journal" || phase === "note") {
    return "journal";
  }
  return "reading";
}
