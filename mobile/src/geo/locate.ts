// Finds the country, Italian region and Italian province that contain a point.
// Plain ray casting with a bounding-box prefilter: no dependency, fast enough
// for a few thousand photos on a phone.
import countries from './countries.json';
import regions from './it-regions.json';
import provinces from './it-provinces.json';

type Ring = number[][];
type Geometry =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };
type Props = { id: string; name: string; region?: string };
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
const REGIONS = index(regions);
const PROVINCES = index(provinces);

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

function italy(province: Indexed | undefined): Place {
  return { country: 'ITA', region: province?.properties.region, province: province?.properties.id };
}

// Regions and provinces exist only for Italy; elsewhere only the country is known.
// Order matters near borders: a point inside France must never snap to an Italian province.
export function locate(lat: number, lon: number): Place {
  const province = find(PROVINCES, lon, lat); // more detailed than the Italian country border
  if (province) return italy(province);
  const country = find(COUNTRIES, lon, lat) ?? nearest(COUNTRIES, lon, lat);
  if (country?.properties.id === 'ITA') return italy(nearest(PROVINCES, lon, lat));
  return { country: country?.properties.id };
}

export const TOTALS = { region: REGIONS.length, province: PROVINCES.length };
