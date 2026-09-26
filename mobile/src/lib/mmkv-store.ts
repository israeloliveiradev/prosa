import { createMMKV, type MMKV } from "react-native-mmkv";

let db: MMKV | null = null;

function store(): MMKV {
  if (!db) {
    db = createMMKV({ id: "prosa" });
  }
  return db;
}

export const kv = {
  getString(key: string): string | undefined {
    return store().getString(key);
  },
  set(key: string, value: string): void {
    store().set(key, value);
  },
  delete(key: string): void {
    store().remove(key);
  },
};
