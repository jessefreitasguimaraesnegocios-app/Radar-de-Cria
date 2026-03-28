import type { Place } from '../types';

/** Sem requisição se o cache tiver menos idade (alinha ao servidor ~1h). */
export const FRESH_MS = 60 * 60 * 1000;

/** Remove entradas mais velhas que isso. */
export const MAX_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = 'radar_places_swr_v1';
const MAX_ENTRIES = 20;

type CacheEntry = {
  savedAt: number;
  places: Place[];
  maxFetchedRadius: number;
};

type StoreV1 = {
  v: 1;
  entries: Record<string, CacheEntry>;
};

function roundCoord(n: number): string {
  return n.toFixed(4);
}

export function buildSearchKey(lat: number, lng: number, keyword: string): string {
  const kw = keyword.trim().toLowerCase();
  return `${roundCoord(lat)}|${roundCoord(lng)}|${kw}`;
}

/** API primeiro (dados mais novos); mantém do cache o que a API não devolveu nesta página. */
export function mergePlacesById(apiPlaces: Place[], cachedPlaces: Place[]): Place[] {
  const apiIds = new Set(apiPlaces.map((p) => p.place_id));
  const extras = cachedPlaces.filter((p) => !apiIds.has(p.place_id));
  return [...apiPlaces, ...extras];
}

function loadStore(): StoreV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, entries: {} };
    const parsed = JSON.parse(raw) as StoreV1;
    if (parsed?.v !== 1 || typeof parsed.entries !== 'object' || parsed.entries == null) {
      return { v: 1, entries: {} };
    }
    return parsed;
  } catch {
    return { v: 1, entries: {} };
  }
}

function saveStore(store: StoreV1): void {
  try {
    let s = JSON.stringify(store);
    if (s.length > 4_500_000) {
      trimOldest(store, Math.floor(MAX_ENTRIES / 2));
      s = JSON.stringify(store);
    }
    localStorage.setItem(STORAGE_KEY, s);
  } catch {
    try {
      const store2 = loadStore();
      trimOldest(store2, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store2));
    } catch {
      /* ignore quota */
    }
  }
}

function trimOldest(store: StoreV1, targetCount: number): void {
  const keys = Object.keys(store.entries);
  if (keys.length <= targetCount) return;
  const sorted = keys.sort(
    (a, b) => store.entries[a].savedAt - store.entries[b].savedAt
  );
  const drop = sorted.slice(0, keys.length - targetCount);
  for (const k of drop) delete store.entries[k];
}

export function pruneExpiredEntries(): void {
  const store = loadStore();
  const now = Date.now();
  let changed = false;
  for (const k of Object.keys(store.entries)) {
    if (now - store.entries[k].savedAt > MAX_RETENTION_MS) {
      delete store.entries[k];
      changed = true;
    }
  }
  if (changed) saveStore(store);
}

export function readEntry(key: string): CacheEntry | null {
  pruneExpiredEntries();
  const store = loadStore();
  const e = store.entries[key];
  if (!e || Date.now() - e.savedAt > MAX_RETENTION_MS) return null;
  if (!Array.isArray(e.places)) return null;
  return e;
}

export function writeEntry(key: string, places: Place[], maxFetchedRadius: number): void {
  const store = loadStore();
  const now = Date.now();
  store.entries[key] = {
    savedAt: now,
    places,
    maxFetchedRadius,
  };
  const keys = Object.keys(store.entries);
  if (keys.length > MAX_ENTRIES) {
    trimOldest(store, MAX_ENTRIES);
  }
  saveStore(store);
}
