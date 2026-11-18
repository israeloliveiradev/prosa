import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import { isListenRate, type ListenRate } from "@/lib/listen-pace";

const STORAGE_KEY = "prosa.listen-rate.v1";
const listeners = new Set<() => void>();
let rate: ListenRate = readRate();

function readRate(): ListenRate {
  const raw = Number(kv.getString(STORAGE_KEY));
  return isListenRate(raw) ? raw : 1;
}

export function listenRate(): ListenRate {
  return rate;
}

export function setListenRate(next: ListenRate): void {
  if (next === rate) {
    return;
  }
  rate = next;
  kv.set(STORAGE_KEY, String(next));
  for (const listener of listeners) {
    listener();
  }
}

export function useListenRate(): ListenRate {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => rate,
    () => 1,
  );
}
