// Travel stats for the "passport": countries, share of the world's land, continents, regions and
// provinces of the country you're in, and a traveller level. Pure functions, testable in Node.
import { COUNTRY_INFO, countryOfRegion, nameOf, regionCount, TOTALS } from '../geo/locate';

export type Count = { visited: number; total: number };

export type Passport = {
  countries: Count & { landPct: number };
  level: { name: string; next?: { name: string; missing: number } };
  continents: (Count & { name: string })[];
  here?: { name: string; regions: Count; provinces?: Count };
  byCountry: { id: string; name: string; regions: Count }[];
};

// Levels by number of countries: the next one is always in sight.
const LEVELS = [
  { name: 'Turista', min: 0 },
  { name: 'Viaggiatore', min: 3 },
  { name: 'Esploratore', min: 10 },
  { name: 'Giramondo', min: 25 },
  { name: 'Leggenda', min: 50 },
];

const CONTINENTS: Record<string, string> = {
  Europe: 'Europa',
  Asia: 'Asia',
  Africa: 'Africa',
  'North America': 'Nord America',
  'South America': 'Sud America',
  Oceania: 'Oceania',
};

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
      name: LEVELS[levelIndex].name,
      next: next && { name: next.name, missing: next.min - seen.length },
    },
    continents: Object.entries(CONTINENTS).map(([key, name]) => ({
      name,
      visited: seen.filter((c) => c.continent === key).length,
      total: COUNTED.filter((c) => c.continent === key).length,
    })),
    here: hereCountry
      ? {
          name: nameOf('country', hereCountry),
          regions: regionsOf(hereCountry),
          // Italian province ids are plates ("TV"); units abroad look like "FRA-1234".
          provinces: hereCountry === 'ITA' ? { visited: visited.province.filter((id) => !id.includes('-')).length, total: TOTALS.province } : undefined,
        }
      : undefined,
    byCountry: seen
      .map((c) => ({ id: c.id, name: c.name, regions: regionsOf(c.id) }))
      .sort((a, b) => b.regions.visited - a.regions.visited || a.name.localeCompare(b.name)),
  };
}
