// Visited places, saved on the device. Each place keeps the sources that marked it
// (by hand, by GPS, by a photo), so the UI can say why a place counts as visited.
import { useCallback, useEffect, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { Place } from '../geo/locate';
import type { Level, Source } from '../types';

export type Visited = Record<Level, Record<string, Source[]>>;

const KEY = 'visited:v1';
const empty = (): Visited => ({ country: {}, region: {}, province: {}, hex: {} });

export function ids(v: Visited, level: Level): string[] {
  return Object.keys(v[level]);
}

export function useVisited() {
  const [visited, setVisited] = useState<Visited>(empty);

  useEffect(() => {
    Storage.getItem(KEY)
      .then((saved) => saved && setVisited({ ...empty(), ...JSON.parse(saved) }))
      .catch((e) => console.warn('[visited] load failed', e));
  }, []);

  const update = useCallback((change: (v: Visited) => void) => {
    setVisited((prev) => {
      const next: Visited = JSON.parse(JSON.stringify(prev));
      change(next);
      Storage.setItem(KEY, JSON.stringify(next)).catch((e) => console.warn('[visited] save failed', e));
      return next;
    });
  }, []);

  // A tap on the map adds or removes the "manual" mark; GPS and photo marks stay.
  const toggleManual = useCallback(
    (level: Level, id: string) =>
      update((v) => {
        const sources = v[level][id] ?? [];
        const next = sources.includes('manual') ? sources.filter((s) => s !== 'manual') : [...sources, 'manual' as const];
        if (next.length) v[level][id] = next;
        else delete v[level][id];
      }),
    [update],
  );

  // Marks every country, region and province of the given places, in one save.
  const mark = useCallback(
    (source: Source, places: Place[]) =>
      update((v) => {
        for (const place of places) {
          for (const level of ['country', 'region', 'province'] as const) {
            const id = place[level];
            if (!id) continue;
            const sources = v[level][id] ?? [];
            if (!sources.includes(source)) v[level][id] = [...sources, source];
          }
        }
      }),
    [update],
  );

  return { visited, toggleManual, mark };
}
