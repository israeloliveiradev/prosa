import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { fetchCognates } from "@/lib/api";
import type { CognateAnchor } from "@/lib/types";

export function CognatePreview({ through, target }: { through: string; target: string }) {
  const [anchors, setAnchors] = useState<CognateAnchor[]>([]);

  useEffect(() => {
    let active = true;
    void fetchCognates(through, target)
      .then((items) => {
        if (active) {
          setAnchors(items);
        }
      })
      .catch(() => {
        if (active) {
          setAnchors([]);
        }
      });
    return () => {
      active = false;
    };
  }, [through, target]);

  const familiar = anchors.filter((item) => item.kind === "true").slice(0, 8);
  const traps = anchors.filter((item) => item.kind === "false").slice(0, 4);
  if (familiar.length === 0) {
    return null;
  }

  return (
    <View className="rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-sm text-ember">Você já conhece</Text>
      <Text className="mt-2 text-base leading-7 text-muted">No A1, as primeiras histórias usam palavras parecidas com as suas e verbos muito comuns.</Text>
      <Text className="mt-4 text-base leading-7 text-ink">{familiar.map((item) => `${item.word} · ${item.familiar}`).join("\n")}</Text>
      {traps.length > 0 ? (
        <View className="mt-4">
          <Text className="font-label text-sm text-ink">Falsos amigos</Text>
          {traps.map((item) => (
            <Text key={item.word} className="mt-2 text-base leading-6 text-muted">
              {item.word} parece {item.familiar}, mas quer dizer {item.gloss}.
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
