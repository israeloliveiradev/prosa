import { createHash } from "node:crypto";

export function normalizeTopic(topic: string): string {
  return topic.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function lessonCacheHash(
  targetLang: string,
  level: string,
  topic: string,
  interests: readonly string[] = [],
  throughLang = "",
  cognate = false,
): string {
  const topicHash = createHash("sha256").update(normalizeTopic(topic)).digest("hex");
  const through = throughLang.trim().toLowerCase();
  const base = through
    ? `${targetLang.toLowerCase()}:${level}:${topicHash}:from:${through}`
    : `${targetLang.toLowerCase()}:${level}:${topicHash}`;
  const normalized = interests.map((item) => normalizeTopic(item)).filter((item) => item.length > 0).sort();
  const withInterests =
    normalized.length === 0 ? base : `${base}:i:${createHash("sha256").update(normalized.join("|")).digest("hex").slice(0, 16)}`;
  return cognate ? `${withInterests}:cognate` : withInterests;
}
