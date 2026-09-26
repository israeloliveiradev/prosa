import { TARGET_LANGS, type TargetLang } from "../types/database.js";

export type PersonaFamily = "tech" | "travel";
export type PersonaRegister = "formal" | "informal";

export interface PersonaScene {
  id: string;
  lang: TargetLang;
  family: PersonaFamily;
  register: PersonaRegister;
  title: string;
  place: string;
  role: string;
  brief: string;
  opener: string;
}

const TECH = /tecnolog|intelig|artificial|(?:^|[^a-z])ai(?:$|[^a-z])|neg[oó]ci|business|startup|software|program|dados|data|tech/i;
const TRAVEL = /viag|travel|cultur|turismo|comida|food|caf[eé]|cidade/i;

const SCENES: readonly PersonaScene[] = [
  scene("en-sf-founder", "en", "tech", "formal", "Entrevista em São Francisco", "São Francisco", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Thanks for coming in. Tell me about a project you are proud of."),
  scene("en-london-station", "en", "travel", "formal", "A estação em Londres", "Londres", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Good morning. Where are you headed?"),
  scene("en-london-cafe", "en", "travel", "informal", "Um café em Londres", "Londres", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Hey. What are you having?"),
  scene("es-madrid-founder", "es", "tech", "formal", "Entrevista em Madri", "Madri", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Gracias por venir. Cuénteme un proyecto del que esté orgulloso."),
  scene("es-madrid-station", "es", "travel", "formal", "A estação em Madri", "Madri", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Buenos días. ¿Adónde quiere ir?"),
  scene("es-madrid-cafe", "es", "travel", "informal", "Um café em Madri", "Madri", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Hola. ¿Qué te pongo?"),
  scene("de-berlin-founder", "de", "tech", "formal", "Entrevista em Berlim", "Berlim", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Schön, dass Sie da sind. Erzählen Sie von einem Projekt."),
  scene("de-berlin-station", "de", "travel", "formal", "A estação em Berlim", "Berlim", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Guten Tag. Wohin möchten Sie fahren?"),
  scene("de-berlin-cafe", "de", "travel", "informal", "Um café em Berlim", "Berlim", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Hallo. Was darf es sein?"),
  scene("fr-paris-founder", "fr", "tech", "formal", "Entrevista em Paris", "Paris", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Merci d'être venu. Parlez-moi d'un projet dont vous êtes fier."),
  scene("fr-paris-station", "fr", "travel", "formal", "A estação em Paris", "Paris", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Bonjour. Où souhaitez-vous aller ?"),
  scene("fr-paris-cafe", "fr", "travel", "informal", "Um café em Paris", "Paris", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Salut. Tu prends quoi ?"),
  scene("it-milan-founder", "it", "tech", "formal", "Entrevista em Milão", "Milão", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Grazie per essere venuto. Mi parli di un progetto di cui è orgoglioso."),
  scene("it-rome-station", "it", "travel", "formal", "A estação em Roma", "Roma", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Buongiorno. Dove desidera andare?"),
  scene("it-rome-cafe", "it", "travel", "informal", "Um café em Roma", "Roma", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Ciao. Cosa prendi?"),
  scene("ru-moscow-founder", "ru", "tech", "formal", "Entrevista em Moscou", "Moscou", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "Спасибо, что пришли. Расскажите о проекте, которым вы гордитесь."),
  scene("ru-moscow-station", "ru", "travel", "formal", "A estação em Moscou", "Moscou", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "Здравствуйте. Куда вы хотите поехать?"),
  scene("ru-moscow-cafe", "ru", "travel", "informal", "Um café em Moscou", "Moscou", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "Привет. Что будешь?"),
  scene("ja-tokyo-founder", "ja", "tech", "formal", "Entrevista em Tóquio", "Tóquio", "Fundador de uma startup", "Uma entrevista de emprego. O tom esperado é profissional.", "本日はありがとうございます。誇りに思う仕事を教えてください。"),
  scene("ja-tokyo-station", "ja", "travel", "formal", "A estação em Tóquio", "Tóquio", "Funcionário da estação", "Você pede uma orientação. O tom esperado é formal.", "いらっしゃいませ。どちらまで行かれますか。"),
  scene("ja-tokyo-cafe", "ja", "travel", "informal", "Um café em Tóquio", "Tóquio", "Pessoa no café", "Uma conversa solta no balcão. O tom esperado é informal.", "こんにちは。何にしますか。"),
];

function scene(
  id: string,
  lang: TargetLang,
  family: PersonaFamily,
  register: PersonaRegister,
  title: string,
  place: string,
  role: string,
  brief: string,
  opener: string,
): PersonaScene {
  return { id, lang, family, register, title, place, role, brief, opener };
}

export function personaScenes(targetLang: string, interests: readonly string[]): PersonaScene[] {
  if (!TARGET_LANGS.includes(targetLang as TargetLang)) {
    return [];
  }
  const text = interests.join(" ");
  const wantsTech = TECH.test(text);
  const wantsTravel = TRAVEL.test(text);
  const pool = SCENES.filter((item) => item.lang === targetLang);
  if (!wantsTech && !wantsTravel) {
    return pool.filter((item) => item.family === "travel");
  }
  return pool.filter((item) => (wantsTech && item.family === "tech") || (wantsTravel && item.family === "travel"));
}

export function findPersonaScene(targetLang: string, interests: readonly string[], sceneId: string): PersonaScene | null {
  return personaScenes(targetLang, interests).find((item) => item.id === sceneId) ?? null;
}
