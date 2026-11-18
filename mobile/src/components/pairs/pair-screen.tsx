import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { fetchPairs, offerPair, reviewPair, type PairInbox, type PairItem } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

export function PairScreen() {
  const session = useSession();
  const copy = useCopy();
  const { palette } = useTheme();
  const token = session?.token;
  const targetLang = session?.user?.target_lang ?? "en";
  const [box, setBox] = useState<PairInbox | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    void fetchPairs(token)
      .then((next) => {
        if (active) {
          setBox(next);
        }
      })
      .catch(() => {
        if (active) {
          setBox({ inbox: [], sent: [] });
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!session || !token) {
    return <Redirect href="/account" />;
  }

  const auth = token;

  async function send() {
    if (draft.trim().length < 12) {
      return;
    }
    setPending(true);
    try {
      const next = await offerPair(auth, { target_lang: targetLang, prompt: "", body: draft.trim() });
      setDraft("");
      setNote(next.matched ? copy.pairOffered : copy.pairWaiting);
      const inbox = await fetchPairs(auth);
      setBox(inbox);
      void tap("success");
    } catch {
      setNote(copy.pairEmpty);
    } finally {
      setPending(false);
    }
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.pairKicker} title={copy.pairTitle} dek={copy.pairDek} />
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            accessibilityLabel={copy.pairOffer}
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-32 rounded-[28px] bg-card px-5 py-4 text-lg leading-7 text-ink"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void send()}
            disabled={pending || draft.trim().length < 12}
            className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
          >
            <Text className="text-base font-semibold text-paper">{copy.pairOffer}</Text>
          </Pressable>
          {note ? <Text className="mt-3 text-base text-ember">{note}</Text> : null}
        </View>
        <PairList title={copy.pairInbox} empty={copy.pairEmpty} items={box?.inbox ?? []} review token={auth} onDone={setBox} />
        <PairList title={copy.pairSent} empty={copy.pairWaiting} items={box?.sent ?? []} token={auth} onDone={setBox} />
      </View>
    </AppFrame>
  );
}

function PairList({
  title,
  empty,
  items,
  review,
  token,
  onDone,
}: {
  title: string;
  empty: string;
  items: PairItem[];
  review?: boolean;
  token: string;
  onDone: (box: PairInbox) => void;
}) {
  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{title}</Text>
      {items.length === 0 ? <Text className="mt-3 text-base leading-7 text-muted">{empty}</Text> : null}
      {items.map((item) => (
        <PairCard key={item.id} item={item} review={review} token={token} onDone={onDone} />
      ))}
    </View>
  );
}

function PairCard({
  item,
  review,
  token,
  onDone,
}: {
  item: PairItem;
  review?: boolean;
  token: string;
  onDone: (box: PairInbox) => void;
}) {
  const copy = useCopy();
  const { palette } = useTheme();
  const [understood, setUnderstood] = useState("");
  const [correction, setCorrection] = useState("");
  const [question, setQuestion] = useState("");
  const [saved, setSaved] = useState(item.status === "done");

  async function submit() {
    await reviewPair(token, item.id, { understood, correction, question });
    setSaved(true);
    onDone(await fetchPairs(token));
    void tap("success");
  }

  return (
    <View className="mt-3 rounded-3xl border border-line bg-card px-5 py-4">
      <Text className="text-base leading-7 text-ink">{item.body}</Text>
      {item.status === "done" ? (
        <View className="mt-3 gap-2">
          <Text className="text-sm text-muted">{item.understood}</Text>
          <Text className="text-sm text-ink">{item.correction}</Text>
          <Text className="text-sm text-ember">{item.question}</Text>
        </View>
      ) : null}
      {review && !saved ? (
        <View className="mt-3 gap-2">
          <TextInput value={understood} onChangeText={setUnderstood} placeholder={copy.pairUnderstood} placeholderTextColor={palette.onSurfaceVariant} className="min-h-12 rounded-2xl bg-paper px-4 text-base text-ink" />
          <TextInput value={correction} onChangeText={setCorrection} placeholder={copy.pairCorrection} placeholderTextColor={palette.onSurfaceVariant} className="min-h-12 rounded-2xl bg-paper px-4 text-base text-ink" />
          <TextInput value={question} onChangeText={setQuestion} placeholder={copy.pairQuestion} placeholderTextColor={palette.onSurfaceVariant} className="min-h-12 rounded-2xl bg-paper px-4 text-base text-ink" />
          <Pressable accessibilityRole="button" onPress={() => void submit()} className="mt-1 min-h-12 items-center justify-center self-start rounded-full border border-line px-5">
            <Text className="text-base font-semibold text-ink">{copy.pairSave}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
