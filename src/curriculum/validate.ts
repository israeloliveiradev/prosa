import { UNIT_IDS } from "./units.js";
import { UI_LOCALES, type LanguageCurriculum, type Syllabus } from "./types.js";

/** Problemas encontrados num arquivo de idioma (vazio = válido). */
export function validateLanguage(lang: string, curriculum: LanguageCurriculum): string[] {
  const problems: string[] = [];
  const ids = Object.keys(curriculum);
  for (const id of UNIT_IDS) {
    if (!curriculum[id]) problems.push(`${lang}: falta a unidade ${id}`);
  }
  for (const id of ids) {
    if (!UNIT_IDS.includes(id)) problems.push(`${lang}: unidade desconhecida ${id}`);
  }
  const seenAcross = new Map<string, string>();
  for (const id of UNIT_IDS) {
    const unit = curriculum[id];
    if (!unit) continue;
    const g = unit.grammar;
    if (!g?.name?.trim()) problems.push(`${lang}/${id}: grammar.name vazio`);
    if (!g?.summary?.trim() || g.summary.length > 300) problems.push(`${lang}/${id}: grammar.summary vazio ou longo demais (máx. 300)`);
    if (!Array.isArray(g?.examples) || g.examples.length !== 2 || g.examples.some((e) => !e?.trim())) {
      problems.push(`${lang}/${id}: grammar.examples precisa de exatamente 2 frases`);
    }
    const lemmas = unit.lemmas ?? [];
    if (lemmas.length < 10 || lemmas.length > 15) problems.push(`${lang}/${id}: ${lemmas.length} lemas (precisa de 10 a 15)`);
    const local = new Set<string>();
    for (const item of lemmas) {
      const key = item?.lemma?.trim().toLowerCase();
      if (!key) {
        problems.push(`${lang}/${id}: lema vazio`);
        continue;
      }
      if (!item.gloss?.trim()) problems.push(`${lang}/${id}: lema "${item.lemma}" sem glosa`);
      if (lang === "ja" && !item.reading?.trim()) problems.push(`${lang}/${id}: lema "${item.lemma}" sem reading (kana)`);
      if (local.has(key)) problems.push(`${lang}/${id}: lema repetido "${item.lemma}"`);
      local.add(key);
      const earlier = seenAcross.get(key);
      if (earlier) problems.push(`${lang}/${id}: lema "${item.lemma}" já é núcleo de ${earlier} (cada lema em uma só unidade)`);
      else seenAcross.set(key, id);
    }
  }
  return problems;
}

export function validateSyllabus(syllabus: Syllabus): string[] {
  const problems: string[] = [];
  for (const id of UNIT_IDS) {
    const entry = syllabus[id];
    if (!entry) {
      problems.push(`syllabus: falta a unidade ${id}`);
      continue;
    }
    const counts = new Set<number>();
    for (const locale of UI_LOCALES) {
      if (!entry.title?.[locale]?.trim()) problems.push(`syllabus/${id}: título vazio em ${locale}`);
      const goals = entry.canDo?.[locale];
      if (!Array.isArray(goals) || goals.length < 2 || goals.length > 3 || goals.some((goal) => !goal?.trim())) {
        problems.push(`syllabus/${id}: canDo em ${locale} precisa de 2 ou 3 metas`);
      } else {
        counts.add(goals.length);
      }
    }
    if (counts.size > 1) problems.push(`syllabus/${id}: quantidade de metas difere entre idiomas`);
  }
  for (const id of Object.keys(syllabus)) {
    if (!UNIT_IDS.includes(id)) problems.push(`syllabus: unidade desconhecida ${id}`);
  }
  return problems;
}
