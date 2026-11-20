import { kv } from "@/lib/kv";

/**
 * Cache dos clipes da voz no aparelho.
 *
 * - `ClipLru`: clipes em memória (blob: URLs). Ao sair do cache, a URL é revogada.
 *   Clipes em uso (tocando) não saem.
 * - IndexedDB (`prosa-tts`/`clips`): o WAV persiste entre recarregamentos (F5) e evita
 *   sintetizar de novo o mesmo texto com a mesma voz.
 * - Registro de URLs (kv): liga uma blob: URL ao texto/idioma/voz que a gerou. Quem
 *   guardou a URL (por exemplo, a notícia salva no aparelho) continua tocando depois de
 *   um F5 ou de a URL sair do cache: o AudioService pede a URL de volta ao speechService.
 */

export interface ClipWord {
  text: string;
  offsetMs: number;
}

export function audioCacheKey(text: string, lang: string, voice: string): string {
  let hash = 5381;
  const value = `${lang}\n${voice}\n${text}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 33) ^ value.charCodeAt(index);
  }
  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

export interface LruEntry<T> {
  key: string;
  bytes: number;
  value: T;
}

/** LRU por quantidade e por bytes. `onEvict` recebe cada entrada que sai. */
export class ClipLru<T> {
  private readonly entries = new Map<string, LruEntry<T>>();
  private readonly pins = new Map<string, number>();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxBytes: number,
    private readonly onEvict: (entry: LruEntry<T>) => void,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Lê e marca como usado agora. */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  peek(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }

  set(key: string, value: T, bytes: number): void {
    const previous = this.entries.get(key);
    if (previous) {
      this.entries.delete(key);
      this.totalBytes -= previous.bytes;
      if (previous.value !== value) {
        this.onEvict(previous);
      }
    }
    const entry = { key, value, bytes: Math.max(0, bytes) };
    this.entries.set(key, entry);
    this.totalBytes += entry.bytes;
    this.trim();
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }
    this.entries.delete(key);
    this.totalBytes -= entry.bytes;
    this.onEvict(entry);
    return true;
  }

  clear(): void {
    const all = [...this.entries.values()];
    this.entries.clear();
    this.totalBytes = 0;
    for (const entry of all) {
      this.onEvict(entry);
    }
  }

  pin(key: string): void {
    this.pins.set(key, (this.pins.get(key) ?? 0) + 1);
  }

  unpin(key: string): void {
    const count = (this.pins.get(key) ?? 0) - 1;
    if (count > 0) {
      this.pins.set(key, count);
    } else {
      this.pins.delete(key);
      this.trim();
    }
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }

  private trim(): void {
    if (this.entries.size <= this.maxEntries && this.totalBytes <= this.maxBytes) {
      return;
    }
    // A entrada mais recente nunca sai: quem acabou de pedir o clipe ainda vai usar a URL.
    // Se as presas impedem o despejo, o cache passa do limite até alguma ser solta.
    const candidates = [...this.entries.values()].slice(0, -1);
    for (const entry of candidates) {
      if (this.entries.size <= this.maxEntries && this.totalBytes <= this.maxBytes) {
        return;
      }
      if (this.pins.has(entry.key)) {
        continue;
      }
      this.entries.delete(entry.key);
      this.totalBytes -= entry.bytes;
      this.onEvict(entry);
    }
  }
}

// ---------------------------------------------------------------------------
// Registro de URLs (kv): blob: URL → descrição do clipe
// ---------------------------------------------------------------------------

export interface ClipRef {
  key: string;
  text: string;
  lang: string;
  voice: string;
}

const REGISTRY_KEY = "prosa.tts.urls.v1";
const REGISTRY_LIMIT = 64;
let registry: Array<[string, ClipRef]> | null = null;
let registryTimer: ReturnType<typeof setTimeout> | null = null;

function loadRegistry(): Array<[string, ClipRef]> {
  if (registry) {
    return registry;
  }
  registry = [];
  const raw = kv.getString(REGISTRY_KEY);
  if (!raw) {
    return registry;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!Array.isArray(item) || typeof item[0] !== "string" || !item[1] || typeof item[1] !== "object") {
          continue;
        }
        const ref = item[1] as Partial<ClipRef>;
        if (typeof ref.key === "string" && typeof ref.text === "string" && typeof ref.lang === "string" && typeof ref.voice === "string") {
          registry.push([item[0], { key: ref.key, text: ref.text, lang: ref.lang, voice: ref.voice }]);
        }
      }
    }
  } catch {
    registry = [];
  }
  return registry;
}

function flushRegistry(): void {
  registryTimer = null;
  if (!registry) {
    return;
  }
  kv.set(REGISTRY_KEY, JSON.stringify(registry));
}

export function rememberClipUrl(url: string, ref: ClipRef): void {
  const list = loadRegistry().filter(([known]) => known !== url);
  list.unshift([url, ref]);
  registry = list.slice(0, REGISTRY_LIMIT);
  if (registryTimer == null) {
    registryTimer = setTimeout(flushRegistry, 400);
  }
}

export function clipRefForUrl(url: string): ClipRef | null {
  return loadRegistry().find(([known]) => known === url)?.[1] ?? null;
}

export function forgetClipUrls(): void {
  registry = [];
  if (registryTimer != null) {
    clearTimeout(registryTimer);
    registryTimer = null;
  }
  kv.delete(REGISTRY_KEY);
}

// ---------------------------------------------------------------------------
// IndexedDB: WAV persistente
// ---------------------------------------------------------------------------

export interface StoredClip {
  key: string;
  wav: Blob;
  words: ClipWord[];
  engine: string;
  voice: string;
  lang: string;
  sampleRate: number;
  durationMs: number;
  bytes: number;
  usedAt: number;
}

const DB_NAME = "prosa-tts";
const STORE = "clips";
const STORED_LIMIT = 160;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let writesSincePrune = 0;

function idb(): IDBFactory | null {
  const factory = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  return factory ?? null;
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) {
    return dbPromise;
  }
  const factory = idb();
  if (!factory) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    try {
      const request = factory.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

function isStoredClip(value: unknown): value is StoredClip {
  const clip = value as Partial<StoredClip> | null;
  return Boolean(
    clip &&
      typeof clip.key === "string" &&
      typeof Blob !== "undefined" &&
      clip.wav instanceof Blob &&
      Array.isArray(clip.words) &&
      typeof clip.sampleRate === "number" &&
      typeof clip.durationMs === "number",
  );
}

export async function loadStoredClip(key: string): Promise<StoredClip | null> {
  const db = await openDb();
  if (!db) {
    return null;
  }
  try {
    const value = await requestToPromise(db.transaction(STORE, "readonly").objectStore(STORE).get(key));
    if (!isStoredClip(value)) {
      return null;
    }
    try {
      db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...value, usedAt: Date.now() });
    } catch {
      // Só a ordem de despejo depende disto.
    }
    return value;
  } catch {
    return null;
  }
}

export async function saveStoredClip(clip: StoredClip): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    await requestToPromise(store.put(clip));
  } catch {
    return;
  }
  writesSincePrune += 1;
  if (writesSincePrune >= 10) {
    writesSincePrune = 0;
    await pruneStoredClips(STORED_LIMIT);
  }
}

export async function pruneStoredClips(limit: number): Promise<number> {
  const db = await openDb();
  if (!db) {
    return 0;
  }
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    const all = (await requestToPromise(store.getAll())) as unknown[];
    const clips = all.filter(isStoredClip).sort((a, b) => b.usedAt - a.usedAt);
    const extra = clips.slice(limit);
    if (extra.length === 0) {
      return 0;
    }
    const writer = db.transaction(STORE, "readwrite").objectStore(STORE);
    await Promise.all(extra.map((clip) => requestToPromise(writer.delete(clip.key))));
    return extra.length;
  } catch {
    return 0;
  }
}

export async function clearStoredClips(): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }
  try {
    await requestToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).clear());
  } catch {
    return;
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
