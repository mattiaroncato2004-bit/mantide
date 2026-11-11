// Finds the country, region and (in Italy and the USA) province that contain a point.
// Plain ray casting with a bounding-box prefilter: no dependency, fast enough
// for a few thousand photos on a phone.
import countries from './countries.json';
import itRegions from './it-regions.json';
import itProvinces from './it-provinces.json';
import usStates from './us-states.json';
import usCounties from './us-counties.json';
import worldRegions from './world-regions.json';
import worldGroups from './world-groups.json';
import countryNames from './country-names.json';
import regionNamesEn from './region-names-en.json';
import { locale, t } from '../i18n';

type Ring = number[][];
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };
type Props = { id: string; name: string; name_it?: string; region?: string; country?: string; continent?: string; group?: string };
type Feature = { properties: Props; geometry: Geometry };
type Indexed = Feature & { bbox: [number, number, number, number] };

export type Place = { country?: string; region?: string; province?: string };

function polygons(g: Geometry): Ring[][] {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

function bboxOf(g: Geometry): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons(g)) {
    for (const [x, y] of poly[0]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

function index(fc: { features: unknown[] }): Indexed[] {
  return (fc.features as Feature[]).map((f) => ({ ...f, bbox: bboxOf(f.geometry) }));
}

const COUNTRIES = index(countries);

function byCountry(features: Indexed[]): Map<string, Indexed[]> {
  const map = new Map<string, Indexed[]>();
  for (const f of features) map.set(f.properties.country!, [...(map.get(f.properties.country!) ?? []), f]);
  return map;
}

// First-level units of every other country (Natural Earth admin-1), by country. For Spain, France,
// the UK and Portugal these are provinces, departments or counties: their real regions are
// WORLD_GROUPS (the units dissolved by Natural Earth's "region" field), and each unit has `group`.
const WORLD_REGIONS = byCountry(index(worldRegions));
const WORLD_GROUPS = byCountry(index(worldGroups));

// The indexed boundaries (each feature with its bbox), for the map model in src/map/model.ts.
export type AreaFeature = Indexed;

// The countries with two detailed levels of their own, and what each calls them: Italy's ISTAT
// regions and provinces, the USA's Census states and counties. A province's `region` is its region id.
export type Detailed = {
  regions: AreaFeature[];
  provinces: AreaFeature[];
  words: { region: 'region' | 'state'; province: 'province' | 'county' };
};
export const DETAILED: ReadonlyMap<string, Detailed> = new Map<string, Detailed>([
  ['ITA', { regions: index(itRegions), provinces: index(itProvinces), words: { region: 'region', province: 'province' } }],
  ['USA', { regions: index(usStates), provinces: index(usCounties), words: { region: 'state', province: 'county' } }],
]);
const DETAILED_REGIONS = [...DETAILED.values()].flatMap((d) => d.regions);
const DETAILED_PROVINCES = [...DETAILED.values()].flatMap((d) => d.provinces);

export const isDetailed = (country: string): boolean => DETAILED.has(country);

// What the two levels are called in a country: states and counties in the USA, regions and provinces elsewhere.
const PLAIN_WORDS: Detailed['words'] = { region: 'region', province: 'province' };
export const levelWords = (country: string): Detailed['words'] => DETAILED.get(country)?.words ?? PLAIN_WORDS;

export const AREAS = {
  countries: COUNTRIES,
  detailed: DETAILED,
  worldRegionsByCountry: WORLD_REGIONS,
  worldGroupsByCountry: WORLD_GROUPS,
};

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function contains(g: Geometry, lon: number, lat: number): boolean {
  return polygons(g).some(
    ([outer, ...holes]) => inRing(lon, lat, outer) && !holes.some((h) => inRing(lon, lat, h)),
  );
}

function find(features: Indexed[], lon: number, lat: number): Indexed | undefined {
  return features.find(
    (f) =>
      lon >= f.bbox[0] && lon <= f.bbox[2] && lat >= f.bbox[1] && lat <= f.bbox[3] &&
      contains(f.geometry, lon, lat),
  );
}

// Distance in degrees from a point to a segment, with longitude scaled by cos(lat)
// so that east-west and north-south distances are comparable.
function segmentDistance(lon: number, lat: number, a: number[], b: number[], k: number): number {
  const ax = a[0] * k, ay = a[1], bx = b[0] * k, by = b[1], px = lon * k;
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), lat - (ay + t * dy));
}

// Simplified coastlines lose small islands and beaches (Venice falls in the lagoon):
// a point in the sea goes to the closest feature within maxDeg (0.25° ≈ 25 km).
function nearest(features: Indexed[], lon: number, lat: number, maxDeg = 0.25): Indexed | undefined {
  const k = Math.cos((lat * Math.PI) / 180);
  let best: Indexed | undefined;
  let bestDistance = maxDeg;
  for (const f of features) {
    const [x0, y0, x1, y1] = f.bbox;
    if (lon < x0 - maxDeg / k || lon > x1 + maxDeg / k || lat < y0 - maxDeg || lat > y1 + maxDeg) continue;
    for (const poly of polygons(f.geometry)) {
      const ring = poly[0];
      for (let i = 1; i < ring.length; i++) {
        const d = segmentDistance(lon, lat, ring[i - 1], ring[i], k);
        if (d < bestDistance) {
          bestDistance = d;
          best = f;
        }
      }
    }
  }
  return best;
}

function detailedPlace(country: string, province: Indexed | undefined): Place {
  return { country, region: province?.properties.region, province: province?.properties.id };
}

// Detailed countries (Italy, the USA) have regions and provinces; every other country has its
// first-level regions. Order matters near borders: a point inside France must never snap to an
// Italian province, so a province wins by containing the point, or as the nearest one once the
// country is known, or when no country at all is within reach.
export function locate(lat: number, lon: number): Place {
  for (const [owner, { provinces }] of DETAILED) {
    const province = find(provinces, lon, lat); // more detailed than the country border
    if (province) return detailedPlace(owner, province);
  }
  const country = (find(COUNTRIES, lon, lat) ?? nearest(COUNTRIES, lon, lat))?.properties.id;
  const detailed = country ? DETAILED.get(country) : undefined;
  if (country && detailed) return detailedPlace(country, nearest(detailed.provinces, lon, lat));
  if (!country) {
    // Small islands that the 1:50m country borders leave out (Key West): the nearest detailed province.
    for (const [owner, { provinces }] of DETAILED) {
      const province = nearest(provinces, lon, lat);
      if (province) return detailedPlace(owner, province);
    }
  }
  const units = (country && WORLD_REGIONS.get(country)) || [];
  const unit = find(units, lon, lat) ?? nearest(units, lon, lat);
  // Spain, France, UK, Portugal: region = the real region, province = the unit inside it.
  if (unit?.properties.group) return { country, region: unit.properties.group, province: unit.properties.id };
  return { country, region: unit?.properties.id };
}

// Area in km² on an equirectangular projection around each ring's latitude: within a few percent
// at this level of simplification, enough for "you've seen 4% of the land".
function ringKm2(ring: Ring): number {
  const k = Math.cos((ring.reduce((sum, c) => sum + c[1], 0) / ring.length) * (Math.PI / 180));
  let twice = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    twice += ring[j][0] * k * 111.32 * ring[i][1] * 110.57 - ring[i][0] * k * 111.32 * ring[j][1] * 110.57;
  }
  return Math.abs(twice) / 2;
}

function areaKm2(g: Geometry): number {
  return polygons(g).reduce((sum, [outer, ...holes]) => sum + ringKm2(outer) - holes.reduce((h, r) => h + ringKm2(r), 0), 0);
}

// Every country with its continent and area, for the travel stats (src/stats/passport.ts).
export const COUNTRY_INFO = COUNTRIES.map((f) => ({
  id: f.properties.id,
  continent: f.properties.continent ?? '',
  areaKm2: areaKm2(f.geometry),
}));

// How many regions a country has: the regions of a detailed country (20 in Italy, 50 states and DC
// in the USA), the real regions for Spain, France, UK and Portugal, Natural Earth's first-level units elsewhere.
export function regionCount(country: string): number {
  return (DETAILED.get(country)?.regions ?? WORLD_GROUPS.get(country) ?? WORLD_REGIONS.get(country))?.length ?? 0;
}

// How many provinces a detailed country has (110 in Italy, the counties of the USA); 0 elsewhere.
export const provinceCount = (country: string): number => DETAILED.get(country)?.provinces.length ?? 0;

const REGION_COUNTRY = new Map<string, string>([
  ...[...DETAILED].flatMap(([country, d]) => d.regions.map((f): [string, string] => [f.properties.id, country])),
  ...[...WORLD_REGIONS, ...WORLD_GROUPS].flatMap(([country, list]) => list.map((f): [string, string] => [f.properties.id, country])),
]);

export const countryOfRegion = (id: string): string | undefined => REGION_COUNTRY.get(id);

// The country and region of a province: one of a detailed country, or a unit of Spain, France, UK, Portugal.
type Parent = { country: string; region: string };
const PROVINCE_PARENT = new Map<string, Parent>([
  ...[...DETAILED].flatMap(([country, d]) =>
    d.provinces.map((f): [string, Parent] => [f.properties.id, { country, region: f.properties.region ?? '' }]),
  ),
  ...[...WORLD_REGIONS.values()].flat().map((f): [string, Parent] => [
    f.properties.id,
    { country: f.properties.country!, region: f.properties.group || f.properties.id },
  ]),
]);

export const placeOfProvince = (id: string): Parent | undefined => PROVINCE_PARENT.get(id);

// Where the map goes when you tap a place: the middle of its largest piece, so France means
// mainland France and not a point in the Atlantic between Paris and French Guiana.
function mainBox(g: Geometry): [number, number, number, number] {
  let best: [number, number, number, number] = [0, 0, 0, 0];
  let bestSize = -1;
  for (const [outer] of polygons(g)) {
    const b = bboxOf({ type: 'Polygon', coordinates: [outer] });
    const size = (b[2] - b[0]) * (b[3] - b[1]);
    if (size > bestSize) {
      bestSize = size;
      best = b;
    }
  }
  return best;
}

const MAIN_BOXES = new Map<string, [number, number, number, number]>(
  [...COUNTRIES, ...DETAILED_REGIONS, ...DETAILED_PROVINCES, ...[...WORLD_REGIONS.values()].flat(), ...[...WORLD_GROUPS.values()].flat()].map((f) => [
    f.properties.id,
    mainBox(f.geometry),
  ]),
);

// The bounding box of a place's largest piece, and its middle.
export const mainBoxOf = (id: string): [number, number, number, number] | undefined => MAIN_BOXES.get(id);
export function centerOf(id: string): [number, number] | undefined {
  const b = MAIN_BOXES.get(id);
  return b && [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

// The areas one level down: a country's regions, a region's provinces (detailed countries, and the
// units inside the real regions of Spain, France, the UK and Portugal). Provinces have none.
export function childrenOf(level: 'country' | 'region' | 'province', id: string): string[] {
  if (level === 'country') {
    const list = DETAILED.get(id)?.regions ?? WORLD_GROUPS.get(id) ?? WORLD_REGIONS.get(id) ?? [];
    return list.map((f) => f.properties.id);
  }
  if (level === 'region') {
    const country = REGION_COUNTRY.get(id);
    const detailed = country ? DETAILED.get(country) : undefined;
    if (detailed) return detailed.provinces.filter((f) => f.properties.region === id).map((f) => f.properties.id);
    const units = country && WORLD_GROUPS.has(country) ? (WORLD_REGIONS.get(country) ?? []) : [];
    return units.filter((f) => f.properties.group === id).map((f) => f.properties.id);
  }
  return [];
}

const NAMES: Record<'country' | 'region' | 'province', Map<string, string>> = {
  country: new Map(COUNTRIES.map((f) => [f.properties.id, f.properties.name])),
  region: new Map(
    [...DETAILED_REGIONS, ...[...WORLD_REGIONS.values()].flat(), ...[...WORLD_GROUPS.values()].flat()].map((f) => [f.properties.id, f.properties.name]),
  ),
  province: new Map([...DETAILED_PROVINCES, ...[...WORLD_REGIONS.values()].flat()].map((f) => [f.properties.id, f.properties.name])),
};

// Country names in English and Italian (Natural Earth NAME_EN / NAME_IT). Regions abroad are stored
// with their Italian name where one exists ("Lisbona"); region-names-en.json holds the English name
// where it differs ("Lisbon"). Italian regions and provinces keep their own names. US states and
// counties are stored in English, states with `name_it` where Italian differs ("Carolina del Nord").
const COUNTRY_NAMES = countryNames as Record<string, { en: string; it: string }>;
const REGION_NAMES_EN = regionNamesEn as Record<string, string>;
const NAMES_IT = new Map(
  [...DETAILED_REGIONS, ...DETAILED_PROVINCES].flatMap((f) => (f.properties.name_it ? [[f.properties.id, f.properties.name_it] as const] : [])),
);

// Human-readable name of a country, region or province id ("VE" → "Venezia", "GBR" → "United Kingdom").
export function nameOf(level: 'country' | 'region' | 'province', id: string | undefined): string {
  if (level === 'country' && id && COUNTRY_NAMES[id]) return COUNTRY_NAMES[id][locale];
  if (level !== 'country' && id && locale === 'en' && REGION_NAMES_EN[id]) return REGION_NAMES_EN[id];
  if (level !== 'country' && id && locale === 'it' && NAMES_IT.has(id)) return NAMES_IT.get(id)!;
  return (id && NAMES[level].get(id)) || t('place.unknown');
}
