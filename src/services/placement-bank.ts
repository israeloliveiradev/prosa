import type { CefrLevel } from "../types/database.js";
import type { StoredPlacementItem } from "../schemas/placement.js";

type Gloss = { pt: string; en: string };

interface BankSeed {
  id: string;
  band: CefrLevel;
  kind: "vocab" | "grammar" | "reading" | "listening";
  prompt: string;
  promptGloss?: Gloss;
  hint: Gloss;
  options: Gloss[] | [string, string, string, string];
  answer: number;
  audio?: string;
  passage?: string;
}

const HINT = {
  meaning: { pt: "Qual é o significado?", en: "What does this mean?" },
  gap: { pt: "Complete a frase.", en: "Complete the sentence." },
  read: { pt: "O que o texto diz?", en: "What does the text say?" },
  listen: { pt: "Ouça e escolha.", en: "Listen and choose." },
};

function gloss(pt: string, en: string): Gloss {
  return { pt, en };
}

function pickGloss(value: Gloss, through: string): string {
  return through === "en" ? value.en : value.pt;
}

function expand(seed: BankSeed, through: string): StoredPlacementItem {
  const options = Array.isArray(seed.options) && typeof seed.options[0] === "string"
    ? [...(seed.options as [string, string, string, string])]
    : (seed.options as Gloss[]).map((item) => pickGloss(item, through));
  return {
    id: seed.id,
    band: seed.band,
    kind: seed.kind,
    prompt: seed.promptGloss ? pickGloss(seed.promptGloss, through) : seed.prompt,
    hint: pickGloss(seed.hint, through),
    options,
    answer: seed.answer,
    ...(seed.audio ? { audio_text: seed.audio } : {}),
    ...(seed.passage ? { passage: seed.passage } : {}),
  };
}

const EN: BankSeed[] = [
  { id: "en-a1-1", band: "A1", kind: "vocab", prompt: "apple", hint: HINT.meaning, options: [gloss("maçã", "a fruit"), gloss("cadeira", "a chair"), gloss("janela", "a window"), gloss("cidade", "a city")], answer: 0 },
  { id: "en-a1-2", band: "A1", kind: "grammar", prompt: "I ____ a student.", hint: HINT.gap, options: ["am", "is", "are", "be"], answer: 0 },
  { id: "en-a1-3", band: "A1", kind: "reading", prompt: "This is my cat. It is small and white.", hint: HINT.read, options: [gloss("O gato é pequeno.", "The cat is small."), gloss("O gato é grande.", "The cat is big."), gloss("Não há gato.", "There is no cat."), gloss("O gato é preto.", "The cat is black.")], answer: 0 },
  { id: "en-a2-1", band: "A2", kind: "vocab", prompt: "yesterday", hint: HINT.meaning, options: [gloss("ontem", "the day before today"), gloss("amanhã", "the day after today"), gloss("sempre", "all the time"), gloss("nunca", "not at any time")], answer: 0 },
  { id: "en-a2-2", band: "A2", kind: "grammar", prompt: "She ____ to work by bus every day.", hint: HINT.gap, options: ["goes", "go", "going", "gone"], answer: 0 },
  { id: "en-a2-3", band: "A2", kind: "reading", prompt: "I usually cook dinner at home, but on Fridays we eat at a restaurant.", hint: HINT.read, options: [gloss("Na sexta eles comem fora.", "They eat out on Fridays."), gloss("Eles nunca cozinham.", "They never cook."), gloss("Eles só comem fora.", "They only eat out."), gloss("Eles trabalham no restaurante.", "They work at the restaurant.")], answer: 0 },
  { id: "en-b1-1", band: "B1", kind: "vocab", prompt: "although", hint: HINT.meaning, options: [gloss("embora", "even if"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "en-b1-2", band: "B1", kind: "grammar", prompt: "If I ____ more time, I would learn German.", hint: HINT.gap, options: ["had", "have", "has", "having"], answer: 0 },
  { id: "en-b1-3", band: "B1", kind: "reading", prompt: "The meeting was postponed because several people could not attend.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was delayed."), gloss("A reunião acabou cedo.", "The meeting ended early."), gloss("Todos compareceram.", "Everyone came."), gloss("A reunião foi cancelada para sempre.", "The meeting was cancelled forever.")], answer: 0 },
  { id: "en-b2-1", band: "B2", kind: "vocab", prompt: "nonetheless", hint: HINT.meaning, options: [gloss("mesmo assim", "even so"), gloss("portanto", "therefore"), gloss("antes", "before"), gloss("apenas", "only")], answer: 0 },
  { id: "en-b2-2", band: "B2", kind: "grammar", prompt: "The report ____ by the time the director arrived.", hint: HINT.gap, options: ["had been finished", "has finished", "was finishing", "is finished"], answer: 0 },
  { id: "en-b2-3", band: "B2", kind: "reading", prompt: "Despite initial scepticism, the policy led to a measurable drop in waste.", hint: HINT.read, options: [gloss("A política reduziu o desperdício.", "The policy reduced waste."), gloss("Ninguém acreditou e nada mudou.", "Nothing changed."), gloss("O desperdício aumentou.", "Waste increased."), gloss("A política foi abandonada.", "The policy was dropped.")], answer: 0 },
  { id: "en-c1-1", band: "C1", kind: "vocab", prompt: "to underscore", hint: HINT.meaning, options: [gloss("ressaltar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("esconder", "to hide")], answer: 0 },
  { id: "en-c1-2", band: "C1", kind: "grammar", prompt: "Had the data ____ earlier, the launch would have been delayed.", hint: HINT.gap, options: ["been available", "been availably", "being available", "be available"], answer: 0 },
  { id: "en-c1-3", band: "C1", kind: "reading", prompt: "The essay takes issue with the premise that growth and equity are mutually exclusive.", hint: HINT.read, options: [gloss("O texto discorda dessa premissa.", "The essay challenges that premise."), gloss("O texto aceita a premissa.", "The essay accepts the premise."), gloss("O texto não fala de crescimento.", "The essay ignores growth."), gloss("O texto só lista dados.", "The essay only lists data.")], answer: 0 },
  { id: "en-c2-1", band: "C2", kind: "vocab", prompt: "anodyne", hint: HINT.meaning, options: [gloss("inofensivo, sem arestas", "inoffensive, bland"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("hostil", "hostile")], answer: 0 },
  { id: "en-c2-2", band: "C2", kind: "grammar", prompt: "Little ____ that the footnote would recast the entire argument.", hint: HINT.gap, options: ["did they imagine", "they imagined", "they did imagine", "imagined they"], answer: 0 },
  { id: "en-c2-3", band: "C2", kind: "reading", prompt: "The critic's praise, lavish as it was, stopped short of endorsing the work's political conclusions.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without backing the politics."), gloss("Rejeitou a obra por completo.", "Rejected the work entirely."), gloss("Endossou as conclusões políticas.", "Endorsed the political conclusions."), gloss("Não falou da obra.", "Did not mention the work.")], answer: 0 },
];

const ES: BankSeed[] = [
  { id: "es-a1-1", band: "A1", kind: "vocab", prompt: "casa", hint: HINT.meaning, options: [gloss("casa, lar", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("carro", "car")], answer: 0 },
  { id: "es-a1-2", band: "A1", kind: "grammar", prompt: "Yo ____ estudiante.", hint: HINT.gap, options: ["soy", "es", "son", "eres"], answer: 0 },
  { id: "es-a1-3", band: "A1", kind: "reading", prompt: "Mi perro es grande y negro.", hint: HINT.read, options: [gloss("O cachorro é grande.", "The dog is big."), gloss("O cachorro é pequeno.", "The dog is small."), gloss("Não há cachorro.", "There is no dog."), gloss("O gato é preto.", "The cat is black.")], answer: 0 },
  { id: "es-a2-1", band: "A2", kind: "vocab", prompt: "ayer", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("sempre", "always")], answer: 0 },
  { id: "es-a2-2", band: "A2", kind: "grammar", prompt: "Ella ____ al trabajo en autobús.", hint: HINT.gap, options: ["va", "voy", "vamos", "van"], answer: 0 },
  { id: "es-a2-3", band: "A2", kind: "reading", prompt: "Los viernes comemos en un restaurante.", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Cozinham todos os dias.", "They cook every day."), gloss("Trabalham no restaurante.", "They work at the restaurant.")], answer: 0 },
  { id: "es-b1-1", band: "B1", kind: "vocab", prompt: "aunque", hint: HINT.meaning, options: [gloss("embora", "although"), gloss("porque", "because"), gloss("depois", "after"), gloss("antes", "before")], answer: 0 },
  { id: "es-b1-2", band: "B1", kind: "grammar", prompt: "Si ____ tiempo, aprendería alemán.", hint: HINT.gap, options: ["tuviera", "tengo", "tiene", "tener"], answer: 0 },
  { id: "es-b1-3", band: "B1", kind: "reading", prompt: "La reunión se aplazó porque faltaba gente.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone went."), gloss("Não havia reunião.", "There was no meeting.")], answer: 0 },
  { id: "es-b2-1", band: "B2", kind: "vocab", prompt: "sin embargo", hint: HINT.meaning, options: [gloss("no entanto", "however"), gloss("portanto", "therefore"), gloss("também", "also"), gloss("nunca", "never")], answer: 0 },
  { id: "es-b2-2", band: "B2", kind: "grammar", prompt: "El informe ya ____ cuando llegó el director.", hint: HINT.gap, options: ["había sido terminado", "ha terminado", "terminaba", "termina"], answer: 0 },
  { id: "es-b2-3", band: "B2", kind: "reading", prompt: "Pese al escepticismo, la medida redujo los residuos.", hint: HINT.read, options: [gloss("A medida funcionou.", "The measure worked."), gloss("Nada mudou.", "Nothing changed."), gloss("Os resíduos aumentaram.", "Waste increased."), gloss("A medida foi rejeitada.", "The measure was rejected.")], answer: 0 },
  { id: "es-c1-1", band: "C1", kind: "vocab", prompt: "poner de relieve", hint: HINT.meaning, options: [gloss("destacar", "to highlight"), gloss("esconder", "to hide"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "es-c1-2", band: "C1", kind: "grammar", prompt: "De ____ los datos antes, el lanzamiento se habría retrasado.", hint: HINT.gap, options: ["haberse dispuesto", "haber dispuesto se", "disponerse", "disponer"], answer: 0 },
  { id: "es-c1-3", band: "C1", kind: "reading", prompt: "El ensayo cuestiona que crecimiento y equidad se excluyan.", hint: HINT.read, options: [gloss("Discute essa ideia.", "It challenges that idea."), gloss("Aceita a ideia.", "It accepts the idea."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só lista números.", "It only lists numbers.")], answer: 0 },
  { id: "es-c2-1", band: "C2", kind: "vocab", prompt: "anodino", hint: HINT.meaning, options: [gloss("inofensivo, sem força", "bland, inoffensive"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("agressivo", "aggressive")], answer: 0 },
  { id: "es-c2-2", band: "C2", kind: "grammar", prompt: "Poco ____ que la nota a pie recosiera el argumento.", hint: HINT.gap, options: ["imaginaban", "imaginaron ellos poco", "ellos imaginan", "imaginado"], answer: 0 },
  { id: "es-c2-3", band: "C2", kind: "reading", prompt: "El elogio, por generoso que fuera, no respaldaba las tesis políticas.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without backing the politics."), gloss("Rejeitou a obra.", "Rejected the work."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não falou da obra.", "Did not mention the work.")], answer: 0 },
];

const DE: BankSeed[] = [
  { id: "de-a1-1", band: "A1", kind: "vocab", prompt: "Haus", hint: HINT.meaning, options: [gloss("casa", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("pão", "bread")], answer: 0 },
  { id: "de-a1-2", band: "A1", kind: "grammar", prompt: "Ich ____ Student.", hint: HINT.gap, options: ["bin", "ist", "sind", "seid"], answer: 0 },
  { id: "de-a1-3", band: "A1", kind: "reading", prompt: "Meine Katze ist klein und weiß.", hint: HINT.read, options: [gloss("A gata é pequena.", "The cat is small."), gloss("A gata é grande.", "The cat is big."), gloss("Não há gata.", "There is no cat."), gloss("O cão é branco.", "The dog is white.")], answer: 0 },
  { id: "de-a2-1", band: "A2", kind: "vocab", prompt: "gestern", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("nunca", "never")], answer: 0 },
  { id: "de-a2-2", band: "A2", kind: "grammar", prompt: "Sie ____ jeden Tag mit dem Bus zur Arbeit.", hint: HINT.gap, options: ["fährt", "fahre", "fahren", "fährst"], answer: 0 },
  { id: "de-a2-3", band: "A2", kind: "reading", prompt: "Freitags essen wir im Restaurant.", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Só cozinham.", "They only cook."), gloss("Trabalham lá.", "They work there.")], answer: 0 },
  { id: "de-b1-1", band: "B1", kind: "vocab", prompt: "obwohl", hint: HINT.meaning, options: [gloss("embora", "although"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "de-b1-2", band: "B1", kind: "grammar", prompt: "Wenn ich mehr Zeit ____, würde ich Deutsch lernen.", hint: HINT.gap, options: ["hätte", "habe", "hat", "haben"], answer: 0 },
  { id: "de-b1-3", band: "B1", kind: "reading", prompt: "Die Sitzung wurde verschoben, weil Leute fehlten.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone attended."), gloss("Não houve reunião.", "There was no meeting.")], answer: 0 },
  { id: "de-b2-1", band: "B2", kind: "vocab", prompt: "dennoch", hint: HINT.meaning, options: [gloss("mesmo assim", "nevertheless"), gloss("portanto", "therefore"), gloss("apenas", "only"), gloss("já", "already")], answer: 0 },
  { id: "de-b2-2", band: "B2", kind: "grammar", prompt: "Der Bericht ____, als der Chef ankam.", hint: HINT.gap, options: ["war schon fertiggestellt worden", "wird fertig", "ist fertig gewesen", "wurde fertig sein"], answer: 0 },
  { id: "de-b2-3", band: "B2", kind: "reading", prompt: "Trotz Skepsis senkte die Maßnahme den Abfall.", hint: HINT.read, options: [gloss("A medida reduziu o lixo.", "The measure reduced waste."), gloss("Nada mudou.", "Nothing changed."), gloss("O lixo aumentou.", "Waste increased."), gloss("A medida caiu.", "The measure failed.")], answer: 0 },
  { id: "de-c1-1", band: "C1", kind: "vocab", prompt: "hervorheben", hint: HINT.meaning, options: [gloss("destacar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "de-c1-2", band: "C1", kind: "grammar", prompt: "Wären die Daten früher ____, hätte man den Start verschoben.", hint: HINT.gap, options: ["verfügbar gewesen", "verfügbar sein", "verfügbar", "gewesen verfügbar"], answer: 0 },
  { id: "de-c1-3", band: "C1", kind: "reading", prompt: "Der Essay bestreitet, dass Wachstum und Gerechtigkeit sich ausschließen.", hint: HINT.read, options: [gloss("Questiona essa tese.", "It challenges that claim."), gloss("Aceita a tese.", "It accepts the claim."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só cita números.", "It only cites figures.")], answer: 0 },
  { id: "de-c2-1", band: "C2", kind: "vocab", prompt: "belanglos", hint: HINT.meaning, options: [gloss("irrelevante, sem peso", "inconsequential"), gloss("urgente", "urgent"), gloss("claro", "clear"), gloss("hostil", "hostile")], answer: 0 },
  { id: "de-c2-2", band: "C2", kind: "grammar", prompt: "Kaum ____, dass die Fußnote das Argument umkehrt.", hint: HINT.gap, options: ["ahnen sie", "sie ahnen kaum", "ahnten kaum sie", "ahnen"], answer: 0 },
  { id: "de-c2-3", band: "C2", kind: "reading", prompt: "Das Lob blieb hinter einer politischen Zustimmung zurück.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without political endorsement."), gloss("Rejeitou o texto.", "Rejected the text."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não comentou.", "Did not comment.")], answer: 0 },
];

const FR: BankSeed[] = [
  { id: "fr-a1-1", band: "A1", kind: "vocab", prompt: "maison", hint: HINT.meaning, options: [gloss("casa", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("pão", "bread")], answer: 0 },
  { id: "fr-a1-2", band: "A1", kind: "grammar", prompt: "Je ____ étudiant.", hint: HINT.gap, options: ["suis", "est", "sont", "es"], answer: 0 },
  { id: "fr-a1-3", band: "A1", kind: "reading", prompt: "Mon chat est petit et blanc.", hint: HINT.read, options: [gloss("O gato é pequeno.", "The cat is small."), gloss("O gato é grande.", "The cat is big."), gloss("Não há gato.", "There is no cat."), gloss("O cão é branco.", "The dog is white.")], answer: 0 },
  { id: "fr-a2-1", band: "A2", kind: "vocab", prompt: "hier", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("nunca", "never")], answer: 0 },
  { id: "fr-a2-2", band: "A2", kind: "grammar", prompt: "Elle ____ au travail en bus.", hint: HINT.gap, options: ["va", "vais", "allons", "vont"], answer: 0 },
  { id: "fr-a2-3", band: "A2", kind: "reading", prompt: "Le vendredi, nous mangeons au restaurant.", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Só cozinham.", "They only cook."), gloss("Trabalham lá.", "They work there.")], answer: 0 },
  { id: "fr-b1-1", band: "B1", kind: "vocab", prompt: "bien que", hint: HINT.meaning, options: [gloss("embora", "although"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "fr-b1-2", band: "B1", kind: "grammar", prompt: "Si j'____ plus de temps, j'apprendrais l'allemand.", hint: HINT.gap, options: ["avais", "ai", "a", "avoir"], answer: 0 },
  { id: "fr-b1-3", band: "B1", kind: "reading", prompt: "La réunion a été reportée faute de participants.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone came."), gloss("Não houve reunião.", "There was no meeting.")], answer: 0 },
  { id: "fr-b2-1", band: "B2", kind: "vocab", prompt: "néanmoins", hint: HINT.meaning, options: [gloss("mesmo assim", "nevertheless"), gloss("portanto", "therefore"), gloss("apenas", "only"), gloss("já", "already")], answer: 0 },
  { id: "fr-b2-2", band: "B2", kind: "grammar", prompt: "Le rapport ____ quand le directeur est arrivé.", hint: HINT.gap, options: ["avait déjà été terminé", "a terminé", "terminait", "est terminé été"], answer: 0 },
  { id: "fr-b2-3", band: "B2", kind: "reading", prompt: "Malgré le scepticisme, la mesure a réduit les déchets.", hint: HINT.read, options: [gloss("A medida reduziu o lixo.", "The measure reduced waste."), gloss("Nada mudou.", "Nothing changed."), gloss("O lixo aumentou.", "Waste increased."), gloss("A medida falhou.", "The measure failed.")], answer: 0 },
  { id: "fr-c1-1", band: "C1", kind: "vocab", prompt: "souligner", hint: HINT.meaning, options: [gloss("ressaltar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "fr-c1-2", band: "C1", kind: "grammar", prompt: "Si les données ____ plus tôt, le lancement aurait été retardé.", hint: HINT.gap, options: ["avaient été disponibles", "étaient disponible", "ont été disponibles", "seraient disponibles"], answer: 0 },
  { id: "fr-c1-3", band: "C1", kind: "reading", prompt: "L'essai conteste l'idée que croissance et équité s'excluent.", hint: HINT.read, options: [gloss("Questiona essa ideia.", "It challenges that idea."), gloss("Aceita a ideia.", "It accepts the idea."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só lista números.", "It only lists numbers.")], answer: 0 },
  { id: "fr-c2-1", band: "C2", kind: "vocab", prompt: "anodin", hint: HINT.meaning, options: [gloss("inofensivo, sem força", "bland, inoffensive"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("hostil", "hostile")], answer: 0 },
  { id: "fr-c2-2", band: "C2", kind: "grammar", prompt: "Peu ____ que la note de bas de page recadre l'argument.", hint: HINT.gap, options: ["se doutaient-ils", "ils se doutaient peu", "doutaient-ils se", "se douter"], answer: 0 },
  { id: "fr-c2-3", band: "C2", kind: "reading", prompt: "L'éloge, généreux, s'arrêtait avant l'adhésion politique.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without political backing."), gloss("Rejeitou o texto.", "Rejected the text."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não comentou.", "Did not comment.")], answer: 0 },
];

const IT: BankSeed[] = [
  { id: "it-a1-1", band: "A1", kind: "vocab", prompt: "casa", hint: HINT.meaning, options: [gloss("casa, lar", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("pão", "bread")], answer: 0 },
  { id: "it-a1-2", band: "A1", kind: "grammar", prompt: "Io ____ studente.", hint: HINT.gap, options: ["sono", "è", "sono io", "sei"], answer: 0 },
  { id: "it-a1-3", band: "A1", kind: "reading", prompt: "Il mio gatto è piccolo e bianco.", hint: HINT.read, options: [gloss("O gato é pequeno.", "The cat is small."), gloss("O gato é grande.", "The cat is big."), gloss("Não há gato.", "There is no cat."), gloss("O cão é branco.", "The dog is white.")], answer: 0 },
  { id: "it-a2-1", band: "A2", kind: "vocab", prompt: "ieri", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("nunca", "never")], answer: 0 },
  { id: "it-a2-2", band: "A2", kind: "grammar", prompt: "Lei ____ al lavoro in autobus.", hint: HINT.gap, options: ["va", "vado", "andiamo", "vanno"], answer: 0 },
  { id: "it-a2-3", band: "A2", kind: "reading", prompt: "Il venerdì mangiamo al ristorante.", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Só cozinham.", "They only cook."), gloss("Trabalham lá.", "They work there.")], answer: 0 },
  { id: "it-b1-1", band: "B1", kind: "vocab", prompt: "sebbene", hint: HINT.meaning, options: [gloss("embora", "although"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "it-b1-2", band: "B1", kind: "grammar", prompt: "Se ____ più tempo, imparerei il tedesco.", hint: HINT.gap, options: ["avessi", "ho", "ha", "avere"], answer: 0 },
  { id: "it-b1-3", band: "B1", kind: "reading", prompt: "La riunione è stata rinviata perché mancava gente.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone came."), gloss("Não houve reunião.", "There was no meeting.")], answer: 0 },
  { id: "it-b2-1", band: "B2", kind: "vocab", prompt: "tuttavia", hint: HINT.meaning, options: [gloss("no entanto", "however"), gloss("portanto", "therefore"), gloss("também", "also"), gloss("nunca", "never")], answer: 0 },
  { id: "it-b2-2", band: "B2", kind: "grammar", prompt: "Il rapporto ____ quando è arrivato il direttore.", hint: HINT.gap, options: ["era già stato finito", "ha finito", "finiva", "è finito stato"], answer: 0 },
  { id: "it-b2-3", band: "B2", kind: "reading", prompt: "Nonostante lo scetticismo, la misura ha ridotto i rifiuti.", hint: HINT.read, options: [gloss("A medida reduziu o lixo.", "The measure reduced waste."), gloss("Nada mudou.", "Nothing changed."), gloss("O lixo aumentou.", "Waste increased."), gloss("A medida falhou.", "The measure failed.")], answer: 0 },
  { id: "it-c1-1", band: "C1", kind: "vocab", prompt: "sottolineare", hint: HINT.meaning, options: [gloss("ressaltar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "it-c1-2", band: "C1", kind: "grammar", prompt: "Se i dati ____ prima, il lancio sarebbe slittato.", hint: HINT.gap, options: ["fossero stati disponibili", "erano disponibile", "sono stati disponibili", "sarebbero disponibili"], answer: 0 },
  { id: "it-c1-3", band: "C1", kind: "reading", prompt: "Il saggio contesta che crescita ed equità si escludano.", hint: HINT.read, options: [gloss("Questiona essa ideia.", "It challenges that idea."), gloss("Aceita a ideia.", "It accepts the idea."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só lista números.", "It only lists numbers.")], answer: 0 },
  { id: "it-c2-1", band: "C2", kind: "vocab", prompt: "anodino", hint: HINT.meaning, options: [gloss("inofensivo, sem força", "bland, inoffensive"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("hostil", "hostile")], answer: 0 },
  { id: "it-c2-2", band: "C2", kind: "grammar", prompt: "Poco ____ che la nota a pie' di pagina ribaltasse l'argomento.", hint: HINT.gap, options: ["immaginavano", "immaginarono poco essi", "essi immaginano", "immaginato"], answer: 0 },
  { id: "it-c2-3", band: "C2", kind: "reading", prompt: "L'elogio, per quanto generoso, non avallava le tesi politiche.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without political backing."), gloss("Rejeitou o texto.", "Rejected the text."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não comentou.", "Did not comment.")], answer: 0 },
];

const RU: BankSeed[] = [
  { id: "ru-a1-1", band: "A1", kind: "vocab", prompt: "дом", hint: HINT.meaning, options: [gloss("casa", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("pão", "bread")], answer: 0 },
  { id: "ru-a1-2", band: "A1", kind: "grammar", prompt: "Я ____ студент.", hint: HINT.gap, options: ["—", "есть", "быть", "это"], answer: 0 },
  { id: "ru-a1-3", band: "A1", kind: "reading", prompt: "Моя кошка маленькая и белая.", hint: HINT.read, options: [gloss("A gata é pequena.", "The cat is small."), gloss("A gata é grande.", "The cat is big."), gloss("Não há gata.", "There is no cat."), gloss("O cão é branco.", "The dog is white.")], answer: 0 },
  { id: "ru-a2-1", band: "A2", kind: "vocab", prompt: "вчера", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("nunca", "never")], answer: 0 },
  { id: "ru-a2-2", band: "A2", kind: "grammar", prompt: "Она ____ на работу на автобусе.", hint: HINT.gap, options: ["ездит", "езжу", "ездим", "ездите"], answer: 0 },
  { id: "ru-a2-3", band: "A2", kind: "reading", prompt: "По пятницам мы едим в ресторане.", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Só cozinham.", "They only cook."), gloss("Trabalham lá.", "They work there.")], answer: 0 },
  { id: "ru-b1-1", band: "B1", kind: "vocab", prompt: "хотя", hint: HINT.meaning, options: [gloss("embora", "although"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "ru-b1-2", band: "B1", kind: "grammar", prompt: "Если бы у меня ____ больше времени, я бы учил немецкий.", hint: HINT.gap, options: ["было", "есть", "будет", "быть"], answer: 0 },
  { id: "ru-b1-3", band: "B1", kind: "reading", prompt: "Встречу перенесли, потому что людей не хватало.", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone came."), gloss("Não houve reunião.", "There was no meeting.")], answer: 0 },
  { id: "ru-b2-1", band: "B2", kind: "vocab", prompt: "тем не менее", hint: HINT.meaning, options: [gloss("mesmo assim", "nevertheless"), gloss("portanto", "therefore"), gloss("apenas", "only"), gloss("já", "already")], answer: 0 },
  { id: "ru-b2-2", band: "B2", kind: "grammar", prompt: "Отчёт ____ к приходу директора.", hint: HINT.gap, options: ["уже был закончен", "закончил", "заканчивал", "закончен будет"], answer: 0 },
  { id: "ru-b2-3", band: "B2", kind: "reading", prompt: "Несмотря на скепсис, мера снизила отходы.", hint: HINT.read, options: [gloss("A medida reduziu o lixo.", "The measure reduced waste."), gloss("Nada mudou.", "Nothing changed."), gloss("O lixo aumentou.", "Waste increased."), gloss("A medida falhou.", "The measure failed.")], answer: 0 },
  { id: "ru-c1-1", band: "C1", kind: "vocab", prompt: "подчеркнуть", hint: HINT.meaning, options: [gloss("ressaltar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "ru-c1-2", band: "C1", kind: "grammar", prompt: "Будь данные ____ раньше, запуск бы отложили.", hint: HINT.gap, options: ["доступны", "доступный", "доступными были бы", "доступен"], answer: 0 },
  { id: "ru-c1-3", band: "C1", kind: "reading", prompt: "Эссе оспаривает, что рост и справедливость исключают друг друга.", hint: HINT.read, options: [gloss("Questiona essa tese.", "It challenges that claim."), gloss("Aceita a tese.", "It accepts the claim."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só cita números.", "It only cites figures.")], answer: 0 },
  { id: "ru-c2-1", band: "C2", kind: "vocab", prompt: "безобидный", hint: HINT.meaning, options: [gloss("inofensivo", "inoffensive"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("hostil", "hostile")], answer: 0 },
  { id: "ru-c2-2", band: "C2", kind: "grammar", prompt: "Едва ли ____, что сноска перевернёт довод.", hint: HINT.gap, options: ["они представляли", "представляли они едва", "они представляют", "представить"], answer: 0 },
  { id: "ru-c2-3", band: "C2", kind: "reading", prompt: "Похвала, сколь щедрой ни была, не означала политической поддержки.", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without political backing."), gloss("Rejeitou o texto.", "Rejected the text."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não comentou.", "Did not comment.")], answer: 0 },
];

const JA: BankSeed[] = [
  { id: "ja-a1-1", band: "A1", kind: "vocab", prompt: "いえ", hint: HINT.meaning, options: [gloss("casa", "house"), gloss("cão", "dog"), gloss("livro", "book"), gloss("pão", "bread")], answer: 0 },
  { id: "ja-a1-2", band: "A1", kind: "grammar", prompt: "わたしは がくせい ____。", hint: HINT.gap, options: ["です", "ます", "だね", "いる"], answer: 0 },
  { id: "ja-a1-3", band: "A1", kind: "reading", prompt: "ねこは ちいさいです。しろいです。", hint: HINT.read, options: [gloss("O gato é pequeno.", "The cat is small."), gloss("O gato é grande.", "The cat is big."), gloss("Não há gato.", "There is no cat."), gloss("O cão é branco.", "The dog is white.")], answer: 0 },
  { id: "ja-a2-1", band: "A2", kind: "vocab", prompt: "きのう", hint: HINT.meaning, options: [gloss("ontem", "yesterday"), gloss("amanhã", "tomorrow"), gloss("hoje", "today"), gloss("nunca", "never")], answer: 0 },
  { id: "ja-a2-2", band: "A2", kind: "grammar", prompt: "かのじょは まいにち バスで かいしゃに ____。", hint: HINT.gap, options: ["いきます", "いきました", "いって", "いく"], answer: 0 },
  { id: "ja-a2-3", band: "A2", kind: "reading", prompt: "きんようびは レストランで たべます。", hint: HINT.read, options: [gloss("Na sexta comem fora.", "They eat out on Fridays."), gloss("Nunca comem.", "They never eat."), gloss("Só cozinham.", "They only cook."), gloss("Trabalham lá.", "They work there.")], answer: 0 },
  { id: "ja-b1-1", band: "B1", kind: "vocab", prompt: "けれども", hint: HINT.meaning, options: [gloss("mas / embora", "but / although"), gloss("porque", "because"), gloss("depois", "after"), gloss("durante", "during")], answer: 0 },
  { id: "ja-b1-2", band: "B1", kind: "grammar", prompt: "じかんが もっと ____、ドイツごを べんきょうします。", hint: HINT.gap, options: ["あれば", "ある", "あった", "あって"], answer: 0 },
  { id: "ja-b1-3", band: "B1", kind: "reading", prompt: "人が たりなかったので、会議は えんきされました。", hint: HINT.read, options: [gloss("A reunião foi adiada.", "The meeting was postponed."), gloss("A reunião acabou.", "The meeting ended."), gloss("Todos foram.", "Everyone came."), gloss("Não houve reunião.", "There was no meeting.")], answer: 0 },
  { id: "ja-b2-1", band: "B2", kind: "vocab", prompt: "しかしながら", hint: HINT.meaning, options: [gloss("no entanto", "however"), gloss("portanto", "therefore"), gloss("também", "also"), gloss("nunca", "never")], answer: 0 },
  { id: "ja-b2-2", band: "B2", kind: "grammar", prompt: "部長が 来たとき、レポートは もう ____。", hint: HINT.gap, options: ["終わっていました", "終わります", "終わっています", "終わったです"], answer: 0 },
  { id: "ja-b2-3", band: "B2", kind: "reading", prompt: "疑いがあったが、その対策は ごみを へらした。", hint: HINT.read, options: [gloss("A medida reduziu o lixo.", "The measure reduced waste."), gloss("Nada mudou.", "Nothing changed."), gloss("O lixo aumentou.", "Waste increased."), gloss("A medida falhou.", "The measure failed.")], answer: 0 },
  { id: "ja-c1-1", band: "C1", kind: "vocab", prompt: "強調する", hint: HINT.meaning, options: [gloss("ressaltar", "to emphasize"), gloss("apagar", "to erase"), gloss("adiar", "to postpone"), gloss("negar", "to deny")], answer: 0 },
  { id: "ja-c1-2", band: "C1", kind: "grammar", prompt: "データが もっと早く ____、発表は 延びていただろう。", hint: HINT.gap, options: ["分かっていれば", "分かる", "分かった", "分かって"], answer: 0 },
  { id: "ja-c1-3", band: "C1", kind: "reading", prompt: "この論考は、成長と公平が両立しないという前提に異を唱える。", hint: HINT.read, options: [gloss("Questiona essa premissa.", "It challenges that premise."), gloss("Aceita a premissa.", "It accepts the premise."), gloss("Ignora o crescimento.", "It ignores growth."), gloss("Só lista números.", "It only lists numbers.")], answer: 0 },
  { id: "ja-c2-1", band: "C2", kind: "vocab", prompt: "無難", hint: HINT.meaning, options: [gloss("inofensivo, sem risco", "safe, inoffensive"), gloss("urgente", "urgent"), gloss("obscuro", "obscure"), gloss("hostil", "hostile")], answer: 0 },
  { id: "ja-c2-2", band: "C2", kind: "grammar", prompt: "脚注が 議論を 覆すとは、____ 思っていなかった。", hint: HINT.gap, options: ["とうてい", "たぶん", "きっと", "ぜひ"], answer: 0 },
  { id: "ja-c2-3", band: "C2", kind: "reading", prompt: "賛辞は厚かったが、政治的結論までは踏み込まなかった。", hint: HINT.read, options: [gloss("Elogiou sem endossar a política.", "Praised it without backing the politics."), gloss("Rejeitou o texto.", "Rejected the text."), gloss("Endossou a política.", "Endorsed the politics."), gloss("Não comentou.", "Did not comment.")], answer: 0 },
];

const LISTEN: Record<string, BankSeed[]> = {
  en: [
    { id: "en-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "The shop closes at seven.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "en-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "The meeting moved to Friday because the room was busy on Thursday.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  es: [
    { id: "es-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas fecha a loja?", "What time does the shop close?"), hint: HINT.listen, audio: "La tienda cierra a las siete.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "es-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "La reunión pasó al viernes porque la sala estaba ocupada el jueves.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  de: [
    { id: "de-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "Der Laden schließt um sieben.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "de-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "Das Treffen ist auf Freitag verschoben, weil der Raum am Donnerstag besetzt war.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  fr: [
    { id: "fr-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "Le magasin ferme à sept heures.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "fr-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "La réunion est passée à vendredi parce que la salle était prise jeudi.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  it: [
    { id: "it-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "Il negozio chiude alle sette.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "it-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "La riunione è passata a venerdì perché la sala era occupata giovedì.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  ru: [
    { id: "ru-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "Магазин закрывается в семь.", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "ru-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "Встречу перенесли на пятницу, потому что в четверг зал был занят.", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
  ja: [
    { id: "ja-a2-l1", band: "A2", kind: "listening", prompt: "", promptGloss: gloss("A que horas a loja fecha?", "What time does the shop close?"), hint: HINT.listen, audio: "店は七時に閉まります。", options: [gloss("Às sete.", "At seven."), gloss("Às nove.", "At nine."), gloss("Ao meio-dia.", "At noon."), gloss("Não fecha.", "It never closes.")], answer: 0 },
    { id: "ja-b1-l1", band: "B1", kind: "listening", prompt: "", promptGloss: gloss("Por que a reunião mudou?", "Why did the meeting change?"), hint: HINT.listen, audio: "木曜日は部屋がふさがっていたので、会議は金曜日になりました。", options: [gloss("A sala estava ocupada.", "The room was busy."), gloss("O diretor viajou.", "The director travelled."), gloss("Ninguém confirmou.", "Nobody confirmed."), gloss("A reunião foi cancelada.", "The meeting was cancelled.")], answer: 0 },
  ],
};

const BANKS: Record<string, BankSeed[]> = { en: EN, es: ES, de: DE, fr: FR, it: IT, ru: RU, ja: JA };

function fisherYates<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) {
      continue;
    }
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

export function shufflePlacementItem(item: StoredPlacementItem): StoredPlacementItem {
  const order = fisherYates([0, 1, 2, 3]);
  return {
    ...item,
    options: order.map((index) => item.options[index] ?? item.options[0] ?? ""),
    answer: order.indexOf(item.answer),
  };
}

export function catalogPlacementItems(targetLang: string, throughLang: string): StoredPlacementItem[] {
  const seeds = [...(BANKS[targetLang] ?? []), ...(LISTEN[targetLang] ?? [])];
  return seeds.map((item) => expand(item, throughLang));
}

export function bankPlacementItems(targetLang: string, throughLang: string, excludeIds: string[] = []): StoredPlacementItem[] {
  const seeds = BANKS[targetLang] ?? EN;
  const blocked = new Set(excludeIds);
  const chosen = seeds.filter((item) => !blocked.has(item.id));
  const source = chosen.length >= 12 ? chosen : seeds;
  return fisherYates(source.map((item) => shufflePlacementItem(expand(item, throughLang))));
}
