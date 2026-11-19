// Prosa Mentor Pedagogical Conversational Engine
// Provides contextual dialogue, intuitive phonetics, translations,
// and real-time mentor corrections in supportLang for all 7 languages.

import { LanguageMatrixEngine } from "./contentService";

export interface ChatSuggestion {
  text: string;
  intuitive?: string;
  translation?: string;
}

export interface ChatMessage {
  id: string;
  sender: "mentor" | "user";
  targetText: string;
  intuitivePronunciation?: string;
  translation?: string;
  mentorNote?: {
    verdict: "impecável" | "ótimo" | "ajuste";
    feedback: string;
    improvedVersion?: string;
  };
  timestamp: number;
}

export interface MentorChatSession {
  mentorId: string;
  mentorName: string;
  avatar: string;
  targetLang: string;
  supportLang: string;
  cefrLevel: string;
  topic: string;
  turn: number;
  maxTurns: number;
  messages: ChatMessage[];
  currentSuggestions: ChatSuggestion[];
}

interface MentorTopicData {
  topic: Record<string, string>;
  openers: Record<string, { targetText: string; intuitive: Record<string, string>; translation: Record<string, string> }>;
  replies: Record<string, Array<{ targetText: string; intuitive: Record<string, string>; translation: Record<string, string> }>>;
  suggestions: Record<string, Array<ChatSuggestion>>;
}

const MENTOR_TOPIC_DATA: Record<string, MentorTopicData> = {
  einstein: {
    topic: {
      pt: "Curiosidade, Tempo e Experimentos Mentais",
      en: "Curiosity, Time & Thought Experiments",
      de: "Neugier, Zeit & Gedankenexperimente",
      fr: "Curiosité, Temps et Expériences de Pensée",
      es: "Curiosidad, Tiempo y Experimentos Mentales",
      it: "Curiosità, Tempo ed Esperimenti Mentali",
      ja: "好奇心・時間・思考実験",
    },
    openers: {
      de: {
        targetText: "Guten Tag! Was regt deine Neugierde heute am meisten an?",
        intuitive: {
          pt: "gú-ten ták! vás rêkt dái-ne nói-guir-de hóu-te am máis-ten an?",
          en: "GOO-ten tahk! vahs raykt DYE-nuh NOY-geer-duh HOY-tuh ahm MY-sten ahn?",
          es: "gú-ten tak! vas rekt dái-ne nói-guir-de jói-te am máis-ten an?",
        },
        translation: {
          pt: "Bom dia! O que mais estimula sua curiosidade no dia de hoje?",
          en: "Good day! What stimulates your curiosity the most today?",
          es: "¡Buenos días! ¿Qué es lo que más estimula tu curiosidad hoy?",
          de: "Guten Tag! Was regt deine Neugierde heute am meisten an?",
        },
      },
      en: {
        targetText: "Welcome! If you could bend time for an hour, what would you explore?",
        intuitive: {
          pt: "uél-kam! if iú cûd bénd táim for ân áu-er, uát uúd iú iks-plór?",
          es: "uél-cam! if iu cud bend táim for an áu-er, uat uud iu iks-plor?",
        },
        translation: {
          pt: "Bem-vindo! Se você pudesse dobrar o tempo por uma hora, o que exploraria?",
          en: "Welcome! If you could bend time for an hour, what would you explore?",
          es: "¡Bienvenido! Si pudieras curvar el tiempo por una hora, ¿qué explorarías?",
          de: "Willkommen! Wenn du die Zeit für eine Stunde krümmen könntest, was würdest du erforschen?",
        },
      },
      fr: {
        targetText: "Bonjour! La curiosité est le moteur de tout progrès. Que cherches-tu?",
        intuitive: {
          pt: "bon-júr! la ku-ri-o-zi-tê é le mo-têr de tu pro-gré. ke chérsh-tu?",
        },
        translation: {
          pt: "Bom dia! A curiosidade é o motor de todo o progresso. O que você procura?",
          en: "Good day! Curiosity is the engine of all progress. What are you looking for?",
          es: "¡Buenos días! La curiosidad es el motor de todo progreso. ¿Qué buscas?",
          fr: "Bonjour! La curiosité est le moteur de tout progrès. Que cherches-tu?",
        },
      },
      es: {
        targetText: "¡Hola! La imaginación es más importante que el mero conocimiento. ¿Qué opinas?",
        intuitive: {
          pt: "o-la! la i-ma-ji-na-ssi-on és mas im-por-tán-te ke el me-ro ko-no-ssi-mi-én-to. ke o-pí-nas?",
        },
        translation: {
          pt: "Olá! A imaginação é mais importante que o mero conhecimento. O que você acha?",
          en: "Hello! Imagination is more important than mere knowledge. What do you think?",
          es: "¡Hola! La imaginación es más importante que el mero conocimiento. ¿Qué opinas?",
        },
      },
      it: {
        targetText: "Benvenuto! Lo spazio e il tempo si piegano davanti alla mente curiosa. Come stai?",
        intuitive: {
          pt: "ben-ve-nú-to! lo spá-ttsi-o e il tém-po si pié-ga-no da-ván-ti al-la men-te ku-ri-ó-za. kó-me stái?",
        },
        translation: {
          pt: "Bem-vindo! O espaço e o tempo se dobram diante da mente curiosa. Como você está?",
          en: "Welcome! Space and time bend before the curious mind. How are you?",
          it: "Benvenuto! Lo spazio e il tempo si piegano davanti alla mente curiosa. Come stai?",
        },
      },
      ja: {
        targetText: "こんにちは！好奇心こそが学びの最も純粋な光です。調子はどうですか？",
        intuitive: {
          pt: "kon-ni-tchi-uá! kô-ki-shin kô-sso ga ma-na-bi no mot-to-mo djun-sui na hi-ka-ri déss. tchô-shi uá dō déss-ka?",
        },
        translation: {
          pt: "Olá! A curiosidade é a luz mais pura do aprendizado. Como você está se sentindo?",
          en: "Hello! Curiosity is the purest light of learning. How are you feeling?",
          ja: "こんにちは！好奇心こそが学びの最も純粋な光です。調子はどうですか？",
        },
      },
      pt: {
        targetText: "Olá! A imaginação é o ensaio prévio das atrações futuras. O que te move hoje?",
        intuitive: {
          pt: "o-lá! a i-ma-ji-na-ção é u en-sái-u pré-viu das a-tra-ções fu-tú-ras.",
        },
        translation: {
          pt: "Olá! A imaginação é o ensaio prévio das atrações futuras. O que te move hoje?",
          en: "Hello! Imagination is the preview of life's coming attractions. What moves you today?",
        },
      },
    },
    suggestions: {
      de: [
        { text: "Ich möchte heute die Physik der Relativität verstehen.", intuitive: "iç méç-te hóu-te di fü-zík der re-la-ti-vi-têt fer-chtê-en", translation: "Quero entender hoje a física da relatividade." },
        { text: "Meine Neugier gilt den Geheimnissen des Universums.", intuitive: "mái-ne nói-guir guilt dehn gue-háim-ni-ssen des u-ni-vér-zums", translation: "Minha curiosidade é voltada para os segredos do universo." },
        { text: "Ich lerne Deutsch, weil die Logik mich fasziniert.", intuitive: "iç lér-ne dôi-tç, váil di ló-guik miç fa-ssi-nírt", translation: "Estudo alemão porque a lógica me fascina." },
      ],
      en: [
        { text: "I would explore how gravity interacts with quantum light.", intuitive: "ái uúd iks-plór háu grá-vi-ti in-ter-ákts uíz kuán-tum láit", translation: "Eu exploraria como a gravidade interage com a luz quântica." },
        { text: "I believe imagination allows us to see beyond equations.", intuitive: "ái bi-lív i-ma-dji-néi-shân a-láus âs tu sí bi-iónd i-kuéi-jâns", translation: "Acredito que a imaginação nos permite ver além das equações." },
        { text: "I want to improve my daily speaking fluency with you.", intuitive: "ái uónt tu im-prúv mái déi-li spí-king flú-en-ssi uíz iú", translation: "Quero aprimorar minha fluência de conversa diária com você." },
      ],
      fr: [
        { text: "Je cherche à comprendre la beauté des lois naturelles.", intuitive: "je shérsh a kom-pran-dre la bo-té de luá na-tu-rél", translation: "Procuro compreender a beleza das leis naturais." },
        { text: "La langue française m'aide à penser avec clarté.", intuitive: "la lan-gue fran-sséz med a pan-ssé a-vék klar-té", translation: "A língua francesa me ajuda a pensar com clareza." },
        { text: "Je suis prêt pour notre expérience de pensée aujourd'hui.", intuitive: "je suí pré pur nó-tre éks-pé-ri-an-ss de pan-ssé o-jur-duí", translation: "Estou pronto para o nosso experimento mental hoje." },
      ],
      es: [
        { text: "Opino que soñar abre caminos donde antes no había nada.", intuitive: "o-pí-no ke so-nhár á-bre ka-mí-nos dón-de án-tes no a-bí-a ná-da", translation: "Acho que sonhar abre caminhos onde antes não havia nada." },
        { text: "Quiero dominar el idioma para compartir ideas profundas.", intuitive: "ki-é-ro do-mi-nár el i-di-ó-ma pá-ra kom-par-tír i-dé-as pro-fún-das", translation: "Quero dominar o idioma para compartilhar ideias profundas." },
        { text: "La física y el lenguaje comparten una misma armonía.", intuitive: "la fí-si-ka i el len-guá-je kom-pár-ten ú-na mís-ma ar-mo-ní-a", translation: "A física e a linguagem compartilham uma mesma harmonia." },
      ],
      it: [
        { text: "Penso che la curiosità sia la scintilla di ogni scoperta.", intuitive: "pén-so ke la ku-ri-o-zi-tá si-a la shin-tíl-la di ón-nhi sko-pér-ta", translation: "Penso que a curiosidade seja a faísca de toda descoberta." },
        { text: "Sto studiando per esprimere concetti complessi con grazia.", intuitive: "sto stu-di-án-do per es-prí-me-re kon-tchét-ti kom-plés-si kon grá-tsi-a", translation: "Estou estudando para expressar conceitos complexos com elegância." },
        { text: "Il tempo vola quando ci immergiamo nello studio vero.", intuitive: "il tém-po vó-la kuán-do tchi im-mer-ji-á-mo nél-lo stú-dio vé-ro", translation: "O tempo voa quando nos aprofundamos no estudo verdadeiro." },
      ],
      ja: [
        { text: "思考の深さと美しさを日本語で探求したいです。", intuitive: "shi-kô no fu-ka-ssa to u-tsu-ku-shi-ssa o ni-hon-go de tan-kiu shi-tái déss", translation: "Quero explorar a profundidade e beleza do pensamento em japonês." },
        { text: "毎日の一歩が新しい理解へとつながっています。", intuitive: "mái-ni-tchi no ip-po ga a-ta-ra-shí ri-kái é to tsu-na-gat-te i-mass", translation: "O passo de cada dia está conectado a um novo entendimento." },
        { text: "アインシュタイン先生、対話を続けましょう。", intuitive: "ain-shu-táin sén-ssê, tái-ua o tsu-zu-ke-ma-shô", translation: "Professor Einstein, continuemos nossa conversa." },
      ],
      pt: [
        { text: "Quero desvendar como a curiosidade transforma o aprendizado.", intuitive: "kê-ro dez-ven-dar kó-mu a ku-ri-o-zi-da-di trans-for-ma", translation: "Quero desvendar como a curiosidade transforma o aprendizado." },
        { text: "Acredito que o ritmo e a persistência geram grandes ideias.", intuitive: "a-cre-di-tu ke u rrit-mu e a per-sis-tên-si-a jé-ram gran-des i-dei-as", translation: "Acredito que o ritmo e a persistência geram grandes ideias." },
        { text: "Estou focado em consolidar conexões duradouras na memória.", intuitive: "es-tou fo-ca-du em con-so-li-dar co-ne-xões du-ra-dou-ras", translation: "Estou focado em consolidar conexões duradouras na memória." },
      ],
    },
    replies: {
      de: [
        {
          targetText: "Ausgezeichnet! Wenn die Gedanken frei fließen, ordnet sich die Grammatik wie von selbst. Was ist dein nächstes Ziel?",
          intuitive: { pt: "áus-gue-tsáiç-net! ven di gue-dán-ken frái flí-ssen, órd-net ziç di gra-má-tik vi fon zélbst." },
          translation: { pt: "Excelente! Quando os pensamentos fluem livres, a gramática se ordena quase por si só. Qual é sua próxima meta?" },
        },
        {
          targetText: "Genau so! Eine einfache Formulierung birgt oft die tiefste Wahrheit. Erzähl mir mehr darüber.",
          intuitive: { pt: "gue-náu zo! ái-ne áin-fa-je for-mu-lí-rung birkt oft di tíf-ste vár-háit." },
          translation: { pt: "Exatamente assim! Uma formulação simples guarda com frequência a verdade mais profunda. Conte-me mais." },
        },
      ],
      en: [
        {
          targetText: "Brilliant thought! Real comprehension happens when intuition precedes formal notation. How do you feel expressing that in English?",
          intuitive: { pt: "brí-li-ant fót! rí-al com-pri-hén-shân há-pêns uén in-tu-í-shân pri-ssíds fór-mal no-téi-shân." },
          translation: { pt: "Pensamento brilhante! A verdadeira compreensão acontece quando a intuição precede a notação formal. Como se sente expressando isso em inglês?" },
        },
        {
          targetText: "Precisely! Clear communication is the hallmark of mastery. Notice how naturally the words flowed in your sentence.",
          intuitive: { pt: "pri-ssáis-li! clíar co-miu-ni-kéi-shân iz zâ hál-mark óv más-te-ri." },
          translation: { pt: "Precisamente! A comunicação clara é a marca da maestria. Repare como as palavras fluíram com naturalidade na sua frase." },
        },
      ],
      fr: [
        {
          targetText: "Magnifique réflexion! La nuance et la rigueur s'unissent parfaitement dans votre propos. Poursuivons!",
          intuitive: { pt: "ma-nhi-fík ré-flék-ssi-on! la nu-an-ss e la ri-gêr s'u-níss par-fét-man dan vó-tre pro-pó." },
          translation: { pt: "Magnífica reflexão! A nuance e o rigor se unem perfeitamente na sua fala. Continuemos!" },
        },
      ],
      es: [
        {
          targetText: "¡Qué lucidez! Quien domina la expresión de su pensamiento conquista la libertad mental. ¿Cómo lo aplicarías en tu rutina?",
          intuitive: { pt: "ke lu-si-dés! ki-en do-mí-na la eks-pre-si-ón de su pen-sa-mi-én-to kon-kís-ta la li-ber-tád men-tál." },
          translation: { pt: "Que lucidez! Quem domina a expressão do seu pensamento conquista a liberdade mental. Como aplicaria isso na sua rotina?" },
        },
      ],
      it: [
        {
          targetText: "Splendida osservazione! La musica delle parole risveglia nuove sinapsi nel cervello. Continua così!",
          intuitive: { pt: "splén-di-da os-ser-va-tsió-ne! la mú-si-ka dél-le pa-ró-le riz-vé-llia nuó-ve si-náp-si nel tcher-vél-lo." },
          translation: { pt: "Esplêndida observação! A música das palavras desperta novas sinapses no cérebro. Continue assim!" },
        },
      ],
      ja: [
        {
          targetText: "見事な表現です！言葉を一つずつ大切に紡ぐ姿勢に、真の知性を感じます。",
          intuitive: { pt: "mi-go-to na hyô-guen déss! ko-to-ba o hi-to-tsu zú-tsu tái-sse-tsu ni tsu-mu-gu shi-ssê ni, shin no tchi-ssê o kan-ji-mass." },
          translation: { pt: "Expressão admirável! Na postura de tecer as palavras com cuidado, sente-se a verdadeira sabedoria." },
        },
      ],
      pt: [
        {
          targetText: "Magnífico! O encadeamento das ideias demonstra clareza e ritmo sólido. Prossigamos!",
          intuitive: { pt: "mag-ní-fi-ku! u en-ca-de-a-men-tu das i-dei-as de-mons-tra cla-re-za." },
          translation: { pt: "Magnífico! O encadeamento das ideias demonstra clareza e ritmo sólido. Prossigamos!" },
        },
      ],
    },
  },
  feynman: {
    topic: {
      pt: "Simplificação Extrema & A Física do Dia a Dia",
      en: "Radical Simplicity & Everyday Physics",
      de: "Radikale Einfachheit & Alltagsphysik",
      fr: "Simplicité Radicale et Physique du Quotidien",
      es: "Simplicidad Radical y Física Cotidiana",
      it: "Semplicità Radicale e Fisica di Ogni Giorno",
      ja: "徹底的シンプルさ・日常の物理",
    },
    openers: {
      en: {
        targetText: "Hey! Don't worry about sounding academic. How would you explain your hobby to a twelve-year-old?",
        intuitive: {
          pt: "héi! dont uâ-ri a-báut sáun-ding a-ca-dé-mik. háu uúd iú iks-pléin iór hó-bi tu a tuélv-iíar-óuld?",
        },
        translation: {
          pt: "Ei! Não se preocupe em soar acadêmico. Como você explicaria seu passatempo para uma criança de doze anos?",
          en: "Hey! Don't worry about sounding academic. How would you explain your hobby to a twelve-year-old?",
        },
      },
      de: {
        targetText: "Hallo! Wenn du eine Sache nicht einfach sagen kannst, hast du sie nicht verstanden. Was magst du?",
        intuitive: {
          pt: "há-lo! ven du ái-ne zá-je niçt áin-faç zá-guen kanst, hast du zi niçt fer-chtán-den. vas makst du?",
        },
        translation: {
          pt: "Olá! Se você não consegue dizer algo de forma simples, ainda não entendeu. Do que você gosta?",
        },
      },
      pt: {
        targetText: "E aí! Menos decoreba, mais conexões vivas. Qual é o seu maior desafio hoje?",
        intuitive: { pt: "e a-í! me-nus de-co-re-ba, mais co-ne-xões ví-vas." },
        translation: { pt: "E aí! Menos decoreba, mais conexões vivas. Qual é o seu maior desafio hoje?" },
      },
    },
    suggestions: {
      en: [
        { text: "I like breaking complex systems into bite-sized components.", intuitive: "ái láik bréi-king cóm-pleks sís-tems ín-tu báit-ssáizd com-póu-nents", translation: "Gosto de quebrar sistemas complexos em pedacinhos pequenos." },
        { text: "I try to practice speaking every single day with rhythm.", intuitive: "ái trâi tu prák-tis spí-king év-ri sín-gl déi uíz rí-dâm", translation: "Tento praticar conversação todo santo dia com ritmo." },
        { text: "Tell me your secret to memorizing without getting bored!", intuitive: "tél mi iór sí-kret tu mé-mo-rái-zing uíz-áut gué-ting bórd", translation: "Conte-me seu segredo para memorizar sem ficar entediado!" },
      ],
      de: [
        { text: "Ich baue meine Sprachkenntnisse Schritt für Schritt auf.", intuitive: "iç báu-e mái-ne chpráj-kénnt-ni-sse chritt für chritt áuf", translation: "Construo meu domínio linguístico passo a passo." },
        { text: "Ich mag praktische Beispiele statt trockener Grammatikregeln.", intuitive: "iç mák prák-ti-che bái-chpí-le chtat tró-ke-ner gra-má-tik-ré-gueln", translation: "Prefiro exemplos práticos a regras gramaticais secas." },
        { text: "Können wir über Technologie und Entdeckungen sprechen?", intuitive: "kén-nen vír ü-ber teç-no-lo-guí unt ent-dék-kun-guen chpré-çen", translation: "Podemos falar sobre tecnologia e descobertas?" },
      ],
    },
    replies: {
      en: [
        {
          targetText: "That's the spirit! You hit the nail right on the head. No jargon, just pure intuition. What's next?",
          intuitive: { pt: "dáts dâ spí-rit! iú hit dâ néil ráit on dâ héd." },
          translation: { pt: "Esse é o espírito! Você acertou na mosca. Sem jargão, apenas intuição pura. Qual é o próximo passo?" },
        },
      ],
      de: [
        {
          targetText: "Ganz genau! So macht Sprache Spaß: direkt, lebendig und unkompliziert. Weiter so!",
          intuitive: { pt: "gants gue-náu! zo majt chprá-je chpass: di-rékt, le-bén-diç unt un-kom-pli-tsírt." },
          translation: { pt: "Exatamente! É assim que aprender um idioma é divertido: direto, vivo e descomplicado. Siga firme!" },
        },
      ],
    },
  },
  curie: {
    topic: {
      pt: "Precisão Fonética, Constância e Mnemônica",
      en: "Phonetic Precision & Mnemonic Retention",
      de: "Phonetische Präzision & Mnemonik",
      fr: "Précision Phonétique et Persévérance",
      es: "Precisión Fonética y Mnemónica",
      it: "Precisione Fonetica e Mnemonica",
      ja: "音響の精密さと記憶術",
    },
    openers: {
      fr: {
        targetText: "Bienvenue au laboratoire! Chaque phonème poli est un atome de clarté. Que souhaitez-vous perfectionner?",
        intuitive: {
          pt: "bi-an-ve-nú o la-bo-ra-tuár! shák fo-ném po-lí é tan a-tóm de klar-té.",
        },
        translation: {
          pt: "Bem-vindo ao laboratório! Cada fonema lapidado é um átomo de clareza. O que deseja aperfeiçoar?",
        },
      },
      en: {
        targetText: "Welcome! In science and languages, perseverance turns the obscure into the brilliant. What are you studying?",
        intuitive: {
          pt: "uél-kam! in sái-ens and lán-gui-djes, per-se-ví-rans têrns di ób-skiur ín-tu dâ brí-liant.",
        },
        translation: {
          pt: "Bem-vinda! Na ciência e nos idiomas, a perseverança transforma o obscuro no brilhante. O que você está estudando?",
        },
      },
      de: {
        targetText: "Willkommen! Ausdauer und Wiederholung sind die stärksten Reagenzien des Gedächtnisses. Wie geht es dir?",
        intuitive: {
          pt: "vil-kóm-men! áus-dáu-er unt ví-der-ho-lung zint di chtérk-sten re-a-guén-tsi-en des gue-déçt-ni-sses.",
        },
        translation: {
          pt: "Bem-vindo! A constância e a repetição são os reagentes mais poderosos da memória. Como você está?",
        },
      },
    },
    suggestions: {
      fr: [
        { text: "Je désire affiner ma prononciation des voyelles nasales.", intuitive: "je de-zír a-fi-né ma pro-non-ssi-a-ssi-on de vuá-yél na-zál", translation: "Desejo refinar minha pronúncia das vogais nasais." },
        { text: "La rigueur scientifique m'inspire à répéter chaque jour.", intuitive: "la ri-gêr ssi-an-ti-fík m'ins-pír a ré-pé-té shak jur", translation: "O rigor científico me inspira a repetir todos os dias." },
        { text: "Pouvez-vous m'écouter et évaluer mon timbre vocal?", intuitive: "pu-vé vu m'é-ku-té e é-va-lu-é mon tan-bre vo-kál", translation: "Pode me ouvir e avaliar meu timbre vocal?" },
      ],
      en: [
        { text: "I want to polish my accent and speak with clear resonance.", intuitive: "ái uónt tu pó-lish mái ák-sent and spík uíz clíar ré-zo-nans", translation: "Quero lapidar meu sotaque e falar com ressonância nítida." },
        { text: "Consistent daily practice is my highest priority right now.", intuitive: "con-ssís-tent déi-li prák-tis iz mái hái-est prai-ó-ri-ti ráit náu", translation: "A prática diária consistente é minha maior prioridade agora." },
      ],
    },
    replies: {
      fr: [
        {
          targetText: "Parfaitement articulé! Le spectre acoustique de vos voyelles s'approche du modèle natif. Continuons!",
          intuitive: { pt: "par-fet-man ar-ti-ku-lé! le spék-tre a-kus-tík de vo vuá-yél." },
          translation: { pt: "Perfeitamente articulado! O espectro acústico de suas vogais se aproxima do modelo nativo. Continuemos!" },
        },
      ],
      en: [
        {
          targetText: "Remarkable discipline! When articulation matches your intention, the message becomes crystal clear.",
          intuitive: { pt: "ri-már-ka-bl dí-ssi-plin! uén ar-ti-kiu-léi-shân mátch-ez iór in-tén-shân." },
          translation: { pt: "Disciplina notável! Quando a articulação corresponde à sua intenção, a mensagem torna-se límpida como cristal." },
        },
      ],
    },
  },
};

export class MentorChatService {
  public static startSession(params: {
    mentorId: string;
    mentorName: string;
    avatar: string;
    targetLang: string;
    supportLang: string;
    cefrLevel?: string;
  }): MentorChatSession {
    const { mentorId, mentorName, avatar, targetLang, supportLang } = params;
    const shortTarget = targetLang.toLowerCase().split("-")[0];
    const shortSupport = supportLang.toLowerCase().split("-")[0];
    const cefr = params.cefrLevel || "B1";

    const data = MENTOR_TOPIC_DATA[mentorId] || MENTOR_TOPIC_DATA.einstein;
    const topicTitle =
      data.topic[shortSupport] || data.topic.pt || data.topic.en || "Diálogo Pedagógico";

    const openerObj =
      data.openers[shortTarget] || data.openers.en || data.openers.de || data.openers.pt;

    const intuitive =
      openerObj.intuitive[shortSupport] ||
      openerObj.intuitive.pt ||
      openerObj.intuitive.en ||
      "";

    const translation =
      openerObj.translation[shortSupport] ||
      openerObj.translation.pt ||
      openerObj.translation.en ||
      openerObj.targetText;

    const firstMessage: ChatMessage = {
      id: `msg-${Date.now()}-0`,
      sender: "mentor",
      targetText: openerObj.targetText,
      intuitivePronunciation: intuitive,
      translation,
      timestamp: Date.now(),
    };

    const suggestions = data.suggestions[shortTarget] || data.suggestions.en || [
      { text: "I understand and I'm ready to learn.", translation: "Entendo e estou pronto para aprender." },
      { text: "Could you give me an example?", translation: "Poderia me dar um exemplo?" },
      { text: "Let's explore this step by step.", translation: "Vamos explorar isso passo a passo." },
    ];

    return {
      mentorId,
      mentorName,
      avatar,
      targetLang,
      supportLang,
      cefrLevel: cefr,
      topic: topicTitle,
      turn: 1,
      maxTurns: 5,
      messages: [firstMessage],
      currentSuggestions: suggestions,
    };
  }

  public static async processUserTurn(
    session: MentorChatSession,
    userText: string
  ): Promise<{
    userMessage: ChatMessage;
    mentorReply: ChatMessage;
    newSuggestions: ChatSuggestion[];
    updatedTurn: number;
    isFinished: boolean;
  }> {
    const cleanUserText = userText.trim();
    const shortTarget = session.targetLang.toLowerCase().split("-")[0];
    const shortSupport = session.supportLang.toLowerCase().split("-")[0];

    // 1. Analyze user utterance for pedagogical note
    const words = cleanUserText.split(/\s+/).filter(Boolean);
    let verdict: "impecável" | "ótimo" | "ajuste" = "ótimo";
    let feedback = "";
    let improvedVersion: string | undefined = undefined;

    if (words.length >= 6) {
      verdict = "impecável";
      feedback =
        shortSupport === "en"
          ? "Excellent sentence cadence! Natural word order and rich vocabulary."
          : "Cadência sintática excelente! Ordem natural das palavras e vocabulário assertivo.";
    } else if (words.length >= 3) {
      verdict = "ótimo";
      feedback =
        shortSupport === "en"
          ? "Clear and direct expression. To sound even more native, you can expand with a connector."
          : "Expressão clara e direta. Para soar ainda mais nativo, experimente expandir usando um conector.";
    } else {
      verdict = "ajuste";
      feedback =
        shortSupport === "en"
          ? "Good attempt! Try elaborating a full sentence with subject and conjugated verb."
          : "Bom início! Tente formular uma oração completa com sujeito e verbo conjugado.";
      improvedVersion = cleanUserText;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      targetText: cleanUserText,
      mentorNote: {
        verdict,
        feedback,
        improvedVersion,
      },
      timestamp: Date.now(),
    };

    // 2. Formulate Mentor reply
    const mentorData = MENTOR_TOPIC_DATA[session.mentorId] || MENTOR_TOPIC_DATA.einstein;
    const repliesList = mentorData.replies[shortTarget] || mentorData.replies.en || mentorData.replies.de;
    const replyTemplate =
      repliesList && repliesList.length > 0
        ? repliesList[(session.turn - 1) % repliesList.length]
        : {
            targetText: "Sehr gut! Deine Ausdruckskraft wächst mit jedem Satz.",
            intuitive: { pt: "zér gut! dái-ne áus-druks-kraft vekst mit jé-dem zats." },
            translation: { pt: "Muito bem! Seu poder de expressão cresce a cada frase." },
          };

    const intuitive =
      replyTemplate.intuitive[shortSupport] ||
      replyTemplate.intuitive.pt ||
      replyTemplate.intuitive.en ||
      "";

    const translation =
      replyTemplate.translation[shortSupport] ||
      replyTemplate.translation.pt ||
      replyTemplate.translation.en ||
      replyTemplate.targetText;

    const mentorReply: ChatMessage = {
      id: `msg-${Date.now()}-mentor`,
      sender: "mentor",
      targetText: replyTemplate.targetText,
      intuitivePronunciation: intuitive,
      translation,
      timestamp: Date.now() + 400,
    };

    const nextTurn = session.turn + 1;
    const isFinished = nextTurn > session.maxTurns;

    // Shift or rotate suggestions
    const rawSuggestions = mentorData.suggestions[shortTarget] || mentorData.suggestions.en || [];
    const rotated = rawSuggestions.slice(1).concat(rawSuggestions.slice(0, 1));

    return {
      userMessage,
      mentorReply,
      newSuggestions: rotated.length > 0 ? rotated : session.currentSuggestions,
      updatedTurn: nextTurn,
      isFinished,
    };
  }
}
