import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { OpsChart } from "@/components/admin/ops-chart";
import { AdminSegment } from "@/components/admin/segment";
import { Stat } from "@/components/admin/stat";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import {
  fetchAdminDashboard,
  fetchAdminEvents,
  fetchAdminUser,
  fetchAdminUsers,
  setAdminUserFreeze,
  setAdminUserPlan,
  setGenerationPaused,
  type AdminAccount,
  type AdminDashboard,
  type AdminEvent,
  type AdminUserDetail,
} from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

type Segment = "hoje" | "contas";
type PlanFilter = "all" | "free" | "pro";
type RoleFilter = "all" | "learner" | "admin";
type EventKind = "all" | AdminEvent["kind"];

const EVENT_KIND: Record<AdminEvent["kind"], string> = {
  gemini: "Gemini",
  lesson: "Lição",
  audio: "Áudio",
  news: "Notícia",
  billing: "Plano",
};

const EVENT_STATUS: Record<AdminEvent["status"], string> = {
  ok: "ok",
  error: "falhou",
  paused: "pausada",
};

export default function AdminScreen() {
  const { palette } = useTheme();
  const session = useSession();
  const [segment, setSegment] = useState<Segment>("hoje");
  const [board, setBoard] = useState<AdminDashboard | null>(null);
  const [boardPending, setBoardPending] = useState(true);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventKind, setEventKind] = useState<EventKind>("all");
  const [eventsPending, setEventsPending] = useState(false);
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [usersPending, setUsersPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<{ id: string; next: "free" | "pro" } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      return;
    }
    let active = true;
    setBoardPending(true);
    setError(null);
    void fetchAdminDashboard(session.token)
      .then((next) => {
        if (active) {
          setBoard(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "A visão de administração não abriu.");
        }
      })
      .finally(() => {
        if (active) {
          setBoardPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "admin" || segment !== "hoje") {
      return;
    }
    let active = true;
    setEventsPending(true);
    void fetchAdminEvents(session.token, {
      kind: eventKind === "all" ? undefined : eventKind,
      limit: 40,
    })
      .then((next) => {
        if (active) {
          setEvents(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Os eventos não abriram.");
        }
      })
      .finally(() => {
        if (active) {
          setEventsPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session, segment, eventKind]);

  useEffect(() => {
    if (!session || session.user.role !== "admin" || segment !== "contas") {
      return;
    }
    let active = true;
    setUsersPending(true);
    void fetchAdminUsers(session.token, debounced, {
      plan: planFilter === "all" ? undefined : planFilter,
      role: roleFilter === "all" ? undefined : roleFilter,
    })
      .then((next) => {
        if (active) {
          setUsers(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "As contas não abriram.");
        }
      })
      .finally(() => {
        if (active) {
          setUsersPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session, segment, debounced, planFilter, roleFilter]);

  useEffect(() => {
    if (!session || !openId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let active = true;
    setDetailPending(true);
    setDetailError(null);
    void fetchAdminUser(session.token, openId)
      .then((next) => {
        if (active) {
          setDetail(next);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setDetail(null);
          setDetailError(caught instanceof Error ? caught.message : "O detalhe desta conta não abriu.");
        }
      })
      .finally(() => {
        if (active) {
          setDetailPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [openId, session]);

  if (!session || session.user.role !== "admin") {
    return <Redirect href="/account" />;
  }

  const token = session.token;

  async function togglePlan(user: AdminAccount, next: "free" | "pro") {
    void tap("medium");
    setBusy(true);
    setError(null);
    try {
      const updated = await setAdminUserPlan(token, user.id, next);
      setUsers((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      if (detail?.user.id === updated.id) {
        setDetail({ ...detail, user: { ...detail.user, ...updated } });
      }
      setConfirmPlan(null);
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
      setError(caught instanceof Error ? caught.message : "O dia de folga não mudou.");
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
        dek="Hoje é a máquina. Contas é quem estuda. A senha não aparece aqui."
      />
      <AdminSegment
        value={segment}
        options={[
          { id: "hoje", label: "Hoje" },
          { id: "contas", label: "Contas" },
        ]}
        onChange={setSegment}
      />
      {error ? (
        <Text accessibilityRole="alert" className="mt-6 text-base text-roseInk">
          {error}
        </Text>
      ) : null}

      {segment === "hoje" ? (
        boardPending && !board ? (
          <View className="mt-8 gap-4" accessibilityLabel="Carregando a operação de hoje">
            <View className="h-16 rounded-[28px] bg-line" />
            <View className="h-16 rounded-[28px] bg-line" />
            <View className="h-40 rounded-[28px] bg-line" />
          </View>
        ) : board ? (
          <>
            <View className="mt-8">
              <Text className="font-label text-sm text-muted">Contas</Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <Stat label="Total" value={board.users} />
                <Stat label="Pro" value={board.pro} />
                <Stat label="Grátis" value={board.free} />
              </View>
            </View>
            <View className="mt-8">
              <Text className="font-label text-sm text-muted">Uso de hoje</Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <Stat label="Lições" value={board.lessons_today} />
                <Stat label="Duelos" value={board.duels_today} />
                <Stat label="Áudios" value={board.audio_today} />
              </View>
            </View>
            {board.cost.calls > 0 ? (
              <View className="mt-8">
                <Text className="font-label text-sm text-muted">Custo de hoje</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  <Stat label="Gasto" value={`$${(board.cost.cost_micros / 1_000_000).toFixed(3)}`} />
                  <Stat
                    label="Por sessão"
                    value={
                      board.cost.per_session_micros == null
                        ? "—"
                        : `$${(board.cost.per_session_micros / 1_000_000).toFixed(3)}`
                    }
                  />
                  <Stat label="Cache" value={`${board.cost.cache_hits}/${board.cost.calls}`} />
                </View>
              </View>
            ) : null}
            <View className="mt-8">
              <Text className="font-label text-sm text-muted">Saúde</Text>
              <View className="mt-3 flex-row flex-wrap gap-3">
                <Stat label="Modelo falhou" value={board.gemini_errors_today} />
                <Stat label="Geração" value={board.generation_paused ? "Pausada" : "Ligada"} />
              </View>
            </View>

            <View className="mt-8 rounded-[28px] border border-line bg-card px-5 py-5">
              <Text className="font-label text-sm text-muted">Máquina</Text>
              <Text className="mt-2 font-display text-2xl text-ink">{board.generation_paused ? "Geração pausada" : "Geração ligada"}</Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                {board.generation_paused
                  ? "Nenhuma lição nova sai do modelo. O cache e a última notícia continuam."
                  : "Lacuna, mnemônica e tema curto vão no Groq. Prosa, diário e prova ficam no Gemini. Se o Gemini falhar, Groq e OpenRouter entram."}
              </Text>
              <Text className="mt-4 text-base leading-7 text-ink">
                Stripe {board.stripe_configured ? "ligada" : "desligada"} · Gemini {board.gemini_configured ? "com chave" : "sem chave"}
                {" · "}
                Groq {board.groq_configured ? "com chave" : "sem chave"}
                {" · "}
                OpenRouter {board.openrouter_configured ? "com chave" : "sem chave"}
              </Text>
              <Text className="mt-2 text-base leading-6 text-muted">
                Sem Stripe o checkout avisa o aluno. Sem nenhum modelo a geração devolve 503.
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

            <OpsChart series={board.series} />

            <View className="mt-10">
              <Text className="font-displayItalic text-headline text-ink">Eventos</Text>
              <Text className="mt-2 text-base leading-6 text-muted">Falhas do modelo, pausa, áudio e plano.</Text>
              <View accessibilityRole="radiogroup" className="mt-4 flex-row flex-wrap gap-2">
                {(["all", "gemini", "lesson", "audio", "news", "billing"] as const).map((item) => {
                  const selected = item === eventKind;
                  const label = item === "all" ? "Todos" : EVENT_KIND[item];
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ selected, checked: selected }}
                      onPress={() => setEventKind(item)}
                      className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                    >
                      <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="mt-4 gap-3">
                {eventsPending ? <Text className="text-base text-muted">Carregando os eventos.</Text> : null}
                {!eventsPending && events.length === 0 ? <Text className="text-base text-muted">Nenhum evento ainda.</Text> : null}
                {events.map((event) => (
                  <View key={event.id} className="rounded-[24px] border border-line bg-card px-4 py-4">
                    <Text className="font-label text-sm text-ember">
                      {EVENT_KIND[event.kind]} · {EVENT_STATUS[event.status]}
                    </Text>
                    <Text className="mt-1 text-base text-ink">{event.message}</Text>
                    {event.detail ? <Text className="mt-1 text-sm leading-6 text-muted">{event.detail}</Text> : null}
                    <Text className="mt-1 text-sm text-muted">{new Date(event.created_at).toLocaleString("pt-BR")}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null
      ) : (
        <>
          <View className="mt-8 max-w-md">
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
              const label = item === "all" ? "Todos os planos" : item === "pro" ? "Pro" : "Grátis";
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => setPlanFilter(item)}
                  className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                >
                  <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>
                    {item === "all" ? "Todos" : item === "pro" ? "Pro" : "Grátis"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
            {(["all", "learner", "admin"] as const).map((item) => {
              const selected = item === roleFilter;
              const label = item === "all" ? "Todos os papéis" : item === "admin" ? "Admin" : "Aluno";
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => setRoleFilter(item)}
                  className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                >
                  <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-4 text-base leading-6 text-muted">Até 80 contas nesta lista.</Text>
          {usersPending ? <Text className="mt-6 text-base text-muted">Carregando as contas.</Text> : null}
          <View className="mt-6 gap-4">
            {users.map((user) => {
              const open = openId === user.id;
              const pendingPlan = confirmPlan?.id === user.id ? confirmPlan.next : null;
              return (
                <View key={user.id} className="rounded-[28px] border border-line bg-card px-5 py-5">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`Detalhe de ${user.email}`}
                    onPress={() => {
                      setConfirmPlan(null);
                      setOpenId(open ? null : user.id);
                    }}
                  >
                    <Text className="font-label text-base text-ink">{user.email}</Text>
                    <Text className="mt-2 text-sm leading-6 text-muted">
                      {user.target_lang.toUpperCase()} por {user.native_lang.toUpperCase()} · {user.plan === "pro" ? "Pro" : "grátis"} · sequência {user.streak_count}
                    </Text>
                  </Pressable>
                  {open ? (
                    <View className="mt-5 border-t border-line pt-4">
                      <Text className="text-base leading-6 text-muted">
                        {user.level} · {user.role === "admin" ? "admin" : "aluno"} · {user.lesson_count} lições · {user.streak_freeze_count}{" "}
                        {user.streak_freeze_count === 1 ? "dia de folga" : "dias de folga"}
                      </Text>
                      <Text className="mt-2 text-base leading-6 text-muted">
                        Criada em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        {user.last_lesson_at ? ` · última lição ${new Date(user.last_lesson_at).toLocaleDateString("pt-BR")}` : ""}
                      </Text>
                      {detailPending ? <Text className="mt-3 text-base text-muted">Abrindo o histórico.</Text> : null}
                      {detailError ? (
                        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
                          {detailError}
                        </Text>
                      ) : null}
                      {detail?.user.id === user.id ? (
                        <>
                          <Text className="mt-2 text-base leading-6 text-muted">
                            Duelos {detail.duels.total} · melhor {detail.duels.best}
                          </Text>
                          {detail.lessons.length === 0 ? (
                            <Text className="mt-3 text-base text-muted">Nenhuma lição gravada.</Text>
                          ) : (
                            detail.lessons.map((lesson) => (
                              <Text key={`${lesson.lesson_date}-${lesson.title}`} className="mt-2 text-base leading-6 text-ink">
                                {lesson.lesson_date} · {lesson.title} · {lesson.target_lang.toUpperCase()}
                              </Text>
                            ))
                          )}
                        </>
                      ) : null}
                      <View className="mt-5 flex-row flex-wrap gap-2">
                        {pendingPlan ? (
                          <>
                            <ChunkButton
                              label={pendingPlan === "pro" ? "Confirmar, passar para Pro" : "Confirmar, passar para grátis"}
                              onPress={() => void togglePlan(user, pendingPlan)}
                              disabled={busy}
                            />
                            <ChunkButton label="Cancelar" onPress={() => setConfirmPlan(null)} tone="ghost" disabled={busy} />
                          </>
                        ) : (
                          <ChunkButton
                            label={user.plan === "pro" ? "Passar para grátis" : "Passar para Pro"}
                            onPress={() => setConfirmPlan({ id: user.id, next: user.plan === "pro" ? "free" : "pro" })}
                            disabled={busy}
                          />
                        )}
                        <ChunkButton label="Dar dia de folga" onPress={() => void changeFreeze(user, 1)} tone="moss" disabled={busy} />
                        <ChunkButton
                          label="Tirar dia de folga"
                          onPress={() => void changeFreeze(user, -1)}
                          tone="ghost"
                          disabled={busy || user.streak_freeze_count <= 0}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {!usersPending && users.length === 0 ? <Text className="text-base leading-7 text-muted">Nenhuma conta com este filtro. Tente outro e-mail ou limpe o plano.</Text> : null}
          </View>
        </>
      )}
    </AppFrame>
  );
}
