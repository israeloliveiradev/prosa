import { Redirect } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { OpsChart } from "@/components/admin/ops-chart";
import { AdminChip, AdminSegment } from "@/components/admin/segment";
import { Stat } from "@/components/admin/stat";
import { fill } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { tactile } from "@/components/tactile/tokens";
import {
  ADMIN_DENIED,
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
import { ADMIN } from "@/lib/copy/admin";
import { useAreaCopy } from "@/lib/copy/area";
import { tap } from "@/lib/haptics";
import { useLocale, type DisplayLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

type Segment = "hoje" | "contas";
type PlanFilter = "all" | "free" | "pro";
type RoleFilter = "all" | "learner" | "admin";
type EventKind = "all" | AdminEvent["kind"];

const DATE_TAG: Record<DisplayLocale, string> = {
  pt: "pt-BR",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  ja: "ja",
};

const KICKER = { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: tactile.primary } as const;
const SECTION = { fontSize: 13, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: tactile.muted } as const;
const BODY = { fontSize: 15, lineHeight: 22, color: tactile.muted } as const;

export default function AdminScreen() {
  const t = useAreaCopy(ADMIN);
  const locale = useLocale();
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

  const tag = DATE_TAG[locale];
  const eventKindLabel: Record<AdminEvent["kind"], string> = {
    gemini: t.kindGemini,
    lesson: t.kindLesson,
    audio: t.kindAudio,
    news: t.kindNews,
    billing: t.kindBilling,
  };
  const eventStatusLabel: Record<AdminEvent["status"], string> = { ok: t.statusOk, error: t.statusError, paused: t.statusPaused };

  /** Texto do erro: o 403 estável vira a mensagem de acesso negado, o resto usa o texto da ação. */
  function failure(caught: unknown, fallback: string): string {
    return caught instanceof Error && caught.message === ADMIN_DENIED ? t.errDenied : fallback;
  }

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
          setError(failure(caught, t.errBoard));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, t.errBoard]);

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
          setError(failure(caught, t.errEvents));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, segment, eventKind, t.errEvents]);

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
          setError(failure(caught, t.errUsers));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, segment, debounced, planFilter, roleFilter, t.errUsers]);

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
          setDetailError(failure(caught, t.errDetail));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, session, t.errDetail]);

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
      setError(failure(caught, t.errPlan));
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
      setError(failure(caught, t.errFreeze));
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
      setError(failure(caught, t.errSwitch));
    } finally {
      setBusy(false);
    }
  }

  const money = (micros: number) => `$${(micros / 1_000_000).toFixed(3)}`;
  const keyState = (on: boolean, yes: string, no: string) => (on ? yes : no);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 24, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 992, alignSelf: "center", paddingHorizontal: 16, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={KICKER}>{t.kicker}</Text>
          <Text accessibilityRole="header" className="font-display text-3xl font-extrabold" style={{ color: tactile.ink }}>
            {t.title}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: tactile.body, maxWidth: 640 }}>{t.dek}</Text>
        </View>

        <AdminSegment
          value={segment}
          options={[
            { id: "hoje", label: t.tabToday },
            { id: "contas", label: t.tabAccounts },
          ]}
          onChange={setSegment}
        />
        {error ? (
          <Text accessibilityRole="alert" style={{ fontSize: 15, color: tactile.danger }}>
            {error}
          </Text>
        ) : null}

        {segment === "hoje" ? (
          boardPending && !board ? (
            <View style={{ gap: 16 }} accessibilityLabel={t.loadingBoard}>
              {[64, 64, 160].map((height, index) => (
                <View key={index} style={{ height, borderRadius: 16, backgroundColor: tactile.raised }} />
              ))}
            </View>
          ) : board ? (
            <>
              <View style={{ gap: 10 }}>
                <Text style={SECTION}>{t.accountsH}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <Stat label={t.total} value={board.users} />
                  <Stat label={t.pro} value={board.pro} />
                  <Stat label={t.free} value={board.free} />
                </View>
              </View>
              <View style={{ gap: 10 }}>
                <Text style={SECTION}>{t.usageH}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <Stat label={t.lessons} value={board.lessons_today} />
                  <Stat label={t.duels} value={board.duels_today} />
                  <Stat label={t.audios} value={board.audio_today} />
                </View>
              </View>
              {board.cost.calls > 0 ? (
                <View style={{ gap: 10 }}>
                  <Text style={SECTION}>{t.costH}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    <Stat label={t.spent} value={money(board.cost.cost_micros)} />
                    <Stat
                      label={t.perSession}
                      value={board.cost.per_session_micros == null ? "—" : money(board.cost.per_session_micros)}
                    />
                    <Stat label={t.cache} value={`${board.cost.cache_hits}/${board.cost.calls}`} />
                  </View>
                </View>
              ) : null}
              <View style={{ gap: 10 }}>
                <Text style={SECTION}>{t.healthH}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  <Stat label={t.modelFailed} value={board.gemini_errors_today} />
                  <Stat label={t.generation} value={board.generation_paused ? t.paused : t.on} />
                </View>
              </View>

              <TactileCard className="p-6" animateEntry={false}>
                <View style={{ gap: 8 }}>
                  <Text style={SECTION}>{t.machineH}</Text>
                  <Text className="font-display font-extrabold" style={{ fontSize: 22, color: tactile.ink }}>
                    {board.generation_paused ? t.genPaused : t.genOn}
                  </Text>
                  <Text style={BODY}>{board.generation_paused ? t.genPausedNote : t.genOnNote}</Text>
                  <Text style={{ fontSize: 15, lineHeight: 24, color: tactile.ink, marginTop: 8 }}>
                    {[
                      keyState(board.stripe_configured, t.stripeOn, t.stripeOff),
                      keyState(board.gemini_configured, t.geminiOn, t.geminiOff),
                      keyState(board.groq_configured, t.groqOn, t.groqOff),
                      keyState(board.openrouter_configured, t.openrouterOn, t.openrouterOff),
                    ].join(" · ")}
                  </Text>
                  <Text style={BODY}>{t.stripeNote}</Text>
                  <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
                    <TactileButton
                      label={board.generation_paused ? t.resumeBtn : t.pauseBtn}
                      variant={board.generation_paused ? "primary" : "secondary"}
                      onPress={() => void toggleGeneration()}
                      disabled={busy}
                    />
                  </View>
                </View>
              </TactileCard>

              <OpsChart series={board.series} />

              <View style={{ gap: 8 }}>
                <Text className="font-display font-extrabold" style={{ fontSize: 22, color: tactile.ink }}>
                  {t.eventsH}
                </Text>
                <Text style={BODY}>{t.eventsDek}</Text>
                <View accessibilityRole="radiogroup" style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["all", "gemini", "lesson", "audio", "news", "billing"] as const).map((item) => (
                    <AdminChip
                      key={item}
                      label={item === "all" ? t.kindAll : eventKindLabel[item]}
                      selected={item === eventKind}
                      onPress={() => setEventKind(item)}
                    />
                  ))}
                </View>
                <View style={{ marginTop: 8, gap: 10 }}>
                  {eventsPending ? <Text style={BODY}>{t.loadingEvents}</Text> : null}
                  {!eventsPending && events.length === 0 ? <Text style={BODY}>{t.noEvents}</Text> : null}
                  {events.map((event) => (
                    <TactileCard key={event.id} className="p-4" animateEntry={false}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: tactile.primary }}>
                          {eventKindLabel[event.kind]} · {eventStatusLabel[event.status]}
                        </Text>
                        <Text style={{ fontSize: 15, color: tactile.ink }}>{event.message}</Text>
                        {event.detail ? <Text style={{ fontSize: 14, lineHeight: 21, color: tactile.muted }}>{event.detail}</Text> : null}
                        <Text style={{ fontSize: 13, color: tactile.muted }}>{new Date(event.created_at).toLocaleString(tag)}</Text>
                      </View>
                    </TactileCard>
                  ))}
                </View>
              </View>
            </>
          ) : null
        ) : (
          <>
            <View style={{ maxWidth: 420, gap: 6 }}>
              <Text style={SECTION}>{t.filterEmail}</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                accessibilityLabel={t.filterEmail}
                autoCapitalize="none"
                autoComplete="off"
                placeholder={t.emailPlaceholder}
                placeholderTextColor={tactile.faint}
                style={{
                  minHeight: 52,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: tactile.border,
                  backgroundColor: tactile.surface,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: tactile.ink,
                }}
              />
            </View>
            <View style={{ gap: 10 }}>
              <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["all", "free", "pro"] as const).map((item) => (
                  <AdminChip
                    key={item}
                    label={item === "all" ? t.allPlans : item === "pro" ? t.pro : t.free}
                    selected={item === planFilter}
                    onPress={() => setPlanFilter(item)}
                  />
                ))}
              </View>
              <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["all", "learner", "admin"] as const).map((item) => (
                  <AdminChip
                    key={item}
                    label={item === "all" ? t.allRoles : item === "admin" ? t.roleAdmin : t.roleLearner}
                    selected={item === roleFilter}
                    onPress={() => setRoleFilter(item)}
                  />
                ))}
              </View>
            </View>
            <Text style={BODY}>{t.limit}</Text>
            {usersPending ? <Text style={BODY}>{t.loadingAccounts}</Text> : null}
            <View style={{ gap: 14 }}>
              {users.map((user) => {
                const open = openId === user.id;
                const pendingPlan = confirmPlan?.id === user.id ? confirmPlan.next : null;
                const planLabel = user.plan === "pro" ? t.pro : t.free;
                return (
                  <TactileCard key={user.id} className="p-5" animateEntry={false}>
                    <View>
                      <AccountHeader
                        label={fill(t.detailOf, { email: user.email })}
                        email={user.email}
                        line={fill(t.accountLine, {
                          target: user.target_lang.toUpperCase(),
                          native: user.native_lang.toUpperCase(),
                          plan: planLabel,
                          streak: user.streak_count,
                        })}
                        open={open}
                        onPress={() => {
                          setConfirmPlan(null);
                          setOpenId(open ? null : user.id);
                        }}
                      />
                      {open ? (
                        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: tactile.border, paddingTop: 14, gap: 8 }}>
                          <Text style={BODY}>
                            {fill(t.detailLine, {
                              level: user.level,
                              role: user.role === "admin" ? t.roleAdmin : t.roleLearner,
                              lessons: user.lesson_count,
                              freezes: fill(user.streak_freeze_count === 1 ? t.freezeOne : t.freezeMany, { n: user.streak_freeze_count }),
                            })}
                          </Text>
                          <Text style={BODY}>
                            {fill(t.createdOn, { date: new Date(user.created_at).toLocaleDateString(tag) })}
                            {user.last_lesson_at
                              ? ` · ${fill(t.lastLesson, { date: new Date(user.last_lesson_at).toLocaleDateString(tag) })}`
                              : ""}
                          </Text>
                          {detailPending ? <Text style={BODY}>{t.openingHistory}</Text> : null}
                          {detailError ? (
                            <Text accessibilityRole="alert" style={{ fontSize: 15, color: tactile.danger }}>
                              {detailError}
                            </Text>
                          ) : null}
                          {detail?.user.id === user.id ? (
                            <>
                              <Text style={BODY}>{fill(t.duelsLine, { total: detail.duels.total, best: detail.duels.best })}</Text>
                              {detail.lessons.length === 0 ? (
                                <Text style={BODY}>{t.noLessons}</Text>
                              ) : (
                                detail.lessons.map((lesson) => (
                                  <Text key={`${lesson.lesson_date}-${lesson.title}`} style={{ fontSize: 15, lineHeight: 22, color: tactile.ink }}>
                                    {lesson.lesson_date} · {lesson.title} · {lesson.target_lang.toUpperCase()}
                                  </Text>
                                ))
                              )}
                            </>
                          ) : null}
                          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            {pendingPlan ? (
                              <>
                                <TactileButton
                                  size="sm"
                                  label={pendingPlan === "pro" ? t.confirmPro : t.confirmFree}
                                  onPress={() => void togglePlan(user, pendingPlan)}
                                  disabled={busy}
                                />
                                <TactileButton size="sm" variant="ghost" label={t.cancel} onPress={() => setConfirmPlan(null)} disabled={busy} />
                              </>
                            ) : (
                              <TactileButton
                                size="sm"
                                variant="secondary"
                                label={user.plan === "pro" ? t.toFree : t.toPro}
                                onPress={() => setConfirmPlan({ id: user.id, next: user.plan === "pro" ? "free" : "pro" })}
                                disabled={busy}
                              />
                            )}
                            <TactileButton size="sm" label={t.giveFreeze} onPress={() => void changeFreeze(user, 1)} disabled={busy} />
                            <TactileButton
                              size="sm"
                              variant="ghost"
                              label={t.takeFreeze}
                              onPress={() => void changeFreeze(user, -1)}
                              disabled={busy || user.streak_freeze_count <= 0}
                            />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </TactileCard>
                );
              })}
              {!usersPending && users.length === 0 ? <Text style={BODY}>{t.noAccounts}</Text> : null}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** Cabeçalho clicável de uma conta (e-mail e resumo). */
function AccountHeader({
  label,
  email,
  line,
  open,
  onPress,
}: {
  label: string;
  email: string;
  line: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <AdminRow label={label} open={open} onPress={onPress}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: tactile.ink }}>{email}</Text>
      <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 21, color: tactile.muted }}>{line}</Text>
    </AdminRow>
  );
}

function AdminRow({ label, open, onPress, children }: { label: string; open: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label} onPress={onPress}>
      {children}
    </Pressable>
  );
}
