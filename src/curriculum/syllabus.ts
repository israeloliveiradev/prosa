import type { Syllabus } from "./types.js";

/**
 * Silabo da trilha (M2): título curto e metas "eu consigo…" de cada unidade de units.ts,
 * nos 7 idiomas de interface.
 *
 * - As metas seguem os descritores CEFR da banda e o tópico/foco de habilidade da unidade.
 * - Valem para qualquer idioma-alvo: nada de gramática de um idioma específico.
 * - Primeira pessoa e sempre a mesma abertura por idioma: "Consigo", "I can", "Ich kann",
 *   "Je peux", "Puedo", "Riesco a", e em ja terminam em "〜できる。".
 * - Mesma quantidade de metas em todos os idiomas de uma unidade (3 em todas).
 * - Validação: `npx tsx src/curriculum/check.ts syllabus`.
 */
const syllabus: Syllabus = {
  // ───────────────────────────── A1 ─────────────────────────────
  "a1-01": {
    title: {
      pt: "Olá, prazer",
      en: "Hello, nice to meet you",
      de: "Hallo, freut mich",
      fr: "Bonjour, je me présente",
      es: "Hola, mucho gusto",
      it: "Ciao, piacere",
      ja: "はじめまして",
    },
    canDo: {
      pt: [
        "Consigo cumprimentar as pessoas e me despedir no dia a dia.",
        "Consigo me apresentar e dizer de onde sou e onde moro.",
        "Consigo entender perguntas simples sobre mim quando falam devagar.",
      ],
      en: [
        "I can greet people and say goodbye in everyday situations.",
        "I can introduce myself and say where I'm from and where I live.",
        "I can understand simple questions about me when people speak slowly.",
      ],
      de: [
        "Ich kann im Alltag Leute begrüßen und mich verabschieden.",
        "Ich kann mich vorstellen und sagen, woher ich komme und wo ich wohne.",
        "Ich kann einfache Fragen zu meiner Person verstehen, wenn man langsam spricht.",
      ],
      fr: [
        "Je peux saluer quelqu'un et prendre congé dans la vie de tous les jours.",
        "Je peux me présenter et dire d'où je viens et où j'habite.",
        "Je peux comprendre des questions simples sur moi si l'on parle lentement.",
      ],
      es: [
        "Puedo saludar y despedirme en situaciones cotidianas.",
        "Puedo presentarme y decir de dónde soy y dónde vivo.",
        "Puedo entender preguntas sencillas sobre mí si me hablan despacio.",
      ],
      it: [
        "Riesco a salutare e a congedarmi nelle situazioni di tutti i giorni.",
        "Riesco a presentarmi e a dire da dove vengo e dove abito.",
        "Riesco a capire domande semplici su di me se mi parlano lentamente.",
      ],
      ja: [
        "日常の場面で、出会いや別れのあいさつができる。",
        "名前や出身地、住んでいる所を言って、自己紹介ができる。",
        "ゆっくり話してもらえれば、自分についての簡単な質問を理解できる。",
      ],
    },
  },
  "a1-02": {
    title: {
      pt: "Família e amigos",
      en: "Family and friends",
      de: "Familie und Freunde",
      fr: "Famille et amis",
      es: "Familia y amigos",
      it: "Famiglia e amici",
      ja: "家族と友だち",
    },
    canDo: {
      pt: [
        "Consigo falar da minha família e das pessoas próximas de mim.",
        "Consigo descrever alguém de forma simples: idade, aparência e personalidade.",
        "Consigo ler um texto curto em que alguém apresenta sua família.",
      ],
      en: [
        "I can talk about my family and the people close to me.",
        "I can describe someone simply: their age, looks and personality.",
        "I can read a short text in which someone introduces their family.",
      ],
      de: [
        "Ich kann über meine Familie und die Menschen in meinem Umfeld sprechen.",
        "Ich kann jemanden einfach beschreiben: Alter, Aussehen und Charakter.",
        "Ich kann einen kurzen Text lesen, in dem jemand seine Familie vorstellt.",
      ],
      fr: [
        "Je peux parler de ma famille et de mes proches.",
        "Je peux décrire quelqu'un simplement : âge, apparence et caractère.",
        "Je peux lire un court texte où quelqu'un présente sa famille.",
      ],
      es: [
        "Puedo hablar de mi familia y de las personas cercanas a mí.",
        "Puedo describir a alguien de forma sencilla: edad, aspecto y carácter.",
        "Puedo leer un texto breve en el que alguien presenta a su familia.",
      ],
      it: [
        "Riesco a parlare della mia famiglia e delle persone a me vicine.",
        "Riesco a descrivere qualcuno in modo semplice: età, aspetto e carattere.",
        "Riesco a leggere un breve testo in cui qualcuno presenta la sua famiglia.",
      ],
      ja: [
        "自分の家族や身近な人について話すことができる。",
        "年齢や外見、性格など、人のことを簡単に説明できる。",
        "家族を紹介する短い文章を読んで理解できる。",
      ],
    },
  },
  "a1-03": {
    title: {
      pt: "Números, horas e datas",
      en: "Numbers, times and dates",
      de: "Zahlen, Uhrzeiten, Daten",
      fr: "Nombres, heures et dates",
      es: "Números, horas y fechas",
      it: "Numeri, orari e date",
      ja: "数字・時間・日付",
    },
    canDo: {
      pt: [
        "Consigo entender números, horas e datas ditos com clareza.",
        "Consigo perguntar e dizer que horas são e que dia é hoje.",
        "Consigo ler horários simples, como os de uma loja ou de um ônibus.",
      ],
      en: [
        "I can understand numbers, times and dates when they're said clearly.",
        "I can ask and say what time it is and what day it is.",
        "I can read simple schedules, such as opening hours or a bus timetable.",
      ],
      de: [
        "Ich kann Zahlen, Uhrzeiten und Daten verstehen, wenn sie deutlich gesagt werden.",
        "Ich kann fragen und sagen, wie spät es ist und welcher Tag heute ist.",
        "Ich kann einfache Zeitangaben lesen, etwa Öffnungszeiten oder einen Fahrplan.",
      ],
      fr: [
        "Je peux comprendre des nombres, des heures et des dates dits clairement.",
        "Je peux demander et dire quelle heure il est et quel jour on est.",
        "Je peux lire des horaires simples, comme ceux d'un magasin ou d'un bus.",
      ],
      es: [
        "Puedo entender números, horas y fechas cuando se dicen con claridad.",
        "Puedo preguntar y decir qué hora es y qué día es hoy.",
        "Puedo leer horarios sencillos, como los de una tienda o un autobús.",
      ],
      it: [
        "Riesco a capire numeri, orari e date detti con chiarezza.",
        "Riesco a chiedere e dire che ore sono e che giorno è oggi.",
        "Riesco a leggere orari semplici, come quelli di un negozio o di un autobus.",
      ],
      ja: [
        "はっきり言われた数字や時刻、日付を聞き取ることができる。",
        "今何時か、今日が何曜日かを尋ねたり言ったりできる。",
        "店の営業時間やバスの時刻表など、簡単な予定表を読むことができる。",
      ],
    },
  },
  "a1-04": {
    title: {
      pt: "Comer e beber",
      en: "Food and drink",
      de: "Essen und Trinken",
      fr: "À table",
      es: "Comer y beber",
      it: "Mangiare e bere",
      ja: "食べ物と飲み物",
    },
    canDo: {
      pt: [
        "Consigo fazer o pedido num café ou restaurante e pedir a conta.",
        "Consigo dizer o que gosto e o que não gosto de comer e beber.",
        "Consigo entender perguntas simples de quem me atende, como o que vou pedir.",
      ],
      en: [
        "I can order food and drinks in a café or restaurant and ask for the bill.",
        "I can say what I like and don't like to eat and drink.",
        "I can understand simple questions from the staff, such as what I want to order.",
      ],
      de: [
        "Ich kann im Café oder Restaurant bestellen und um die Rechnung bitten.",
        "Ich kann sagen, was ich gern esse und trinke und was nicht.",
        "Ich kann einfache Fragen der Bedienung verstehen, etwa was ich möchte.",
      ],
      fr: [
        "Je peux commander au café ou au restaurant et demander l'addition.",
        "Je peux dire ce que j'aime et ce que je n'aime pas manger ou boire.",
        "Je peux comprendre les questions simples qu'on me pose au comptoir ou à table.",
      ],
      es: [
        "Puedo hacer un pedido en un bar o restaurante y pedir la cuenta.",
        "Puedo decir qué me gusta y qué no me gusta comer y beber.",
        "Puedo entender las preguntas sencillas de quien me atiende, como qué voy a tomar.",
      ],
      it: [
        "Riesco a ordinare da mangiare e da bere al bar o al ristorante e chiedere il conto.",
        "Riesco a dire cosa mi piace e cosa non mi piace mangiare e bere.",
        "Riesco a capire le domande semplici del cameriere, come cosa desidero.",
      ],
      ja: [
        "カフェやレストランで食べ物や飲み物を注文し、会計を頼むことができる。",
        "好きな食べ物や飲み物と、苦手なものを言うことができる。",
        "注文を聞かれたときなど、店員の簡単な質問を聞き取ることができる。",
      ],
    },
  },
  "a1-05": {
    title: {
      pt: "Pela cidade",
      en: "Getting around town",
      de: "Unterwegs in der Stadt",
      fr: "En ville",
      es: "Por la ciudad",
      it: "In giro per la città",
      ja: "町で道をたずねる",
    },
    canDo: {
      pt: [
        "Consigo dizer o nome de lugares da cidade e onde eles ficam.",
        "Consigo perguntar como chegar a um lugar e entender uma resposta simples.",
        "Consigo seguir indicações curtas faladas e achar o lugar no mapa.",
      ],
      en: [
        "I can name places in town and say where they are.",
        "I can ask how to get somewhere and understand a simple answer.",
        "I can follow short spoken directions and find the place on a map.",
      ],
      de: [
        "Ich kann Orte in der Stadt benennen und sagen, wo sie sind.",
        "Ich kann nach dem Weg fragen und eine einfache Antwort verstehen.",
        "Ich kann einer kurzen Wegbeschreibung folgen und den Ort auf der Karte finden.",
      ],
      fr: [
        "Je peux nommer des lieux de la ville et dire où ils se trouvent.",
        "Je peux demander mon chemin et comprendre une réponse simple.",
        "Je peux suivre de courtes indications orales et trouver le lieu sur un plan.",
      ],
      es: [
        "Puedo nombrar lugares de la ciudad y decir dónde están.",
        "Puedo preguntar cómo llegar a un sitio y entender una respuesta sencilla.",
        "Puedo seguir indicaciones orales breves y encontrar el lugar en un mapa.",
      ],
      it: [
        "Riesco a nominare i luoghi della città e dire dove si trovano.",
        "Riesco a chiedere come arrivare in un posto e capire una risposta semplice.",
        "Riesco a seguire brevi indicazioni a voce e trovare il posto sulla mappa.",
      ],
      ja: [
        "町の中の場所の名前と、それがどこにあるかを言うことができる。",
        "行き方を尋ねて、簡単な答えを理解できる。",
        "口頭の短い道案内を聞いて、地図で場所を見つけることができる。",
      ],
    },
  },
  "a1-06": {
    title: {
      pt: "Meu dia a dia",
      en: "A day in my life",
      de: "Mein Alltag",
      fr: "Ma journée",
      es: "Mi día a día",
      it: "La mia giornata",
      ja: "わたしの一日",
    },
    canDo: {
      pt: [
        "Consigo descrever minha rotina: quando acordo, trabalho, como e durmo.",
        "Consigo dizer com que frequência faço as coisas: sempre, às vezes, nunca.",
        "Consigo escrever algumas frases simples sobre um dia comum.",
      ],
      en: [
        "I can describe my daily routine: when I get up, work, eat and sleep.",
        "I can say how often I do things: always, sometimes or never.",
        "I can write a few simple sentences about a typical day.",
      ],
      de: [
        "Ich kann meinen Tagesablauf beschreiben: wann ich aufstehe, arbeite, esse und schlafe.",
        "Ich kann sagen, wie oft ich etwas mache: immer, manchmal, nie.",
        "Ich kann ein paar einfache Sätze über einen typischen Tag schreiben.",
      ],
      fr: [
        "Je peux décrire ma journée type : lever, travail, repas, coucher.",
        "Je peux dire à quelle fréquence je fais les choses : toujours, parfois, jamais.",
        "Je peux écrire quelques phrases simples sur une journée ordinaire.",
      ],
      es: [
        "Puedo describir mi rutina: cuándo me levanto, trabajo, como y duermo.",
        "Puedo decir con qué frecuencia hago las cosas: siempre, a veces, nunca.",
        "Puedo escribir unas frases sencillas sobre un día normal.",
      ],
      it: [
        "Riesco a descrivere la mia routine: quando mi alzo, lavoro, mangio e dormo.",
        "Riesco a dire quanto spesso faccio le cose: sempre, a volte, mai.",
        "Riesco a scrivere alcune frasi semplici su una giornata tipo.",
      ],
      ja: [
        "起きる時間や食事、仕事など、毎日の生活を説明できる。",
        "何かをどのくらいの頻度でするか（いつも、ときどきなど）を言うことができる。",
        "普段の一日について、簡単な文をいくつか書くことができる。",
      ],
    },
  },
  "a1-07": {
    title: {
      pt: "Fazendo compras",
      en: "Going shopping",
      de: "Einkaufen gehen",
      fr: "Faire des achats",
      es: "De compras",
      it: "Fare acquisti",
      ja: "買い物",
    },
    canDo: {
      pt: [
        "Consigo pedir o que preciso numa loja, com tamanho e quantidade.",
        "Consigo entender preços e perguntar quanto custa alguma coisa.",
        "Consigo descrever a roupa que procuro e dizer se vou levar.",
      ],
      en: [
        "I can ask for what I need in a shop, including size and quantity.",
        "I can understand prices and ask how much something costs.",
        "I can describe the clothes I'm looking for and say if I'll take them.",
      ],
      de: [
        "Ich kann im Geschäft sagen, was ich brauche, auch Größe und Menge.",
        "Ich kann Preise verstehen und fragen, was etwas kostet.",
        "Ich kann beschreiben, welche Kleidung ich suche, und sagen, ob ich sie nehme.",
      ],
      fr: [
        "Je peux demander ce dont j'ai besoin dans un magasin, avec la taille et la quantité.",
        "Je peux comprendre les prix et demander combien coûte un article.",
        "Je peux décrire le vêtement que je cherche et dire si je le prends.",
      ],
      es: [
        "Puedo pedir lo que necesito en una tienda, con la talla y la cantidad.",
        "Puedo entender precios y preguntar cuánto cuesta algo.",
        "Puedo describir la ropa que busco y decir si me la llevo.",
      ],
      it: [
        "Riesco a chiedere quello che mi serve in un negozio, con taglia e quantità.",
        "Riesco a capire i prezzi e chiedere quanto costa qualcosa.",
        "Riesco a descrivere il capo che cerco e dire se lo prendo.",
      ],
      ja: [
        "店で、サイズや数量を伝えて、ほしい物を頼むことができる。",
        "値段を聞き取り、いくらかを尋ねることができる。",
        "探している服を説明して、買うかどうかを伝えることができる。",
      ],
    },
  },
  "a1-08": {
    title: {
      pt: "Lar, doce lar",
      en: "Home sweet home",
      de: "Mein Zuhause",
      fr: "Chez moi",
      es: "Hogar, dulce hogar",
      it: "Casa dolce casa",
      ja: "わが家",
    },
    canDo: {
      pt: [
        "Consigo descrever minha casa: os cômodos e o que tem em cada um.",
        "Consigo ler um anúncio simples de aluguel e achar as informações principais.",
        "Consigo escrever uma mensagem curta contando onde e como moro.",
      ],
      en: [
        "I can describe my home: the rooms and what's in them.",
        "I can read a simple ad for a place to rent and find the key details.",
        "I can write a short message describing where and how I live.",
      ],
      de: [
        "Ich kann mein Zuhause beschreiben: die Räume und was darin steht.",
        "Ich kann eine einfache Wohnungsanzeige lesen und das Wichtigste finden.",
        "Ich kann in einer kurzen Nachricht beschreiben, wo und wie ich wohne.",
      ],
      fr: [
        "Je peux décrire mon logement : les pièces et ce qu'il y a dedans.",
        "Je peux lire une annonce de location simple et en repérer l'essentiel.",
        "Je peux écrire un court message pour décrire où et comment j'habite.",
      ],
      es: [
        "Puedo describir mi casa: las habitaciones y lo que hay en ellas.",
        "Puedo leer un anuncio sencillo de alquiler y encontrar los datos clave.",
        "Puedo escribir un mensaje corto para contar dónde y cómo vivo.",
      ],
      it: [
        "Riesco a descrivere la mia casa: le stanze e cosa c'è dentro.",
        "Riesco a leggere un semplice annuncio d'affitto e trovare le informazioni chiave.",
        "Riesco a scrivere un breve messaggio per descrivere dove e come abito.",
      ],
      ja: [
        "部屋や家具など、自分の家の様子を説明できる。",
        "簡単な賃貸物件の広告を読んで、大事な情報を見つけることができる。",
        "自分がどこにどんなふうに住んでいるかを、短いメッセージに書くことができる。",
      ],
    },
  },

  // ───────────────────────────── A2 ─────────────────────────────
  "a2-01": {
    title: {
      pt: "Fim de semana passado",
      en: "Last weekend",
      de: "Letztes Wochenende",
      fr: "Le week-end dernier",
      es: "El fin de semana pasado",
      it: "Lo scorso fine settimana",
      ja: "先週末のこと",
    },
    canDo: {
      pt: [
        "Consigo contar em ordem o que fiz no fim de semana passado.",
        "Consigo perguntar a alguém como foi o fim de semana e reagir de forma simples.",
        "Consigo escrever uma mensagem curta sobre algo que aconteceu e quando foi.",
      ],
      en: [
        "I can tell someone, in order, what I did last weekend.",
        "I can ask others about their weekend and react in a simple way.",
        "I can write a short message about something that happened and when.",
      ],
      de: [
        "Ich kann der Reihe nach erzählen, was ich letztes Wochenende gemacht habe.",
        "Ich kann andere nach ihrem Wochenende fragen und einfach darauf reagieren.",
        "Ich kann in einer kurzen Nachricht schreiben, was passiert ist und wann.",
      ],
      fr: [
        "Je peux raconter dans l'ordre ce que j'ai fait le week-end dernier.",
        "Je peux demander à quelqu'un comment s'est passé son week-end et réagir simplement.",
        "Je peux écrire un court message sur un événement passé en disant quand il a eu lieu.",
      ],
      es: [
        "Puedo contar en orden lo que hice el fin de semana pasado.",
        "Puedo preguntar a alguien qué tal su fin de semana y reaccionar de forma sencilla.",
        "Puedo escribir un mensaje corto sobre algo que pasó y cuándo ocurrió.",
      ],
      it: [
        "Riesco a raccontare in ordine cosa ho fatto lo scorso fine settimana.",
        "Riesco a chiedere a qualcuno com'è andato il suo weekend e reagire in modo semplice.",
        "Riesco a scrivere un breve messaggio su un fatto passato, dicendo quando è successo.",
      ],
      ja: [
        "先週末にしたことを、順を追って話すことができる。",
        "相手の週末について尋ね、簡単に反応することができる。",
        "過去の出来事について、いつのことかも含めて短いメッセージを書くことができる。",
      ],
    },
  },
  "a2-02": {
    title: {
      pt: "Viagem e transporte",
      en: "Travel and transport",
      de: "Reisen und Verkehr",
      fr: "Voyages et transports",
      es: "Viajes y transporte",
      it: "Viaggi e trasporti",
      ja: "旅行と交通",
    },
    canDo: {
      pt: [
        "Consigo comprar uma passagem e perguntar sobre horários, plataformas e conexões.",
        "Consigo fazer o check-in num hotel e pedir o que preciso.",
        "Consigo entender avisos simples sobre atrasos e mudanças.",
      ],
      en: [
        "I can buy a ticket and ask about times, platforms and connections.",
        "I can check in at a hotel and ask for what I need.",
        "I can understand simple announcements about delays and changes.",
      ],
      de: [
        "Ich kann eine Fahrkarte kaufen und nach Zeiten, Gleisen und Anschlüssen fragen.",
        "Ich kann im Hotel einchecken und um das bitten, was ich brauche.",
        "Ich kann einfache Durchsagen zu Verspätungen und Änderungen verstehen.",
      ],
      fr: [
        "Je peux acheter un billet et me renseigner sur les horaires, quais et correspondances.",
        "Je peux m'enregistrer à l'hôtel et demander ce dont j'ai besoin.",
        "Je peux comprendre des annonces simples sur les retards et les changements.",
      ],
      es: [
        "Puedo comprar un billete y preguntar por horarios, andenes y conexiones.",
        "Puedo registrarme en un hotel y pedir lo que necesito.",
        "Puedo entender avisos sencillos sobre retrasos y cambios.",
      ],
      it: [
        "Riesco a comprare un biglietto e chiedere orari, binari e coincidenze.",
        "Riesco a fare il check-in in albergo e chiedere ciò di cui ho bisogno.",
        "Riesco a capire semplici annunci su ritardi e cambiamenti.",
      ],
      ja: [
        "切符を買い、時刻やホーム、乗り換えについて尋ねることができる。",
        "ホテルでチェックインをして、必要なものを頼むことができる。",
        "遅れや変更についての簡単なアナウンスを聞き取ることができる。",
      ],
    },
  },
  "a2-03": {
    title: {
      pt: "Trabalho e estudos",
      en: "Work and studies",
      de: "Beruf und Ausbildung",
      fr: "Travail et études",
      es: "Trabajo y estudios",
      it: "Lavoro e studio",
      ja: "仕事と勉強",
    },
    canDo: {
      pt: [
        "Consigo descrever meu trabalho ou meus estudos e o que faço no dia a dia.",
        "Consigo dizer do que gosto e do que não gosto no meu trabalho ou curso.",
        "Consigo ler uma vaga de emprego ou a descrição de um curso e achar o essencial.",
      ],
      en: [
        "I can describe my job or my studies and what I do day to day.",
        "I can say what I like and don't like about my work or course.",
        "I can read a short job ad or course description and pick out the main points.",
      ],
      de: [
        "Ich kann meine Arbeit oder Ausbildung beschreiben und sagen, was ich täglich mache.",
        "Ich kann sagen, was mir an meiner Arbeit oder meinem Kurs gefällt und was nicht.",
        "Ich kann eine kurze Stellenanzeige oder Kursbeschreibung lesen und das Wichtigste finden.",
      ],
      fr: [
        "Je peux décrire mon travail ou mes études et ce que je fais au quotidien.",
        "Je peux dire ce qui me plaît ou non dans mon travail ou ma formation.",
        "Je peux lire une courte offre d'emploi ou de formation et en repérer l'essentiel.",
      ],
      es: [
        "Puedo describir mi trabajo o mis estudios y lo que hago a diario.",
        "Puedo decir qué me gusta y qué no de mi trabajo o de mi curso.",
        "Puedo leer una oferta de empleo o la descripción de un curso y encontrar lo principal.",
      ],
      it: [
        "Riesco a descrivere il mio lavoro o i miei studi e cosa faccio ogni giorno.",
        "Riesco a dire cosa mi piace e cosa no del mio lavoro o del mio corso.",
        "Riesco a leggere un breve annuncio di lavoro o di un corso e coglierne l'essenziale.",
      ],
      ja: [
        "自分の仕事や勉強について、普段していることを説明できる。",
        "仕事や授業の好きな点と、そうでない点を言うことができる。",
        "短い求人広告や講座の案内を読んで、要点をつかむことができる。",
      ],
    },
  },
  "a2-04": {
    title: {
      pt: "O corpo e a saúde",
      en: "Body and health",
      de: "Körper und Gesundheit",
      fr: "Le corps et la santé",
      es: "El cuerpo y la salud",
      it: "Corpo e salute",
      ja: "からだと健康",
    },
    canDo: {
      pt: [
        "Consigo dizer onde dói e descrever sintomas simples.",
        "Consigo entender as orientações básicas de um médico ou farmacêutico.",
        "Consigo pedir um remédio na farmácia e perguntar como tomar.",
      ],
      en: [
        "I can say what hurts and describe simple symptoms.",
        "I can understand basic instructions from a doctor or pharmacist.",
        "I can ask for medicine at a pharmacy and ask how to take it.",
      ],
      de: [
        "Ich kann sagen, was mir wehtut, und einfache Beschwerden beschreiben.",
        "Ich kann einfache Anweisungen in der Arztpraxis oder Apotheke verstehen.",
        "Ich kann in der Apotheke ein Medikament verlangen und fragen, wie man es nimmt.",
      ],
      fr: [
        "Je peux dire où j'ai mal et décrire des symptômes simples.",
        "Je peux comprendre les consignes simples d'un médecin ou d'un pharmacien.",
        "Je peux demander un médicament en pharmacie et me faire expliquer comment le prendre.",
      ],
      es: [
        "Puedo decir qué me duele y describir síntomas sencillos.",
        "Puedo entender las indicaciones básicas de un médico o un farmacéutico.",
        "Puedo pedir un medicamento en la farmacia y preguntar cómo tomarlo.",
      ],
      it: [
        "Riesco a dire dove mi fa male e descrivere sintomi semplici.",
        "Riesco a capire le indicazioni di base di un medico o di un farmacista.",
        "Riesco a chiedere un farmaco in farmacia e informarmi su come prenderlo.",
      ],
      ja: [
        "どこが痛いかを言い、簡単な症状を説明できる。",
        "医者や薬剤師の基本的な指示を聞いて理解できる。",
        "薬局で薬を頼み、飲み方を尋ねることができる。",
      ],
    },
  },
  "a2-05": {
    title: {
      pt: "Planos e convites",
      en: "Plans and invitations",
      de: "Pläne und Einladungen",
      fr: "Projets et invitations",
      es: "Planes e invitaciones",
      it: "Programmi e inviti",
      ja: "予定とお誘い",
    },
    canDo: {
      pt: [
        "Consigo falar dos meus planos para os próximos dias e semanas.",
        "Consigo convidar alguém e aceitar ou recusar um convite com educação.",
        "Consigo combinar onde e quando vamos nos encontrar, falando ou por escrito.",
      ],
      en: [
        "I can talk about my plans for the coming days and weeks.",
        "I can invite someone, and accept or politely turn down an invitation.",
        "I can agree on when and where to meet, in person or in writing.",
      ],
      de: [
        "Ich kann über meine Pläne für die nächsten Tage und Wochen sprechen.",
        "Ich kann jemanden einladen und eine Einladung annehmen oder höflich absagen.",
        "Ich kann mündlich oder schriftlich verabreden, wann und wo wir uns treffen.",
      ],
      fr: [
        "Je peux parler de mes projets pour les jours et les semaines à venir.",
        "Je peux inviter quelqu'un, et accepter ou refuser poliment une invitation.",
        "Je peux convenir d'un lieu et d'une heure de rendez-vous, à l'oral ou par écrit.",
      ],
      es: [
        "Puedo hablar de mis planes para los próximos días y semanas.",
        "Puedo invitar a alguien y aceptar o rechazar una invitación con amabilidad.",
        "Puedo acordar cuándo y dónde vernos, de palabra o por escrito.",
      ],
      it: [
        "Riesco a parlare dei miei programmi per i prossimi giorni e le prossime settimane.",
        "Riesco a invitare qualcuno e ad accettare o rifiutare un invito con gentilezza.",
        "Riesco a mettermi d'accordo su dove e quando vederci, a voce o per iscritto.",
      ],
      ja: [
        "これから数日、数週間の予定について話すことができる。",
        "人を誘ったり、誘いを受けたり丁寧に断ったりできる。",
        "会う日時と場所を、口頭や文章で決めることができる。",
      ],
    },
  },
  "a2-06": {
    title: {
      pt: "Isto ou aquilo?",
      en: "This or that?",
      de: "Dies oder das?",
      fr: "Ceci ou cela ?",
      es: "¿Esto o aquello?",
      it: "Questo o quello?",
      ja: "どっちがいい？",
    },
    canDo: {
      pt: [
        "Consigo comparar duas coisas de forma simples: maior, mais barato, melhor.",
        "Consigo dizer qual opção prefiro e dar um motivo curto.",
        "Consigo ler descrições curtas de produtos ou hotéis e compará-las.",
      ],
      en: [
        "I can compare two things in a simple way: bigger, cheaper, better.",
        "I can say which option I prefer and give a short reason.",
        "I can read short descriptions of products or hotels and compare them.",
      ],
      de: [
        "Ich kann zwei Dinge einfach vergleichen: größer, billiger, besser.",
        "Ich kann sagen, was mir lieber ist, und kurz begründen, warum.",
        "Ich kann kurze Beschreibungen von Produkten oder Hotels lesen und vergleichen.",
      ],
      fr: [
        "Je peux comparer simplement deux choses : plus grand, moins cher, meilleur.",
        "Je peux dire quelle option je préfère et donner une raison simple.",
        "Je peux lire de courtes descriptions de produits ou d'hôtels et les comparer.",
      ],
      es: [
        "Puedo comparar dos cosas de forma sencilla: más grande, más barato, mejor.",
        "Puedo decir qué opción prefiero y dar una razón breve.",
        "Puedo leer descripciones breves de productos u hoteles y compararlas.",
      ],
      it: [
        "Riesco a confrontare due cose in modo semplice: più grande, più economico, migliore.",
        "Riesco a dire quale opzione preferisco e dare un breve motivo.",
        "Riesco a leggere brevi descrizioni di prodotti o hotel e confrontarle.",
      ],
      ja: [
        "大きさや値段など、二つの物を簡単に比べることができる。",
        "どちらがいいかを、短い理由とともに言うことができる。",
        "商品やホテルなどの短い説明を読んで、比べることができる。",
      ],
    },
  },
  "a2-07": {
    title: {
      pt: "Mensagens e ligações",
      en: "Messages and calls",
      de: "Nachrichten und Anrufe",
      fr: "Messages et appels",
      es: "Mensajes y llamadas",
      it: "Messaggi e telefonate",
      ja: "メッセージと電話",
    },
    canDo: {
      pt: [
        "Consigo escrever uma mensagem curta para pedir algo, agradecer ou pedir desculpas.",
        "Consigo entender um recado simples por telefone e anotar o principal.",
        "Consigo fazer uma ligação curta para pedir ou mudar algo, como uma reserva.",
      ],
      en: [
        "I can write a short message or email to ask for something, thank someone or apologise.",
        "I can understand a simple phone message and note down the key details.",
        "I can make a short phone call to ask for or change something, like a booking.",
      ],
      de: [
        "Ich kann in einer kurzen Nachricht um etwas bitten, mich bedanken oder entschuldigen.",
        "Ich kann eine einfache Telefonnachricht verstehen und das Wichtigste notieren.",
        "Ich kann kurz anrufen, um etwas zu erfragen oder zu ändern, etwa eine Reservierung.",
      ],
      fr: [
        "Je peux écrire un court message ou e-mail pour demander, remercier ou m'excuser.",
        "Je peux comprendre un message téléphonique simple et noter l'essentiel.",
        "Je peux téléphoner pour demander ou changer quelque chose, comme une réservation.",
      ],
      es: [
        "Puedo escribir un mensaje corto para pedir algo, dar las gracias o disculparme.",
        "Puedo entender un mensaje telefónico sencillo y anotar lo importante.",
        "Puedo hacer una llamada corta para pedir o cambiar algo, como una reserva.",
      ],
      it: [
        "Riesco a scrivere un breve messaggio o un'e-mail per chiedere, ringraziare o scusarmi.",
        "Riesco a capire un semplice messaggio telefonico e annotare l'essenziale.",
        "Riesco a telefonare per chiedere o cambiare qualcosa, come una prenotazione.",
      ],
      ja: [
        "頼みごとやお礼、おわびを伝える短いメッセージやメールを書くことができる。",
        "電話の簡単な伝言を聞いて、要点をメモすることができる。",
        "予約の変更など、用件を伝える短い電話をかけることができる。",
      ],
    },
  },
  "a2-08": {
    title: {
      pt: "Histórias de vida",
      en: "Life stories",
      de: "Erfahrungen und Biografien",
      fr: "Récits de vie",
      es: "Historias de vida",
      it: "Storie di vita",
      ja: "人生と経験",
    },
    canDo: {
      pt: [
        "Consigo falar de experiências que já tive e de coisas que nunca fiz.",
        "Consigo perguntar sobre as experiências dos outros e mostrar interesse.",
        "Consigo ler uma biografia curta e pôr os fatos principais em ordem.",
      ],
      en: [
        "I can talk about experiences I've had and things I've never done.",
        "I can ask others about their experiences and show interest.",
        "I can read a short biography and put the main events in order.",
      ],
      de: [
        "Ich kann erzählen, was ich schon erlebt und was ich noch nie gemacht habe.",
        "Ich kann andere nach ihren Erfahrungen fragen und Interesse zeigen.",
        "Ich kann eine kurze Biografie lesen und die wichtigsten Ereignisse ordnen.",
      ],
      fr: [
        "Je peux parler de ce que j'ai déjà vécu et de ce que je n'ai jamais fait.",
        "Je peux interroger les autres sur leurs expériences et montrer mon intérêt.",
        "Je peux lire une courte biographie et remettre les faits principaux dans l'ordre.",
      ],
      es: [
        "Puedo hablar de experiencias que he vivido y de cosas que nunca he hecho.",
        "Puedo preguntar a otras personas por sus experiencias y mostrar interés.",
        "Puedo leer una biografía breve y ordenar los hechos principales.",
      ],
      it: [
        "Riesco a parlare delle esperienze che ho fatto e delle cose che non ho mai fatto.",
        "Riesco a chiedere agli altri delle loro esperienze e a mostrare interesse.",
        "Riesco a leggere una breve biografia e a mettere in ordine i fatti principali.",
      ],
      ja: [
        "これまでにした経験や、まだしたことがないことについて話すことができる。",
        "相手の経験について尋ね、興味を示すことができる。",
        "短い伝記を読んで、主な出来事を順番に並べることができる。",
      ],
    },
  },

  // ───────────────────────────── B1 ─────────────────────────────
  "b1-01": {
    title: {
      pt: "Contar uma história",
      en: "Telling a good story",
      de: "Geschichten erzählen",
      fr: "Raconter une histoire",
      es: "Contar una historia",
      it: "Raccontare una storia",
      ja: "体験を語る",
    },
    canDo: {
      pt: [
        "Consigo contar uma história situando a cena antes de dizer o que aconteceu.",
        "Consigo descrever o que senti e como reagi aos fatos que conto.",
        "Consigo escrever um relato curto e encadeado de uma experiência, real ou inventada.",
      ],
      en: [
        "I can tell a story, setting the scene before saying what happened.",
        "I can describe how I felt and reacted to the events I'm telling.",
        "I can write a short, connected account of an experience, real or imagined.",
      ],
      de: [
        "Ich kann eine Geschichte erzählen und erst die Situation, dann die Ereignisse schildern.",
        "Ich kann beschreiben, wie ich mich dabei gefühlt und wie ich reagiert habe.",
        "Ich kann ein echtes oder erfundenes Erlebnis in einem kurzen, flüssigen Text schildern.",
      ],
      fr: [
        "Je peux raconter une histoire en posant le décor avant de dire ce qui s'est passé.",
        "Je peux décrire ce que j'ai ressenti et comment j'ai réagi.",
        "Je peux écrire un court récit suivi d'une expérience, réelle ou imaginaire.",
      ],
      es: [
        "Puedo contar una historia situando la escena antes de decir qué pasó.",
        "Puedo describir cómo me sentí y cómo reaccioné ante lo que cuento.",
        "Puedo escribir un relato breve y bien hilado de una experiencia, real o inventada.",
      ],
      it: [
        "Riesco a raccontare una storia, descrivendo la scena prima di dire cosa è successo.",
        "Riesco a descrivere cosa ho provato e come ho reagito.",
        "Riesco a scrivere un breve racconto coerente di un'esperienza, vera o inventata.",
      ],
      ja: [
        "場面の状況を説明してから、何が起きたかを話すことができる。",
        "話す出来事について、自分の気持ちや反応を説明できる。",
        "実際の、または想像した体験について、まとまった短い文章を書くことができる。",
      ],
    },
  },
  "b1-02": {
    title: {
      pt: "Na minha opinião",
      en: "In my opinion",
      de: "Meiner Meinung nach",
      fr: "À mon avis",
      es: "En mi opinión",
      it: "Secondo me",
      ja: "わたしの意見",
    },
    canDo: {
      pt: [
        "Consigo dar minha opinião sobre temas conhecidos e explicar por que penso assim.",
        "Consigo concordar ou discordar com educação e dizer por quê.",
        "Consigo acompanhar uma discussão sobre um tema conhecido e saber quem pensa o quê.",
      ],
      en: [
        "I can give my opinion on familiar topics and explain why I think so.",
        "I can politely agree or disagree with someone and say why.",
        "I can follow a discussion on a familiar topic and tell who thinks what.",
      ],
      de: [
        "Ich kann meine Meinung zu vertrauten Themen sagen und begründen.",
        "Ich kann höflich zustimmen oder widersprechen und sagen, warum.",
        "Ich kann einer Diskussion über ein vertrautes Thema folgen und erkennen, wer was denkt.",
      ],
      fr: [
        "Je peux donner mon avis sur des sujets familiers et expliquer pourquoi.",
        "Je peux exprimer poliment mon accord ou mon désaccord et le justifier.",
        "Je peux suivre une discussion sur un sujet familier et savoir qui pense quoi.",
      ],
      es: [
        "Puedo dar mi opinión sobre temas conocidos y explicar por qué pienso así.",
        "Puedo mostrar acuerdo o desacuerdo con educación y decir por qué.",
        "Puedo seguir una conversación sobre un tema conocido y saber quién opina qué.",
      ],
      it: [
        "Riesco a dare la mia opinione su temi familiari e spiegare perché la penso così.",
        "Riesco a esprimere accordo o disaccordo con garbo e dire perché.",
        "Riesco a seguire una discussione su un tema familiare e capire chi pensa cosa.",
      ],
      ja: [
        "身近な話題について自分の意見を言い、その理由を説明できる。",
        "相手の意見に丁寧に賛成したり反対したりして、理由を言うことができる。",
        "身近な話題の話し合いを聞いて、だれがどう考えているかを理解できる。",
      ],
    },
  },
  "b1-03": {
    title: {
      pt: "Resolvendo problemas",
      en: "Sorting out problems",
      de: "Probleme lösen",
      fr: "Régler un problème",
      es: "Resolver problemas",
      it: "Risolvere problemi",
      ja: "トラブルを解決する",
    },
    canDo: {
      pt: [
        "Consigo explicar um problema com um produto ou serviço e dizer o que espero.",
        "Consigo fazer uma reclamação com educação e insistir se nada for resolvido.",
        "Consigo escrever uma mensagem clara descrevendo o problema e a solução que quero.",
      ],
      en: [
        "I can explain a problem with a product or service and say what I expect.",
        "I can make a complaint politely and insist if nothing is done.",
        "I can write a clear message describing the problem and the solution I want.",
      ],
      de: [
        "Ich kann ein Problem mit einem Kauf oder Service erklären und sagen, was ich erwarte.",
        "Ich kann mich höflich beschweren und nachhaken, wenn nichts passiert.",
        "Ich kann eine klare Beschwerde schreiben, mit Problem und gewünschter Lösung.",
      ],
      fr: [
        "Je peux expliquer un problème avec un produit ou un service et dire ce que j'attends.",
        "Je peux faire une réclamation poliment et insister si rien ne change.",
        "Je peux écrire un message clair qui décrit le problème et la solution souhaitée.",
      ],
      es: [
        "Puedo explicar un problema con un producto o servicio y decir qué espero.",
        "Puedo presentar una queja con educación e insistir si no se resuelve.",
        "Puedo escribir un mensaje claro que describa el problema y la solución que pido.",
      ],
      it: [
        "Riesco a spiegare un problema con un prodotto o un servizio e dire cosa mi aspetto.",
        "Riesco a fare un reclamo con cortesia e insistere se non si risolve.",
        "Riesco a scrivere un messaggio chiaro che descriva il problema e la soluzione che chiedo.",
      ],
      ja: [
        "商品やサービスの問題を説明し、どうしてほしいかを伝えることができる。",
        "丁寧に苦情を言い、解決しない場合は重ねて求めることができる。",
        "問題と希望する対応をまとめた、分かりやすいメッセージを書くことができる。",
      ],
    },
  },
  "b1-04": {
    title: {
      pt: "Nas notícias",
      en: "In the news",
      de: "In den Nachrichten",
      fr: "À la une",
      es: "En las noticias",
      it: "In prima pagina",
      ja: "ニュースを読み解く",
    },
    canDo: {
      pt: [
        "Consigo entender os pontos principais de uma notícia clara sobre um tema conhecido.",
        "Consigo acompanhar o essencial de uma reportagem de rádio ou TV falada com clareza.",
        "Consigo resumir uma notícia curta com minhas palavras: quem, o quê, onde e quando.",
      ],
      en: [
        "I can understand the main points of a clear news article on a familiar topic.",
        "I can follow the main points of a clearly spoken radio or TV news report.",
        "I can sum up a short news report in my own words: who, what, where and when.",
      ],
      de: [
        "Ich kann die Kernaussagen eines klaren Artikels über ein vertrautes Thema verstehen.",
        "Ich kann den Hauptpunkten eines klar gesprochenen Radio- oder TV-Beitrags folgen.",
        "Ich kann eine kurze Meldung mit eigenen Worten zusammenfassen: wer, was, wo, wann.",
      ],
      fr: [
        "Je peux comprendre l'essentiel d'un article clair sur un sujet familier.",
        "Je peux suivre l'essentiel d'un reportage radio ou télé bien articulé.",
        "Je peux résumer une courte dépêche avec mes mots : qui, quoi, où et quand.",
      ],
      es: [
        "Puedo entender las ideas principales de una noticia clara sobre un tema conocido.",
        "Puedo seguir lo esencial de un reportaje de radio o televisión si se habla claro.",
        "Puedo resumir una noticia breve con mis palabras: quién, qué, dónde y cuándo.",
      ],
      it: [
        "Riesco a capire i punti principali di un articolo chiaro su un tema familiare.",
        "Riesco a seguire l'essenziale di un servizio radio o TV, se parlato con chiarezza.",
        "Riesco a riassumere una breve notizia con parole mie: chi, cosa, dove e quando.",
      ],
      ja: [
        "身近な話題についての分かりやすい記事を読んで、要点を理解できる。",
        "はっきり話されたラジオやテレビのニュースの要点を聞き取ることができる。",
        "短いニュースを、だれが、いつ、どこで、何をしたかに沿って自分の言葉で要約できる。",
      ],
    },
  },
  "b1-05": {
    title: {
      pt: "E se…?",
      en: "What if…?",
      de: "Was wäre, wenn …?",
      fr: "Et si… ?",
      es: "¿Y si…?",
      it: "E se…?",
      ja: "もしも…",
    },
    canDo: {
      pt: [
        "Consigo dizer o que eu faria numa situação imaginária e por quê.",
        "Consigo falar de condições e das consequências prováveis de cada uma.",
        "Consigo dar e pedir conselhos sobre problemas do dia a dia, falando ou por escrito.",
      ],
      en: [
        "I can say what I would do in an imagined situation and why.",
        "I can talk about conditions and their likely consequences.",
        "I can give and ask for advice on everyday problems, in speech or in writing.",
      ],
      de: [
        "Ich kann sagen, was ich in einer angenommenen Situation tun würde, und warum.",
        "Ich kann über Bedingungen und ihre wahrscheinlichen Folgen sprechen.",
        "Ich kann mündlich oder schriftlich Rat zu Alltagsproblemen geben und einholen.",
      ],
      fr: [
        "Je peux dire ce que je ferais dans une situation imaginaire, et pourquoi.",
        "Je peux parler de conditions et de leurs conséquences probables.",
        "Je peux donner et demander conseil sur un problème du quotidien, à l'oral ou à l'écrit.",
      ],
      es: [
        "Puedo decir qué haría en una situación imaginaria y por qué.",
        "Puedo hablar de condiciones y de sus consecuencias probables.",
        "Puedo dar y pedir consejo sobre problemas cotidianos, de palabra o por escrito.",
      ],
      it: [
        "Riesco a dire cosa farei in una situazione immaginaria e perché.",
        "Riesco a parlare di condizioni e delle loro probabili conseguenze.",
        "Riesco a dare e chiedere consigli su problemi quotidiani, a voce o per iscritto.",
      ],
      ja: [
        "仮の状況で自分ならどうするかを、理由とともに言うことができる。",
        "条件と、それによって起こりそうな結果について話すことができる。",
        "日常の困りごとについて、口頭や文章でアドバイスをしたり求めたりできる。",
      ],
    },
  },
  "b1-06": {
    title: {
      pt: "No trabalho",
      en: "At work",
      de: "Im Beruf",
      fr: "Au travail",
      es: "En el trabajo",
      it: "Al lavoro",
      ja: "職場で",
    },
    canDo: {
      pt: [
        "Consigo participar de uma reunião de rotina: dar atualizações e fazer perguntas.",
        "Consigo acompanhar o essencial de uma conversa de trabalho sobre temas conhecidos.",
        "Consigo alternar entre um tom formal e um informal, conforme com quem falo.",
      ],
      en: [
        "I can take part in a routine meeting: give updates and ask questions.",
        "I can follow the main points of a work discussion on familiar matters.",
        "I can switch between a formal and an informal tone depending on who I'm talking to.",
      ],
      de: [
        "Ich kann mich an einer Routinebesprechung beteiligen: berichten und Fragen stellen.",
        "Ich kann den Hauptpunkten eines Arbeitsgesprächs über vertraute Themen folgen.",
        "Ich kann je nach Gegenüber zwischen förmlichem und lockerem Ton wechseln.",
      ],
      fr: [
        "Je peux participer à une réunion de routine : faire le point et poser des questions.",
        "Je peux suivre l'essentiel d'une discussion de travail sur des sujets familiers.",
        "Je peux passer d'un ton formel à un ton détendu selon la personne à qui je parle.",
      ],
      es: [
        "Puedo participar en una reunión habitual: informar de avances y hacer preguntas.",
        "Puedo seguir lo esencial de una conversación de trabajo sobre temas conocidos.",
        "Puedo pasar de un tono formal a uno informal según con quién hable.",
      ],
      it: [
        "Riesco a partecipare a una riunione di routine: aggiornare gli altri e fare domande.",
        "Riesco a seguire l'essenziale di una discussione di lavoro su temi familiari.",
        "Riesco a passare da un tono formale a uno informale a seconda di chi ho davanti.",
      ],
      ja: [
        "定例の会議で、進み具合を報告したり質問したりできる。",
        "身近な業務についての話し合いの要点を聞き取ることができる。",
        "相手に合わせて、改まった話し方とくだけた話し方を使い分けることができる。",
      ],
    },
  },
  "b1-07": {
    title: {
      pt: "Culturas e tradições",
      en: "Cultures and traditions",
      de: "Kulturen und Bräuche",
      fr: "Cultures et traditions",
      es: "Culturas y tradiciones",
      it: "Culture e tradizioni",
      ja: "文化と伝統",
    },
    canDo: {
      pt: [
        "Consigo descrever uma tradição ou festa da minha cultura e explicar seu sentido.",
        "Consigo comparar costumes de países diferentes, com semelhanças e diferenças.",
        "Consigo ler um texto sobre os costumes de outra cultura e entender as ideias principais.",
      ],
      en: [
        "I can describe a tradition or festival from my culture and explain what it means.",
        "I can compare customs in different countries, noting similarities and differences.",
        "I can read a text about another culture's customs and understand the main ideas.",
      ],
      de: [
        "Ich kann ein Fest oder einen Brauch meiner Kultur beschreiben und seinen Sinn erklären.",
        "Ich kann Gemeinsamkeiten und Unterschiede zwischen Bräuchen verschiedener Länder nennen.",
        "Ich kann einen Text über Bräuche anderer Kulturen lesen und das Wesentliche verstehen.",
      ],
      fr: [
        "Je peux décrire une tradition ou une fête de ma culture et expliquer son sens.",
        "Je peux comparer les coutumes de différents pays : points communs et différences.",
        "Je peux lire un texte sur les coutumes d'une autre culture et en comprendre l'essentiel.",
      ],
      es: [
        "Puedo describir una tradición o fiesta de mi cultura y explicar su significado.",
        "Puedo comparar costumbres de distintos países y señalar semejanzas y diferencias.",
        "Puedo leer un texto sobre las costumbres de otra cultura y entender lo esencial.",
      ],
      it: [
        "Riesco a descrivere una tradizione o una festa della mia cultura e spiegarne il senso.",
        "Riesco a confrontare le usanze di paesi diversi, cogliendo somiglianze e differenze.",
        "Riesco a leggere un testo sulle usanze di un'altra cultura e capirne le idee principali.",
      ],
      ja: [
        "自分の文化の伝統や祭りを紹介し、その意味を説明できる。",
        "国ごとの習慣を比べて、似ている点と違う点を話すことができる。",
        "ほかの文化の習慣についての文章を読んで、主な内容を理解できる。",
      ],
    },
  },
  "b1-08": {
    title: {
      pt: "Um mundo em mudança",
      en: "A changing world",
      de: "Eine Welt im Wandel",
      fr: "Un monde qui change",
      es: "Un mundo que cambia",
      it: "Un mondo che cambia",
      ja: "変わりゆく社会",
    },
    canDo: {
      pt: [
        "Consigo descrever como algo mudou com o tempo, como minha cidade ou um hábito.",
        "Consigo ler um texto claro sobre um tema social ou ambiental e achar os fatos principais.",
        "Consigo escrever um texto curto sobre um tema atual, com fatos e minha opinião.",
      ],
      en: [
        "I can describe how something has changed over time, such as my city or a habit.",
        "I can read a clear text on a social or environmental issue and find the key facts.",
        "I can write a short text on a current issue, with facts and my own view.",
      ],
      de: [
        "Ich kann beschreiben, wie sich etwas verändert hat, etwa meine Stadt oder eine Gewohnheit.",
        "Ich kann einen klaren Text über Gesellschaft oder Umwelt lesen und die Kernfakten finden.",
        "Ich kann über ein aktuelles Thema kurz schreiben, mit Fakten und meiner Meinung.",
      ],
      fr: [
        "Je peux décrire comment une chose a changé avec le temps, comme ma ville ou une habitude.",
        "Je peux lire un texte clair sur la société ou l'environnement et en tirer les faits clés.",
        "Je peux écrire un court texte sur un sujet d'actualité, avec des faits et mon avis.",
      ],
      es: [
        "Puedo describir cómo ha cambiado algo con el tiempo, como mi ciudad o un hábito.",
        "Puedo leer un texto claro sobre un tema social o ambiental y encontrar los datos clave.",
        "Puedo escribir un texto breve sobre un tema actual, con datos y mi opinión.",
      ],
      it: [
        "Riesco a descrivere come è cambiato qualcosa nel tempo, ad esempio la mia città.",
        "Riesco a leggere un testo chiaro su società o ambiente e trovarne i fatti chiave.",
        "Riesco a scrivere un breve testo su un tema d'attualità, con fatti e la mia opinione.",
      ],
      ja: [
        "自分の町や習慣など、何かが時とともにどう変わったかを説明できる。",
        "社会や環境の問題についての分かりやすい文章を読んで、重要な事実をつかむことができる。",
        "時事的な話題について、事実と自分の意見を入れた短い文章を書くことができる。",
      ],
    },
  },

  // ───────────────────────────── B2 ─────────────────────────────
  "b2-01": {
    title: {
      pt: "Prós e contras",
      en: "Pros and cons",
      de: "Pro und Contra",
      fr: "Le pour et le contre",
      es: "Pros y contras",
      it: "Pro e contro",
      ja: "賛否を論じる",
    },
    canDo: {
      pt: [
        "Consigo explicar um ponto de vista sobre um tema atual, pesando prós e contras.",
        "Consigo defender minha posição num debate e responder a contra-argumentos.",
        "Consigo escrever um texto argumentativo a favor ou contra uma ideia.",
      ],
      en: [
        "I can explain a view on a current issue, weighing up the pros and cons.",
        "I can defend my position in a debate and respond to counterarguments.",
        "I can write an essay that builds a reasoned case for or against an idea.",
      ],
      de: [
        "Ich kann meine Sicht auf ein aktuelles Thema erläutern und Vor- und Nachteile abwägen.",
        "Ich kann meine Position in einer Debatte vertreten und auf Gegenargumente eingehen.",
        "Ich kann eine Erörterung schreiben und schlüssig für oder gegen eine Idee argumentieren.",
      ],
      fr: [
        "Je peux exposer un point de vue sur un sujet d'actualité en pesant le pour et le contre.",
        "Je peux défendre ma position dans un débat et répondre aux contre-arguments.",
        "Je peux rédiger un texte argumenté pour ou contre une idée.",
      ],
      es: [
        "Puedo explicar un punto de vista sobre un tema actual sopesando los pros y los contras.",
        "Puedo defender mi postura en un debate y responder a los contraargumentos.",
        "Puedo escribir un texto argumentativo a favor o en contra de una idea.",
      ],
      it: [
        "Riesco a esporre un punto di vista su un tema attuale, valutando pro e contro.",
        "Riesco a difendere la mia posizione in un dibattito e a rispondere alle obiezioni.",
        "Riesco a scrivere un testo argomentativo a favore o contro un'idea.",
      ],
      ja: [
        "時事的な問題について、長所と短所を比べながら自分の考えを説明できる。",
        "討論で自分の立場を主張し、反論に答えることができる。",
        "ある考えに賛成または反対する、筋の通った意見文を書くことができる。",
      ],
    },
  },
  "b2-02": {
    title: {
      pt: "Relatar e explicar",
      en: "Retell and explain",
      de: "Wiedergeben und erklären",
      fr: "Rapporter et expliquer",
      es: "Relatar y explicar",
      it: "Riferire e spiegare",
      ja: "伝える・説明する",
    },
    canDo: {
      pt: [
        "Consigo relatar com precisão o que alguém disse ou escreveu, com minhas palavras.",
        "Consigo ler uma entrevista e repassar as principais declarações e quem as fez.",
        "Consigo descrever um processo por escrito, com clareza e passo a passo.",
      ],
      en: [
        "I can report accurately, in my own words, what someone said or wrote.",
        "I can read an interview and pass on the key statements and who made them.",
        "I can describe a process in writing, clearly and step by step.",
      ],
      de: [
        "Ich kann in eigenen Worten genau wiedergeben, was jemand gesagt oder geschrieben hat.",
        "Ich kann ein Interview lesen und weitergeben, wer was Wichtiges gesagt hat.",
        "Ich kann einen Ablauf schriftlich klar und Schritt für Schritt beschreiben.",
      ],
      fr: [
        "Je peux rapporter fidèlement, avec mes mots, ce que quelqu'un a dit ou écrit.",
        "Je peux lire une interview et rapporter qui a dit quoi d'important.",
        "Je peux décrire un processus par écrit, clairement et étape par étape.",
      ],
      es: [
        "Puedo transmitir con precisión y con mis palabras lo que alguien dijo o escribió.",
        "Puedo leer una entrevista y resumir las declaraciones clave y quién las hizo.",
        "Puedo describir un proceso por escrito, con claridad y paso a paso.",
      ],
      it: [
        "Riesco a riferire con precisione, con parole mie, ciò che qualcuno ha detto o scritto.",
        "Riesco a leggere un'intervista e riportare le dichiarazioni principali e chi le ha fatte.",
        "Riesco a descrivere un processo per iscritto, in modo chiaro e passo dopo passo.",
      ],
      ja: [
        "人が言ったことや書いたことを、自分の言葉で正確に伝えることができる。",
        "インタビュー記事を読んで、だれが何を言ったかの要点を人に伝えることができる。",
        "ある手順や過程を、順を追って分かりやすく文章で説明できる。",
      ],
    },
  },
  "b2-03": {
    title: {
      pt: "Ciência e tecnologia",
      en: "Science and technology",
      de: "Wissenschaft und Technik",
      fr: "Sciences et technologies",
      es: "Ciencia y tecnología",
      it: "Scienza e tecnologia",
      ja: "科学とテクノロジー",
    },
    canDo: {
      pt: [
        "Consigo ler um artigo sobre ciência ou tecnologia e acompanhar o raciocínio principal.",
        "Consigo entender as ideias principais de uma palestra ou podcast sobre um tema abstrato.",
        "Consigo explicar uma ideia complexa com palavras mais simples e um exemplo.",
      ],
      en: [
        "I can read an article on science or technology and follow its main line of argument.",
        "I can understand the main ideas of a talk or podcast on an abstract topic.",
        "I can explain a complex idea in simpler words, with an example.",
      ],
      de: [
        "Ich kann einen Artikel über Wissenschaft oder Technik lesen und der Argumentation folgen.",
        "Ich kann die Kernaussagen eines Vortrags oder Podcasts zu abstrakten Themen verstehen.",
        "Ich kann eine komplexe Idee einfacher erklären und mit einem Beispiel veranschaulichen.",
      ],
      fr: [
        "Je peux lire un article de sciences ou de technologie et suivre son raisonnement.",
        "Je peux saisir les idées clés d'une conférence ou d'un podcast sur un sujet abstrait.",
        "Je peux expliquer une idée complexe avec des mots plus simples et un exemple.",
      ],
      es: [
        "Puedo leer un artículo de ciencia o tecnología y seguir el razonamiento principal.",
        "Puedo entender las ideas principales de una charla o un pódcast sobre un tema abstracto.",
        "Puedo explicar una idea compleja con palabras más sencillas y un ejemplo.",
      ],
      it: [
        "Riesco a leggere un articolo di scienza o tecnologia e seguirne il ragionamento.",
        "Riesco a capire le idee principali di una conferenza o di un podcast su un tema astratto.",
        "Riesco a spiegare un'idea complessa con parole più semplici e un esempio.",
      ],
      ja: [
        "科学や技術についての記事を読んで、主な論理の流れを追うことができる。",
        "抽象的なテーマの講演やポッドキャストを聞いて、主な考えを理解できる。",
        "複雑な考えを、例を挙げながら、より簡単な言葉で説明できる。",
      ],
    },
  },
  "b2-04": {
    title: {
      pt: "Falar com nuances",
      en: "Shades of certainty",
      de: "Feine Zwischentöne",
      fr: "Tout en nuances",
      es: "Hablar con matices",
      it: "Questione di sfumature",
      ja: "ニュアンスを伝える",
    },
    canDo: {
      pt: [
        "Consigo dizer o quanto tenho certeza de algo, da convicção à dúvida.",
        "Consigo levantar hipóteses sobre as causas e os possíveis desfechos de uma situação.",
        "Consigo suavizar o que digo ou escrevo para não soar direto demais.",
      ],
      en: [
        "I can say how certain I am about something, from sure to doubtful.",
        "I can speculate about the causes and possible outcomes of a situation.",
        "I can soften what I say or write so it doesn't sound too blunt.",
      ],
      de: [
        "Ich kann ausdrücken, wie sicher ich mir bei etwas bin, von überzeugt bis zweifelnd.",
        "Ich kann Vermutungen über Ursachen und mögliche Folgen einer Situation anstellen.",
        "Ich kann Aussagen mündlich und schriftlich abmildern, damit sie nicht zu schroff wirken.",
      ],
      fr: [
        "Je peux exprimer mon degré de certitude, de la conviction au doute.",
        "Je peux émettre des hypothèses sur les causes et les suites possibles d'une situation.",
        "Je peux nuancer mes propos, à l'oral comme à l'écrit, pour qu'ils soient moins abrupts.",
      ],
      es: [
        "Puedo expresar mi grado de certeza sobre algo, de la convicción a la duda.",
        "Puedo plantear hipótesis sobre las causas y los posibles resultados de una situación.",
        "Puedo matizar lo que digo o escribo para que no suene demasiado tajante.",
      ],
      it: [
        "Riesco a esprimere il mio grado di certezza, dalla convinzione al dubbio.",
        "Riesco a fare ipotesi sulle cause e sui possibili esiti di una situazione.",
        "Riesco ad attenuare ciò che dico o scrivo perché non suoni troppo brusco.",
      ],
      ja: [
        "どのくらい確信があるかを、断定から疑いまで言い分けることができる。",
        "ある状況の原因や、この先どうなりそうかを推測して話すことができる。",
        "話すときも書くときも、表現をやわらげて、きつくなりすぎないように伝えることができる。",
      ],
    },
  },
  "b2-05": {
    title: {
      pt: "Apresentar e negociar",
      en: "Presenting and negotiating",
      de: "Präsentieren und verhandeln",
      fr: "Présenter et négocier",
      es: "Presentar y negociar",
      it: "Presentare e negoziare",
      ja: "プレゼンと交渉",
    },
    canDo: {
      pt: [
        "Consigo fazer uma apresentação clara e bem estruturada e responder às perguntas.",
        "Consigo negociar até chegar a um acordo, fazendo e pedindo concessões.",
        "Consigo acompanhar uma reunião de negócios e anotar o que cada lado quer.",
      ],
      en: [
        "I can give a clear, well-structured presentation and handle follow-up questions.",
        "I can negotiate towards an agreement, making and asking for concessions.",
        "I can follow a business meeting and note down what each side wants.",
      ],
      de: [
        "Ich kann eine klar gegliederte Präsentation halten und auf Rückfragen eingehen.",
        "Ich kann eine Einigung aushandeln, Zugeständnisse machen und welche einfordern.",
        "Ich kann einem geschäftlichen Gespräch folgen und festhalten, was jede Seite will.",
      ],
      fr: [
        "Je peux faire une présentation claire et structurée, puis répondre aux questions.",
        "Je peux négocier pour parvenir à un accord, en faisant et en demandant des concessions.",
        "Je peux suivre une réunion d'affaires et noter ce que veut chaque partie.",
      ],
      es: [
        "Puedo hacer una presentación clara y bien estructurada y responder a las preguntas.",
        "Puedo negociar hasta llegar a un acuerdo, haciendo y pidiendo concesiones.",
        "Puedo seguir una reunión de negocios y anotar qué quiere cada parte.",
      ],
      it: [
        "Riesco a tenere una presentazione chiara e strutturata e a rispondere alle domande.",
        "Riesco a negoziare fino a un accordo, facendo e chiedendo concessioni.",
        "Riesco a seguire una trattativa d'affari e annotare cosa vuole ciascuna parte.",
      ],
      ja: [
        "分かりやすく構成されたプレゼンテーションをして、質問に答えることができる。",
        "譲歩したり求めたりしながら、交渉して合意にたどり着くことができる。",
        "ビジネスの話し合いを聞いて、それぞれの側の要望を書き留めることができる。",
      ],
    },
  },

  // ───────────────────────────── C1 ─────────────────────────────
  "c1-01": {
    title: {
      pt: "A arte de convencer",
      en: "The art of persuasion",
      de: "Die Kunst der Überzeugung",
      fr: "L'art de convaincre",
      es: "El arte de convencer",
      it: "L'arte di convincere",
      ja: "説得の技術",
    },
    canDo: {
      pt: [
        "Consigo construir um argumento convincente, com razões e exemplos bem escolhidos.",
        "Consigo antecipar objeções e respondê-las de forma convincente, na hora.",
        "Consigo escrever um texto persuasivo bem estruturado e adaptado ao público.",
      ],
      en: [
        "I can build a persuasive argument with well-chosen reasons and examples.",
        "I can anticipate objections and answer them convincingly on the spot.",
        "I can write a well-structured persuasive text adapted to its audience.",
      ],
      de: [
        "Ich kann überzeugend argumentieren, mit gut gewählten Gründen und Beispielen.",
        "Ich kann Einwände vorwegnehmen und spontan überzeugend darauf antworten.",
        "Ich kann einen überzeugenden, klar gegliederten Text für meine Zielgruppe schreiben.",
      ],
      fr: [
        "Je peux bâtir un argumentaire convaincant, appuyé sur des exemples bien choisis.",
        "Je peux anticiper les objections et y répondre avec aplomb, sur le moment.",
        "Je peux rédiger un texte persuasif bien structuré et adapté à son public.",
      ],
      es: [
        "Puedo construir un argumento convincente con razones y ejemplos bien elegidos.",
        "Puedo anticipar objeciones y rebatirlas de forma convincente sobre la marcha.",
        "Puedo escribir un texto persuasivo bien estructurado y adaptado a su público.",
      ],
      it: [
        "Riesco a costruire un'argomentazione convincente, con ragioni ed esempi ben scelti.",
        "Riesco ad anticipare le obiezioni e a rispondere in modo convincente sul momento.",
        "Riesco a scrivere un testo persuasivo ben strutturato e adatto al suo pubblico.",
      ],
      ja: [
        "よく選んだ理由と例を使って、説得力のある主張を組み立てることができる。",
        "反論を予想して、その場で説得力をもって答えることができる。",
        "読み手に合わせて、構成のしっかりした説得力のある文章を書くことができる。",
      ],
    },
  },
  "c1-02": {
    title: {
      pt: "Nas entrelinhas",
      en: "Reading between the lines",
      de: "Zwischen den Zeilen",
      fr: "Lire entre les lignes",
      es: "Leer entre líneas",
      it: "Leggere tra le righe",
      ja: "行間を読む",
    },
    canDo: {
      pt: [
        "Consigo entender expressões idiomáticas e coloquiais e perceber mudanças de registro.",
        "Consigo captar sentidos implícitos, ironia e atitudes que não são ditas diretamente.",
        "Consigo acompanhar filmes e conversas reais, mesmo com fala rápida e gírias.",
      ],
      en: [
        "I can understand idioms and colloquial expressions and notice shifts in register.",
        "I can pick up implied meaning, irony and attitudes that aren't stated directly.",
        "I can follow films and real conversations, even with fast speech and slang.",
      ],
      de: [
        "Ich kann Redewendungen und Umgangssprache verstehen und Registerwechsel erkennen.",
        "Ich kann Zwischentöne, Ironie und unausgesprochene Haltungen erfassen.",
        "Ich kann Filmen und echten Gesprächen folgen, auch bei schnellem Tempo und Slang.",
      ],
      fr: [
        "Je peux comprendre les tournures idiomatiques et repérer les changements de registre.",
        "Je peux saisir les sous-entendus, l'ironie et les attitudes implicites.",
        "Je peux suivre des films et des conversations réelles malgré le débit rapide et l'argot.",
      ],
      es: [
        "Puedo entender expresiones idiomáticas y coloquiales y notar los cambios de registro.",
        "Puedo captar sentidos implícitos, ironía y actitudes que no se dicen abiertamente.",
        "Puedo seguir películas y conversaciones reales, aunque se hable rápido y con jerga.",
      ],
      it: [
        "Riesco a capire espressioni idiomatiche e colloquiali e a cogliere i cambi di registro.",
        "Riesco a cogliere sottintesi, ironia e atteggiamenti non espressi apertamente.",
        "Riesco a seguire film e conversazioni reali, anche se si parla in fretta e con slang.",
      ],
      ja: [
        "慣用句や話し言葉の表現を理解し、場面による言葉づかいの変化に気づくことができる。",
        "はっきり言われていない意図や皮肉、態度を読み取ることができる。",
        "速いスピードや俗語があっても、映画や実際の会話についていくことができる。",
      ],
    },
  },
  "c1-03": {
    title: {
      pt: "Das fontes à síntese",
      en: "From sources to synthesis",
      de: "Von Quellen zur Synthese",
      fr: "Des sources à la synthèse",
      es: "Sintetizar fuentes",
      it: "Dalle fonti alla sintesi",
      ja: "情報をまとめて書く",
    },
    canDo: {
      pt: [
        "Consigo ler vários textos longos e complexos e comparar seus argumentos.",
        "Consigo reunir ideias de fontes diferentes num só texto claro e bem estruturado.",
        "Consigo escrever um relatório citando as fontes, num tom acadêmico ou profissional.",
      ],
      en: [
        "I can read several long, complex texts and compare their arguments.",
        "I can bring ideas from different sources together in one clear, structured text.",
        "I can write a report that cites its sources, in an academic or professional style.",
      ],
      de: [
        "Ich kann mehrere lange, komplexe Texte lesen und ihre Argumente vergleichen.",
        "Ich kann Ideen aus mehreren Quellen zu einem klar gegliederten Text verbinden.",
        "Ich kann einen Bericht mit Quellenangaben in passendem Fachstil verfassen.",
      ],
      fr: [
        "Je peux lire plusieurs textes longs et complexes et comparer leurs arguments.",
        "Je peux réunir les idées de plusieurs sources dans un texte clair et bien structuré.",
        "Je peux rédiger un rapport citant ses sources, dans un style académique ou professionnel.",
      ],
      es: [
        "Puedo leer varios textos largos y complejos y comparar sus argumentos.",
        "Puedo reunir ideas de distintas fuentes en un solo texto claro y bien estructurado.",
        "Puedo redactar un informe que cite sus fuentes, con un estilo académico o profesional.",
      ],
      it: [
        "Riesco a leggere più testi lunghi e complessi e a confrontarne gli argomenti.",
        "Riesco a unire idee da fonti diverse in un unico testo chiaro e ben strutturato.",
        "Riesco a redigere una relazione con le fonti citate, in stile accademico o professionale.",
      ],
      ja: [
        "長く複雑な文章を複数読み、それぞれの主張を比べることができる。",
        "さまざまな情報源の考えを、一つの分かりやすく構成された文章にまとめることができる。",
        "出典を示しながら、学術的・専門的な文体で報告書を書くことができる。",
      ],
    },
  },
};

export default syllabus;
