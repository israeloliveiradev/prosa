import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { PathUnit } from "@/api/schemas/path";
import { tactile } from "@/components/tactile/tokens";
import type { PathCopy } from "@/lib/copy/path";
import type { UnitView } from "@/features/path/model/path-model";
import { CheckMark, MeterBar } from "./path-parts";

/** Os quatro critérios de domínio da unidade, com os números reais do servidor. */
export function MasteryChecklist({ view, t }: { view: Pick<UnitView, "testState" | "lemmaShare" | "lemmaTarget"> & { unit: Pick<PathUnit, "mastery"> }; t: PathCopy }) {
  const { lessons, lemmas, journal, test } = view.unit.mastery;
  const testText =
    view.testState === "passed"
      ? t.testPassed(Math.round(test.best ?? test.required))
      : view.testState === "available"
        ? test.best !== null
          ? t.testBestFailed(Math.round(test.best), Math.round(test.required))
          : t.testAvailable(Math.round(test.required))
        : t.testLocked;

  return (
    <View testID="path-mastery" style={{ gap: 12 }}>
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: tactile.muted }}>{t.masteryTitle}</Text>

      <Row met={lessons.met} testID="path-mastery-lessons">
        <Text style={lineStyle}>{t.lessonsLine(lessons.done, lessons.required)}</Text>
      </Row>

      <Row met={lemmas.met} testID="path-mastery-lemmas">
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
            <Text style={lineStyle}>{t.lemmasLine(lemmas.known, lemmas.total)}</Text>
            {lemmas.total > 0 ? <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "700", color: tactile.muted }}>{t.lemmasNeed(lemmas.required)}</Text> : null}
          </View>
          {lemmas.total > 0 ? <MeterBar share={view.lemmaShare} target={view.lemmaTarget} met={lemmas.met} label={t.lemmasLine(lemmas.known, lemmas.total)} /> : null}
          <Text style={{ fontFamily: tactile.font, fontSize: 12, lineHeight: 17, color: tactile.muted }}>{t.lemmasHint}</Text>
        </View>
      </Row>

      <Row met={journal.met} testID="path-mastery-journal">
        <Text style={lineStyle}>{journal.met ? t.journalMet : t.journalPending}</Text>
      </Row>

      <Row met={view.testState === "passed"} locked={view.testState === "locked"} testID="path-mastery-test">
        <Text style={lineStyle}>{testText}</Text>
      </Row>
    </View>
  );
}

const lineStyle = { fontFamily: tactile.font, fontSize: 14, lineHeight: 20, fontWeight: "600" as const, color: tactile.ink };

function Row({ met, locked = false, children, testID }: { met: boolean; locked?: boolean; children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} accessibilityState={{ checked: met }} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <CheckMark met={met} locked={locked} />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}
