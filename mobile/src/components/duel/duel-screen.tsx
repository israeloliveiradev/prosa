import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { fetchDuelBoard, fetchDuelRound, saveDuelScore, type DuelBoardEntry, type DuelDrill } from "@/lib/api";
import { duelPoints } from "@/lib/duel";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { AudioService } from "@/services/audio/AudioService";

const ROUND_MS = 120_000;
const QUESTION_MS = 4_000;

export function DuelScreen() {
  const session = useSession();
  const token = session?.token;
  const [phase, setPhase] = useState<"loading" | "ready" | "play" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<DuelBoardEntry[]>([]);
  const [current, setCurrent] = useState<DuelDrill | null>(null);
  const [remaining, setRemaining] = useState(ROUND_MS);
  const [questionLeft, setQuestionLeft] = useState(QUESTION_MS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const drillsRef = useRef<DuelDrill[]>([]);
  const statsRef = useRef({ score: 0, combo: 0, best: 0, correct: 0, index: 0 });
  const endsAt = useRef(0);
  const questionEnds = useRef(0);
  const locked = useRef(false);
  const saved = useRef(false);

  useEffect(() => {
    AudioService.stopAndUnload();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setPhase("loading");
    void Promise.all([fetchDuelRound(token), fetchDuelBoard(token)])
      .then(([round, entries]) => {
        if (!active) {
          return;
        }
        drillsRef.current = round.drills;
        setFocus(round.focus);
        setCurrent(round.drills[0] ?? null);
        setBoard(entries);
        setPhase("ready");
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "O duelo não abriu.");
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (phase !== "play" || !token) {
      return;
    }
    const timer = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endsAt.current - now);
      setRemaining(left);
      setQuestionLeft(Math.max(0, questionEnds.current - now));
      if (left === 0) {
        void finish(token);
        return;
      }
      if (!locked.current && now >= questionEnds.current) {
        miss("O tempo acabou.");
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, token]);

  function showDrill(index: number) {
    const drill = drillsRef.current[index % Math.max(1, drillsRef.current.length)];
    if (!drill) {
      return;
    }
    statsRef.current.index = index;
    setCurrent(drill);
    setPicked(null);
    setNote(null);
    questionEnds.current = Date.now() + QUESTION_MS;
    setQuestionLeft(QUESTION_MS);
    locked.current = false;
  }

  function miss(message: string) {
    locked.current = true;
    statsRef.current.combo = 0;
    setCombo(0);
    setNote(message);
    setPicked(-1);
    void tap("light");
    setTimeout(() => {
      if (Date.now() >= endsAt.current) {
        return;
      }
      showDrill(statsRef.current.index + 1);
    }, 350);
  }

  function choose(index: number) {
    if (phase !== "play" || locked.current || !current) {
      return;
    }
    locked.current = true;
    setPicked(index);
    if (index === current.answer) {
      const nextCombo = statsRef.current.combo + 1;
      statsRef.current.combo = nextCombo;
      statsRef.current.best = Math.max(statsRef.current.best, nextCombo);
      statsRef.current.correct += 1;
      statsRef.current.score += duelPoints(nextCombo);
      setCombo(nextCombo);
      setScore(statsRef.current.score);
      setNote("Certa.");
      void tap(nextCombo >= 2 ? "heavy" : "success");
    } else {
      statsRef.current.combo = 0;
      setCombo(0);
      setNote("Essa não.");
      void tap("light");
    }
    setTimeout(() => {
      if (Date.now() >= endsAt.current) {
        return;
      }
      showDrill(statsRef.current.index + 1);
    }, 350);
  }

  function begin() {
    statsRef.current = { score: 0, combo: 0, best: 0, correct: 0, index: 0 };
    saved.current = false;
    setScore(0);
    setCombo(0);
    setNote(null);
    setPicked(null);
    endsAt.current = Date.now() + ROUND_MS;
    setRemaining(ROUND_MS);
    setPhase("play");
    showDrill(0);
    void tap("medium");
  }

  async function finish(authToken: string) {
    if (saved.current) {
      return;
    }
    saved.current = true;
    setPhase("done");
    const stats = statsRef.current;
    try {
      await saveDuelScore(authToken, {
        score: stats.score,
        best_combo: stats.best,
        correct_count: stats.correct,
      });
      setBoard(await fetchDuelBoard(authToken));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A pontuação não foi guardada.");
    }
  }

  if (!session) {
    return <Redirect href="/account" />;
  }

  const clock = `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <AppFrame>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Duelo</Text>
      <Text accessibilityLabel={`Tempo restante ${clock}`} className="font-display mt-2 text-display text-ink">
        {phase === "play" || phase === "done" ? clock : "02:00"}
      </Text>
      {phase === "play" && current ? (
        <View className={`mt-8 border-t pt-6 ${combo >= 2 ? "border-ember" : "border-ink"}`}>
          <Text className="font-label text-sm text-muted">Combo {combo}</Text>
          <Text className="mt-1 text-sm text-muted">{Math.ceil(questionLeft / 1000)} s nesta frase · {score} pontos</Text>
          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
            <View className="h-full rounded-full bg-ember" style={{ width: `${Math.max(0, Math.min(100, (questionLeft / QUESTION_MS) * 100))}%` }} />
          </View>
          <Text className="font-displayItalic mt-4 text-headline leading-10 text-ink">{current.prompt}</Text>
          <View className="mt-4 gap-2">
            {current.options.map((option, index) => {
              const correct = index === current.answer && picked !== null;
              const chosen = picked === index;
              return (
                <Pressable
                  key={`${option}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  disabled={picked !== null}
                  onPress={() => choose(index)}
                  className={`min-h-12 justify-center rounded-full px-5 ${chosen && index === current.answer ? "bg-mossSoft" : chosen ? "bg-emberSoft" : correct ? "bg-mossSoft" : "bg-line"}`}
                >
                  <Text className="text-base font-semibold text-ink">
                    {option}
                    {chosen && index === current.answer ? " · Certa" : ""}
                    {chosen && index !== current.answer ? " · Essa não" : ""}
                    {correct && !chosen ? " · A certa" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {note ? <Text className="mt-3 text-base text-muted">{note}</Text> : null}
        </View>
      ) : null}
      {phase === "ready" ? (
        <View className="mt-6">
          <Text className="max-w-xl text-lg leading-7 text-muted">
            O placar já está abaixo. Doze frases, quatro segundos cada. A sequência aumenta a pontuação. Comece quando quiser.
          </Text>
          {focus.length > 0 ? (
            <Text className="mt-3 max-w-xl text-base leading-7 text-ink">Estas frases vêm do que ainda falha: {focus.join(" · ")}.</Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={begin} className="mt-6 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6">
            <Text className="text-base font-semibold text-onEmber">Começar o duelo</Text>
          </Pressable>
        </View>
      ) : null}
      {phase === "loading" ? <Text className="mt-6 text-base text-muted">Preparando as frases...</Text> : null}
      {phase === "done" ? (
        <View className="mt-6">
          <Text className="font-displayItalic text-headline text-ink">{score} pontos</Text>
          <Text className="mt-2 text-base text-muted">Melhor sequência {statsRef.current.best}. Acertos {statsRef.current.correct}.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!token) {
                return;
              }
              setPhase("loading");
              setError(null);
              void fetchDuelRound(token)
                .then((round) => {
                  drillsRef.current = round.drills;
                  setFocus(round.focus);
                  setCurrent(round.drills[0] ?? null);
                  setPhase("ready");
                })
                .catch((caught: unknown) => {
                  setError(caught instanceof Error ? caught.message : "O duelo não abriu.");
                  setPhase("error");
                });
            }}
            className="mt-6 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
          >
            <Text className="text-base font-semibold text-onEmber">Outras frases</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="mt-4 text-base leading-7 text-roseInk">
          {error}
        </Text>
      ) : null}
      {phase === "error" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setPhase("loading");
            if (!token) {
              return;
            }
            void Promise.all([fetchDuelRound(token), fetchDuelBoard(token)])
              .then(([round, entries]) => {
                drillsRef.current = round.drills;
                setFocus(round.focus);
                setCurrent(round.drills[0] ?? null);
                setBoard(entries);
                setPhase("ready");
              })
              .catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "O duelo não abriu.");
                setPhase("error");
              });
          }}
          className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
        >
          <Text className="text-base font-semibold text-onEmber">Tentar de novo</Text>
        </Pressable>
      ) : null}
      {phase !== "play" ? <Board entries={board} /> : null}
    </AppFrame>
  );
}

function Board({ entries }: { entries: DuelBoardEntry[] }) {
  return (
    <View className="mt-10">
      <Text className="font-label text-xs uppercase tracking-widest text-muted">Seus resultados</Text>
      {entries.length === 0 ? <Text className="mt-4 text-base leading-7 text-muted">Ainda não há pontuações neste idioma.</Text> : null}
      {entries.map((entry, index) => (
        <View key={`${entry.label}-${index}`} className="min-h-14 flex-row items-center justify-between border-b border-line">
          <Text className="text-base text-ink">{entry.you ? "Você" : entry.label}</Text>
          <Text className="font-label text-base text-muted">
            {entry.score} · combo {entry.best_combo}
          </Text>
        </View>
      ))}
    </View>
  );
}
