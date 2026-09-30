import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { useCast } from "@/lib/cast";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { keepWords } from "@/lib/text";

export default function GuideScreen() {
  const session = useSession();
  const copy = useCopy();
  const { people } = useCast();
  const names = people.map((person) => person.name);
  const sections = [
    { title: copy.guideHomeTitle, body: copy.guideHomeBody },
    {
      title: copy.guideLessonTitle,
      body: `${copy.guideLessonBody} ${names[0]} ${copy.reading.toLowerCase()}. ${names[1]} ${copy.navMemory.toLowerCase()}. ${names[2]} ${copy.speech.toLowerCase()}. ${names[3]} ${copy.journal.toLowerCase()}.`,
    },
    { title: copy.guideListenTitle, body: copy.guideListenBody },
    {
      title: copy.guideWordTitle,
      body: `${copy.guideWordBody} ${copy.guideWordStep1} ${copy.guideWordStep2} ${copy.guideWordStep3} ${copy.guideWordStep4}`,
    },
    { title: copy.guideLangsTitle, body: copy.guideLangsBody },
    { title: copy.guidePlaceTitle, body: copy.guidePlaceBody },
    { title: copy.guideNewsTitle, body: copy.guideNewsBody },
    { title: copy.guidePracticeTitle, body: copy.guidePracticeBody },
    { title: copy.guideMemoryTitle, body: copy.guideMemoryBody },
    { title: copy.guideAccountTitle, body: copy.guideAccountBody },
  ];

  if (!session) {
    return <Redirect href="/account" />;
  }

  return (
    <AppFrame>
      <PageMasthead kicker={copy.guideKicker} title={copy.guideTitle} dek={copy.guideDek} />
      <View className="mt-12 gap-10">
        {sections.map((section, index) => (
          <View key={section.title} className="border-t border-line pt-6">
            <Text className="font-label text-[11px] uppercase tracking-[0.28em] text-ember">
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text className="font-displayItalic mt-2 text-headline text-ink">{section.title}</Text>
            <Text className="mt-3 max-w-2xl text-base leading-7 text-ink">{keepWords(section.body)}</Text>
          </View>
        ))}
      </View>
    </AppFrame>
  );
}
