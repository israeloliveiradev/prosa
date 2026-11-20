import { View } from "react-native";
import type { PathUnit } from "@/api/schemas/path";
import type { PathCopy } from "@/lib/copy/path";
import { unitSummary } from "@/features/path/model/path-model";
import { Tag } from "./path-parts";

/** Resumo do domínio da unidade em etiquetas: lições, palavras, diário e teste (números do servidor). */
export function UnitChips({ unit, t, testID }: { unit: Pick<PathUnit, "mastery">; t: PathCopy; testID?: string }) {
  const summary = unitSummary(unit);
  return (
    <View testID={testID} style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      <Tag label={t.chipLessons(summary.lessons.done, summary.lessons.required)} icon={summary.lessons.met ? "check" : "play"} tone={summary.lessons.met ? "green" : "neutral"} />
      <Tag label={t.chipLemmas(summary.lemmas.known, summary.lemmas.total)} icon={summary.lemmas.met ? "check" : "book"} tone={summary.lemmas.met ? "green" : "neutral"} />
      <Tag label={summary.journal ? t.chipJournalMet : t.chipJournalPending} icon={summary.journal ? "check" : "pen"} tone={summary.journal ? "green" : "neutral"} />
      <Tag
        label={summary.test === "passed" ? t.chipTestPassed(Math.round(summary.best ?? 0)) : summary.test === "available" ? t.chipTestAvailable : t.chipTestLocked}
        icon={summary.test === "passed" ? "check" : summary.test === "available" ? "target" : "lock"}
        tone={summary.test === "passed" ? "green" : summary.test === "available" ? "amber" : "neutral"}
      />
    </View>
  );
}
