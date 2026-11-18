import { useState } from "react";
import { View, Text, Pressable, ScrollView, Image, Platform } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";

const EINSTEIN_AVATAR = "/cast/einstein.png";

interface CardData {
  id: number;
  level: string;
  indexText: string;
  retention: string;
  targetPhrase: string;
  phonetics: string;
  translation: string;
  culturalNote: string;
  interval: string;
}

const SAMPLE_CARDS: CardData[] = [
  {
    id: 14,
    level: "🇩🇪 A2.2",
    indexText: "Cartão #14 de 28",
    retention: "89%",
    targetPhrase: "“Die Gedanken sind frei und fliegen wie der Wind.”",
    phonetics: "[dee geh-dan-ken zint fry oont flee-gen vee dayr vint]",
    translation: "“Os pensamentos são livres e voam como o vento.”",
    culturalNote:
      "💡 Provérbio popular folclórico alemão do século XVIII sobre liberdade individual.",
    interval: "1 dia atrás",
  },
  {
    id: 15,
    level: "🇩🇪 B1.1",
    indexText: "Cartão #15 de 28",
    retention: "92%",
    targetPhrase: "“Übung macht den Meister, wenn man beharrlich bleibt.”",
    phonetics: "[ee-boong mahkht dayn mys-ter ven mahn beh-har-likh blypt]",
    translation: "“A prática faz o mestre, quando se é perseverante.”",
    culturalNote:
      "💡 Expressão alemã correspondente a 'A prática leva à perfeição'.",
    interval: "3 dias atrás",
  },
];

export function DailySessionScreen() {
  const session = useSession();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isRevealed, setIsRevealed] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const card = SAMPLE_CARDS[currentCardIdx] || SAMPLE_CARDS[0];

  const handleRate = (points: number) => {
    void tap("light");
    if (currentCardIdx < SAMPLE_CARDS.length - 1) {
      setCurrentCardIdx((prev) => prev + 1);
    } else {
      setCurrentCardIdx(0);
    }
  };

  const handlePlayAudio = () => {
    void tap("medium");
    setAudioPlaying(true);
    if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Die Gedanken sind frei und fliegen wie der Wind.");
      utterance.lang = "de-DE";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => setAudioPlaying(false), 2000);
  };

  const phases = [
    { num: 1, label: "FSRS Cards", icon: "🎴" },
    { num: 2, label: "Áudio & Ritmo", icon: "🎧" },
    { num: 3, label: "Sintaxe", icon: "📖" },
    { num: 4, label: "Cadência", icon: "🎙️" },
    { num: 5, label: "Reconstrução", icon: "🧩" },
  ];

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: "#FDFBF7" }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          maxWidth: 1380,
          width: "100%",
          marginHorizontal: "auto",
          paddingHorizontal: 24,
          paddingVertical: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ======================================================== */}
        {/* 1. TOP SESSION PHASE NAVIGATION BAR                      */}
        {/* ======================================================== */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 16,
            borderWidth: 2,
            borderColor: "#E2E8F0",
            boxShadow: "0 4px 0 #CBD5E1",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Phase Stepper Pills */}
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {phases.map((ph, idx) => {
              const active = idx === phaseIndex;
              return (
                <Pressable
                  key={ph.num}
                  accessibilityRole="button"
                  onPress={() => {
                    void tap("light");
                    setPhaseIndex(idx);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor: active ? "#00685F" : "#F5F0E8",
                    borderWidth: 1,
                    borderColor: active ? "#0F766E" : "#E2E8F0",
                    boxShadow: active ? "0 3px 0 #0F766E" : "0 2px 0 #CBD5E1",
                    cursor: "pointer",
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{ph.icon}</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: active ? "#FFFFFF" : "#111C2D",
                    }}
                  >
                    {ph.num}. {ph.label}
                  </Text>
                  {active ? (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#10B981",
                      }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Cronômetro e 2x XP */}
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: "#F5F0E8",
                borderWidth: 1,
                borderColor: "#CBD5E1",
                boxShadow: "0 2px 0 #CBD5E1",
              }}
            >
              <Text style={{ fontSize: 14 }}>⏱️</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#111C2D",
                }}
              >
                08:45
              </Text>
              <Text style={{ fontSize: 11, color: "#64748B" }}>/ 20:00</Text>
            </View>

            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: "rgba(255, 87, 34, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(255, 87, 34, 0.3)",
                boxShadow: "0 2px 0 rgba(255, 87, 34, 0.15)",
              }}
            >
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: "#FF5722",
                }}
              >
                2x XP Ativo
              </Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 2. WORKSPACE CENTRAL SPLIT (DESKTOP 7:5 ROW)             */}
        {/* ======================================================== */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 28,
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          {/* ====================================================== */}
          {/* COLUNA ESQUERDA: FLASHCARD 3D FSRS STUDIO (7 COLS)     */}
          {/* ====================================================== */}
          <View
            style={{
              flex: 7,
              minWidth: 420,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* O Cartão 3D Tátil */}
            <View
              style={{
                width: "100%",
                minHeight: 390,
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 0 #CBD5E1",
                borderWidth: 2,
                borderColor: "#E2E8F0",
              }}
            >
              {/* Cabeçalho do Card */}
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: 2,
                  borderBottomColor: "#F5F0E8",
                  paddingBottom: 14,
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: "#E7EEFF",
                      borderWidth: 1,
                      borderColor: "#D8E3FB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: "#00685F",
                      }}
                    >
                      {card.level}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#64748B",
                    }}
                  >
                    {card.indexText}
                  </Text>
                </View>

                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      backgroundColor: "rgba(16, 185, 129, 0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>🎯</Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#059669",
                      }}
                    >
                      FSRS Retenção: {card.retention}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ouvir Áudio"
                    onPress={handlePlayAudio}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: audioPlaying ? "#00685F" : "#F5F0E8",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 0 #CBD5E1",
                      cursor: "pointer",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{audioPlaying ? "🔊" : "🔈"}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Conteúdo Central */}
              <View
                style={{
                  paddingVertical: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <View style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      fontWeight: "800",
                      letterSpacing: 1,
                      color: "#64748B",
                    }}
                  >
                    Frase Alvo (Alemão)
                  </Text>
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: "800",
                      color: "#111C2D",
                      lineHeight: 34,
                      letterSpacing: -0.5,
                    }}
                  >
                    {card.targetPhrase}
                  </Text>
                </View>

                {/* Pronúncia Fonética */}
                <View
                  style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: "#F5F0E8",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#00685F" }}>🎙️</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3D4947",
                      fontFamily: "monospace",
                    }}
                  >
                    {card.phonetics}
                  </Text>
                </View>

                {/* Tradução e Contexto */}
                {isRevealed ? (
                  <View
                    style={{
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderStyle: "dashed",
                      borderTopColor: "#CBD5E1",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        fontWeight: "800",
                        letterSpacing: 1,
                        color: "#64748B",
                      }}
                    >
                      Português (Contexto)
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#00685F",
                        marginTop: 4,
                      }}
                    >
                      {card.translation}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      {card.culturalNote}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Barra Inferior do Card */}
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  borderTopWidth: 2,
                  borderTopColor: "#F5F0E8",
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>⏱️</Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      fontWeight: "600",
                    }}
                  >
                    Intervalo anterior: {card.interval}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsRevealed(!isRevealed)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#00685F",
                    }}
                  >
                    {isRevealed
                      ? "Ocultar Reverso"
                      : "Alternar Reverso (Espaço)"}{" "}
                    👁️
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ==================================================== */}
            {/* 4 CHUNKY 3D TACTILE BUTTONS SIDE-BY-SIDE IN ONE ROW  */}
            {/* ==================================================== */}
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 12,
                width: "100%",
              }}
            >
              {/* Errei */}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRate(1)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#FECACA",
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 0 #EF4444",
                  cursor: "pointer",
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#EF4444",
                    marginBottom: 4,
                  }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: "#111C2D" }}
                >
                  Errei
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  1m · [1]
                </Text>
              </Pressable>

              {/* Difícil */}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRate(2)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#FDE68A",
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 0 #D97706",
                  cursor: "pointer",
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#F59E0B",
                    marginBottom: 4,
                  }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: "#111C2D" }}
                >
                  Difícil
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  12h · [2]
                </Text>
              </Pressable>

              {/* Bom */}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRate(3)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#A7F3D0",
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 0 #10B981",
                  cursor: "pointer",
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#10B981",
                    marginBottom: 4,
                  }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: "#111C2D" }}
                >
                  Bom
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  3d · [3]
                </Text>
              </Pressable>

              {/* Fácil */}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRate(4)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#A5F3FC",
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 0 #06B6D4",
                  cursor: "pointer",
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#06B6D4",
                    marginBottom: 4,
                  }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: "#111C2D" }}
                >
                  Fácil
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  7d · [4]
                </Text>
              </Pressable>
            </View>

            {/* Shortcuts Bar */}
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: "#F5F0E8",
                borderWidth: 1,
                borderColor: "#CBD5E1",
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#111C2D",
                    }}
                  >
                    1-4
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#64748B" }}>Avaliar</Text>
              </View>

              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#111C2D",
                    }}
                  >
                    Espaço
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  Tocar Áudio
                </Text>
              </View>

              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#111C2D",
                    }}
                  >
                    Enter
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#64748B" }}>Próximo</Text>
              </View>
            </View>
          </View>

          {/* ====================================================== */}
          {/* COLUNA DIREITA: ANÁLISE & COMPANION (5 COLS)           */}
          {/* ====================================================== */}
          <View
            style={{
              flex: 5,
              minWidth: 360,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Widget 1: Decomposição Sintática (4 Partes) */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 22,
                boxShadow: "0 4px 0 #CBD5E1",
                borderWidth: 2,
                borderColor: "#E2E8F0",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>📖</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    Decomposição Sintática
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 9999,
                    backgroundColor: "rgba(0, 104, 95, 0.1)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#00685F",
                    }}
                  >
                    4 Partes
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: "#64748B" }}>
                Observe como as funções gramaticais se encaixam como blocos táteis:
              </Text>

              {/* 2x2 Grid de Fichas Sintáticas */}
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  paddingTop: 4,
                }}
              >
                {/* Sujeito */}
                <View
                  style={{
                    flex: 1,
                    minWidth: "46%",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#E7EEFF",
                    borderWidth: 2,
                    borderColor: "#BAE6FD",
                    boxShadow: "0 3px 0 #CBD5E1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        fontWeight: "900",
                        color: "#0284C7",
                      }}
                    >
                      Sujeito (Nom.)
                    </Text>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#0284C7",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    Die Gedanken
                  </Text>
                  <Text style={{ fontSize: 10, color: "#64748B" }}>
                    Plural / Artigo Det.
                  </Text>
                </View>

                {/* Verbo */}
                <View
                  style={{
                    flex: 1,
                    minWidth: "46%",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#FEF3C7",
                    borderWidth: 2,
                    borderColor: "#FDE68A",
                    boxShadow: "0 3px 0 #CBD5E1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        fontWeight: "900",
                        color: "#D97706",
                      }}
                    >
                      Verbo (Posição 2)
                    </Text>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#D97706",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    sind
                  </Text>
                  <Text style={{ fontSize: 10, color: "#64748B" }}>
                    Sein (3ª pl. Pres.)
                  </Text>
                </View>

                {/* Predicativo */}
                <View
                  style={{
                    flex: 1,
                    minWidth: "46%",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#ECFDF5",
                    borderWidth: 2,
                    borderColor: "#A7F3D0",
                    boxShadow: "0 3px 0 #CBD5E1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        fontWeight: "900",
                        color: "#10B981",
                      }}
                    >
                      Predicativo
                    </Text>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#10B981",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    frei
                  </Text>
                  <Text style={{ fontSize: 10, color: "#64748B" }}>
                    Adjetivo invariável
                  </Text>
                </View>

                {/* Conector */}
                <View
                  style={{
                    flex: 1,
                    minWidth: "46%",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#F5F3FF",
                    borderWidth: 2,
                    borderColor: "#DDD6FE",
                    boxShadow: "0 3px 0 #CBD5E1",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        fontWeight: "900",
                        color: "#8B5CF6",
                      }}
                    >
                      Conector
                    </Text>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#8B5CF6",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    und fliegen...
                  </Text>
                  <Text style={{ fontSize: 10, color: "#64748B" }}>
                    Coordenação direta
                  </Text>
                </View>
              </View>
            </View>

            {/* Widget 2: Radar de Cadência Real-time */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 22,
                boxShadow: "0 4px 0 #CBD5E1",
                borderWidth: 2,
                borderColor: "#E2E8F0",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🎙️</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    Radar de Cadência
                  </Text>
                </View>
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 9999,
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#059669",
                    }}
                  >
                    ✓ 96% Ritmo
                  </Text>
                </View>
              </View>

              {/* Waveform Visualizer Mockup SVG */}
              <View
                style={{
                  backgroundColor: "#18181B",
                  borderRadius: 18,
                  padding: 14,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#6BD8CB",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#E4E4E7",
                      }}
                    >
                      Nativo (Berlim)
                    </Text>
                  </View>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#FEA619",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#E4E4E7",
                      }}
                    >
                      Sua Pronúncia
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    width: "100%",
                    height: 75,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Svg
                    width="100%"
                    height={75}
                    viewBox="0 0 400 75"
                    fill="none"
                  >
                    {/* Onda Nativa (Teal) */}
                    <Path
                      d="M0,38 Q25,8 50,38 T100,38 T150,5 T200,38 T250,70 T300,38 T350,15 T400,38"
                      stroke="#6bd8cb"
                      strokeWidth={2.5}
                      opacity={0.9}
                    />
                    {/* Onda do Aluno (Amber Tracejado) */}
                    <Path
                      d="M0,38 Q25,12 50,38 T100,36 T150,10 T200,40 T250,66 T300,38 T350,20 T400,38"
                      stroke="#fea619"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      opacity={0.8}
                    />
                    <Circle cx="150" cy="10" r="3.5" fill="#fea619" />
                    <Circle cx="250" cy="66" r="3.5" fill="#fea619" />
                    <Circle cx="350" cy="20" r="3.5" fill="#6bd8cb" />
                  </Svg>
                </View>

                <View
                  style={{
                    marginTop: 4,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#A1A1AA",
                      fontFamily: "monospace",
                    }}
                  >
                    0.0s
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#A1A1AA",
                      fontFamily: "monospace",
                    }}
                  >
                    1.2s (Pausa Natural)
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#A1A1AA",
                      fontFamily: "monospace",
                    }}
                  >
                    2.8s
                  </Text>
                </View>
              </View>

              {/* Micro feedback */}
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  borderRadius: 14,
                  backgroundColor: "#F5F0E8",
                }}
              >
                <Text style={{ fontSize: 13, color: "#10B981" }}>✓</Text>
                <Text style={{ fontSize: 12, color: "#3D4947" }}>
                  Excelente controle do tempo na consoante oclusiva ‘frei und’.
                </Text>
              </View>
            </View>

            {/* Widget 3: Albert Einstein Live Companion Dock */}
            <View
              style={{
                backgroundColor: "#F5F0E8",
                borderRadius: 24,
                padding: 18,
                boxShadow: "0 4px 0 #CBD5E1",
                borderWidth: 2,
                borderColor: "#CBD5E1",
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <View style={{ position: "relative", flexShrink: 0 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "#FEA619",
                  }}
                >
                  <Image
                    source={{ uri: EINSTEIN_AVATAR }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <View
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#FF5722",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 10, color: "#FFFFFF" }}>👍</Text>
                </View>
              </View>

              <View
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#111C2D",
                    }}
                  >
                    Albert Einstein
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#CBD5E1",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color: "#855300",
                        textTransform: "uppercase",
                      }}
                    >
                      Mentor em Foco
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#3D4947",
                    fontStyle: "italic",
                    lineHeight: 18,
                  }}
                >
                  “Fantástico{session?.user?.display_name ? `, ${session.user.display_name.split(" ")[0]}` : ""}! A velocidade e a ressonância da sua fala
                  estão relativos à velocidade da luz! Mantenha essa precisão.”
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
