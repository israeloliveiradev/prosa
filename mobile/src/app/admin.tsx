import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import {
  fetchAdminDashboard,
  fetchAdminUser,
  fetchAdminUsers,
  setAdminUserFreeze,
  setAdminUserPlan,
  setGenerationPaused,
  type AdminAccount,
  type AdminDashboard,
  type AdminUserDetail,
} from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

type PlanFilter = "all" | "free" | "pro";

const EVENT_KIND: Record<string, string> = {
  gemini: "Gemini",
  lesson: "Lição",
  audio: "Áudio",
  news: "Notícia",
  billing: "Plano",
};

export default function AdminScreen() {
  const { palette } = useTheme();
  const session = useSession();
  const [board, setBoard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      router.replace("/account");
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      return;
    }
    let active = true;
    setPending(true);
    setError(null);
    void Promise.all([
      fetchAdminDashboard(session.token),
      fetchAdminUsers(session.token, query, planFilter === "all" ? undefined : { plan: planFilter }),
    ])
      .then(([nextBoard, nextUsers]) => {
        if (!active) {
          return;
        }
        setBoard(nextBoard);
        setUsers(nextUsers);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "A visão de administração não abriu.");
      })
      .finally(() => {
        if (active) {
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [query, planFilter, session]);

  useEffect(() => {
    if (!session || !openId) {
      setDetail(null);
      return;
    }
    let active = true;
    void fetchAdminUser(session.token, openId)
      .then((next) => {
        if (active) {
          setDetail(next);
        }
      })
      .catch(() => {
        if (active) {
          setDetail(null);
        }
      });
    return () => {
      active = false;
    };
  }, [openId, session]);

  if (!session || session.user.role !== "admin") {
    return null;
  }

  const token = session.token;

  async function refresh() {
    const [nextBoard, nextUsers] = await Promise.all([
      fetchAdminDashboard(token),
      fetchAdminUsers(token, query, planFilter === "all" ? undefined : { plan: planFilter }),
    ]);
    setBoard(nextBoard);
    setUsers(nextUsers);
    if (openId) {
      setDetail(await fetchAdminUser(token, openId));
    }
  }

  async function togglePlan(user: AdminAccount) {
    const next = user.plan === "pro" ? "free" : "pro";
    void tap("medium");
    setBusy(true);
    setError(null);
    try {
      const updated = await setAdminUserPlan(token, user.id, next);
      setUsers((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O plano não mudou.");
    } finally {
      setBusy(false);
    }
  }

  async function changeFreeze(user: AdminAccount, delta: 1 | -1) {
    void tap("light");
    setBusy(true);
    setError(null);
    try {
      const updated = await setAdminUserFreeze(token, user.id, delta);
      setUsers((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      if (detail?.user.id === updated.id) {
        setDetail({ ...detail, user: { ...detail.user, ...updated } });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O freeze não mudou.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleGeneration() {
    if (!board) {
      return;
    }
    void tap("medium");
    setBusy(true);
    setError(null);
    try {
      const paused = await setGenerationPaused(token, !board.generation_paused);
      setBoard({ ...board, generation_paused: paused });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O interruptor não mudou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppFrame>
      <PageMasthead
        kicker="Administração"
        title="Operação do dia."
        dek="Contas, gráficos de 14 dias, geração e eventos. A senha não aparece aqui."
      />

      {board ? (
        <>
          <View className="mt-8 flex-row flex-wrap gap-3">
            <Stat label="Contas" value={board.users} />
            <Stat label="Pro" value={board.pro} />
            <Stat label="Grátis" value={board.free} />
            <Stat label="Lições hoje" value={board.lessons_today} />
            <Stat label="Duelos hoje" value={board.duels_today} />
            <Stat label="Áudios hoje" value={board.audio_today} />
            <Stat label="Gemini falhou" value={board.gemini_errors_today} />
          </View>

          <View className="mt-8 gap-3 md:flex-row">
            <View className="flex-1 rounded-[28px] border border-line bg-card px-5 py-5">
              <Text className="font-label text-sm text-muted">Geração</Text>
              <Text className="mt-2 font-display text-2xl text-ink">{board.generation_paused ? "Pausada" : "Ligada"}</Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                {board.generation_paused
                  ? "Nenhuma prosa nova sai do modelo. O cache e a última notícia continuam."
                  : "Lições e notícias novas saem do Gemini."}
              </Text>
              <View className="mt-4 self-start">
                <ChunkButton
                  label={board.generation_paused ? "Ligar a geração" : "Pausar a geração"}
                  onPress={() => void toggleGeneration()}
                  tone={board.generation_paused ? "moss" : "ink"}
                  disabled={busy}
                />
              </View>
            </View>
            <View className="flex-1 rounded-[28px] border border-line bg-card px-5 py-5">
              <Text className="font-label text-sm text-muted">Serviços</Text>
              <Text className="mt-3 text-base leading-7 text-ink">
                Stripe {board.stripe_configured ? "ligada" : "desligada"} · Gemini {board.gemini_configured ? "com chave" : "sem chave"}
              </Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                Sem Stripe o checkout avisa o aluno. Sem Gemini a geração devolve 503.
              </Text>
            </View>
          </View>

          <OpsChart series={board.series} />

          <View className="mt-10">
            <Text className="font-displayItalic text-headline text-ink">Eventos</Text>
            <Text className="mt-2 text-base leading-6 text-muted">429 do Gemini, pausa, áudio e plano.</Text>
            <View className="mt-4 gap-3">
              {board.events.length === 0 ? <Text className="text-base text-muted">Nenhum evento ainda.</Text> : null}
              {board.events.map((event) => (
                <View key={event.id} className="rounded-[24px] border border-line bg-card px-4 py-4">
                  <Text className="font-label text-sm text-ember">
                    {EVENT_KIND[event.kind] ?? event.kind} · {event.status}
                  </Text>
                  <Text className="mt-1 text-base text-ink">{event.message}</Text>
                  <Text className="mt-1 text-sm text-muted">{new Date(event.created_at).toLocaleString("pt-BR")}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      <View className="mt-12">
        <Text className="font-displayItalic text-headline text-ink">Clientes</Text>
        <View className="mt-4 max-w-md">
          <Text className="mb-2 font-label text-sm text-muted">Filtrar por e-mail</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Filtrar por e-mail"
            autoCapitalize="none"
            autoComplete="off"
            placeholder="parte do e-mail"
            placeholderTextColor={palette.onSurfaceVariant}
            className="min-h-14 rounded-full bg-card px-5 text-base text-ink"
          />
        </View>
        <View accessibilityRole="radiogroup" className="mt-4 flex-row flex-wrap gap-2">
          {(["all", "free", "pro"] as const).map((item) => {
            const selected = item === planFilter;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={item === "all" ? "Todos os planos" : item === "pro" ? "Só Pro" : "Só grátis"}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => setPlanFilter(item)}
                className={`min-h-12 items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
              >
                <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>
                  {item === "all" ? "Todos" : item === "pro" ? "Pro" : "Grátis"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {pending ? <Text className="mt-6 text-base text-muted">Carregando as contas.</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="mt-6 text-base text-roseInk">
          {error}
        </Text>
      ) : null}

      <View className="mt-8 gap-4">
        {users.map((user) => {
          const open = openId === user.id;
          return (
            <View key={user.id} className="rounded-[28px] border border-line bg-card px-5 py-5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Detalhe de ${user.email}`}
                onPress={() => setOpenId(open ? null : user.id)}
              >
                <Text className="font-label text-base text-ink">{user.email}</Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  {user.target_lang.toUpperCase()} por {user.native_lang.toUpperCase()} · {user.level} · {user.role === "admin" ? "admin" : "aluno"} · {user.plan === "pro" ? "Pro" : "grátis"}
                </Text>
                <Text className="mt-1 text-sm leading-6 text-muted">
                  Sequência {user.streak_count} · freeze {user.streak_freeze_count} · {user.lesson_count} lições
                </Text>
              </Pressable>
              <View className="mt-4 flex-row flex-wrap gap-2">
                <ChunkButton
                  label={user.plan === "pro" ? "Passar para grátis" : "Passar para Pro"}
                  onPress={() => void togglePlan(user)}
                  disabled={busy}
                />
                <ChunkButton label="Dar freeze" onPress={() => void changeFreeze(user, 1)} tone="moss" disabled={busy} />
                <ChunkButton
                  label="Tirar freeze"
                  onPress={() => void changeFreeze(user, -1)}
                  tone="ghost"
                  disabled={busy || user.streak_freeze_count <= 0}
                />
              </View>
              {open && detail?.user.id === user.id ? (
                <View className="mt-5 border-t border-line pt-4">
                  <Text className="text-base leading-6 text-muted">
                    Criada em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    {user.last_lesson_at ? ` · última lição ${new Date(user.last_lesson_at).toLocaleDateString("pt-BR")}` : ""}
                  </Text>
                  <Text className="mt-2 text-base leading-6 text-muted">
                    Duelos {detail.duels.total} · melhor {detail.duels.best}
                  </Text>
                  {detail.lessons.length === 0 ? (
                    <Text className="mt-3 text-base text-muted">Nenhuma prosa gravada.</Text>
                  ) : (
                    detail.lessons.map((lesson) => (
                      <Text key={`${lesson.lesson_date}-${lesson.title}`} className="mt-2 text-base leading-6 text-ink">
                        {lesson.lesson_date} · {lesson.title} · {lesson.target_lang.toUpperCase()}
                      </Text>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
        {!pending && users.length === 0 ? <Text className="text-base leading-7 text-muted">Nenhuma conta com este filtro.</Text> : null}
      </View>
    </AppFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-28 border-l border-ink py-1 pl-4">
      <Text className="font-label text-[11px] uppercase tracking-[0.22em] text-muted">{label}</Text>
      <Text className="font-display mt-1 text-3xl text-ink">{value}</Text>
    </View>
  );
}

function OpsChart({ series }: { series: AdminDashboard["series"] }) {
  const peak = useMemo(() => Math.max(1, ...series.flatMap((day) => [day.users, day.lessons, day.duels])), [series]);
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, day) => ({
          users: acc.users + day.users,
          lessons: acc.lessons + day.lessons,
          duels: acc.duels + day.duels,
        }),
        { users: 0, lessons: 0, duels: 0 },
      ),
    [series],
  );

  return (
    <View className="mt-10">
      <Text className="font-displayItalic text-headline text-ink">14 dias</Text>
      <Text className="mt-2 text-base leading-6 text-muted">
        {totals.users} contas novas · {totals.lessons} lições · {totals.duels} duelos. A altura é quantidade, não cor.
      </Text>
      <View className="mt-6 flex-row items-end gap-1">
        {series.map((day) => (
          <View key={day.date} className="min-w-0 flex-1 items-center">
            <View className="h-36 w-full flex-row items-end justify-center gap-0.5">
              <View
                accessibilityLabel={`${day.date}, ${day.users} contas`}
                className="w-1.5 rounded-t bg-ember"
                style={{ height: `${Math.max(6, (day.users / peak) * 100)}%` }}
              />
              <View
                accessibilityLabel={`${day.date}, ${day.lessons} lições`}
                className="w-1.5 rounded-t bg-moss"
                style={{ height: `${Math.max(6, (day.lessons / peak) * 100)}%` }}
              />
              <View
                accessibilityLabel={`${day.date}, ${day.duels} duelos`}
                className="w-1.5 rounded-t bg-sandInk"
                style={{ height: `${Math.max(6, (day.duels / peak) * 100)}%` }}
              />
            </View>
            <Text className="mt-2 text-[10px] text-muted">{day.date.slice(8)}</Text>
          </View>
        ))}
      </View>
      <View className="mt-4 gap-1">
        <Text className="text-base text-muted">Bordô · contas novas</Text>
        <Text className="text-base text-muted">Verde · lições</Text>
        <Text className="text-base text-muted">Areia · duelos</Text>
      </View>
    </View>
  );
}
