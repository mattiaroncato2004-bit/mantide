// Visited places and what marked them (by hand, by GPS, by a photo). Pure, so the test scripts run
// it in Node; src/state/visited.ts keeps it on the device.
import type { Place } from '../geo/locate';
import type { Level, Source } from '../types';

export type Visited = Record<Level, Record<string, Source[]>>;

export function ids(v: Visited, level: Level): string[] {
  return Object.keys(v[level]);
}

// Marks every country, region and province of the given places.
export function addMarks(v: Visited, source: Source, places: Place[]): void {
  for (const place of places) {
    for (const level of ['country', 'region', 'province'] as const) {
      const id = place[level];
      if (!id) continue;
      const sources = v[level][id] ?? [];
      if (!sources.includes(source)) v[level][id] = [...sources, source];
    }
  }
}

// Forgets one source everywhere; a place nothing else marks is no longer visited.
export function removeSource(v: Visited, source: Source): void {
  for (const level of ['country', 'region', 'province'] as const) {
    for (const [id, sources] of Object.entries(v[level])) {
      const rest = sources.filter((s) => s !== source);
      if (rest.length) v[level][id] = rest;
      else delete v[level][id];
    }
  }
}
