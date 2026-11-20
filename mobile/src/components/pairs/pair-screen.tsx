import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { fetchPairs, offerPair, reviewPair, type PairInbox, type PairItem } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useAreaCopy } from "@/lib/copy/area";
import { PAIRS } from "@/lib/copy/pairs";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { TactilePage } from "@/features/shell/tactile-page";
import { TactileButton } from "@/components/tactile/tactile-button";
import { tactile } from "@/components/tactile/tokens";

export function PairScreen() {
  const session = useSession();
  const copy = useCopy();
  const t = useAreaCopy(PAIRS);
  const [reload, setReload] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
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
    setLoadFailed(false);
    void fetchPairs(token)
      .then((next) => {
        if (active) {
          setBox(next);
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [token, reload]);

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
      setNote(t.sendFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <TactilePage testID="pairs-screen" kicker={copy.pairKicker} title={copy.pairTitle} dek={copy.pairDek}>
        {loadFailed ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-base text-[#9F1239]">{t.loadFailed}</Text>
            <TactileButton testID="pairs-retry" label={t.retry} variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => setReload((n) => n + 1)} />
          </View>
        ) : null}
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            accessibilityLabel={copy.pairOffer}
            placeholderTextColor={tactile.faint}
            className="min-h-32 rounded-2xl border-2 border-[#E7E5E4] bg-white px-5 py-4 text-lg leading-7 text-[#111C2D]"
          />
          <TactileButton testID="pairs-send" label={copy.pairOffer} variant="primary" size="md" style={{ marginTop: 16, alignSelf: "flex-start" }} onPress={() => void send()} disabled={pending || draft.trim().length < 12} />
          {note ? <Text className="mt-3 text-base text-[#B45309]">{note}</Text> : null}
        </View>
        <PairList title={copy.pairInbox} empty={copy.pairEmpty} items={box?.inbox ?? []} review token={auth} onDone={setBox} />
        <PairList title={copy.pairSent} empty={copy.pairWaiting} items={box?.sent ?? []} token={auth} onDone={setBox} />
    </TactilePage>
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
      <Text className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">{title}</Text>
      {items.length === 0 ? <Text className="mt-3 text-base leading-7 text-[#64748B]">{empty}</Text> : null}
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
    <View className="mt-3 rounded-3xl border-2 border-[#E7E5E4] bg-white px-5 py-4">
      <Text className="text-base leading-7 text-[#111C2D]">{item.body}</Text>
      {item.status === "done" ? (
        <View className="mt-3 gap-2">
          <Text className="text-sm text-[#64748B]">{item.understood}</Text>
          <Text className="text-sm text-[#111C2D]">{item.correction}</Text>
          <Text className="text-sm text-[#B45309]">{item.question}</Text>
        </View>
      ) : null}
      {review && !saved ? (
        <View className="mt-3 gap-2">
          <TextInput value={understood} onChangeText={setUnderstood} placeholder={copy.pairUnderstood} placeholderTextColor={tactile.faint} className="min-h-12 rounded-2xl border-2 border-[#E7E5E4] bg-white px-4 text-base text-[#111C2D]" />
          <TextInput value={correction} onChangeText={setCorrection} placeholder={copy.pairCorrection} placeholderTextColor={tactile.faint} className="min-h-12 rounded-2xl border-2 border-[#E7E5E4] bg-white px-4 text-base text-[#111C2D]" />
          <TextInput value={question} onChangeText={setQuestion} placeholder={copy.pairQuestion} placeholderTextColor={tactile.faint} className="min-h-12 rounded-2xl border-2 border-[#E7E5E4] bg-white px-4 text-base text-[#111C2D]" />
          <TactileButton testID="pairs-review-save" label={copy.pairSave} variant="secondary" size="md" style={{ marginTop: 4, alignSelf: "flex-start" }} onPress={() => void submit()} />
        </View>
      ) : null}
    </View>
  );
}
