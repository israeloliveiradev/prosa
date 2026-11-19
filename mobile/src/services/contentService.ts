export interface SyntacticBlock {
  role: string;
  word: string;
  detail: string;
  color: string;
  explanation: Record<string, string>;
}

export interface CardItem {
  id: string | number;
  level: string;
  targetPhrase: string;
  ipa: string;
  intuitivePronunciation: Record<string, string>;
  translation: Record<string, string>;
  culturalNote: Record<string, string>;
  syntax: SyntacticBlock[];
}

export interface TrailNode {
  id: string;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  quote: string;
  icon: string;
  targetXp: number;
}

export interface CommuteItem {
  targetPhrase: string;
  ipa: string;
  intuitivePronunciation: Record<string, string>;
  translation: Record<string, string>;
  badge: string;
  speechLang: string;
  pitchHz: number;
  curieTip: Record<string, string>;
  syllables: Array<{ text: string; intuitive: Record<string, string> }>;
}

export interface DuelQuestion {
  id: number;
  word: string;
  ipa: string;
  intuitivePronunciation: Record<string, string>;
  gender: Record<string, string>;
  sentence: string;
  highlight: string;
  options: Array<{
    key: "A" | "B" | "C" | "D";
    text: Record<string, string>;
    correct: boolean;
  }>;
}

export const LANGUAGE_BCP47: Record<string, string> = {
  "pt-BR": "pt-BR",
  pt: "pt-BR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  ja: "ja-JP",
};

export const TRAIL_MODULES_BY_LANG: Record<string, TrailNode[]> = {
  de: [
    {
      id: "de-node-1",
      title: {
        "pt-BR": "1. Fundamentos & Ordem Verbal (V2)",
        en: "1. Fundamentals & V2 Verb Order",
        de: "1. Grundlagen & V2-Verbposition",
        fr: "1. Fondamentaux & Ordre Verbal (V2)",
        es: "1. Fundamentos y Orden Verbal (V2)",
        it: "1. Fondamenti & Ordine Verbale (V2)",
        ja: "1. 基本構造 & 動詞第2位の法則 (V2)",
      },
      subtitle: {
        "pt-BR": "Regra canônica do verbo na segunda posição sintática.",
        en: "Canonical rule of the finite verb in second position.",
        de: "Kanonische Regel des finiten Verbs an zweiter Stelle.",
        fr: "Règle canonique du verbe conjugué en 2e position.",
        es: "Regla canónica del verbo conjugado en 2ª posición.",
        it: "Regola canonica del verbo in seconda posizione.",
        ja: "平叙文において定動詞が文頭第2位に置かれる基本規則。",
      },
      quote: "“Die Gedanken sind frei.” — Os pensamentos são livres.",
      icon: "🏛️",
      targetXp: 50,
    },
    {
      id: "de-node-2",
      title: {
        "pt-BR": "2. Casos Nominativo & Acusativo",
        en: "2. Nominative & Accusative Cases",
        de: "2. Nominativ- & Akkusativkasus",
        fr: "2. Cas Nominatif & Accusatif",
        es: "2. Casos Nominativo y Acusativo",
        it: "2. Casi Nominativo & Accusativo",
        ja: "2. 主格(1格)と対格(4格)",
      },
      subtitle: {
        "pt-BR": "Declinações essenciais de artigos definidos (der, den).",
        en: "Essential definite article declensions (der, den).",
        de: "Deklination bestimmter Artikel im Akkusativ.",
        fr: "Déclinaisons des articles définis (der, den).",
        es: "Declinación de artículos definidos en acusativo.",
        it: "Declinazione degli articoli determinativi.",
        ja: "定冠詞の変化と直接目的語の識別。",
      },
      quote: "“Übung macht den Meister.” — A prática faz o mestre.",
      icon: "⚔️",
      targetXp: 120,
    },
    {
      id: "de-node-3",
      title: {
        "pt-BR": "3. Orações Causais (Weil / Denn)",
        en: "3. Causal Clauses (Weil / Denn)",
        de: "3. Kausalsätze (Weil / Denn)",
        fr: "3. Propositions Causales (Weil / Denn)",
        es: "3. Oraciones Causales (Weil / Denn)",
        it: "3. Frasi Causali (Weil / Denn)",
        ja: "3. 理由を表す従属節 (Weil / Denn)",
      },
      subtitle: {
        "pt-BR": "O conector 'weil' que arremessa o verbo conjugado para o final.",
        en: "Subordinating 'weil' which moves verb to clause-final position.",
        de: "Nebensatzstellung mit Verbletztstellung.",
        fr: "La conjonction 'weil' qui rejette le verbe à la fin.",
        es: "Conector 'weil' que envía el verbo conjugado al final.",
        it: "Uso di 'weil' con il verbo in posizione finale.",
        ja: "副詞節'weil'による定動詞後置構文のマスター。",
      },
      quote: "“Wissen ist Macht, weil es den Geist befreit.”",
      icon: "⚡",
      targetXp: 210,
    },
    {
      id: "de-node-4",
      title: {
        "pt-BR": "4. Verbos Separáveis & Passado Perfekt",
        en: "4. Separable Verbs & Perfekt Tense",
        de: "4. Trennbare Verben & Perfekt",
        fr: "4. Verbes Séparables & Passé Composé",
        es: "4. Verbos Separables y Pasado Perfekt",
        it: "4. Verbi Separabili & Passato Perfekt",
        ja: "4. 分離動詞 & 現在完了形",
      },
      subtitle: {
        "pt-BR": "Prefixos móveis e o particípio com ge- no diálogo cotidiano.",
        en: "Moveable prefixes and ge- participles in spoken conversation.",
        de: "Präfixabspaltung und Partizip II im Alltag.",
        fr: "Préfixes séparables et participe II dans la conversation.",
        es: "Prefijos separables y formación con ge-.",
        it: "Prefissi separabili e formazione del passato colloquiale.",
        ja: "分離前綴りとge-過去分詞を用いた日常会話表現。",
      },
      quote: "“Aller Anfang ist schwer, doch Ausdauer siegt immer.”",
      icon: "👑",
      targetXp: 300,
    },
  ],

  fr: [
    {
      id: "fr-node-1",
      title: {
        "pt-BR": "1. Sons Nasais & Saudações Elegantes",
        en: "1. Nasal Vowels & Politeness",
        de: "1. Nasallaute & Elegante Begrüßungen",
        fr: "1. Sons Nasals & Salutations Élégantes",
        es: "1. Sonidos Nasales y Saludos",
        it: "1. Suoni Nasali & Saluti",
        ja: "1. 鼻母音とエレガントな挨拶",
      },
      subtitle: {
        "pt-BR": "Articulação de 'on', 'an', 'in' e a musicalidade parisiense.",
        en: "Vocal production of 'on', 'an', 'in' in Parisian cadence.",
        de: "Artikulation französischer Nasale.",
        fr: "Maîtrise des voyelles nasales et du rythme parlé.",
        es: "Producción de nasales y entonación melódica.",
        it: "Articolazione delle vocali nasali e musicalità.",
        ja: "美しい鼻母音の発音とパリジャンのリズム。",
      },
      quote: "“Le temps perdu ne se rattrape jamais.”",
      icon: "🥖",
      targetXp: 50,
    },
    {
      id: "fr-node-2",
      title: {
        "pt-BR": "2. Artigos & Gênero Gramatical",
        en: "2. Articles & Grammatical Gender",
        de: "2. Artikel & Genus",
        fr: "2. Articles & Genre Grammatical",
        es: "2. Artículos y Género Gramatical",
        it: "2. Articoli e Genere",
        ja: "2. 冠詞と名詞の性別",
      },
      subtitle: {
        "pt-BR": "Domínio de 'le', 'la', 'un', 'une' e concordância harmônica.",
        en: "Mastering 'le', 'la', 'un', 'une' and harmonic agreement.",
        de: "Genuszuordnung und Artikelanpassung.",
        fr: "Accords euphoniques et articles définis.",
        es: "Concordancia de género y contracciones.",
        it: "Articoli determinativi e accordo di genere.",
        ja: "男性名詞・女性名詞と冠詞の調和。",
      },
      quote: "“C'est la vie et la poésie du monde.”",
      icon: "✨",
      targetXp: 120,
    },
    {
      id: "fr-node-3",
      title: {
        "pt-BR": "3. Passé Composé & Narrativa",
        en: "3. Passé Composé & Storytelling",
        de: "3. Passé Composé & Erzählung",
        fr: "3. Passé Composé & Récit",
        es: "3. Passé Composé y Narración",
        it: "3. Passato Prossimo & Narrazione",
        ja: "3. 複合過去と物語の語り口",
      },
      subtitle: {
        "pt-BR": "Escolha entre 'avoir' e 'être' e particípios regulares.",
        en: "Choosing between 'avoir' and 'être' with regular participles.",
        de: "Hilfsverbwahl zwischen avoir und être.",
        fr: "Auxiliaires avoir/être et accords du participe.",
        es: "Selección entre avoir y être en pasado.",
        it: "Uso di avere ed essere nel passato composto.",
        ja: "助動詞avoirとêtreの使い分けと過去分詞。",
      },
      quote: "“Rien ne se crée, tout se transforme.” — Curie",
      icon: "🍷",
      targetXp: 210,
    },
    {
      id: "fr-node-4",
      title: {
        "pt-BR": "4. Pronomes 'En' & 'Y' e Fluidez",
        en: "4. Pronouns 'En' & 'Y' and Fluency",
        de: "4. Pronomina 'En' & 'Y'",
        fr: "4. Pronoms 'En' & 'Y' et Fluidité",
        es: "4. Pronombres 'En' y 'Y'",
        it: "4. Pronomi 'En' & 'Y' e Fluidità",
        ja: "4. 中性代名詞 en & y と流暢さ",
      },
      subtitle: {
        "pt-BR": "Elimine repetições com as partículas adverbiais canônicas.",
        en: "Eliminate noun repetition with native adverbial pronouns.",
        de: "Elegante Substitution von Orts- und Mengenangaben.",
        fr: "Substitutions fluides pour parler comme un natif.",
        es: "Reemplazo elegante de complementos con en e y.",
        it: "Sostituzione fluida di complementi di luogo e quantità.",
        ja: "名詞の反復を美しく避ける代名詞マスター。",
      },
      quote: "“La simplicité est la sophistication suprême.”",
      icon: "👑",
      targetXp: 300,
    },
  ],

  ja: [
    {
      id: "ja-node-1",
      title: {
        "pt-BR": "1. Hiragana & Partículas は (wa) / を (o)",
        en: "1. Hiragana & Particles は / を",
        de: "1. Hiragana & Partikeln は / を",
        fr: "1. Hiragana & Particules は / を",
        es: "1. Hiragana y Partículas は / を",
        it: "1. Hiragana & Particelle は / を",
        ja: "1. ひらがな & 助詞「は」「を」",
      },
      subtitle: {
        "pt-BR": "Marcação do tema da oração e do objeto direto na fala.",
        en: "Topic marker and direct object identification.",
        de: "Themen- und Akkusativpartikeln im Satzgefüge.",
        fr: "Marquage du thème et du complément direct.",
        es: "Marcador de tema y objeto directo.",
        it: "Marcatore del tema e dell'oggetto diretto.",
        ja: "文の主題を示す「は」と目的語を示す「を」の基礎。",
      },
      quote: "“千里の道も一歩から始まる。” — Uma jornada de mil milhas começa com um passo.",
      icon: "⛩️",
      targetXp: 50,
    },
    {
      id: "ja-node-2",
      title: {
        "pt-BR": "2. Estrutura SOV & Verbos Básicos",
        en: "2. SOV Order & Essential Verbs",
        de: "2. SOV-Satzstellung & Verben",
        fr: "2. Ordre SOV & Verbes Essentiels",
        es: "2. Estructura SOV y Verbos",
        it: "2. Ordine SOV & Verbi Essenziali",
        ja: "2. SOV語順 & 基本動詞",
      },
      subtitle: {
        "pt-BR": "Sujeito-Objeto-Verbo: o verbo ancorado estritamente no final.",
        en: "Subject-Object-Verb: anchoring the predicate at the very end.",
        de: "Das Verb schließt die Aussage konsequent ab.",
        fr: "Sujet-Objet-Verbe : le verbe toujours en clôture de phrase.",
        es: "El verbo siempre al final de la oración.",
        it: "Il predicato saldamente ancorato a fine frase.",
        ja: "主語・目的語・述語の順序と文末の重要性。",
      },
      quote: "“初心忘るべからず。” — Não esqueça a mente de iniciante.",
      icon: "🌸",
      targetXp: 120,
    },
    {
      id: "ja-node-3",
      title: {
        "pt-BR": "3. Polidez Teineigo (Desu / Masu)",
        en: "3. Polite Speech (Desu / Masu)",
        de: "3. Höflichkeitsform (Desu / Masu)",
        fr: "3. Politesse Teineigo (Desu / Masu)",
        es: "3. Cortesía Teineigo (Desu / Masu)",
        it: "3. Forma Cortese (Desu / Masu)",
        ja: "3. 丁寧語（です・ます）の調和",
      },
      subtitle: {
        "pt-BR": "Comunicação respeitosa com falantes nativos e colegas.",
        en: "Harmonious and respectful social communication in Japan.",
        de: "Respektvolle Konversation im Alltag.",
        fr: "La courtoisie naturelle pour interagir à Tokyo.",
        es: "Forma cortés estándar para la vida cotidiana.",
        it: "La cortesia essenziale per conversare con nativi.",
        ja: "社会的な調和を保つ丁寧な日常対話。",
      },
      quote: "“一期一会。” — Encontro único na vida.",
      icon: "🍵",
      targetXp: 210,
    },
    {
      id: "ja-node-4",
      title: {
        "pt-BR": "4. Adjetivos em い (i) e な (na)",
        en: "4. い (i) and な (na) Adjectives",
        de: "4. い- und な-Adjektive",
        fr: "4. Adjectifs en い (i) et な (na)",
        es: "4. Adjetivos en い (i) y な (na)",
        it: "4. Aggettivi in い (i) e な (na)",
        ja: "4. い形容詞 & な形容詞の修飾法",
      },
      subtitle: {
        "pt-BR": "Flexão temporal direta dos adjetivos e descrições ricas.",
        en: "Direct tense conjugation of descriptive adjectives.",
        de: "Konjugation von Adjektiven als eigenständige Prädikate.",
        fr: "Conjugaison temporelle directe des adjectifs.",
        es: "Conjugación en tiempo pasado de los adjetivos en い.",
        it: "Flessione temporale diretta degli aggettivi descrittivi.",
        ja: "感情や情景を豊かに描写する形容詞の活用。",
      },
      quote: "“継続は力なり。” — A persistência é poder.",
      icon: "👑",
      targetXp: 300,
    },
  ],

  en: [
    {
      id: "en-node-1",
      title: {
        "pt-BR": "1. Padrões de Fala & Cadência Rítmica",
        en: "1. Speech Patterns & Rhythmic Cadence",
        de: "1. Sprachmuster & Rhythmik",
        fr: "1. Schémas de Discours & Cadence",
        es: "1. Patrones de Habla y Cadencia",
        it: "1. Modelli di Parlata & Cadenza",
        ja: "1. 英語の音声リズムと強弱アクセント",
      },
      subtitle: {
        "pt-BR": "Isocronia acentual, reduções fracas (schwa) e conexões sonoras.",
        en: "Stress-timed rhythm, schwa reductions, and native connected speech.",
        de: "Akzentbasierter Rhythmus und Schwa-Laut.",
        fr: "Rythme accentuel et liaisons consoniques.",
        es: "Ritmo acentual y reducciones vocálicas.",
        it: "Isocronia accentuativa e collegamenti fonetici fluidi.",
        ja: "強勢リズムと曖昧母音（シュワ）のマスター。",
      },
      quote: "“Knowledge speaks, but wisdom listens attentively.”",
      icon: "🎙️",
      targetXp: 50,
    },
    {
      id: "en-node-2",
      title: {
        "pt-BR": "2. Present Perfect & Conexões Atemporais",
        en: "2. Present Perfect & Timeless Connections",
        de: "2. Present Perfect & Verknüpfungen",
        fr: "2. Present Perfect & Expériences",
        es: "2. Present Perfect y Experiencias",
        it: "2. Present Perfect & Esperienze",
        ja: "2. 現在完了形と今への影響",
      },
      subtitle: {
        "pt-BR": "A ponte entre o passado e o presente sem datação rígida.",
        en: "The psychological bridge linking past actions directly to the now.",
        de: "Die Brücke zwischen Vergangenheit und Gegenwart.",
        fr: "Le pont temporel reliant le passé au présent.",
        es: "Conexión viva entre el pasado y el momento actual.",
        it: "Il ponte concettuale che unisce il passato al presente.",
        ja: "過去の出来事が現在に及ぼす影響を伝える構文。",
      },
      quote: "“I have lived a thousand lives through language.”",
      icon: "⚡",
      targetXp: 120,
    },
    {
      id: "en-node-3",
      title: {
        "pt-BR": "3. Phrasal Verbs & Fluidez Idiomática",
        en: "3. Phrasal Verbs & Native Idioms",
        de: "3. Phrasal Verbs & Idiomatik",
        fr: "3. Verbes à Particule & Idiomes",
        es: "3. Phrasal Verbs y Fluidez",
        it: "3. Phrasal Verbs & Espressioni",
        ja: "3. 句動詞（Phrasal Verbs）と慣用表現",
      },
      subtitle: {
        "pt-BR": "Combinações de verbos e partículas com significado figurativo.",
        en: "Figurative verb-particle blends used in real-world dialogue.",
        de: "Bildhafte Kombinationen für fließendes Alltagsenglisch.",
        fr: "Particules adverbiales et sens métaphorique.",
        es: "Combinaciones verbales idiomáticas del inglés real.",
        it: "Espressioni idiomatiche indispensabili per sembrare madrelingua.",
        ja: "ネイティブが頻繁に使う句動詞の直感理解。",
      },
      quote: "“The only way to do great work is to love what you do.”",
      icon: "💡",
      targetXp: 210,
    },
    {
      id: "en-node-4",
      title: {
        "pt-BR": "4. Condicionais & Argumentação Lógica",
        en: "4. Conditionals & Logic Argumentation",
        de: "4. Konditionalsätze & Logik",
        fr: "4. Conditionnels & Argumentation",
        es: "4. Condicionales y Argumentación",
        it: "4. Condizionali & Logica",
        ja: "4. 仮定法と論理的推論",
      },
      subtitle: {
        "pt-BR": "Expressão de hipóteses com would, could e past perfect.",
        en: "Hypothetical reasoning with nuance, restraint, and precision.",
        de: "Ausdruck von Hypothesen und Wahrscheinlichkeiten.",
        fr: "Nuances hypothétiques et discours argumentatif.",
        es: "Estructuras condicionales para debates formales.",
        it: "Formulazione elegante di ipotesi e possibilità.",
        ja: "事実と反する仮定や推論を伝える論理的英語。",
      },
      quote: "“Curiosity is the engine of intellectual discovery.”",
      icon: "👑",
      targetXp: 300,
    },
  ],

  es: [
    {
      id: "es-node-1",
      title: {
        "pt-BR": "1. Fonética Clara & Ritmo Silábico",
        en: "1. Clear Phonetics & Syllable Timing",
        de: "1. Spanische Phonetik & Rhythmus",
        fr: "1. Phonétique Claire & Rythme",
        es: "1. Fonética Clara y Ritmo Silábico",
        it: "1. Fonetica Chiara & Ritmo",
        ja: "1. 明瞭な発音と音節リズム",
      },
      subtitle: {
        "pt-BR": "Articulação das 5 vogais puras e a cadência peninsular e latina.",
        en: "Purity of the 5 vocalic sounds and vibrant syllable pacing.",
        de: "Reinheit der fünf Vokale und gleichmäßiger Takt.",
        fr: "Pureté des voyelles et égalité des syllabes.",
        es: "Pureza vocálica y energía articulatoria constante.",
        it: "Le 5 vocali pure e la cadenza naturale spagnola.",
        ja: "母音の純粋性と均等な音節ビートの習得。",
      },
      quote: "“El camino se hace al andar con paso firme.”",
      icon: "☀️",
      targetXp: 50,
    },
    {
      id: "es-node-2",
      title: {
        "pt-BR": "2. Ser vs Estar & Identidade",
        en: "2. Ser vs Estar & Identity",
        de: "2. Ser vs. Estar",
        fr: "2. Ser vs Estar & Identité",
        es: "2. Ser vs Estar e Identidad",
        it: "2. Ser vs Estar & Identità",
        ja: "2. SerとEstarの哲学的使い分け",
      },
      subtitle: {
        "pt-BR": "Diferença entre essência permanente e estado circunstancial.",
        en: "Permanent essence versus transient circumstantial states.",
        de: "Dauerhafter Zustand versus vorübergehende Eigenschaft.",
        fr: "Essence immuable versus état transitoire.",
        es: "Esencia perdurable frente a condición temporal.",
        it: "Essenza immutabile rispetto a stati transitori.",
        ja: "本質的性質（ser）と一時的状態（estar）の識別。",
      },
      quote: "“No es lo que eres, sino cómo estás presente hoy.”",
      icon: "🔥",
      targetXp: 120,
    },
    {
      id: "es-node-3",
      title: {
        "pt-BR": "3. Subjuntivo Essencial & Desejo",
        en: "3. Essential Subjunctive & Desire",
        de: "3. Subjuntivo & Wunschform",
        fr: "3. Subjonctif Essentiel & Désir",
        es: "3. Subjuntivo Esencial y Deseo",
        it: "3. Congiuntivo Essenziale & Desiderio",
        ja: "3. 接続法（Subjuntivo）と希望・願望",
      },
      subtitle: {
        "pt-BR": "Navegue pelo reino da dúvida, da vontade e da incerteza.",
        en: "Navigate the subjective realm of wishes, doubts, and emotions.",
        de: "Ausdruck subjektiver Wahrnehmungen und Wünsche.",
        fr: "L'univers du doute, de la volonté et des sentiments.",
        es: "Dominio de la voluntad, duda y juicio de valor.",
        it: "Esprimere dubbi, speranze e stati d'animo personali.",
        ja: "話者の主観、願望、不確実性を表す接続法。",
      },
      quote: "“Ojalá que el viento lleve tus palabras con fuerza.”",
      icon: "🌊",
      targetXp: 210,
    },
    {
      id: "es-node-4",
      title: {
        "pt-BR": "4. Pretéritos Indefinido & Imperfeito",
        en: "4. Past Tenses & Narrative",
        de: "4. Vergangenheitszeiten im Spanischen",
        fr: "4. Passé Simple vs Imparfait",
        es: "4. Pretéritos Indefinido e Imperfecto",
        it: "4. Passato Remoto vs Imperfetto",
        ja: "4. 点過去と線過去の鮮やかな対比",
      },
      subtitle: {
        "pt-BR": "Pinte o cenário com o imperfeito e marque ações com o indefinido.",
        en: "Paint the background with imperfect and puncture events with preterite.",
        de: "Erzählende Schilderungen mit scharfem Zeithorizont.",
        fr: "Décor de l'imparfait et actions précises du passé simple.",
        es: "Contraste narrativo entre acción puntual y hábito pasado.",
        it: "Dipingere lo sfondo e scandire le azioni puntuali.",
        ja: "物語の背景描写と完了した出来事の織り成し。",
      },
      quote: "“Ayer fue historia, hoy construimos el porvenir.”",
      icon: "👑",
      targetXp: 300,
    },
  ],

  it: [
    {
      id: "it-node-1",
      title: {
        "pt-BR": "1. Fonética Musical & Consoantes Duplas",
        en: "1. Musical Phonetics & Double Consonants",
        de: "1. Italienische Phonetik & Geminaten",
        fr: "1. Phonétique Musicale & Consonnes Doubles",
        es: "1. Fonética Musical y Geminadas",
        it: "1. Fonetica Musicale & Consonanti Doppie",
        ja: "1. 音楽的フォネティクス & 重子音",
      },
      subtitle: {
        "pt-BR": "A tensão rítmica das geminadas e a melodia toscana.",
        en: "The rhythmic tension of doubled consonants and lyric melody.",
        de: "Spannung und Pause bei verdoppelten Konsonanten.",
        fr: "La petite pause expressive des consonnes doubles.",
        es: "Tensión rítmica de consonantes dobles en italiano.",
        it: "La cadenza lirica e la sospensione delle consonanti doppie.",
        ja: "促音（っ）に似た重子音のタメとイタリア語の旋律。",
      },
      quote: "“La bellezza salverà il mondo con la sua armonia.”",
      icon: "🎭",
      targetXp: 50,
    },
    {
      id: "it-node-2",
      title: {
        "pt-BR": "2. Preposições Articuladas & Fluidez",
        en: "2. Articulated Prepositions & Flow",
        de: "2. Zusammengesetzte Präpositionen",
        fr: "2. Prépositions Contractées & Fluidité",
        es: "2. Preposiciones Articuladas",
        it: "2. Preposizioni Articolate & Fluidità",
        ja: "2. 結合前置詞と自然な文の連結",
      },
      subtitle: {
        "pt-BR": "Fusão harmoniosa entre preposições e artigos (del, al, nel).",
        en: "Harmonious blending of prepositions and articles (nel, dal).",
        de: "Verschmelzung von Präposition und bestimmtem Artikel.",
        fr: "Contraction élégante des prépositions et articles.",
        es: "Fusión de preposiciones con artículos determinativos.",
        it: "Fusione armonica di preposizioni semplici e articoli.",
        ja: "前置詞と定冠詞が一体化する結合前置詞の規則。",
      },
      quote: "“Nella mente limpida fioriscono le idee grandi.” — Da Vinci",
      icon: "🎨",
      targetXp: 120,
    },
    {
      id: "it-node-3",
      title: {
        "pt-BR": "3. Passato Prossimo & Expressividade",
        en: "3. Passato Prossimo & Expression",
        de: "3. Passato Prossimo & Ausdruck",
        fr: "3. Passé Composé Italien",
        es: "3. Pasado Próximo y Expresión",
        it: "3. Passato Prossimo & Espressività",
        ja: "3. 近過去と日常の語り",
      },
      subtitle: {
        "pt-BR": "Relatos vívidos de viagens, arte e vivências passadas.",
        en: "Vivid personal stories and reflections using avere and essere.",
        de: "Lebendige Schilderung erlebter Ereignisse.",
        fr: "Raconter des souvenirs avec vivacité et précision.",
        es: "Relatos cercanos al presente con essere y avere.",
        it: "Raccontare il vissuto con immediatezza espressiva.",
        ja: "essereとavereを使い分ける近過去の表現力。",
      },
      quote: "“Ho cercato l'armonia in ogni curva della natura.”",
      icon: "🎻",
      targetXp: 210,
    },
    {
      id: "it-node-4",
      title: {
        "pt-BR": "4. Pronomes Combinados & Vivacidade",
        en: "4. Combined Pronouns & Italian Spirit",
        de: "4. Kombinierte Pronomina",
        fr: "4. Pronoms Combinés & Vivacité",
        es: "4. Pronombres Combinados",
        it: "4. Pronomi Combinati & Vivacità",
        ja: "4. 複合代名詞と会話のスピード感",
      },
      subtitle: {
        "pt-BR": "Encaixe 'me lo', 'te la' com a rapidez de um nativo de Roma.",
        en: "Mastering double clitic sequences with effortless Italian pace.",
        de: "Präzises Einsetzen doppelter Objektpronomen.",
        fr: "Agencement naturel des pronoms d'objet direct et indirect.",
        es: "Secuencias de pronombres dobles en conversación ágil.",
        it: "L'arte di combinare i pronomi con grazia e naturalezza.",
        ja: "会話のテンポを飛躍的に高める二重代名詞の運用法。",
      },
      quote: "“La semplicità è la suprema sofisticazione.”",
      icon: "👑",
      targetXp: 300,
    },
  ],
};

export const COURSE_DECKS_BY_LANG: Record<string, CardItem[]> = {
  de: [
    {
      id: "de-card-1",
      level: "A2.2",
      targetPhrase: "“Die Gedanken sind frei und fliegen wie der Wind.”",
      ipa: "/diː ɡəˈdaŋkn̩ zɪnt faɪ̯ ʊnt ˈfliːɡn̩ viː deːɐ̯ vɪnt/",
      intuitivePronunciation: {
        "pt-BR": "<b>di</b> gue-<b>dán</b>-quen zint <b>frai</b> unt <b>flí</b>-guen vi der <b>vint</b>",
        en: "<b>dee</b> geh-<b>dahn</b>-ken zint <b>fry</b> oont <b>flee</b>-gen vee dayr <b>vint</b>",
        fr: "<b>di</b> gue-<b>dank</b>-en zint <b>fraï</b> ount <b>fli</b>-guen vi dère <b>vint</b>",
        es: "<b>di</b> gue-<b>dán</b>-ken zint <b>frai</b> unt <b>flí</b>-guen vi der <b>vint</b>",
        it: "<b>di</b> ghe-<b>dan</b>-ken zint <b>frai</b> unt <b>fli</b>-ghen vi der <b>vint</b>",
        ja: "<b>ディー</b>・ゲ・<b>ダン</b>・ケン・ズィント・<b>フライ</b>・ウント・<b>フリー</b>・ゲン・ヴィ・デア・<b>ヴィント</b>",
      },
      translation: {
        "pt-BR": "“Os pensamentos são livres e voam como o vento.”",
        en: "“Thoughts are free and fly like the wind.”",
        de: "“Die Gedanken sind frei und fliegen wie der Wind.”",
        fr: "“Les pensées sont libres et volent comme le vent.”",
        es: "“Los pensamientos son libres y vuelan como el viento.”",
        it: "“I pensieri sono liberi e volano come il vento.”",
        ja: "「思想は自由であり、風のように飛んでいく。」",
      },
      culturalNote: {
        "pt-BR": "💡 Provérbio folclórico alemão do século XVIII sobre liberdade intelectual e resistência moral.",
        en: "💡 Traditional 18th-century German folk song about personal sovereignty and freedom of thought.",
        de: "💡 Traditionelles deutsches Volkslied über Gewissensfreiheit und individuelle Souveränität.",
        fr: "💡 Chant traditionnel allemand du XVIIIe siècle célébrant la liberté de pensée inviolable.",
        es: "💡 Proverbio tradicional alemán del siglo XVIII sobre la libertad inviolable de la mente.",
        it: "💡 Canto tradizionale tedesco del XVIII secolo sulla libertà di pensiero e autodeterminazione.",
        ja: "💡 思想・良心の自由を謳った18世紀の代表的なドイツ民謡。",
      },
      syntax: [
        {
          role: "Sujeito (Nominativo)",
          word: "Die Gedanken",
          detail: "Plural / Artigo Det.",
          color: "#06B6D4",
          explanation: {
            "pt-BR": "Substantivo neutro plural no caso Nominativo, exercendo função de sujeito.",
            en: "Plural noun in the Nominative case acting as the subject of the clause.",
            de: "Nomen im Nominativ Plural als Subjekt des Satzes.",
            es: "Sustantivo en caso nominativo plural como sujeto de la oración.",
          },
        },
        {
          role: "Verbo (Posição 2)",
          word: "sind",
          detail: "Sein (3ª pl. Pres.)",
          color: "#D97706",
          explanation: {
            "pt-BR": "Verbo copulativo conjugado estritamente na 2ª posição sintática (Regra V2).",
            en: "Copular finite verb strictly placed in the second syntactic slot (V2 rule).",
            de: "Finites Verb an Position 2 der Hauptsatzstruktur.",
            es: "Verbo copulativo conjugado colocado estrictamente en segunda posición.",
          },
        },
        {
          role: "Predicativo",
          word: "frei",
          detail: "Adjetivo predicativo",
          color: "#10B981",
          explanation: {
            "pt-BR": "Adjetivo predicativo após 'sein' — nunca recebe desinência de declinação.",
            en: "Predicative adjective following 'sein' — never takes an inflectional ending.",
            de: "Prädikatives Adjektiv ohne Deklinationsendung.",
            es: "Adjetivo predicativo invariable tras el verbo ser/estar.",
          },
        },
        {
          role: "Conector Aditivo",
          word: "und fliegen wie der Wind",
          detail: "Coordenação direta",
          color: "#8B5CF6",
          explanation: {
            "pt-BR": "Conjunção 'und' (posição zero) mantendo a estrutura direta da segunda oração.",
            en: "Coordinating conjunction 'und' maintaining word order in the second clause.",
            de: "Koordinierende Konjunktion in Position Null.",
            es: "Conjunción coordinante que mantiene el orden directo.",
          },
        },
      ],
    },
    {
      id: "de-card-2",
      level: "B1.1",
      targetPhrase: "“Übung macht den Meister, wenn man beharrlich bleibt.”",
      ipa: "/ˈyːbʊŋ maxt deːn ˈmaɪ̯stɐ vɛn man bəˈhaʁlɪç blaɪ̯pt/",
      intuitivePronunciation: {
        "pt-BR": "<b>ú</b>-bung makht den <b>máis</b>-ter, ven man be-<b>hár</b>-likh <b>bláipt</b>",
        en: "<b>oo</b>-boong mahkht den <b>my</b>-ster, ven mahn beh-<b>hahr</b>-likh <b>blypt</b>",
        fr: "<b>ou</b>-boung makht dène <b>maïss</b>-ter, vène mane be-<b>har</b>-likh <b>blaïpt</b>",
        es: "<b>ú</b>-bung majt den <b>máis</b>-ter, ven man be-<b>jár</b>-lij <b>bláipt</b>",
        it: "<b>u</b>-bung makht den <b>mais</b>-ter, ven man be-<b>har</b>-likh <b>blaipt</b>",
        ja: "<b>ユー</b>・ブング・マハト・デン・<b>マイ</b>・スター、ヴェン・マン・ベ・<b>ハル</b>・リヒ・<b>ブライプト</b>",
      },
      translation: {
        "pt-BR": "“A prática faz o mestre, quando se é perseverante.”",
        en: "“Practice makes the master, when one remains persistent.”",
        de: "“Übung macht den Meister, wenn man beharrlich bleibt.”",
        fr: "“La pratique fait le maître quand on persévère avec constance.”",
        es: "“La práctica hace al maestro, cuando se es perseverante.”",
        it: "“L'esercizio fa il maestro, quando si è perseveranti.”",
        ja: "「不屈の努力を続けるとき、修練が達人を生み出す。」",
      },
      culturalNote: {
        "pt-BR": "💡 Princípio germânico clássico de dedicação ao aperfeiçoamento deliberado e contínuo.",
        en: "💡 Core cultural ideal of craftsmanship, patience, and deliberate mastery over time.",
        de: "💡 Klassisches deutsches Leitmotiv über Fleiß, Präzision und Meisterschaft.",
        fr: "💡 Idéal culturel germanique d'artisanat et d'exigence dans l'apprentissage patient.",
        es: "💡 Máxima alemana sobre la perseverancia y la maestría artesanal.",
        it: "💡 Principio classico di dedizione al perfezionamento deliberato.",
        ja: "💡 ドイツ職人精神の根底にある、継続的な鍛錬と精進を説く格言。",
      },
      syntax: [
        {
          role: "Sujeito Abstrato",
          word: "Übung",
          detail: "Feminino / Nominativo",
          color: "#06B6D4",
          explanation: {
            "pt-BR": "Substantivo feminino sem artigo denotando o conceito universal de prática.",
            en: "Anarthrous feminine noun denoting the universal concept of practice.",
            de: "Abstraktes Nomen im Nominativ ohne Artikel.",
            es: "Sustantivo femenino sin artículo con valor universal.",
          },
        },
        {
          role: "Verbo Transitivo (V2)",
          word: "macht",
          detail: "Machen (3ª sing.)",
          color: "#D97706",
          explanation: {
            "pt-BR": "Verbo principal da oração afirmativa na 2ª posição canônica.",
            en: "Main clause transitive verb anchored strictly in second position.",
            de: "Transitives Verb an Position 2.",
            es: "Verbo transitivo principal en segunda posición sintáctica.",
          },
        },
        {
          role: "Objeto Direto (Acusativo)",
          word: "den Meister",
          detail: "Acusativo Masculino",
          color: "#10B981",
          explanation: {
            "pt-BR": "Declinação do artigo definido masculino 'der' transformado em 'den'.",
            en: "Masculine definite article showing accusative case marker 'den'.",
            de: "Direktes Objekt im Akkusativ Maskulinum.",
            es: "Artículo masculino declinado en acusativo como objeto directo.",
          },
        },
        {
          role: "Oração Condicional",
          word: "wenn man beharrlich bleibt",
          detail: "Nebensatz (Verbo Final)",
          color: "#8B5CF6",
          explanation: {
            "pt-BR": "A conjunção 'wenn' arremessa o verbo conjugado 'bleibt' para o final.",
            en: "The subordinating conjunction 'wenn' kicks 'bleibt' to the clause-final slot.",
            de: "Konditionaler Nebensatz mit finitem Verb am Satzende.",
            es: "Conjunción condicional que envía el verbo conjugado al final de la oración.",
          },
        },
      ],
    },
    {
      id: "de-card-3",
      level: "B1.2",
      targetPhrase: "“Wer den Pfennig nicht ehrt, ist des Talers nicht wert.”",
      ipa: "/veːɐ̯ deːn ˈpfɛnɪç nɪçt eːɐ̯t ɪst dɛs ˈtaːlɐs nɪçt veːɐ̯t/",
      intuitivePronunciation: {
        "pt-BR": "<b>ver</b> den <b>pfé</b>-nikh nikht <b>êrt</b>, ist des <b>tá</b>-lers nikht <b>vert</b>",
        en: "<b>vair</b> den <b>pfen</b>-nikh nikht <b>airt</b>, ist des <b>tah</b>-lers nikht <b>vairt</b>",
        fr: "<b>vère</b> dène <b>pfè</b>-nikh nikht <b>ère</b>, isst dès <b>ta</b>-lerss nikht <b>vère</b>",
        es: "<b>ver</b> den <b>pfé</b>-nij nijt <b>ert</b>, ist des <b>tá</b>-lers nijt <b>vert</b>",
        it: "<b>ver</b> den <b>pfen</b>-nikh nikht <b>ert</b>, ist des <b>ta</b>-lers nikht <b>vert</b>",
        ja: "<b>ヴェア</b>・デン・<b>プフェ</b>・ニヒ・ニヒト・<b>エーアト</b>、イスト・デス・<b>ター</b>・ラース・ニヒト・<b>ヴェーアト</b>",
      },
      translation: {
        "pt-BR": "“Quem não honra a pequena moeda, não é digno do grande tesouro.”",
        en: "“He who does not honor the penny is not worthy of the thaler.”",
        de: "“Wer den Pfennig nicht ehrt, ist des Talers nicht wert.”",
        fr: "“Qui ne respecte pas le sou n'est pas digne du franc.”",
        es: "“Quien no cuida la pequeña moneda, no es digno del gran tesoro.”",
        it: "“Chi non apprezza la piccola moneta non è degno del grande tesoro.”",
        ja: "「わずかな小銭を粗末にする者は、大金を手にする資格がない。」",
      },
      culturalNote: {
        "pt-BR": "💡 Sabedoria secular sobre apreço aos detalhes e valor acumulativo do esforço diário.",
        en: "💡 Traditional idiom praising financial prudence, humility, and attention to detail.",
        de: "💡 Bekannte Redewendung zur Wertschätzung von Kleinigkeiten und Beharrlichkeit.",
        fr: "💡 Sagesse populaire soulignant la valeur des petites attentions répétées.",
        es: "💡 Proverbio sobre la frugalidad, la humildad y la disciplina en los detalles.",
        it: "💡 Proverbio secolare sull'importanza di aver cura dei piccoli dettagli quotidiani.",
        ja: "💡 小さな努力や節約の積み重ねが大きな成功を生むという伝統的教訓。",
      },
      syntax: [
        {
          role: "Oração Relativa (Sujeito)",
          word: "Wer den Pfennig...",
          detail: "Pronome relativo 'wer'",
          color: "#06B6D4",
          explanation: {
            "pt-BR": "Oração subordinada com pronome livre funcionando como sujeito da oração matriz.",
            en: "Free relative clause acting as the subject of the main verb 'ist'.",
            de: "Relativsatz in Funktion des Subjekts.",
            es: "Oración subordinada relativa libre en función de sujeto.",
          },
        },
        {
          role: "Cópula da Matriz (V2)",
          word: "ist",
          detail: "Sein (3ª pessoa)",
          color: "#D97706",
          explanation: {
            "pt-BR": "Verbo principal da oração afirmativa ocupando a 2ª posição sintática.",
            en: "Main clause copula occupying the required second structural position.",
            de: "Hauptsatzverb an Position 2.",
            es: "Verbo cópula principal en segunda posición sintáctica.",
          },
        },
        {
          role: "Genitivo Regido",
          word: "des Talers",
          detail: "Genitivo Masculino",
          color: "#8B5CF6",
          explanation: {
            "pt-BR": "Construção culta com adjetivo 'wert' regendo o caso Genitivo.",
            en: "Archaic genitive government triggered by the adjective 'wert'.",
            de: "Genitivobjekt, regiert vom Adjektiv 'wert'.",
            es: "Caso genitivo regido por el adjetivo predicativo wert.",
          },
        },
        {
          role: "Predicativo Negado",
          word: "nicht wert",
          detail: "Negação + Adjetivo",
          color: "#10B981",
          explanation: {
            "pt-BR": "Partícula de negação antecedendo imediatamente o adjetivo final.",
            en: "Negative particle directly modifying the predicative adjective.",
            de: "Negiertes prädikatives Adjektiv.",
            es: "Partícula de negación y adjetivo predicativo.",
          },
        },
      ],
    },
  ],

  en: [
    {
      id: "en-card-1",
      level: "B1.2",
      targetPhrase: "“Knowledge speaks, but wisdom listens attentively.”",
      ipa: "/ˈnɒl.ɪdʒ spiːks bʌt ˈwɪz.dəm ˈlɪs.ənz əˈten.tɪv.li/",
      intuitivePronunciation: {
        "pt-BR": "<b>nó</b>-lidj <b>spíks</b>, bât <b>uíz</b>-dâm <b>lí</b>-sâns a-<b>tén</b>-tiv-li",
        en: "<b>nah</b>-lidj <b>speaks</b>, buht <b>wiz</b>-duhm <b>lis</b>-uhnz uh-<b>ten</b>-tiv-lee",
        fr: "<b>no</b>-lidj <b>spiks</b>, beute <b>ouiz</b>-deum <b>li</b>-seunze a-<b>tèn</b>-tiv-li",
        es: "<b>nó</b>-lidj <b>spíks</b>, bat <b>uís</b>-dom <b>lí</b>-sens a-<b>tén</b>-tiv-li",
        it: "<b>no</b>-lidj <b>spiks</b>, bat <b>uiz</b>-dom <b>lis</b>-sens a-<b>ten</b>-tiv-li",
        ja: "<b>ナ</b>・リジ・<b>スピークス</b>、バット・<b>ウィズ</b>・ダム・<b>リ</b>・スンズ・ア・<b>テン</b>・ティヴ・リー",
      },
      translation: {
        "pt-BR": "“O conhecimento fala, mas a sabedoria escuta atentamente.”",
        en: "“Knowledge speaks, but wisdom listens attentively.”",
        de: "“Wissen spricht, aber Weisheit hört aufmerksam zu.”",
        fr: "“Le savoir parle, mais la sagesse écoute attentivement.”",
        es: "“El conocimiento habla, pero la sabiduría escucha atentamente.”",
        it: "“La conoscenza parla, ma la saggezza ascolta attentamente.”",
        ja: "「知識は語り、知恵は耳を澄ませて聴く。」",
      },
      culturalNote: {
        "pt-BR": "💡 Provérbio reflexivo sobre modéstia epistêmica, escuta ativa e diálogo fecundo.",
        en: "💡 Axiom highlighting the contrast between superficial certainty and deep contemplation.",
        de: "💡 Philosophische Maxime über Bescheidenheit, aktives Zuhören und Urteilsfähigkeit.",
        fr: "💡 Réflexion classique sur l'importance de l'écoute humble et attentive.",
        es: "💡 Proverbio sobre la modestia intelectual y el poder de la escucha activa.",
        it: "💡 Riflessione sull'importanza del silenzio contemplativo e dell'ascolto attento.",
        ja: "💡 多弁よりも傾聴にこそ真の知性が宿ることを説く格言。",
      },
      syntax: [
        {
          role: "Sujeito (Incontável)",
          word: "Knowledge",
          detail: "Uncountable Noun",
          color: "#06B6D4",
          explanation: {
            "pt-BR": "Substantivo abstrato incontável operando como sujeito da primeira oração.",
            en: "Uncountable abstract noun heading the first coordinate clause.",
            de: "Abstraktes Nomen als Subjekt des ersten Teilsatzes.",
            es: "Sustantivo incontable abstracto que funciona como sujeto.",
          },
        },
        {
          role: "Verbo (Present Simple)",
          word: "speaks",
          detail: "3rd Sing. (-s)",
          color: "#D97706",
          explanation: {
            "pt-BR": "Verbo no Present Simple com a desinência canônica '-s' de 3ª pessoa.",
            en: "Present simple verb inflected with third-person singular suffix '-s'.",
            de: "Präsensform der 3. Person Singular mit Suffix '-s'.",
            es: "Verbo en presente simple con desinencia de tercera persona.",
          },
        },
        {
          role: "Conector Adversativo",
          word: "but wisdom",
          detail: "Coord. Conjunction",
          color: "#8B5CF6",
          explanation: {
            "pt-BR": "Conjunção coordenativa adversativa introduzindo contraste de atitude.",
            en: "Adversative coordinating conjunction establishing thematic contrast.",
            de: "Adversative Beiordnung zur thematischen Gegenüberstellung.",
            es: "Conjunción adversativa que contrapone dos actitudes opuestas.",
          },
        },
        {
          role: "Predicado & Advérbio",
          word: "listens attentively",
          detail: "Verb + Manner Adv.",
          color: "#10B981",
          explanation: {
            "pt-BR": "Verbo de ação intransitivo complementado por advérbio de modo em '-ly'.",
            en: "Intransitive action verb modified by a derived manner adverb in '-ly'.",
            de: "Intransitives Verb, modifiziert durch Modaladverb.",
            es: "Verbo intransitivo complementado por adverbio de modo.",
          },
        },
      ],
    },
    {
      id: "en-card-2",
      level: "B2.1",
      targetPhrase: "“The only way to do great work is to love what you do.”",
      ipa: "/ðiː ˈoʊn.li weɪ tuː duː ɡreɪt wɜːrk ɪz tuː lʌv wʌt juː duː/",
      intuitivePronunciation: {
        "pt-BR": "di <b>ôn</b>-li <b>uêi</b> tu du <b>grêit</b> <b>uôrk</b> iz tu <b>lâv</b> <b>uót</b> iú <b>du</b>",
        en: "the <b>ohn</b>-lee <b>way</b> too doo <b>grayt</b> <b>wurk</b> iz too <b>luhv</b> <b>wuht</b> yoo <b>doo</b>",
        fr: "dhi <b>onn</b>-li <b>oué</b> tou dou <b>gréte</b> <b>oueuk</b> iz tou <b>leuv</b> <b>ouat</b> you <b>dou</b>",
        es: "di <b>ón</b>-li <b>uéi</b> tu du <b>gréit</b> <b>uork</b> iz tu <b>lav</b> <b>uat</b> iu <b>du</b>",
        it: "di <b>on</b>-li <b>uei</b> tu du <b>greit</b> <b>uork</b> iz tu <b>lav</b> <b>uat</b> iu <b>du</b>",
        ja: "ジ・<b>オウン</b>・リー・<b>ウェイ</b>・トゥ・ドゥ・<b>グレイト</b>・<b>ワーク</b>・イズ・トゥ・<b>ラヴ</b>・<b>ワット</b>・ユー・<b>ドゥ</b>",
      },
      translation: {
        "pt-BR": "“A única maneira de fazer um ótimo trabalho é amar o que você faz.”",
        en: "“The only way to do great work is to love what you do.”",
        de: "“Der einzige Weg, großartige Arbeit zu leisten, ist, zu lieben, was man tut.”",
        fr: "“La seule façon de faire du bon travail est d'aimer ce que vous faites.”",
        es: "“La única manera de hacer un gran trabajo es amar lo que haces.”",
        it: "“L'unico modo per fare un ottimo lavoro è amare ciò che fai.”",
        ja: "「偉大な仕事を成し遂げる唯一の方法は、自分の仕事を愛することだ。」",
      },
      culturalNote: {
        "pt-BR": "💡 Máxima sobre foco deliberado, paixão vocacional e maestria duradoura.",
        en: "💡 Celebrated insight on vocations, intentional focus, and creative excellence.",
        de: "💡 Berühmter Leitsatz über Leidenschaft, Hingabe und schöpferische Reife.",
        fr: "💡 Réflexion marquante sur la passion créatrice et l'excellence professionnelle.",
        es: "💡 Reflexión sobre la dedicación vocacional y la excelencia creativa.",
        it: "💡 Celebre massima sulla passione autentica e la ricerca dell'eccellenza.",
        ja: "💡 情熱と専念こそが真の卓越性を生み出すという名言。",
      },
      syntax: [
        {
          role: "Sintagma Sujeito",
          word: "The only way to do great work",
          detail: "Noun + Inf. Clause",
          color: "#06B6D4",
          explanation: {
            "pt-BR": "Sintagma nominal sujeito modificado por oração infinitiva reduzida.",
            en: "Complex noun phrase modified by a restrictive infinitive clause.",
            de: "Komplexe Nominalphrase mit Infinitivergänzung als Subjekt.",
            es: "Sintagma nominal sujeto con cláusula infinitiva restrictiva.",
          },
        },
        {
          role: "Cópula Principal",
          word: "is",
          detail: "Be (3ª sing.)",
          color: "#D97706",
          explanation: {
            "pt-BR": "Verbo de ligação que ancora a definição semântica do período.",
            en: "Copular verb linking subject identity to the predicative infinitive.",
            de: "Kopulaverb zur Verknüpfung von Subjekt und Prädikativ.",
            es: "Verbo copulativo de enlace.",
          },
        },
        {
          role: "Predicativo Infinitivo",
          word: "to love",
          detail: "Full Infinitive",
          color: "#10B981",
          explanation: {
            "pt-BR": "Infinitivo com 'to' funcionando como núcleo do predicativo do sujeito.",
            en: "Infinitive with 'to' acting as the core of the predicate nominative.",
            de: "Prädikativer Infinitiv mit 'zu'.",
            es: "Infinitivo pleno como núcleo del predicativo.",
          },
        },
        {
          role: "Oração Relativa Livre",
          word: "what you do",
          detail: "Free Relative",
          color: "#8B5CF6",
          explanation: {
            "pt-BR": "Oração relativa nominal livre funcionando como objeto direto de 'love'.",
            en: "Fused relative clause functioning as the direct object of 'love'.",
            de: "Freier Relativsatz als direktes Akkusativobjekt.",
            es: "Cláusula relativa libre como objeto directo.",
          },
        },
      ],
    },
  ],
};

export const COMMUTE_ITEMS_BY_LANG: Record<string, CommuteItem> = {
  de: {
    targetPhrase: "Ich möchte gerne eine heiße Schokolade mit Hafermilch.",
    ipa: "/ɪç ˈmœç.tə ˈɡɛʁ.nə ˈaɪ̯.nə ˈhaɪ̯.sə ʃo.koˈlaː.də mɪt ˈhaː.fɐˌmɪlç/",
    intuitivePronunciation: {
      "pt-BR": "<b>i-sh</b> <b>mêt</b>-che <b>guêr</b>-ne <b>ái</b>-ne <b>hái</b>-se choco-<b>LÁ</b>-de mit <b>RÁ</b>-fer-mil-sh",
      en: "<b>ikh</b> <b>moekh</b>-teh <b>gair</b>-neh <b>eye</b>-neh <b>hy</b>-seh shoh-koh-<b>LAH</b>-deh mit <b>HAH</b>-fer-milkh",
      fr: "<b>ikh</b> <b>meukh</b>-teu <b>guèr</b>-neu <b>aï</b>-neu <b>haï</b>-sseu cho-co-<b>LA</b>-deu mit <b>HA</b>-fer-milkh",
      es: "<b>ij</b> <b>mêj</b>-te <b>guer</b>-ne <b>ái</b>-ne <b>jái</b>-se choco-<b>LÁ</b>-de mit <b>JÁ</b>-fer-milj",
      it: "<b>ikh</b> <b>moekh</b>-te <b>gher</b>-ne <b>ai</b>-ne <b>hai</b>-se ciocco-<b>LA</b>-de mit <b>HA</b>-fer-milkh",
      ja: "<b>イヒ</b>・<b>メヒ</b>・テ・<b>ゲル</b>・ネ・<b>アイ</b>・ネ・<b>ハイ</b>・セ・チョコ・<b>ラー</b>・デ・ミット・<b>ハー</b>・ファー・ミルヒ",
    },
    translation: {
      "pt-BR": "Eu gostaria de um chocolate quente com leite de aveia.",
      en: "I would like a hot chocolate with oat milk.",
      de: "Ich möchte gerne eine heiße Schokolade mit Hafermilch.",
      fr: "Je voudrais un chocolat chaud avec du lait d'avoine.",
      es: "Quisiera un chocolate caliente con leche de avena.",
      it: "Vorrei una cioccolata calda con latte d'avena.",
      ja: "オーツミルク入りのホットチョコレートをお願いします。",
    },
    badge: "BERLIN-MITTE HOCHDEUTSCH B1",
    speechLang: "de-DE",
    pitchHz: 138,
    curieTip: {
      "pt-BR": "Excelente energia nos harmônicos do som suave! Na vogal em ‘möchte’, projete seus lábios 2 milímetros mais para a frente com língua relaxada.",
      en: "Great formant energy! Round your lips slightly forward on the vowel in 'möchte' while maintaining a relaxed tongue position.",
      de: "Sehr gute Konsonantenführung. Achten Sie bei 'möchte' auf die korrekte Lippenrundung für den offenen Ö-Laut.",
      fr: "Belle énergie articulatoire. Projetez légèrement les lèvres vers l'avant sur la voyelle de 'möchte'.",
      es: "Excelente energía armónica. Redondea los labios hacia adelante en la vocal de 'möchte'.",
      it: "Ottimo controllo articolatorio. Arrotonda le labbra in avanti sulla vocale di 'möchte'.",
      ja: "素晴らしいフォルマント調和です。『möchte』の母音では唇を少し前に突き出して発音してください。",
    },
    syllables: [
      { text: "Ich", intuitive: { "pt-BR": "i-sh", en: "ikh", es: "ij", ja: "イヒ" } },
      { text: "möch", intuitive: { "pt-BR": "mêtch", en: "moekh", es: "mêj", ja: "メヒ" } },
      { text: "te", intuitive: { "pt-BR": "te", en: "teh", es: "te", ja: "テ" } },
      { text: "ger", intuitive: { "pt-BR": "guêr", en: "gair", es: "guer", ja: "ゲル" } },
      { text: "ne", intuitive: { "pt-BR": "ne", en: "neh", es: "ne", ja: "ネ" } },
      { text: "hei", intuitive: { "pt-BR": "hái", en: "hy", es: "jái", ja: "ハイ" } },
      { text: "ße", intuitive: { "pt-BR": "se", en: "seh", es: "se", ja: "セ" } },
      { text: "Scho", intuitive: { "pt-BR": "cho", en: "shoh", es: "cho", ja: "ショ" } },
      { text: "ko", intuitive: { "pt-BR": "co", en: "koh", es: "co", ja: "コ" } },
      { text: "la", intuitive: { "pt-BR": "lá", en: "lah", es: "lá", ja: "ラー" } },
      { text: "de", intuitive: { "pt-BR": "de", en: "deh", es: "de", ja: "デ" } },
    ],
  },

  en: {
    targetPhrase: "I would like an iced oat latte with a double shot of espresso, please.",
    ipa: "/aɪ wʊd laɪk ən aɪst oʊt ˈlɑː.teɪ wɪð ə ˈdʌb.əl ʃɒt əv eˈspre.soʊ pliːz/",
    intuitivePronunciation: {
      "pt-BR": "<b>ai</b> <b>uúd</b> <b>láik</b> an <b>áist</b> <b>ôut</b> <b>LÁ</b>-tei uíd a <b>DÂ</b>-bol <b>chát</b> ov es-<b>PRÉ</b>-sou, <b>pliz</b>",
      en: "<b>eye</b> <b>wood</b> <b>lyke</b> an <b>eyst</b> <b>oht</b> <b>LAH</b>-tay with a <b>DUH</b>-buhl <b>shaht</b> uhv eh-<b>SPREH</b>-soh, <b>pleez</b>",
      fr: "<b>aï</b> <b>oude</b> <b>laïk</b> an <b>aïste</b> <b>ôte</b> <b>LA</b>-té ouidh eu <b>DEU</b>-beul <b>chate</b> ov è-<b>SPRE</b>-so, <b>plize</b>",
      es: "<b>ai</b> <b>uud</b> <b>láik</b> an <b>áist</b> <b>out</b> <b>LÁ</b>-tei uid a <b>DÁ</b>-bol <b>shot</b> ov es-<b>PRÉ</b>-so, <b>plis</b>",
      it: "<b>ai</b> <b>uud</b> <b>laik</b> an <b>aist</b> <b>out</b> <b>LA</b>-te uid a <b>DA</b>-bol <b>sciat</b> ov es-<b>PRE</b>-so, <b>plis</b>",
      ja: "<b>アイ</b>・<b>ウッド</b>・<b>ライク</b>・アン・<b>アイスト</b>・<b>オート</b>・<b>ラ</b>・テイ・ウィズ・ア・<b>ダ</b>・ブル・<b>ショット</b>・オブ・エス・<b>プレ</b>・ソー、<b>プリーズ</b>",
    },
    translation: {
      "pt-BR": "Eu gostaria de um latte gelado com leite de aveia e dose dupla de espresso, por favor.",
      en: "I would like an iced oat latte with a double shot of espresso, please.",
      de: "Ich hätte gerne einen Eislatte mit Hafermilch und einem doppelten Espresso, bitte.",
      fr: "Je voudrais un latte glacé au lait d'avoine avec un double expresso, s'il vous plaît.",
      es: "Quisiera un latte helado con leche de avena y doble shot de espresso, por favor.",
      it: "Vorrei un latte freddo con latte d'avena e un doppio espresso, per favore.",
      ja: "オーツミルク入りのアイスラテにエスプレッソのダブルショットをお願いします。",
    },
    badge: "LONDON SOUTHWARK RP B2",
    speechLang: "en-US",
    pitchHz: 142,
    curieTip: {
      "pt-BR": "Excelente foco na conexão rítmica das palavras. No inglês internacional, mantenha as vogais abertas e suavize a transição articulatória entre as consoantes.",
      en: "Great rhythm on connected speech! Keep vowels open and maintain a smooth articulatory transition between consonants.",
      de: "Ausgezeichnete Melodie beim Sprechrhythmus. Halten Sie die Vokale offen und verbinden Sie die Konsonanten fließend.",
      fr: "Belle cadence continue ! Gardez les voyelles ouvertes et liez les consonnes naturellement pour une diction fluide.",
      es: "Excelente cadencia rítmica. Mantén las vocales abiertas y suaviza la transición articulatoria entre consonantes.",
      it: "Ottima fluidità nel legare le parole. Mantieni le vocali aperte per una dizione pulita e naturale.",
      ja: "滑らかな単語の連結を意識しましょう。母音をしっかり響かせ、子音の移行をスムーズに行うことがポイントです。",
    },
    syllables: [
      { text: "I", intuitive: { "pt-BR": "ai", en: "eye", es: "ai", ja: "アイ" } },
      { text: "would", intuitive: { "pt-BR": "uúd", en: "wood", es: "uud", ja: "ウッド" } },
      { text: "like", intuitive: { "pt-BR": "láik", en: "lyke", es: "láik", ja: "ライク" } },
      { text: "iced", intuitive: { "pt-BR": "áist", en: "eyst", es: "áist", ja: "アイスト" } },
      { text: "oat", intuitive: { "pt-BR": "ôut", en: "oht", es: "out", ja: "オート" } },
      { text: "lat", intuitive: { "pt-BR": "LÁ", en: "LAH", es: "LÁ", ja: "ラ" } },
      { text: "te", intuitive: { "pt-BR": "tei", en: "tay", es: "tei", ja: "テイ" } },
      { text: "dou", intuitive: { "pt-BR": "DÂ", en: "DUH", es: "DÁ", ja: "ダ" } },
      { text: "ble", intuitive: { "pt-BR": "bol", en: "buhl", es: "bol", ja: "ブル" } },
      { text: "shot", intuitive: { "pt-BR": "chát", en: "shaht", es: "shot", ja: "ショット" } },
    ],
  },
};

export const DUEL_QUESTIONS_BY_LANG: Record<string, DuelQuestion[]> = {
  en: [
    {
      id: 1,
      word: "the Breakthrough",
      ipa: "/ðə ˈbreɪk.θruː/",
      intuitivePronunciation: {
        "pt-BR": "dâ <b>brêik</b>-tru",
        en: "the <b>brayk</b>-throo",
        es: "de <b>bréik</b>-zru",
        fr: "dhe <b>bréke</b>-throu",
        it: "de <b>breik</b>-thru",
        ja: "ザ・<b>ブレイク</b>・スルー",
      },
      gender: {
        "pt-BR": "Substantivo Contável",
        en: "Countable Noun",
        de: "Zählbares Nomen",
        es: "Sustantivo Contable",
      },
      sentence: "“The team achieved a major scientific breakthrough in neural computing.”",
      highlight: "breakthrough",
      options: [
        {
          key: "A",
          text: {
            "pt-BR": "O Avanço Decisivo",
            en: "Decisive Breakthrough",
            de: "Der Durchbruch",
            es: "El Avance Decisivo",
            it: "La Svolta Decisiva",
            ja: "決定的な大躍進",
          },
          correct: true,
        },
        {
          key: "B",
          text: {
            "pt-BR": "O Retrocesso",
            en: "Setback / Regression",
            de: "Der Rückschritt",
            es: "El Retroceso",
            it: "Il Regresso",
            ja: "後退・挫折",
          },
          correct: false,
        },
        {
          key: "C",
          text: {
            "pt-BR": "A Hipótese Provisória",
            en: "Tentative Hypothesis",
            de: "Die Vorläufige Hypothese",
            es: "La Hipótesis Provisional",
            it: "L'Ipotesi Provvisoria",
            ja: "仮説",
          },
          correct: false,
        },
        {
          key: "D",
          text: {
            "pt-BR": "O Prazo Limite",
            en: "Strict Deadline",
            de: "Die Frist",
            es: "El Plazo Límite",
            it: "La Scadenza",
            ja: "締め切り",
          },
          correct: false,
        },
      ],
    },
  ],
  de: [
    {
      id: 1,
      word: "die Herausforderung",
      ipa: "/diː hɛˈʁaʊ̯sˌfɔʁdəʁʊŋ/",
      intuitivePronunciation: {
        "pt-BR": "di re-<b>ráus</b>-for-de-rung",
        en: "dee heh-<b>rows</b>-for-deh-roong",
        es: "di je-<b>ráus</b>-for-de-rung",
        fr: "di hé-<b>raousse</b>-for-deu-roung",
        it: "di he-<b>raus</b>-for-de-rung",
        ja: "ディー・ヘ・<b>ラウス</b>・フォル・デ・ルング",
      },
      gender: {
        "pt-BR": "Substantivo Feminino",
        en: "Feminine Noun",
        de: "Weibliches Nomen",
        es: "Sustantivo Femenino",
      },
      sentence: "“Eine neue Sprache zu lernen ist eine spannende Herausforderung für den Geist.”",
      highlight: "Herausforderung",
      options: [
        {
          key: "A",
          text: {
            "pt-BR": "O Desafio",
            en: "The Challenge",
            de: "Die Herausforderung",
            es: "El Desafío",
            it: "La Sfida",
            ja: "挑戦・課題",
          },
          correct: true,
        },
        {
          key: "B",
          text: {
            "pt-BR": "A Oportunidade Perdida",
            en: "Lost Opportunity",
            de: "Die Verpasste Chance",
            es: "La Oportunidad Perdida",
            it: "L'Opportunità Mancata",
            ja: "逃した機会",
          },
          correct: false,
        },
        {
          key: "C",
          text: {
            "pt-BR": "O Hábito Mecânico",
            en: "Mechanical Habit",
            de: "Die Gewohnheit",
            es: "El Hábito Mecánico",
            it: "L'Abitudine Meccanica",
            ja: "無意識の習慣",
          },
          correct: false,
        },
        {
          key: "D",
          text: {
            "pt-BR": "A Certeza Absoluta",
            en: "Absolute Certainty",
            de: "Die Gewissheit",
            es: "La Certeza Absoluta",
            it: "La Certezza Assoluta",
            ja: "確信",
          },
          correct: false,
        },
      ],
    },
  ],
};

export class LanguageMatrixEngine {
  static getDeckForCourse(targetLang: string): CardItem[] {
    const safeLang = targetLang.toLowerCase().split("-")[0];
    return COURSE_DECKS_BY_LANG[safeLang] || COURSE_DECKS_BY_LANG.en || [];
  }

  static getTrailModules(targetLang: string): TrailNode[] {
    const safeLang = targetLang.toLowerCase().split("-")[0];
    return TRAIL_MODULES_BY_LANG[safeLang] || TRAIL_MODULES_BY_LANG.en || [];
  }

  static getCommutePhrase(targetLang: string): CommuteItem {
    const safeLang = targetLang.toLowerCase().split("-")[0];
    return COMMUTE_ITEMS_BY_LANG[safeLang] || COMMUTE_ITEMS_BY_LANG.en;
  }

  static getDuelQuestions(targetLang: string): DuelQuestion[] {
    const safeLang = targetLang.toLowerCase().split("-")[0];
    return DUEL_QUESTIONS_BY_LANG[safeLang] || DUEL_QUESTIONS_BY_LANG.en || [];
  }

  static getBCP47(lang: string): string {
    const safe = lang.toLowerCase().split("-")[0];
    return LANGUAGE_BCP47[safe] || LANGUAGE_BCP47[lang] || "en-US";
  }

  static getLocalizedText(field: Record<string, string> | undefined, supportLang: string, fallback = ""): string {
    if (!field) return fallback;
    if (field[supportLang]) return field[supportLang];
    const short = supportLang.split("-")[0];
    if (field[short]) return field[short];
    if (field["pt-BR"]) return field["pt-BR"];
    if (field["en"]) return field["en"];
    return Object.values(field)[0] || fallback;
  }
}
