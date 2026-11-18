import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { kv } from "@/lib/kv";

export type TypeScale = "default" | "large";

const TYPE_KEY = "prosa.type.v1";
const FOCUS_KEY = "prosa.focus.v1";

let typeScale: TypeScale = "default";
let focusLesson = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function applyTypeScale(next: TypeScale): void {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("type-large", next === "large");
}

export function hydratePrefs(): void {
  typeScale = kv.getString(TYPE_KEY) === "large" ? "large" : "default";
  focusLesson = kv.getString(FOCUS_KEY) === "on";
  applyTypeScale(typeScale);
}

export function getTypeScale(): TypeScale {
  return typeScale;
}

export function setTypeScale(next: TypeScale): void {
  typeScale = next;
  kv.set(TYPE_KEY, next);
  applyTypeScale(next);
  emit();
}

export function getFocusLesson(): boolean {
  return focusLesson;
}

export function setFocusLesson(next: boolean): void {
  focusLesson = next;
  kv.set(FOCUS_KEY, next ? "on" : "off");
  emit();
}

export function prefersReducedMotion(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefs() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => `${typeScale}:${focusLesson ? "1" : "0"}`,
    () => `${typeScale}:${focusLesson ? "1" : "0"}`,
  );
  const [scale, focus] = snapshot.split(":");
  return {
    typeScale: (scale === "large" ? "large" : "default") as TypeScale,
    focusLesson: focus === "1",
    setTypeScale,
    setFocusLesson,
    reducedMotion: prefersReducedMotion(),
  };
}

export function passwordStrength(password: string): "weak" | "ok" | "strong" {
  if (password.length < 8) {
    return "weak";
  }
  const mixed = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const number = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && mixed && number && symbol) {
    return "strong";
  }
  if (password.length >= 8 && (mixed || number)) {
    return "ok";
  }
  return "weak";
}

hydratePrefs();
