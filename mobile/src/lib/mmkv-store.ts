const memoryStore = new Map<string, string>();

interface StorageLike {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

let db: StorageLike | null = null;

function store(): StorageLike {
  if (!db) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mmkvModule = require("react-native-mmkv");
      if (typeof mmkvModule.createMMKV === "function") {
        db = mmkvModule.createMMKV({ id: "prosa" });
      }
    } catch {
      // Em ambiente de teste unitário (Node/Playwright), o módulo nativo MMKV não está presente
    }
    if (!db) {
      const hasLocalStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
      db = {
        getString(key: string): string | undefined {
          if (hasLocalStorage) {
            try {
              const val = window.localStorage.getItem(key);
              return val === null ? undefined : val;
            } catch {
              return memoryStore.get(key);
            }
          }
          return memoryStore.get(key);
        },
        set(key: string, value: string): void {
          if (hasLocalStorage) {
            try {
              window.localStorage.setItem(key, value);
            } catch {}
          }
          memoryStore.set(key, value);
        },
        remove(key: string): void {
          if (hasLocalStorage) {
            try {
              window.localStorage.removeItem(key);
            } catch {}
          }
          memoryStore.delete(key);
        },
      };
    }
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
