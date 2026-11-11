// Travel stats for the "passport": countries, share of the world's land, continents, regions and
// provinces (states and counties in the USA) of the country you're in, and a traveller level.
// Pure functions, testable in Node.
import {
  childrenOf, COUNTRY_INFO, countryOfRegion, isDetailed, levelWords, nameOf, placeOfProvince, provinceCount, regionCount,
  type Detailed, type Place,
} from '../geo/locate';
import type { Level } from '../types';
import { t } from '../i18n';

export type Count = { visited: number; total: number };

export type Passport = {
  countries: Count & { landPct: number };
  level: { name: string; next?: { name: string; missing: number } };
  continents: (Count & { name: string })[];
  here?: { name: string; words: Detailed['words']; regions: Count; provinces?: Count };
  byCountry: { id: string; name: string; regions: Count }[];
};

// Levels by number of countries: the next one is always in sight.
const LEVELS = [
  { key: 'level.tourist', min: 0 },
  { key: 'level.traveller', min: 3 },
  { key: 'level.explorer', min: 10 },
  { key: 'level.globetrotter', min: 25 },
  { key: 'level.legend', min: 50 },
] as const;

// Natural Earth continent → string key.
const CONTINENTS = {
  Europe: 'continent.europe',
  Asia: 'continent.asia',
  Africa: 'continent.africa',
  'North America': 'continent.northAmerica',
  'South America': 'continent.southAmerica',
  Oceania: 'continent.oceania',
} as const;

// The 8 small islands Natural Earth files under "open ocean" belong to no continent: left out.
const COUNTED = COUNTRY_INFO.filter((c) => c.continent in CONTINENTS || c.continent === 'Antarctica');
const LAND_KM2 = COUNTED.reduce((sum, c) => sum + c.areaKm2, 0);

export function passport(
  visited: { country: string[]; region: string[]; province: string[] },
  hereCountry: string,
): Passport {
  const countries = new Set(visited.country);
  const seen = COUNTED.filter((c) => countries.has(c.id));

  const levelIndex = LEVELS.reduce((best, l, i) => (seen.length >= l.min ? i : best), 0);
  const next = LEVELS[levelIndex + 1];

  const regionsBy = new Map<string, number>();
  for (const id of visited.region) {
    const country = countryOfRegion(id);
    if (country) regionsBy.set(country, (regionsBy.get(country) ?? 0) + 1);
  }
  const regionsOf = (country: string): Count => ({ visited: regionsBy.get(country) ?? 0, total: regionCount(country) });

  return {
    countries: {
      visited: seen.length,
      total: COUNTED.length,
      landPct: (100 * seen.reduce((sum, c) => sum + c.areaKm2, 0)) / LAND_KM2,
    },
    level: {
      name: t(LEVELS[levelIndex].key),
      next: next && { name: t(next.key), missing: next.min - seen.length },
    },
    continents: Object.entries(CONTINENTS).map(([key, label]) => ({
      name: t(label),
      visited: seen.filter((c) => c.continent === key).length,
      total: COUNTED.filter((c) => c.continent === key).length,
    })),
    here: hereCountry
      ? {
          name: nameOf('country', hereCountry),
          words: levelWords(hereCountry),
          regions: regionsOf(hereCountry),
          // Only that country's provinces: a gallery from Italy and the USA has both.
          provinces: isDetailed(hereCountry)
            ? { visited: visited.province.filter((id) => placeOfProvince(id)?.country === hereCountry).length, total: provinceCount(hereCountry) }
            : undefined,
        }
      : undefined,
    byCountry: seen
      .map((c) => ({ id: c.id, name: nameOf('country', c.id), regions: regionsOf(c.id) }))
      .sort((a, b) => b.regions.visited - a.regions.visited || a.name.localeCompare(b.name)),
  };
}

// More than 4 days without photos ends a trip (the timeline marks trips the same way).
const TRIP_GAP_MS = 4 * 24 * 3600 * 1000;

export function countTrips(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted.filter((at, i) => i === 0 || at - sorted[i - 1] > TRIP_GAP_MS).length;
}

// The place sheet's three small numbers: photos taken there, the areas inside it you've seen, trips.
export function placeStats(
  photos: (Place & { takenAt: number })[],
  visited: Record<Level, string[]>,
  level: Level,
  id: string,
): { photos: number; children?: Count; trips: number } {
  const here = photos.filter((p) => p[level] === id);
  const trips = countTrips(here.map((p) => p.takenAt));
  const inside = childrenOf(level, id);
  if (!inside.length) return { photos: here.length, trips };
  const seen = new Set(visited[level === 'country' ? 'region' : 'province']);
  return { photos: here.length, children: { visited: inside.filter((c) => seen.has(c)).length, total: inside.length }, trips };
}
