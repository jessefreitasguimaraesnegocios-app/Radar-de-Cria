export const MARKS_STORAGE_KEY = 'radar-de-cria-place-marks';

export type PlaceMarkColor = 'red' | 'yellow' | 'green';

export function loadMarksFromStorage(): Record<string, PlaceMarkColor> {
  try {
    const raw = localStorage.getItem(MARKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, PlaceMarkColor> = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (v === 'red' || v === 'yellow' || v === 'green') {
        out[id] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMarksToStorage(marks: Record<string, PlaceMarkColor>): void {
  try {
    localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(marks));
  } catch {
    /* ignore */
  }
}

/** Chave única por linha (lista + mapa alinhados). */
export function computeRowMarkKeys(placesIn: { place_id?: string; name?: string; geometry?: { location?: { lat: number; lng: number } } }[]): string[] {
  const counts = new Map<string, number>();
  for (const p of placesIn) {
    const id = (p.place_id && String(p.place_id).trim()) || '';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return placesIn.map((p, index) => {
    const id = (p.place_id && String(p.place_id).trim()) || '';
    if (id && (counts.get(id) ?? 0) === 1) {
      return id;
    }
    if (id) {
      return `${id}::__row${index}`;
    }
    const loc = p.geometry?.location;
    if (loc != null && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return `geo:${index}:${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
    }
    return `row:${index}:${(p.name || 'place').slice(0, 40)}`;
  });
}

/** Sem marca = vermelho (padrão: não vendi / sem potencial). Amarelo = potencial. Verde = vendeu. */
export function mapMarkerHex(mark: PlaceMarkColor | undefined): string {
  if (mark === 'yellow') return '#F59E0B';
  if (mark === 'green') return '#22C55E';
  return '#EF4444';
}

export const USER_LOCATION_MARKER_HEX = '#2563EB';
