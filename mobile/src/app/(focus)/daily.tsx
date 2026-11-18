import React, { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "expo-router";
import {
  Volume2,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Brain,
  Headphones,
  BookOpen,
  Mic,
  Puzzle,
  ThumbsUp,
  Activity,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Check,
  Repeat,
  Radio,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { AppShell } from "@/components/tactile/app-shell";
import { Flag } from "@/components/shell/flag";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { languageName } from "@/lib/languages";
import { tap } from "@/lib/haptics";
import { SpeechCadenceEngine } from "@/services/speech-cadence";

interface CardItem {
  id: number;
  level: string;
  indexText: string;
  retention: string;
  targetPhrase: string;
  phonetics: string;
  translation: string;
  culturalNote: string;
  interval: string;
  syntax: Array<{
    role: string;
    word: string;
    detail: string;
    color: string;
    explanation?: string;
  }>;
}

export interface CurriculumTrack {
  langLabel: string;
  flag: string;
  speechLang: string;
  nativeCity: string;
  targetClean: string;
  initialBank: string[];
  syntaxChallenge: {
    question: string;
    options: { id: string; label: string; correct: boolean }[];
  };
  cards: CardItem[];
}

export const CURRICULUM_DATABASE: Record<string, CurriculumTrack> = {
  en: {
    langLabel: "Inglês",
    flag: "gb",
    speechLang: "en-US",
    nativeCity: "Londres",
    targetClean: "Knowledge speaks, but wisdom listens attentively.",
    initialBank: [
      "Knowledge",
      "speaks,",
      "but",
      "wisdom",
      "listens",
      "attentively.",
      "although",
      "hearing",
      "is",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Qual é a ordem sintática canônica não-marcada em inglês?",
      options: [
        { id: "A", label: "A) SOV (Sujeito-Objeto-Verbo)", correct: false },
        { id: "B", label: "B) SVO (Sujeito-Verbo-Objeto)", correct: true },
        { id: "C", label: "C) VSO (Verbo-Sujeito-Objeto)", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "B1.2",
        indexText: "Cartão #14 de 28",
        retention: "89%",
        targetPhrase: "“Knowledge speaks, but wisdom listens attentively.”",
        phonetics: "[nah-lidj speaks, buht wiz-duhm lis-uhnz uh-ten-tiv-lee]",
        translation: "“O conhecimento fala, mas a sabedoria escuta atentamente.”",
        culturalNote: "💡 Citação clássica atribuída a Jimi Hendrix sobre modéstia epistêmica e escuta ativa.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Sujeito (Noun)",
            word: "Knowledge",
            detail: "Uncountable Noun",
            color: "#06B6D4",
            explanation: "Substantivo abstrato em posição de sujeito da primeira oração coordenada.",
          },
          {
            role: "Verbo (Presente)",
            word: "speaks",
            detail: "3rd person sing.",
            color: "#D97706",
            explanation: "Verbo transitivo no Present Simple com a desinência '-s' da 3ª pessoa.",
          },
          {
            role: "Conector Adversativo",
            word: "but wisdom",
            detail: "Coord. Conjunction",
            color: "#8B5CF6",
            explanation: "Conjunção adversativa que contrapõe o falar com o escutar reflexivo.",
          },
          {
            role: "Predicado & Advérbio",
            word: "listens attentively",
            detail: "Verb + Manner Adv.",
            color: "#10B981",
            explanation: "Verbo de ação intransitivo intensificado por advérbio de modo derivado com '-ly'.",
          },
        ],
      },
      {
        id: 15,
        level: "B2.1",
        indexText: "Cartão #15 de 28",
        retention: "94%",
        targetPhrase: "“The only way to do great work is to love what you do.”",
        phonetics: "[the ohn-lee way too doo grayt wurk iz too luhv wuht yoo doo]",
        translation: "“A única maneira de fazer um ótimo trabalho é amar o que você faz.”",
        culturalNote: "💡 Máxima clássica sobre foco deliberado, paixão vocacional e maestria duradoura.",
        interval: "3 dias atrás",
        syntax: [
          {
            role: "Sujeito Complexo",
            word: "The only way...",
            detail: "Noun phrase + inf.",
            color: "#06B6D4",
            explanation: "Sintagma nominal sujeito complementado por oração infinitiva reduzida.",
          },
          {
            role: "Verbo Copulativo",
            word: "is",
            detail: "To Be (3ª sing.)",
            color: "#D97706",
            explanation: "Verbo de ligação que ancora a oração predicativa subsequente.",
          },
          {
            role: "Predicativo Infinitivo",
            word: "to love",
            detail: "Full Infinitive",
            color: "#10B981",
            explanation: "Infinitivo com 'to' funcionando como núcleo do predicativo do sujeito.",
          },
          {
            role: "Oração Relativa",
            word: "what you do",
            detail: "Free relative clause",
            color: "#8B5CF6",
            explanation: "Oração relativa nominal livre atuando como objeto direto de 'love'.",
          },
        ],
      },
      {
        id: 16,
        level: "B2.2",
        indexText: "Cartão #3 de 5",
        retention: "88%",
        targetPhrase: "“Simplicity is the ultimate sophistication in language.”",
        phonetics: "[sim-plis-i-tee iz the uhl-tuh-muht suh-fis-tuh-kay-shuhn in lang-gwidj]",
        translation: "“A simplicidade é o grau máximo de sofisticação na linguagem.”",
        culturalNote: "💡 Princípio de Leonardo da Vinci sobre clareza sintática e elegância cognitiva.",
        interval: "5 dias atrás",
        syntax: [
          {
            role: "Sujeito Abstrato",
            word: "Simplicity",
            detail: "Noun (Uncountable)",
            color: "#06B6D4",
            explanation: "Conceito nuclear como sujeito da oração assertiva.",
          },
          {
            role: "Verbo Copulativo",
            word: "is",
            detail: "Present Simple",
            color: "#D97706",
            explanation: "Conecta o sujeito à sua definição conceitual predicativa.",
          },
          {
            role: "Predicativo Superlativo",
            word: "the ultimate sophistication",
            detail: "Noun Phrase + Adj.",
            color: "#10B981",
            explanation: "Sintagma nominal com adjetivo absoluto 'ultimate'.",
          },
          {
            role: "Adjunto Preposicional",
            word: "in language",
            detail: "Prep. Phrase",
            color: "#8B5CF6",
            explanation: "Delimita o domínio semântico da proposição.",
          },
        ],
      },
      {
        id: 17,
        level: "C1.1",
        indexText: "Cartão #4 de 5",
        retention: "91%",
        targetPhrase: "“Curiosity is the engine of intellectual growth and discovery.”",
        phonetics: "[kyoor-ee-ahs-i-tee iz the en-jin uhv in-tuh-lek-choo-uhl grohth and dis-kuhv-uh-ree]",
        translation: "“A curiosidade é o motor do crescimento intelectual e da descoberta.”",
        culturalNote: "💡 Axioma de Feynman sobre a paixão pelo desconhecido e a busca científica.",
        interval: "7 dias atrás",
        syntax: [
          {
            role: "Sujeito",
            word: "Curiosity",
            detail: "Abstract Noun",
            color: "#06B6D4",
            explanation: "Força motriz como núcleo nominal do período.",
          },
          {
            role: "Cópula",
            word: "is",
            detail: "Finite Verb",
            color: "#D97706",
            explanation: "Verbo de ligação em 3ª pessoa do singular.",
          },
          {
            role: "Metáfora Predicativa",
            word: "the engine",
            detail: "Definite Noun",
            color: "#10B981",
            explanation: "Imagem mecânica atribuída ao sujeito cognitivo.",
          },
          {
            role: "Complemento Genitivo",
            word: "of intellectual growth",
            detail: "Prepositional Genitive",
            color: "#8B5CF6",
            explanation: "Especifica o efeito causal da curiosidade.",
          },
        ],
      },
      {
        id: 18,
        level: "C1.2",
        indexText: "Cartão #5 de 5",
        retention: "96%",
        targetPhrase: "“To have another language is to possess a second soul.”",
        phonetics: "[too hav uh-nuh-thuhr lang-gwidj iz too puh-zes uh sek-uhnd sohl]",
        translation: "“Ter outro idioma é possuir uma segunda alma.”",
        culturalNote: "💡 Reflexão clássica atribuída a Carlos Magno sobre a expansão da consciência poliglota.",
        interval: "14 dias atrás",
        syntax: [
          {
            role: "Sujeito Infinitivo",
            word: "To have another...",
            detail: "Infinitive Phrase",
            color: "#06B6D4",
            explanation: "Oração infinitiva reduzida em função de sujeito gramatical.",
          },
          {
            role: "Verbo Central",
            word: "is",
            detail: "Copula",
            color: "#D97706",
            explanation: "Eixo de equivalência identitária entre as duas metades.",
          },
          {
            role: "Predicado Paralelo",
            word: "to possess",
            detail: "Infinitive Predicate",
            color: "#10B981",
            explanation: "Infinitivo que ecoa simetricamente o sujeito.",
          },
          {
            role: "Objeto Poético",
            word: "a second soul",
            detail: "Direct Object",
            color: "#8B5CF6",
            explanation: "Sintagma nominal com conotação de profundidade existencial.",
          },
        ],
      },
    ],
  },
  de: {
    langLabel: "Alemão",
    flag: "de",
    speechLang: "de-DE",
    nativeCity: "Berlim",
    targetClean: "Die Gedanken sind frei und fliegen wie der Wind.",
    initialBank: [
      "Die Gedanken",
      "sind",
      "frei",
      "und",
      "fliegen",
      "wie der Wind.",
      "weil",
      "denn",
      "ist",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Em orações principais em alemão, qual posição é estritamente reservada ao verbo flexionado?",
      options: [
        { id: "A", label: "A) Posição 1", correct: false },
        { id: "B", label: "B) Posição 2 (V2)", correct: true },
        { id: "C", label: "C) Final absoluto", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "A2.2",
        indexText: "Cartão #1 de 5",
        retention: "89%",
        targetPhrase: "“Die Gedanken sind frei und fliegen wie der Wind.”",
        phonetics: "[dee geh-dan-ken zint fry oont flee-gen vee dayr vint]",
        translation: "“Os pensamentos são livres e voam como o vento.”",
        culturalNote: "💡 Provérbio popular folclórico alemão do século XVIII sobre liberdade individual.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Sujeito (Nom.)",
            word: "Die Gedanken",
            detail: "Plural / Artigo Det.",
            color: "#06B6D4",
            explanation: "Substantivo neutro plural no caso Nominativo, exercendo função de sujeito.",
          },
          {
            role: "Verbo (Posição 2)",
            word: "sind",
            detail: "Sein (3ª pl. Pres.)",
            color: "#D97706",
            explanation: "Verbo copulativo conjugado estritamente na 2ª posição sintática (Regra V2).",
          },
          {
            role: "Predicativo",
            word: "frei",
            detail: "Adjetivo não-inclinado",
            color: "#10B981",
            explanation: "Adjetivo predicativo após 'sein' — nunca recebe desinência de declinação.",
          },
          {
            role: "Conector",
            word: "und fliegen...",
            detail: "Coordenação direta",
            color: "#8B5CF6",
            explanation: "Conjunção coordenativa 'und' (Posição 0), mantendo a ordem direta.",
          },
        ],
      },
      {
        id: 15,
        level: "B1.1",
        indexText: "Cartão #2 de 5",
        retention: "92%",
        targetPhrase: "“Übung macht den Meister, wenn man beharrlich bleibt.”",
        phonetics: "[ee-boong mahkht dayn mys-ter ven mahn beh-har-likh blypt]",
        translation: "“A prática faz o mestre, quando se é perseverante.”",
        culturalNote: "💡 Expressão alemã clássica sobre persistência e maestria prática.",
        interval: "3 dias atrás",
        syntax: [
          {
            role: "Sujeito (Nom.)",
            word: "Übung",
            detail: "Fem. / Substantivo",
            color: "#06B6D4",
            explanation: "Substantivo feminino abstrato sem artigo, indicando princípio universal.",
          },
          {
            role: "Verbo (Posição 2)",
            word: "macht",
            detail: "Machen (3ª sing.)",
            color: "#D97706",
            explanation: "Verbo transitivo direto na posição nuclear 2.",
          },
          {
            role: "Objeto Direto",
            word: "den Meister",
            detail: "Acusativo masc.",
            color: "#10B981",
            explanation: "Substantivo masculino com artigo definido no caso Acusativo (der -> den).",
          },
          {
            role: "Subordinada",
            word: "wenn man...",
            detail: "Oração condicional",
            color: "#8B5CF6",
            explanation: "Conjunção subordinativa 'wenn' que arremessa o verbo conjugado para o fim.",
          },
        ],
      },
      {
        id: 16,
        level: "B1.2",
        indexText: "Cartão #3 de 5",
        retention: "85%",
        targetPhrase: "“Wer den Pfennig nicht ehrt, ist des Talers nicht wert.”",
        phonetics: "[vayr dayn pfen-nikh nikht ayrt ist des tah-lers nikht vayrt]",
        translation: "“Quem não honra a pequena moeda, não é digno do tesouro.”",
        culturalNote: "💡 Máxima tradicional alemã sobre apreço aos detalhes e valor cumulativo.",
        interval: "5 dias atrás",
        syntax: [
          {
            role: "Oração Relativa Livre",
            word: "Wer den Pfennig...",
            detail: "Pronominal Sujeito",
            color: "#06B6D4",
            explanation: "Pronome relativo 'wer' encabeçando oração subordinada em função de sujeito.",
          },
          {
            role: "Cópula Principal",
            word: "ist",
            detail: "Sein (V2)",
            color: "#D97706",
            explanation: "Verbo principal da oração matriz na posição 2 após a oração relativa.",
          },
          {
            role: "Genitivo Regido",
            word: "des Talers",
            detail: "Genitiv Masc.",
            color: "#8B5CF6",
            explanation: "Objeto no caso Genitivo regido pelo adjetivo 'wert'.",
          },
          {
            role: "Predicativo",
            word: "nicht wert",
            detail: "Negation + Adj.",
            color: "#10B981",
            explanation: "Adjetivo predicativo com negação antecedente.",
          },
        ],
      },
      {
        id: 17,
        level: "B2.1",
        indexText: "Cartão #4 de 5",
        retention: "90%",
        targetPhrase: "“Aller Anfang ist schwer, doch Ausdauer siegt immer.”",
        phonetics: "[ahl-ler ahn-fahng ist shvayr dokh ows-dow-er zeekt im-mer]",
        translation: "“Todo começo é difícil, mas a perseverança sempre vence.”",
        culturalNote: "💡 Encorajamento clássico germânico para a superação das primeiras barreiras de aprendizado.",
        interval: "7 dias atrás",
        syntax: [
          {
            role: "Sujeito Nominal",
            word: "Aller Anfang",
            detail: "Nom. Masc.",
            color: "#06B6D4",
            explanation: "Substantivo com pronome adjetivo forte 'aller' no Nominativo.",
          },
          {
            role: "Verbo de Ligação",
            word: "ist schwer",
            detail: "V2 + Predicativo",
            color: "#D97706",
            explanation: "Predicação de estado inicial.",
          },
          {
            role: "Conector Adversativo",
            word: "doch",
            detail: "Konjunktion",
            color: "#8B5CF6",
            explanation: "Conector que introduz a virada de perspectiva positiva.",
          },
          {
            role: "Oração Coordenada",
            word: "Ausdauer siegt",
            detail: "Subj. + Verb",
            color: "#10B981",
            explanation: "Afirmação do triunfo final da dedicação.",
          },
        ],
      },
      {
        id: 18,
        level: "C1.1",
        indexText: "Cartão #5 de 5",
        retention: "95%",
        targetPhrase: "“Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.”",
        phonetics: "[dee gren-tsen my-ner shprah-khe beh-doy-ten dee gren-tsen my-ner velt]",
        translation: "“Os limites da minha linguagem significam os limites do meu mundo.”",
        culturalNote: "💡 Proposição 5.6 do Tractatus Logico-Philosophicus de Ludwig Wittgenstein.",
        interval: "14 dias atrás",
        syntax: [
          {
            role: "Sujeito com Genitivo",
            word: "Die Grenzen...",
            detail: "Plural + Genitiv",
            color: "#06B6D4",
            explanation: "Sintagma nominal sujeito complementado por atributo possessivo genitivo.",
          },
          {
            role: "Verbo Transitivo",
            word: "bedeuten",
            detail: "Inf. Stamm + en",
            color: "#D97706",
            explanation: "Verbo transitivo direto estabelecendo relação semiótica de igualdade.",
          },
          {
            role: "Objeto Acusativo",
            word: "die Grenzen",
            detail: "Akkusativ Pl.",
            color: "#10B981",
            explanation: "Núcleo do objeto direto com artigo plural.",
          },
          {
            role: "Genitivo de Escopo",
            word: "meiner Welt",
            detail: "Genitiv Fem.",
            color: "#8B5CF6",
            explanation: "Determina a extensão ontológica da proposição wittgensteiniana.",
          },
        ],
      },
    ],
  },
  es: {
    langLabel: "Espanhol",
    flag: "es",
    speechLang: "es-ES",
    nativeCity: "Madrid",
    targetClean: "El camino se hace al andar con paso firme y constante.",
    initialBank: [
      "El camino",
      "se hace",
      "al andar",
      "con paso",
      "firme",
      "y constante.",
      "aunque",
      "haciendo",
      "está",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Em espanhol, a estrutura 'al + infinitivo' expressa primariamente:",
      options: [
        { id: "A", label: "A) Causa retroativa", correct: false },
        { id: "B", label: "B) Simultaneidade temporal (ao caminhar)", correct: true },
        { id: "C", label: "C) Finalidade futura", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "B1.2",
        indexText: "Cartão #14 de 28",
        retention: "91%",
        targetPhrase: "“El camino se hace al andar con paso firme y constante.”",
        phonetics: "[el kah-mee-noh seh ah-seh ahl ahn-dahr kohn pah-soh feer-meh ee kohns-tahn-teh]",
        translation: "“O caminho se faz ao caminhar com passo firme e constante.”",
        culturalNote: "💡 Inspirado nos versos de Antonio Machado sobre construir seu próprio destino.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Sujeito",
            word: "El camino",
            detail: "Masc. Singular",
            color: "#06B6D4",
            explanation: "Substantivo masculino determinado exercendo função sintática de sujeito passivo.",
          },
          {
            role: "Voz Passiva Reflexa",
            word: "se hace",
            detail: "Hacer (Pasiva)",
            color: "#D97706",
            explanation: "Construção passiva reflexa com partícula 'se', muito natural no espanhol culto.",
          },
          {
            role: "Locução Temporal",
            word: "al andar",
            detail: "Al + Infinitivo",
            color: "#8B5CF6",
            explanation: "Estrutura idiomática de simultaneidade temporal, equivalente a 'ao caminhar'.",
          },
          {
            role: "Adjunto Modal",
            word: "con paso firme",
            detail: "Prep. + Adjetivos",
            color: "#10B981",
            explanation: "Sintagma preposicional com valor adverbial de modo qualificado.",
          },
        ],
      },
    ],
  },
  fr: {
    langLabel: "Francês",
    flag: "fr",
    speechLang: "fr-FR",
    nativeCity: "Paris",
    targetClean: "Le temps perdu ne se rattrape jamais avec des regrets.",
    initialBank: [
      "Le temps perdu",
      "ne se rattrape",
      "jamais",
      "avec",
      "des",
      "regrets.",
      "toujours",
      "avoir",
      "dans",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Em francês, a negação composta 'ne... jamais' substitui:",
      options: [
        { id: "A", label: "A) Somente o advérbio 'non'", correct: false },
        { id: "B", label: "B) A negação padrão 'ne... pas' (nunca vs não)", correct: true },
        { id: "C", label: "C) Apenas verbos no infinitivo", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "B1.2",
        indexText: "Cartão #14 de 28",
        retention: "90%",
        targetPhrase: "“Le temps perdu ne se rattrape jamais avec des regrets.”",
        phonetics: "[luh tahn pair-dyoo nuh suh rah-trahp zhah-meh ah-vek day ruh-greh]",
        translation: "“O tempo perdido nunca se recupera com arrependimentos.”",
        culturalNote: "💡 Sabedoria literária francesa sobre o valor inestimável do momento presente.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Groupe Sujet",
            word: "Le temps perdu",
            detail: "Nom + Participe",
            color: "#06B6D4",
            explanation: "Grupo nominal sujeito acompanhado de particípio passado funcionando como adjetivo.",
          },
          {
            role: "Négation & Verbe",
            word: "ne se rattrape jamais",
            detail: "Pronominal Passif",
            color: "#D97706",
            explanation: "Negação descontínua 'ne... jamais' encadernando o verbo pronominal reflexivo.",
          },
          {
            role: "Complément de Moyen",
            word: "avec des regrets",
            detail: "Préposition + Pluriel",
            color: "#10B981",
            explanation: "Complemento circunstancial preposicional com artigo partitivo contracto.",
          },
          {
            role: "Harmonie Métrique",
            word: "rattrape jamais",
            detail: "Cadence alexandrine",
            color: "#8B5CF6",
            explanation: "Eufonia e ritmo equilibrado de prosódia parisiense clássica.",
          },
        ],
      },
    ],
  },
  it: {
    langLabel: "Italiano",
    flag: "it",
    speechLang: "it-IT",
    nativeCity: "Roma",
    targetClean: "La bellezza salverà il mondo con la sua armonia.",
    initialBank: [
      "La bellezza",
      "salverà",
      "il mondo",
      "con la sua",
      "armonia.",
      "perché",
      "quando",
      "sempre",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Em italiano, o futuro simples de 'salvare' na 3ª pessoa do singular é:",
      options: [
        { id: "A", label: "A) Salverà (com acento tônico grave/agudo final)", correct: true },
        { id: "B", label: "B) Salverebbe", correct: false },
        { id: "C", label: "C) Ha salvato", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "B1.2",
        indexText: "Cartão #14 de 28",
        retention: "92%",
        targetPhrase: "“La bellezza salverà il mondo con la sua armonia.”",
        phonetics: "[lah bel-leht-tsah sahl-veh-rah eel mohn-doh kohn lah soo-ah ahr-moh-nee-ah]",
        translation: "“A beleza salvará o mundo com a sua harmonia.”",
        culturalNote: "💡 Reflexão estética clássica sobre harmonia, proporção e arte humanista.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Soggetto",
            word: "La bellezza",
            detail: "Femminile Singolare",
            color: "#06B6D4",
            explanation: "Substantivo abstrato feminino introduzido por artigo determinado 'la'.",
          },
          {
            role: "Verbo (Futuro)",
            word: "salverà",
            detail: "3ª sing. Futuro",
            color: "#D97706",
            explanation: "Verbo transitivo no Futuro Semplice do modo indicativo com tônica na última sílaba.",
          },
          {
            role: "Oggetto Diretto",
            word: "il mondo",
            detail: "Maschile Singolare",
            color: "#10B981",
            explanation: "Complemento de objeto direto regido sem preposição.",
          },
          {
            role: "Complemento di Modo",
            word: "con la sua armonia",
            detail: "Prep. + Possessivo",
            color: "#8B5CF6",
            explanation: "Adjunto modal conclamando o equilíbrio e a cadência italiana.",
          },
        ],
      },
    ],
  },
  ja: {
    langLabel: "Japonês",
    flag: "jp",
    speechLang: "ja-JP",
    nativeCity: "Tóquio",
    targetClean: "千里の道も 一歩から 始まる。",
    initialBank: [
      "千里の道も",
      "一歩から",
      "始まる。",
      "いつも",
      "とても",
      "今日から",
    ],
    syntaxChallenge: {
      question: "Desafio Rápido: Em japonês, a partícula 'から' (kara) após um substantivo indica:",
      options: [
        { id: "A", label: "A) Origem ou ponto de partida ('a partir de')", correct: true },
        { id: "B", label: "B) Objeto direto da oração", correct: false },
        { id: "C", label: "C) Pergunta interrogativa final", correct: false },
      ],
    },
    cards: [
      {
        id: 14,
        level: "N4/B1",
        indexText: "Cartão #14 de 28",
        retention: "88%",
        targetPhrase: "“千里の道も一歩から始まる。”",
        phonetics: "[sen-ree noh mee-chee moh eep-poh kah-rah hah-jee-mah-roo]",
        translation: "“Uma jornada de mil milhas começa com um único passo.”",
        culturalNote: "💡 Kotowaza tradicional sobre a consistência diária e progresso contínuo.",
        interval: "1 dia atrás",
        syntax: [
          {
            role: "Tema e Sujeito",
            word: "千里の道も",
            detail: "Partícula 'mo' inclusiva",
            color: "#06B6D4",
            explanation: "Sintagma nominal com partícula genitiva 'no' e partícula 'mo' (até mesmo).",
          },
          {
            role: "Ponto de Partida",
            word: "一歩から",
            detail: "Substantivo + 'kara'",
            color: "#10B981",
            explanation: "Origem ou ponto inicial de ação com a partícula ablativa 'kara'.",
          },
          {
            role: "Verbo Nuclear",
            word: "始まる",
            detail: "Hajimaru (Presente)",
            color: "#D97706",
            explanation: "Verbo intransitivo no presente não-passado em estilo neutro.",
          },
        ],
      },
    ],
  },
};

export default function DailyRoute() {
  const router = useRouter();
  const session = useSession();
  const { addXp, activeMentor, targetLang } = useProsa();
  const langKey = targetLang && targetLang in CURRICULUM_DATABASE ? targetLang : "en";
  const curriculum = CURRICULUM_DATABASE[langKey];
  const cards = curriculum.cards;

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isCardsComplete, setIsCardsComplete] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; xp: number } | null>(null);

  // Countdown timer: 08:45 (525 seconds)
  const [secondsLeft, setSecondsLeft] = useState(525);

  // Phase 1 (Áudio & Ritmo) state
  const [audioSpeed, setAudioSpeed] = useState<"0.8x" | "1.0x" | "1.2x">("1.0x");
  const [isShadowLoop, setIsShadowLoop] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  // Phase 2 (Sintaxe) state
  const [selectedSyntaxBlock, setSelectedSyntaxBlock] = useState<number | null>(0);
  const [syntaxQuizAnswer, setSyntaxQuizAnswer] = useState<string | null>(null);

  // Phase 3 (Cadência) state
  const [isRecordingCadence, setIsRecordingCadence] = useState(false);
  const [cadenceScore, setCadenceScore] = useState<number | null>(null);
  const engineRef = useRef<SpeechCadenceEngine | null>(null);
  const cadenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 4 (Reconstrução) state
  const [reconstructionSlots, setReconstructionSlots] = useState<string[]>([]);
  const [reconstructionBank, setReconstructionBank] = useState<string[]>(curriculum.initialBank);
  const [reconstructionStatus, setReconstructionStatus] = useState<"idle" | "correct" | "error">("idle");

  // Keep reconstruction bank in sync if language switches
  useEffect(() => {
    setReconstructionBank(curriculum.initialBank);
    setReconstructionSlots([]);
    setReconstructionStatus("idle");
    setCurrentIdx(0);
    setIsCardsComplete(false);
  }, [langKey]);

  useEffect(() => {
    engineRef.current = new SpeechCadenceEngine();
    return () => {
      if (engineRef.current) engineRef.current.stopListening();
      if (cadenceTimeoutRef.current) clearTimeout(cadenceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 1200));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentCard = cards[currentIdx] || cards[0];

  const handlePlayAudio = useCallback(
    (customSpeed?: number) => {
      void tap("medium");
      setIsPlayingAudio(true);
      setHasPlayedAudio(true);
      if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const cleanText = currentCard.targetPhrase.replace(/[“”"]/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = curriculum.speechLang;
        const speedRate =
          customSpeed ||
          (audioSpeed === "0.8x" ? 0.75 : audioSpeed === "1.2x" ? 1.15 : 0.95);
        utterance.rate = speedRate;
        window.speechSynthesis.speak(utterance);
      }
      setTimeout(() => setIsPlayingAudio(false), 2400);
    },
    [currentCard.targetPhrase, audioSpeed, curriculum.speechLang]
  );

  const triggerToast = (text: string, xpGain = 10) => {
    addXp(xpGain);
    setFeedbackToast({ text, xp: xpGain });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleRate = useCallback(
    (rating: "again" | "hard" | "good" | "easy") => {
      void tap("light");
      let xpEarned = 10;
      let label = "Bom";

      if (rating === "again") {
        xpEarned = 5;
        label = "Errei (+5 XP)";
      } else if (rating === "hard") {
        xpEarned = 10;
        label = "Difícil (+10 XP)";
      } else if (rating === "good") {
        xpEarned = 15;
        label = "Bom (+15 XP)";
      } else if (rating === "easy") {
        xpEarned = 25;
        label = "Fácil (+25 XP)";
      }

      triggerToast(label, xpEarned);
      handlePlayAudio();
      setTimeout(() => {
        if (currentIdx + 1 < cards.length) {
          setCurrentIdx((prev) => prev + 1);
          setIsRevealed(true);
        } else {
          setIsCardsComplete(true);
          triggerToast("🎉 Lote FSRS Concluído! +50 XP", 50);
        }
      }, 500);
    },
    [handlePlayAudio, cards.length, currentIdx]
  );

  // Keyboard navigation for Phase 0
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseIndex !== 0 || isCardsComplete) return;
      if (e.key === "1") handleRate("again");
      else if (e.key === "2") handleRate("hard");
      else if (e.key === "3") handleRate("good");
      else if (e.key === "4") handleRate("easy");
      else if (e.code === "Space") {
        e.preventDefault();
        handlePlayAudio();
      } else if (e.key === "Enter") {
        setIsRevealed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phaseIndex, handleRate, handlePlayAudio, isCardsComplete]);

  // Phase 3 Cadence Recording with Real Mic Engine
  const handleRecordCadence = async () => {
    void tap("medium");
    if (!isRecordingCadence) {
      setIsRecordingCadence(true);
      setCadenceScore(null);
      if (engineRef.current) {
        await engineRef.current.startListening(curriculum.speechLang);
      }
      cadenceTimeoutRef.current = setTimeout(() => {
        if (engineRef.current) {
          const res = engineRef.current.stopListening(currentCard.targetPhrase);
          setIsRecordingCadence(false);
          setCadenceScore(res.accuracy);
          void tap("success");
          triggerToast(`Gravação analisada: ${res.accuracy}% de Precisão Rítmica!`, 25);
        }
      }, 3500);
    } else {
      if (cadenceTimeoutRef.current) clearTimeout(cadenceTimeoutRef.current);
      setIsRecordingCadence(false);
      let res = { accuracy: 96 };
      if (engineRef.current) {
        res = engineRef.current.stopListening(currentCard.targetPhrase);
      }
      setCadenceScore(res.accuracy);
      void tap("success");
      triggerToast(`Gravação analisada: ${res.accuracy}% de Precisão Rítmica!`, 25);
    }
  };

  // Phase 4 Reconstruction token handling
  const handleAddTokenToSlot = (token: string, bankIdx: number) => {
    void tap("light");
    setReconstructionSlots((prev) => [...prev, token]);
    setReconstructionBank((prev) => prev.filter((_, idx) => idx !== bankIdx));
    setReconstructionStatus("idle");
  };

  const handleRemoveTokenFromSlot = (slotIdx: number) => {
    void tap("light");
    const token = reconstructionSlots[slotIdx];
    setReconstructionSlots((prev) => prev.filter((_, idx) => idx !== slotIdx));
    setReconstructionBank((prev) => [...prev, token]);
    setReconstructionStatus("idle");
  };

  const handleVerifyReconstruction = () => {
    const constructed = reconstructionSlots.join(" ").trim();
    if (constructed === curriculum.targetClean) {
      void tap("success");
      setReconstructionStatus("correct");
      triggerToast("Reconstrução Perfeita! +50 XP", 50);
    } else {
      void tap("heavy");
      setReconstructionStatus("error");
    }
  };

  const PHASES = [
    { id: 0, label: "1. FSRS Cards", icon: "🎴", desc: "Repetição Espaçada" },
    { id: 1, label: "2. Áudio & Ritmo", icon: "🎧", desc: "Shadowing Neural" },
    { id: 2, label: "3. Sintaxe", icon: "📖", desc: "Decomposição em Blocos" },
    { id: 3, label: "4. Cadência", icon: "🎙️", desc: "Radar de Prosódia" },
    { id: 4, label: "5. Reconstrução", icon: "🧩", desc: "Montagem Sináptica" },
  ];

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ======================================================== */}
        {/* 1. TOP SESSION NAVIGATION BAR: 5 RITUAL BUTTONS          */}
        {/* ======================================================== */}
        <header className="bg-white rounded-3xl p-4 lg:p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Phase Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {PHASES.map((phase) => {
              const active = phase.id === phaseIndex;
              const isPast = phase.id < phaseIndex;
              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs select-none transition-all ${
                    active
                      ? "bg-[#0D9488] text-white shadow-[0_4px_0_#0F766E] translate-y-0"
                      : isPast
                      ? "bg-teal-50 text-[#0D9488] border border-teal-200"
                      : "bg-[#F5F0E8] text-[#94A3B8]"
                  }`}
                >
                  <span className="text-sm">{phase.icon}</span>
                  <span>{phase.label}</span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-white shadow-sm animate-pulse" />
                  )}
                  {isPast && (
                    <span className="text-xs font-black text-[#0D9488]">✓</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session Timer & 2x XP Booster */}
          <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#F5F0E8] text-[#111C2D] font-extrabold text-xs shadow-[0_2px_0_#CBD5E1]">
              <Clock className="w-4 h-4 text-[#0D9488]" />
              <span>{formatTimer(secondsLeft)}</span>
              <span className="text-[#64748B] font-normal">/ 20:00</span>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FF5722]/10 text-[#FF5722] font-extrabold text-xs shadow-[0_2px_0_rgba(255,87,34,0.25)]">
              <span className="animate-bounce">🔥</span>
              <span>2x XP Ativo</span>
            </div>
          </div>
        </header>

        {/* Feedback Float Pill */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D9488] text-white font-extrabold text-sm shadow-[0_6px_0_#0F766E]"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{feedbackToast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* 2. MAIN WORKSPACE GRID (SPLIT 7:5)                       */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ====================================================== */}
          {/* COLUNA ESQUERDA: WORKSPACE DINÂMICO POR ETAPA (7 COLS) */}
          {/* ====================================================== */}
          <section className="lg:col-span-7 flex flex-col gap-5">
            {/* ETAPA 0: FLASHCARDS FSRS */}
            {phaseIndex === 0 && (
              <motion.div
                key="phase-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                {isCardsComplete ? (
                  <TactileCard className="min-h-[420px] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-white border-2 border-emerald-300 shadow-[0_6px_0_#059669]">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center text-3xl shadow-sm">
                      🎉
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-[#111C2D]">
                        Deck FSRS Diário Concluído!
                      </h2>
                      <p className="text-sm font-medium text-stone-600 max-w-md mx-auto leading-relaxed">
                        Todas as {cards.length} cartas da sua sessão de hoje foram ativadas no modelo neural FSRS. Retenção sináptica consolidada!
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
                      <div className="px-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700">
                        ⚡ +75 XP Acumulados
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-xs font-bold text-[#0D9488]">
                        🧠 Retenção FSRS: 94%
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          void tap("success");
                          setPhaseIndex(1);
                        }}
                        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0D9488] text-white font-extrabold text-sm shadow-[0_4px_0_#0F766E] hover:opacity-95 active:translate-y-1 transition-all cursor-pointer"
                      >
                        <span>Avançar para Etapa 2: Áudio & Ritmo</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </TactileCard>
                ) : (
                  <>
                    <TactileCard className="min-h-[400px] flex flex-col justify-between p-6 sm:p-8 relative">
                      {/* Card Header Meta */}
                      <div className="flex items-center justify-between border-b-2 border-[#F5F0E8] pb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-[#E7EEFF] text-[#00685F] font-extrabold text-xs flex items-center gap-1.5">
                            <Flag code={curriculum.flag} size={14} />
                            <span>{currentCard.level.replace(/^[^\s]+\s*/, "").trim()}</span>
                          </span>
                          <span className="text-[#64748B] text-xs font-semibold">
                            Cartão #{currentIdx + 1} de {cards.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#059669] font-extrabold text-xs">
                            <Brain className="w-3.5 h-3.5" />
                            <span>FSRS Retenção: {currentCard.retention}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePlayAudio()}
                            title={`Ouvir Áudio ${curriculum.langLabel}`}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-[0_2px_0_#CBD5E1] cursor-pointer ${
                              isPlayingAudio
                                ? "bg-[#0D9488] text-white scale-110"
                                : "bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488] hover:text-white"
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Core Content */}
                      <div className="my-auto py-6 space-y-4">
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                            Frase Alvo ({curriculum.langLabel})
                          </span>
                          <h2 className="font-serif text-2xl sm:text-3xl text-[#111C2D] font-bold leading-relaxed tracking-tight">
                            {currentCard.targetPhrase}
                          </h2>
                        </div>

                        {/* Phonetics Pronunciation Helper */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-[#3D4947] font-sans font-medium text-xs">
                          <Mic className="w-3.5 h-3.5 text-[#0D9488]" />
                          <span>{currentCard.phonetics}</span>
                        </div>

                        {/* Translation Drawer / Flip State */}
                        <div
                          className={`pt-3 border-t border-dashed border-stone-300 transition-all duration-300 ${
                            isRevealed ? "opacity-100" : "opacity-10 blur-sm select-none"
                          }`}
                        >
                          <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                            Português (Contexto)
                          </span>
                          <p className="text-base sm:text-lg text-[#0D9488] font-bold mt-0.5">
                            {currentCard.translation}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1 italic">
                            {currentCard.culturalNote}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom Bar: Quick Flip Toggle */}
                      <div className="flex items-center justify-between pt-4 border-t-2 border-[#F5F0E8]">
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Intervalo anterior: {currentCard.interval}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsRevealed((prev) => !prev)}
                          className="flex items-center gap-1 text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Ocultar Reverso (Espaço)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Alternar Reverso (Espaço)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </TactileCard>

                    {/* 4 Chunky 3D FSRS Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("again")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#FECACA] shadow-[0_4px_0_#EF4444] hover:shadow-[0_2px_0_#EF4444] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mb-1 group-hover:scale-125 transition-transform" />
                        <span className="font-extrabold text-sm text-[#111C2D]">Errei</span>
                        <span className="text-[#64748B] text-[11px] font-semibold">1m · [1]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("hard")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#FDE68A] shadow-[0_4px_0_#D97706] hover:shadow-[0_2px_0_#D97706] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] mb-1 group-hover:scale-125 transition-transform" />
                        <span className="font-extrabold text-sm text-[#111C2D]">Difícil</span>
                        <span className="text-[#64748B] text-[11px] font-semibold">12h · [2]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("good")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#A7F3D0] shadow-[0_4px_0_#10B981] hover:shadow-[0_2px_0_#10B981] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mb-1 group-hover:scale-125 transition-transform" />
                        <span className="font-extrabold text-sm text-[#111C2D]">Bom</span>
                        <span className="text-[#64748B] text-[11px] font-semibold">3d · [3]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("easy")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#A5F3FC] shadow-[0_4px_0_#06B6D4] hover:shadow-[0_2px_0_#06B6D4] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] mb-1 group-hover:scale-125 transition-transform" />
                        <span className="font-extrabold text-sm text-[#111C2D]">Fácil</span>
                        <span className="text-[#64748B] text-[11px] font-semibold">7d · [4]</span>
                      </motion.button>
                    </div>

                    {/* Queue Status and Shortcuts Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-[#64748B]">
                        <span className="px-1.5 py-0.5 rounded bg-white border border-stone-300 text-[#111C2D] font-bold text-[10px]">
                          1-4
                        </span>
                        <span>Avaliar</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-stone-300 text-[#111C2D] font-bold text-[10px]">
                          Espaço
                        </span>
                        <span>Áudio</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                        <span>Fila Ativa: {currentIdx + 1} de {cards.length}</span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ETAPA 1: ÁUDIO & RITMO */}
            {phaseIndex === 1 && (
              <motion.div
                key="phase-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <TactileCard className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-5 h-5 text-[#0D9488]" />
                      <h3 className="font-extrabold text-lg text-[#111C2D]">
                        Laboratório de Áudio & Shadowing Neural
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs">
                      Etapa 2 de 5
                    </span>
                  </div>

                  {/* Vinyl Player Waveform */}
                  <div className="bg-[#18181B] rounded-2xl p-6 text-white flex flex-col items-center justify-center gap-5 shadow-inner relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      {/* Animated Audio Equalizer Bars */}
                      <div className="flex items-end gap-1.5 h-16">
                        {[40, 80, 55, 95, 70, 30, 85, 60, 90, 45, 75, 100].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: isPlayingAudio ? [h * 0.4, h, h * 0.3] : h * 0.4,
                            }}
                            transition={{
                              repeat: isPlayingAudio ? Infinity : 0,
                              duration: 0.8,
                              delay: i * 0.05,
                            }}
                            className="w-2 rounded-full bg-gradient-to-t from-[#0D9488] to-[#14B8A6]"
                            style={{ height: `${h * 0.4}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <p className="font-serif text-xl sm:text-2xl font-bold text-[#FDFBF7]">
                        {currentCard.targetPhrase}
                      </p>
                      <p className="text-xs text-stone-400 font-sans">
                        {currentCard.phonetics}
                      </p>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center gap-2 pt-2">
                      {(["0.8x", "1.0x", "1.2x"] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setAudioSpeed(spd)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            audioSpeed === spd
                              ? "bg-[#0D9488] text-white"
                              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {spd} {spd === "0.8x" ? "Cadência" : spd === "1.0x" ? "Padrão" : "Rápido"}
                        </button>
                      ))}
                    </div>

                    {/* Big Tactile Play Button */}
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePlayAudio()}
                      className="w-16 h-16 rounded-full bg-[#0D9488] flex items-center justify-center text-white shadow-[0_6px_0_#0F766E] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#0F766E] transition-all cursor-pointer"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-7 h-7" />
                      ) : (
                        <Play className="w-7 h-7 fill-white ml-0.5" />
                      )}
                    </motion.button>
                  </div>

                  {/* Audio Shadowing Helper Notes */}
                  <div className="p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200/80 flex items-start gap-3">
                    <Radio className="w-5 h-5 text-[#FF5722] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-extrabold text-xs text-[#111C2D] block">
                        Instrução de Shadowing:
                      </span>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Ouça a frase em {curriculum.langLabel.toLowerCase()} e repita em voz alta imediatamente, acompanhando a
                        melodia, as conexões fonéticas e as pausas naturais da fala nativa.
                      </p>
                    </div>
                  </div>

                  {/* Action Advance Button (Gated by Audio Playback) */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasPlayedAudio) {
                          handlePlayAudio();
                          return;
                        }
                        triggerToast("Etapa de Áudio Concluída! +25 XP", 25);
                        setPhaseIndex(2);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_3px_0_#0F766E] hover:opacity-95 cursor-pointer"
                    >
                      {!hasPlayedAudio ? (
                        <>
                          <Volume2 size={14} />
                          <span>Ouvir Áudio para Desbloquear Sintaxe</span>
                        </>
                      ) : (
                        <>
                          <span>Concluir Áudio & Ir para Sintaxe (+25 XP)</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </TactileCard>
              </motion.div>
            )}

            {/* ETAPA 2: SINTAXE */}
            {phaseIndex === 2 && (
              <motion.div
                key="phase-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <TactileCard className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#0D9488]" />
                      <h3 className="font-extrabold text-lg text-[#111C2D]">
                        Oficina de Sintaxe: Anatomia da Frase
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs">
                      Etapa 3 de 5
                    </span>
                  </div>

                  <p className="text-xs text-stone-600">
                    Clique em cada bloco para inspecionar a mecânica sintática e entender como os
                    casos gramaticais se encaixam:
                  </p>

                  {/* Interactive Blocks */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentCard.syntax.map((block, idx) => {
                      const isSelected = selectedSyntaxBlock === idx;
                      return (
                        <motion.button
                          key={idx}
                          type="button"
                          whileTap={{ y: 2 }}
                          onClick={() => {
                            void tap("light");
                            setSelectedSyntaxBlock(idx);
                          }}
                          className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer select-none ${
                            isSelected
                              ? "bg-white shadow-[0_4px_0_#0F766E] border-[#0D9488]"
                              : "bg-[#F5F0E8] border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-stone-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-[11px] font-black uppercase tracking-wider"
                              style={{ color: block.color }}
                            >
                              {block.role}
                            </span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: block.color }}
                            />
                          </div>
                          <span className="text-base font-black text-[#111C2D] block">
                            {block.word}
                          </span>
                          <span className="text-xs text-[#64748B] block mt-0.5">
                            {block.detail}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Explanatory Drawer for Selected Block */}
                  {selectedSyntaxBlock !== null && currentCard.syntax[selectedSyntaxBlock] && (
                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-start gap-3">
                      <Brain className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-xs text-teal-900 block mb-1">
                          Regra Gramatical: {currentCard.syntax[selectedSyntaxBlock].role}
                        </span>
                        <p className="text-xs text-teal-800 leading-relaxed">
                          {currentCard.syntax[selectedSyntaxBlock].explanation ||
                            "Elemento estruturador da oração alemã, posicionado em conformidade com as regras gramaticais do CEFR."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Syntax Challenge */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-stone-900 block">
                      {curriculum.syntaxChallenge.question}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {curriculum.syntaxChallenge.options.map((opt) => {
                        const isChosen = syntaxQuizAnswer === opt.id;
                        const isCorrect = opt.correct;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSyntaxQuizAnswer(opt.id);
                              if (isCorrect) {
                                void tap("success");
                                triggerToast("Correto! Sintaxe Dominada (+15 XP)", 15);
                              } else {
                                void tap("heavy");
                              }
                            }}
                            className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                              isChosen
                                ? isCorrect
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-[0_3px_0_#059669]"
                                  : "bg-rose-50 border-rose-400 text-rose-800 shadow-[0_3px_0_#EF4444]"
                                : "bg-white border-stone-200 hover:bg-stone-100 text-stone-700 shadow-[0_2px_0_#E2E8F0]"
                            }`}
                          >
                            {opt.label} {isChosen && (isCorrect ? "✓" : "✗")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Footer (Gated by Syntax Challenge) */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!syntaxQuizAnswer) {
                          triggerToast("Responda ao Desafio de Sintaxe acima para avançar!", 0);
                          return;
                        }
                        triggerToast("Sintaxe Concluída! +30 XP", 30);
                        setPhaseIndex(3);
                      }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-[0_3px_0_#0F766E] transition-all cursor-pointer ${
                        !syntaxQuizAnswer
                          ? "bg-stone-300 text-stone-600 shadow-[0_3px_0_#94A3B8]"
                          : "bg-[#0D9488] text-white hover:opacity-95"
                      }`}
                    >
                      <span>Avançar para Radar de Cadência (+30 XP)</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </TactileCard>
              </motion.div>
            )}

            {/* ETAPA 3: CADÊNCIA */}
            {phaseIndex === 3 && (
              <motion.div
                key="phase-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <TactileCard className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                      <Mic className="w-5 h-5 text-[#FF5722]" />
                      <h3 className="font-extrabold text-lg text-[#111C2D]">
                        Radar de Cadência Acústica & Prosódia
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#FF5722]/10 text-[#FF5722] font-bold text-xs">
                      Etapa 4 de 5
                    </span>
                  </div>

                  <p className="text-xs text-stone-600">
                    Grave sua pronúncia para o espectrógrafo comparar sua curva de pitch com o
                    padrão nativo de {curriculum.nativeCity} em tempo real:
                  </p>

                  {/* Dual Spectrogram Box */}
                  <div className="bg-[#18181B] rounded-2xl p-5 text-white shadow-inner space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                        Modelo Nativo ({curriculum.nativeCity})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
                        {isRecordingCadence ? "Gravando voz..." : "Sua Curva de Pitch"}
                      </span>
                    </div>

                    <div className="w-full h-24 flex items-center justify-center relative">
                      <svg
                        className="w-full h-full stroke-linecap-round"
                        fill="none"
                        viewBox="0 0 400 90"
                      >
                        {/* Native curve */}
                        <path
                          d="M0,45 Q30,10 60,45 T120,45 T180,12 T240,45 T300,78 T360,45 T400,20"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          className="opacity-90"
                        />
                        {/* User curve */}
                        <motion.path
                          d="M0,45 Q30,15 60,45 T120,42 T180,18 T240,48 T300,72 T360,45 T400,26"
                          stroke="#FF5722"
                          strokeWidth="2.5"
                          strokeDasharray="4,4"
                          animate={{
                            opacity: isRecordingCadence ? [0.3, 1, 0.3] : 0.8,
                          }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 border-t border-stone-800 pt-2">
                      <span>0.0s (Início)</span>
                      <span>1.4s (Pausa Natural)</span>
                      <span>2.8s (Cadência Final)</span>
                    </div>
                  </div>

                  {/* Record Control */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRecordCadence}
                        disabled={isRecordingCadence}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_0_#DC2626] ${
                          isRecordingCadence
                            ? "bg-rose-600 text-white animate-pulse"
                            : "bg-[#FF5722] hover:bg-rose-600 text-white"
                        }`}
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                      <div>
                        <span className="font-extrabold text-sm text-stone-900 block">
                          {isRecordingCadence
                            ? `Gravando... Fale agora em ${curriculum.langLabel.toLowerCase()}!`
                            : cadenceScore
                            ? `Precisão Aferida: ${cadenceScore}%`
                            : "Clique no microfone para calibrar"}
                        </span>
                        <span className="text-xs text-stone-500 block">
                          Pronuncie: <em>“{currentCard.targetPhrase.slice(1, 28)}...”</em>
                        </span>
                      </div>
                    </div>

                    {cadenceScore && (
                      <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300">
                        ✓ Ritmo Validado
                      </div>
                    )}
                  </div>

                  {/* Navigation Footer (Gated by Microphone Recording) */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!cadenceScore) {
                          handleRecordCadence();
                          return;
                        }
                        triggerToast("Cadência Validada! +35 XP", 35);
                        setPhaseIndex(4);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_3px_0_#0F766E] hover:opacity-95 cursor-pointer"
                    >
                      {!cadenceScore ? (
                        <>
                          <Mic size={14} />
                          <span>Gravar Pronúncia para Desbloquear Reconstrução</span>
                        </>
                      ) : (
                        <>
                          <span>Avançar para Reconstrução (+35 XP)</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </TactileCard>
              </motion.div>
            )}

            {/* ETAPA 4: RECONSTRUÇÃO */}
            {phaseIndex === 4 && (
              <motion.div
                key="phase-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                <TactileCard className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-5 h-5 text-[#0D9488]" />
                      <h3 className="font-extrabold text-lg text-[#111C2D]">
                        Reconstrução Sináptica: Monte a Frase
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] font-bold text-xs">
                      Etapa Final
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                      Frase em Português:
                    </span>
                    <p className="font-serif text-xl sm:text-2xl font-bold text-[#111C2D]">
                      {currentCard.translation}
                    </p>
                  </div>

                  {/* Assembly Slots Area */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-600 block">
                      Área de Montagem da Frase em {curriculum.langLabel}:
                    </span>
                    <div className="min-h-[72px] p-4 rounded-2xl bg-[#F5F0E8] border-2 border-dashed border-stone-300 flex flex-wrap gap-2 items-center">
                      {reconstructionSlots.length === 0 ? (
                        <span className="text-xs text-stone-400 italic">
                          Clique nas palavras abaixo para adicioná-las na ordem correta...
                        </span>
                      ) : (
                        reconstructionSlots.map((tok, idx) => (
                          <motion.button
                            key={idx}
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemoveTokenFromSlot(idx)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_2px_0_#0F766E] flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{tok}</span>
                            <span className="text-teal-200 hover:text-white">×</span>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Token Bank */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-600 block">
                      Banco de Palavras & Conectores:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {reconstructionBank.map((tok, idx) => (
                        <motion.button
                          key={idx}
                          type="button"
                          whileTap={{ y: 2 }}
                          onClick={() => handleAddTokenToSlot(tok, idx)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 font-bold text-xs shadow-[0_3px_0_#CBD5E1] hover:bg-stone-50 cursor-pointer"
                        >
                          {tok}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Status & Validation Action */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs">
                      {reconstructionStatus === "correct" && (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <CheckCircle2 size={16} /> Frase Reconstruída com Sucesso!
                        </span>
                      )}
                      {reconstructionStatus === "error" && (
                        <span className="text-rose-600 font-bold">
                          Ordem incorreta. Verifique a posição dos verbos e conectores.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReconstructionSlots([]);
                          setReconstructionBank(curriculum.initialBank);
                          setReconstructionStatus("idle");
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        Reiniciar
                      </button>

                      {reconstructionStatus === "correct" ? (
                        <button
                          type="button"
                          onClick={() => router.push("/summary")}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white font-extrabold text-xs shadow-[0_4px_0_#059669] hover:opacity-95 cursor-pointer"
                        >
                          <Sparkles size={16} />
                          <span>Concluir Sessão Diária de 20m 🏆</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVerifyReconstruction}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_3px_0_#0F766E] hover:opacity-95 cursor-pointer"
                        >
                          <span>Validar Reconstrução</span>
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </TactileCard>
              </motion.div>
            )}
          </section>

          {/* ====================================================== */}
          {/* COLUNA DIREITA: MICRO-LAB DIAGNOSTICS & MENTOR (5 COLS)*/}
          {/* ====================================================== */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            {/* Widget 1: Syntactic 4-Part Decomposition */}
            <TactileCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D9488]" />
                  <h3 className="font-extrabold text-base text-[#111C2D]">
                    Decomposição Sintática
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs">
                  4 Partes
                </span>
              </div>

              <p className="text-xs text-[#64748B]">
                Observe como as funções gramaticais se encaixam como blocos táteis colecionáveis:
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {currentCard.syntax.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#F5F0E8] border-2 border-stone-200/80 shadow-[0_3px_0_#CBD5E1] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] uppercase font-extrabold tracking-wider"
                        style={{ color: item.color }}
                      >
                        {item.role}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <span className="font-extrabold text-sm text-[#111C2D]">
                      {item.word}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </TactileCard>

            {/* Widget 2: Cadence Real-time Radar */}
            <TactileCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#FF5722]" />
                  <h3 className="font-extrabold text-base text-[#111C2D]">
                    Radar de Cadência
                  </h3>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#059669] font-extrabold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>96% Ritmo</span>
                </div>
              </div>

              {/* Waveform Visualizer in Dark Surface */}
              <div className="relative bg-[#18181B] rounded-2xl p-4 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6BD8CB]" />
                    Nativo ({curriculum.nativeCity})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FEA619]" />
                    Sua Pronúncia
                  </span>
                </div>

                {/* Soundwave SVG Overlay */}
                <div className="w-full h-20 flex items-center justify-center">
                  <svg
                    className="w-full h-full stroke-linecap-round"
                    fill="none"
                    viewBox="0 0 400 80"
                  >
                    {/* Native Waveform (Teal) */}
                    <path
                      className="opacity-90"
                      d="M0,40 Q25,10 50,40 T100,40 T150,5 T200,40 T250,75 T300,40 T350,15 T400,40"
                      stroke="#6BD8CB"
                      strokeWidth="2.5"
                    />
                    {/* User Waveform (Amber) with variance */}
                    <path
                      className="opacity-80"
                      d="M0,40 Q25,14 50,40 T100,38 T150,10 T200,42 T250,70 T300,40 T350,20 T400,40"
                      stroke="#FEA619"
                      strokeDasharray="3,3"
                      strokeWidth="2"
                    />
                    {/* Cadence Synchronization Nodes */}
                    <circle cx="150" cy="10" fill="#FEA619" r="3.5" />
                    <circle cx="250" cy="70" fill="#FEA619" r="3.5" />
                    <circle cx="350" cy="20" fill="#6BD8CB" r="3.5" />
                  </svg>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>0.0s</span>
                  <span>1.4s (Pausa Natural)</span>
                  <span>2.8s</span>
                </div>
              </div>

              {/* Micro Feedback Badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F5F0E8] text-xs text-[#3D4947]">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>
                  {curriculum.speechLang.startsWith("en")
                    ? "Excelente controle de ritmo e conexão articulatória em inglês."
                    : curriculum.speechLang.startsWith("de")
                    ? "Excelente controle do tempo na consoante oclusiva ‘frei und’."
                    : "Excelente sincronização prosódica com a fala nativa."}
                </span>
              </div>
            </TactileCard>

            {/* Widget 3: Companion Mentor Reactive Speech Dock */}
            <div className="relative bg-[#F5F0E8] rounded-3xl p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={activeMentor.avatar}
                  alt={activeMentor.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#FEA619] shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5722] text-white text-[10px] font-bold">
                  👍
                </span>
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    {activeMentor.name}
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white text-[#D97706] font-bold shadow-sm">
                    Mentor em Foco
                  </span>
                </div>

                <p className="font-serif text-sm text-[#111C2D] italic leading-snug">
                  “Fantástico{session?.user?.display_name ? `, ${session.user.display_name.split(" ")[0]}` : ""}! A velocidade e o fraseamento da sua fala estão relativos à velocidade da luz! Mantenha essa precisão.”
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
