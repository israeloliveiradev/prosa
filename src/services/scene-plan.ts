/**
 * Cenas de conversa do M3: uma do objetivo da conta, uma da unidade ativa da trilha e uma
 * dos temas do aluno. A IA escreve as cenas no idioma de interface; quando ela falha, o
 * servidor devolve as cenas fixas abaixo (por tipo de objetivo) com `source: "fallback"`.
 */
import type { Scene, SceneKind } from "../schemas/persona.js";
import type { UiLocale } from "../curriculum/types.js";

export const GOAL_KINDS = ["career", "travel", "studies", "culture", "family", "relocation"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

/** [title, setting, learner_role, partner_role, objective] */
type SceneText = readonly [string, string, string, string, string];

const GOAL_SCENES: Record<GoalKind, Record<UiLocale, SceneText>> = {
  career: {
    pt: ["Entrevista de emprego", "Uma videochamada com uma empresa que tem uma vaga na sua área.", "Candidato(a) à vaga", "Recrutadora da empresa", "Apresentar sua experiência e perguntar sobre a vaga."],
    en: ["Job interview", "A video call with a company that has an opening in your field.", "Job candidate", "Company recruiter", "Present your experience and ask about the role."],
    de: ["Vorstellungsgespräch", "Ein Videocall mit einer Firma, die eine passende Stelle anbietet.", "Bewerber(in)", "Recruiterin der Firma", "Die eigene Erfahrung vorstellen und Fragen zur Stelle stellen."],
    fr: ["Entretien d'embauche", "Un appel vidéo avec une entreprise qui recrute dans votre domaine.", "Candidat(e)", "Recruteuse de l'entreprise", "Présenter votre expérience et poser des questions sur le poste."],
    es: ["Entrevista de trabajo", "Una videollamada con una empresa que tiene una vacante en tu área.", "Candidato(a)", "Reclutadora de la empresa", "Presentar tu experiencia y preguntar por el puesto."],
    it: ["Colloquio di lavoro", "Una videochiamata con un'azienda che cerca qualcuno nel tuo settore.", "Candidato/a", "Selezionatrice dell'azienda", "Presentare la tua esperienza e fare domande sul ruolo."],
    ja: ["就職の面接", "あなたの分野で人を募集している会社とのビデオ通話。", "応募者", "会社の採用担当者", "自分の経験を伝えて、仕事について質問する。"],
  },
  travel: {
    pt: ["Check-in no hotel", "A recepção de um hotel no fim da tarde, depois de uma viagem longa.", "Hóspede", "Recepcionista do hotel", "Fazer o check-in e pedir uma dica sobre a cidade."],
    en: ["Hotel check-in", "A hotel front desk in the late afternoon, after a long trip.", "Guest", "Hotel receptionist", "Check in and ask for a tip about the city."],
    de: ["Check-in im Hotel", "Die Rezeption eines Hotels am späten Nachmittag, nach einer langen Reise.", "Gast", "Rezeptionist(in) des Hotels", "Einchecken und nach einem Tipp für die Stadt fragen."],
    fr: ["Arrivée à l'hôtel", "La réception d'un hôtel en fin d'après-midi, après un long voyage.", "Client(e) de l'hôtel", "Réceptionniste", "Faire votre enregistrement et demander un conseil sur la ville."],
    es: ["Check-in en el hotel", "La recepción de un hotel a última hora de la tarde, después de un viaje largo.", "Huésped", "Recepcionista del hotel", "Hacer el check-in y pedir un consejo sobre la ciudad."],
    it: ["Check-in in hotel", "La reception di un hotel nel tardo pomeriggio, dopo un lungo viaggio.", "Ospite", "Receptionist dell'hotel", "Fare il check-in e chiedere un consiglio sulla città."],
    ja: ["ホテルのチェックイン", "長い旅のあと、夕方のホテルのフロント。", "宿泊客", "ホテルのフロント係", "チェックインをして、町のおすすめを聞く。"],
  },
  studies: {
    pt: ["Conversa com o professor", "O horário de atendimento de um professor na universidade.", "Estudante", "Professor(a) da disciplina", "Explicar uma dúvida sobre o trabalho e combinar o próximo passo."],
    en: ["Talking to your professor", "A professor's office hours at the university.", "Student", "Course professor", "Explain a question about your assignment and agree on the next step."],
    de: ["Sprechstunde", "Die Sprechstunde einer Professorin an der Universität.", "Student(in)", "Professorin des Kurses", "Eine Frage zur Hausarbeit erklären und den nächsten Schritt vereinbaren."],
    fr: ["Rendez-vous avec le professeur", "La permanence d'un professeur à l'université.", "Étudiant(e)", "Professeur du cours", "Expliquer votre question sur le devoir et convenir de la suite."],
    es: ["Tutoría con el profesor", "El horario de tutoría de un profesor en la universidad.", "Estudiante", "Profesor(a) de la asignatura", "Explicar una duda sobre el trabajo y acordar el siguiente paso."],
    it: ["Ricevimento del professore", "L'orario di ricevimento di un professore all'università.", "Studente/ssa", "Professore del corso", "Spiegare un dubbio sulla tesina e concordare il passo successivo."],
    ja: ["先生との面談", "大学の先生のオフィスアワー。", "学生", "授業の先生", "課題についての質問を説明して、次にすることを決める。"],
  },
  culture: {
    pt: ["Visita ao museu", "A bilheteria de um museu num sábado de manhã.", "Visitante", "Guia do museu", "Comprar a entrada e perguntar o que vale a pena ver."],
    en: ["A museum visit", "The ticket desk of a museum on a Saturday morning.", "Visitor", "Museum guide", "Buy a ticket and ask what is worth seeing."],
    de: ["Im Museum", "Die Kasse eines Museums an einem Samstagmorgen.", "Besucher(in)", "Museumsführer(in)", "Eine Eintrittskarte kaufen und fragen, was sich lohnt."],
    fr: ["Visite au musée", "La billetterie d'un musée un samedi matin.", "Visiteur ou visiteuse", "Guide du musée", "Acheter votre billet et demander ce qu'il faut voir."],
    es: ["Visita al museo", "La taquilla de un museo un sábado por la mañana.", "Visitante", "Guía del museo", "Comprar la entrada y preguntar qué vale la pena ver."],
    it: ["Visita al museo", "La biglietteria di un museo un sabato mattina.", "Visitatore/visitatrice", "Guida del museo", "Comprare il biglietto e chiedere cosa vale la pena vedere."],
    ja: ["美術館へ行く", "土曜日の朝、美術館のチケット売り場。", "来館者", "美術館のガイド", "チケットを買って、見るべきものを聞く。"],
  },
  family: {
    pt: ["Jantar em família", "Um jantar na casa de uma família que fala o idioma.", "Convidado(a)", "Anfitriã da família", "Agradecer o convite, falar um pouco de você e perguntar sobre a família."],
    en: ["Family dinner", "Dinner at the home of a family who speaks the language.", "Guest", "Host of the family", "Thank them for the invitation, talk a little about yourself and ask about the family."],
    de: ["Abendessen mit der Familie", "Ein Abendessen bei einer Familie, die die Sprache spricht.", "Gast", "Gastgeberin der Familie", "Sich für die Einladung bedanken, etwas von sich erzählen und nach der Familie fragen."],
    fr: ["Dîner en famille", "Un dîner chez une famille qui parle la langue.", "Invité(e)", "Hôtesse de la famille", "Remercier pour l'invitation, parler un peu de vous et poser des questions sur la famille."],
    es: ["Cena en familia", "Una cena en casa de una familia que habla el idioma.", "Invitado(a)", "Anfitriona de la familia", "Agradecer la invitación, hablar un poco de ti y preguntar por la familia."],
    it: ["Cena in famiglia", "Una cena a casa di una famiglia che parla la lingua.", "Ospite", "Padrona di casa", "Ringraziare per l'invito, parlare un po' di te e fare domande sulla famiglia."],
    ja: ["家族との夕食", "その言葉を話す家族の家での夕食。", "お客さん", "家族のホスト", "招待のお礼を言って、自分のことを少し話し、家族について質問する。"],
  },
  relocation: {
    pt: ["Alugar um apartamento", "A visita a um apartamento para alugar na nova cidade.", "Futuro(a) inquilino(a)", "Corretor(a) de imóveis", "Perguntar sobre o aluguel, as contas e a data de mudança."],
    en: ["Renting a flat", "Viewing a flat to rent in your new city.", "Future tenant", "Letting agent", "Ask about the rent, the bills and the move-in date."],
    de: ["Eine Wohnung mieten", "Eine Wohnungsbesichtigung in der neuen Stadt.", "Künftige(r) Mieter(in)", "Makler(in)", "Nach Miete, Nebenkosten und Einzugstermin fragen."],
    fr: ["Louer un appartement", "La visite d'un appartement à louer dans votre nouvelle ville.", "Futur(e) locataire", "Agent immobilier", "Poser des questions sur le loyer, les charges et la date d'emménagement."],
    es: ["Alquilar un piso", "La visita a un piso de alquiler en tu nueva ciudad.", "Futuro(a) inquilino(a)", "Agente inmobiliario", "Preguntar por el alquiler, los gastos y la fecha de mudanza."],
    it: ["Affittare un appartamento", "La visita a un appartamento in affitto nella tua nuova città.", "Futuro/a inquilino/a", "Agente immobiliare", "Chiedere dell'affitto, delle spese e della data di trasloco."],
    ja: ["部屋を借りる", "新しい町で、賃貸の部屋を見に行く。", "入居希望者", "不動産屋さん", "家賃、光熱費、入居日について質問する。"],
  },
};

/** [setting com {title}, learner_role, partner_role, objective quando a unidade não tem meta] */
const UNIT_SCENE: Record<UiLocale, readonly [string, string, string, string]> = {
  pt: ["Uma conversa do dia a dia para praticar a unidade “{title}”.", "Você", "Parceiro(a) de conversa", "Usar o que a unidade pratica numa conversa curta."],
  en: ["An everyday conversation to practise the unit “{title}”.", "You", "Conversation partner", "Use what the unit practises in a short conversation."],
  de: ["Ein Alltagsgespräch zur Einheit „{title}“.", "Lernende(r)", "Gesprächspartner(in)", "Das, was die Einheit übt, in einem kurzen Gespräch anwenden."],
  fr: ["Une conversation du quotidien pour pratiquer l'unité « {title} ».", "Vous", "Partenaire de conversation", "Utiliser ce que l'unité fait pratiquer dans une courte conversation."],
  es: ["Una conversación cotidiana para practicar la unidad «{title}».", "Tú", "Compañero(a) de conversación", "Usar lo que practica la unidad en una conversación corta."],
  it: ["Una conversazione quotidiana per praticare l'unità «{title}».", "Tu", "Partner di conversazione", "Usare ciò che l'unità fa praticare in una breve conversazione."],
  ja: ["ユニット「{title}」を練習する日常の会話。", "あなた", "会話の相手", "ユニットで練習することを短い会話で使う。"],
};

/** [title, setting, learner_role, partner_role, objective], com {label} = o tema. */
const INTEREST_SCENE: Record<UiLocale, SceneText> = {
  pt: ["Conversa sobre {label}", "Um encontro de pessoas interessadas em {label}.", "Participante", "Outra participante", "Contar por que esse tema te interessa e perguntar a opinião da outra pessoa."],
  en: ["Talking about {label}", "A meetup for people who enjoy {label}.", "Participant", "Another participant", "Say why the topic interests you and ask for the other person's view."],
  de: ["Gespräch über {label}", "Ein Treffen von Leuten, die sich für {label} interessieren.", "Teilnehmer(in)", "Andere Teilnehmerin", "Erzählen, warum das Thema spannend ist, und nach der Meinung der anderen Person fragen."],
  fr: ["Sujet : {label}", "Une rencontre autour du thème « {label} ».", "Participant(e)", "Une autre participante", "Dire pourquoi ce thème vous intéresse et demander l'avis de l'autre personne."],
  es: ["Tema: {label}", "Un encuentro sobre el tema «{label}».", "Participante", "Otra participante", "Contar por qué te interesa este tema y preguntar la opinión de la otra persona."],
  it: ["Parliamo di {label}", "Un incontro tra persone appassionate di {label}.", "Partecipante", "Un'altra partecipante", "Raccontare perché ti interessa questo tema e chiedere l'opinione dell'altra persona."],
  ja: ["{label}について話す", "{label}が好きな人たちの集まり。", "参加者", "ほかの参加者", "このテーマに興味がある理由を話して、相手の意見を聞く。"],
};

/** Rótulo dos temas conhecidos (as chaves dobradas são as mesmas de news-feed.ts). */
const INTEREST_LABELS: Record<string, Record<UiLocale, string>> = {
  "tecnologia e ia": { pt: "tecnologia e IA", en: "technology and AI", de: "Technik und KI", fr: "technologie et IA", es: "tecnología e IA", it: "tecnologia e IA", ja: "テクノロジーとAI" },
  ciencia: { pt: "ciência", en: "science", de: "Wissenschaft", fr: "science", es: "ciencia", it: "scienza", ja: "科学" },
  negocios: { pt: "negócios", en: "business", de: "Wirtschaft", fr: "affaires", es: "negocios", it: "affari", ja: "ビジネス" },
  viagens: { pt: "viagens", en: "travel", de: "Reisen", fr: "voyages", es: "viajes", it: "viaggi", ja: "旅行" },
  filosofia: { pt: "filosofia", en: "philosophy", de: "Philosophie", fr: "philosophie", es: "filosofía", it: "filosofia", ja: "哲学" },
  "cultura pop": { pt: "cultura pop", en: "pop culture", de: "Popkultur", fr: "culture pop", es: "cultura pop", it: "cultura pop", ja: "ポップカルチャー" },
  cozinha: { pt: "culinária", en: "cooking", de: "Kochen", fr: "cuisine", es: "cocina", it: "cucina", ja: "料理" },
  musica: { pt: "música", en: "music", de: "Musik", fr: "musique", es: "música", it: "musica", ja: "音楽" },
};

const EVERYDAY_LABEL: Record<UiLocale, string> = {
  pt: "temas do dia a dia",
  en: "everyday topics",
  de: "Alltagsthemen",
  fr: "vie quotidienne",
  es: "vida cotidiana",
  it: "vita quotidiana",
  ja: "日常の話題",
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string): string {
  return fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isGoalKind(value: string | null | undefined): value is GoalKind {
  return typeof value === "string" && (GOAL_KINDS as readonly string[]).includes(value);
}

/** Rótulo do tema no idioma de interface: tabela para os temas conhecidos, o texto do aluno nos outros. */
export function interestLabel(interest: string | null | undefined, locale: UiLocale): string {
  const raw = interest?.trim() ?? "";
  if (!raw) {
    return EVERYDAY_LABEL[locale];
  }
  return INTEREST_LABELS[fold(raw)]?.[locale] ?? raw.slice(0, 40);
}

export interface SceneUnit {
  id: string;
  /** Título da unidade no idioma de interface. */
  title: string;
  /** Metas "eu consigo…" no idioma de interface (pode ser vazio). */
  canDo: string[];
}

/** As 3 cenas fixas (objetivo, unidade, tema) no idioma de interface. Sem objetivo, usa "travel". */
export function fallbackScenes(input: {
  goal: string | null | undefined;
  locale: UiLocale;
  unit: SceneUnit;
  interest: string | null | undefined;
}): Scene[] {
  const goal: GoalKind = isGoalKind(input.goal) ? input.goal : "travel";
  const [gTitle, gSetting, gLearner, gPartner, gObjective] = GOAL_SCENES[goal][input.locale];
  const [uSetting, uLearner, uPartner, uObjective] = UNIT_SCENE[input.locale];
  const label = interestLabel(input.interest, input.locale);
  const fill = (text: string) => text.replaceAll("{label}", label);
  const [iTitle, iSetting, iLearner, iPartner, iObjective] = INTEREST_SCENE[input.locale];
  const interestSlug = slug(input.interest ?? "") || "everyday";
  return [
    {
      id: `fb-goal-${goal}`,
      kind: "goal",
      title: gTitle,
      setting: gSetting,
      learner_role: gLearner,
      partner_role: gPartner,
      objective: gObjective,
      twist: null,
      unit_id: null,
    },
    {
      id: `fb-unit-${input.unit.id}`,
      kind: "unit",
      title: input.unit.title.slice(0, 80),
      setting: uSetting.replace("{title}", input.unit.title),
      learner_role: uLearner,
      partner_role: uPartner,
      objective: (input.unit.canDo[0] ?? uObjective).slice(0, 220),
      twist: null,
      unit_id: input.unit.id,
    },
    {
      id: `fb-interest-${interestSlug}`,
      kind: "interest",
      title: fill(iTitle).slice(0, 80),
      setting: fill(iSetting).slice(0, 220),
      learner_role: iLearner,
      partner_role: iPartner,
      objective: fill(iObjective).slice(0, 220),
      twist: null,
      unit_id: null,
    },
  ];
}

type GeneratedScene = Omit<Scene, "id" | "unit_id">;

const KIND_ORDER: readonly SceneKind[] = ["goal", "unit", "interest"];

/**
 * Cenas da IA → as 3 do contrato (uma de cada tipo, nessa ordem), com id e unit_id do
 * servidor. null quando falta algum tipo (quem chama usa as cenas fixas).
 */
export function assembleScenes(generated: readonly GeneratedScene[], unitId: string, date: string): Scene[] | null {
  const stamp = date.replace(/-/g, "");
  const scenes: Scene[] = [];
  for (const kind of KIND_ORDER) {
    const found = generated.find((scene) => scene.kind === kind);
    if (!found) {
      return null;
    }
    scenes.push({
      ...found,
      id: `ai-${kind}-${stamp}`,
      unit_id: kind === "unit" ? unitId : null,
    });
  }
  return scenes;
}

/** Chave do cache: por aluno, idioma-alvo, idioma de interface e dia UTC. */
export function sceneCacheKey(userId: string, targetLang: string, locale: string, date: string): string {
  // v2: as cenas da IA ganharam a fala de abertura (opener).
  return `prosa:scenes:v2:${userId}:${targetLang}:${locale}:${date}`;
}
