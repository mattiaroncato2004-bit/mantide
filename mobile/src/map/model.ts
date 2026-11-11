// What the map shows, computed once for both renderers (native MapLibre on Android, MapLibre GL JS
// on the web): which level lights up at a zoom, the areas in view, the photo clusters, the journey,
// the distance rings. Pure: no React Native, so the test scripts run it in Node.
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';
import Supercluster, { type ClusterProperties } from 'supercluster';
import { AREAS, locate, mainBoxOf, type AreaFeature } from '../geo/locate';
import type { Level } from '../types';

export type ZoomLevel = Level;
export type BBox = [west: number, south: number, east: number, north: number];

// Countries far out, regions closer, provinces closer still (Italy fills a phone at about 5).
export const REGION_ZOOM = 3.5;
export const PROVINCE_ZOOM = 6.5;

// Close enough to see a town: the sheet talks about the province, with events around the centre.
export const LOCAL_ZOOM = 9;

export function levelForZoom(zoom: number): ZoomLevel {
  return zoom < REGION_ZOOM ? 'country' : zoom < PROVINCE_ZOOM ? 'region' : 'province';
}

// The place the sheet talks about holds the lit areas: the world (null) while countries are lit,
// the country while its regions are, the region while its provinces are, the province up close.
export function placeLevelForZoom(zoom: number): Level | null {
  return zoom < REGION_ZOOM ? null : zoom < PROVINCE_ZOOM ? 'country' : zoom < LOCAL_ZOOM ? 'region' : 'province';
}

// The zooms at which the sheet talks about each level (see placeLevelForZoom).
const FRAME_ZOOMS: Record<Level, [number, number]> = {
  country: [REGION_ZOOM + 0.1, PROVINCE_ZOOM - 0.2],
  region: [PROVINCE_ZOOM + 0.1, LOCAL_ZOOM - 0.2],
  province: [LOCAL_ZOOM, 11],
};

// Where the camera goes when you tap an area: its largest piece fills a phone's width, within the
// zooms at which the sheet then talks about that area.
export function frameOf(level: Level, id: string): { center: [number, number]; zoom: number } | null {
  const box = mainBoxOf(id);
  if (!box) return null;
  const [w, s, e, n] = box;
  const center: [number, number] = [(w + e) / 2, (s + n) / 2];
  // A 390-pt-wide map shows 360 × 390 / (512 × 2^zoom) degrees of longitude; leave a margin of 40%.
  const height = (n - s) / Math.cos((center[1] * Math.PI) / 180);
  const fit = Math.log2((360 * 390) / (512 * 1.4 * Math.max(e - w, height, 0.01)));
  const [lo, hi] = FRAME_ZOOMS[level];
  return { center, zoom: Math.min(hi, Math.max(lo, fit)) };
}

export type AreaProps = { id: string; level: Level; visited: boolean };
export type Areas = FeatureCollection<Polygon | MultiPolygon, AreaProps>;

// A view across the antimeridian (west > east) is two boxes.
function boxes([w, s, e, n]: BBox): BBox[] {
  return w <= e ? [[w, s, e, n]] : [[w, s, 180, n], [-180, s, e, n]];
}

export function areasInView(level: ZoomLevel, bounds: BBox, visited: Record<Level, string[]>): Areas {
  const views = boxes(bounds);
  const inView = (f: AreaFeature) => views.some(([w, s, e, n]) => f.bbox[0] <= e && f.bbox[2] >= w && f.bbox[1] <= n && f.bbox[3] >= s);
  const seen = { country: new Set(visited.country), region: new Set(visited.region), province: new Set(visited.province) };
  const area = (f: AreaFeature, as: Level): Feature<Polygon | MultiPolygon, AreaProps> => ({
    type: 'Feature',
    geometry: f.geometry as Polygon | MultiPolygon,
    properties: { id: f.properties.id, level: as, visited: seen[as].has(f.properties.id) },
  });

  const countries = AREAS.countries.filter(inView);
  if (level === 'country') return { type: 'FeatureCollection', features: countries.map((f) => area(f, 'country')) };

  const features: Feature<Polygon | MultiPolygon, AreaProps>[] = [];
  for (const country of countries) {
    const id = country.properties.id;
    // Italy and the USA: their regions (states), then their provinces (counties).
    const detailed = AREAS.detailed.get(id);
    if (detailed) {
      features.push(...(level === 'region' ? detailed.regions : detailed.provinces).filter(inView).map((f) => area(f, level)));
      continue;
    }
    // Spain, France, UK, Portugal: their real regions, then the units inside them as provinces.
    // Elsewhere the first-level units are the deepest level we have, so they stay regions.
    const groups = AREAS.worldGroupsByCountry.get(id) ?? [];
    const units = AREAS.worldRegionsByCountry.get(id) ?? [];
    const [list, as]: [AreaFeature[], Level] =
      level === 'region' ? [groups.length ? groups : units, 'region'] : groups.length ? [units, 'province'] : [units, 'region'];
    if (list.length) features.push(...list.filter(inView).map((f) => area(f, as)));
    else features.push(area(country, 'country'));
  }
  return { type: 'FeatureCollection', features };
}

export type PhotoPoint = { id: string; lon: number; lat: number; takenAt: number };
// `key` is c<clusterId> for a group, p<photoId> for a single photo; the cover is the newest photo.
export type PhotoCluster = { key: string; lon: number; lat: number; count: number; coverId: string };
export interface PhotoIndex {
  clusters(bounds: BBox, zoom: number, max?: number): PhotoCluster[];
  leaves(key: string): string[];
}

const MAX_MARKERS = 60;

export function makePhotoIndex(photos: PhotoPoint[]): PhotoIndex {
  type In = { id: string; takenAt: number };
  type Out = { newest: number; coverId: string };
  const index = new Supercluster<In, Out>({
    radius: 60,
    maxZoom: 16,
    map: (p) => ({ newest: p.takenAt, coverId: p.id }),
    reduce: (acc, p) => {
      if (p.newest > acc.newest) {
        acc.newest = p.newest;
        acc.coverId = p.coverId;
      }
    },
  });
  index.load(photos.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, takenAt: p.takenAt } })));

  return {
    clusters(bounds, zoom, max = MAX_MARKERS) {
      return index
        .getClusters(bounds, Math.round(zoom))
        .map((f): PhotoCluster => {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties as Partial<ClusterProperties & Out & In>;
          return p.cluster
            ? { key: `c${p.cluster_id}`, lon, lat, count: p.point_count!, coverId: p.coverId! }
            : { key: `p${p.id}`, lon, lat, count: 1, coverId: p.id! };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, max);
    },
    leaves(key) {
      if (key.startsWith('p')) return [key.slice(1)];
      return index
        .getLeaves(Number(key.slice(1)), Infinity)
        .map((f) => f.properties)
        .sort((a, b) => a.takenAt - b.takenAt)
        .map((p) => p.id);
    },
  };
}

// The pins on screen whose cover has no thumbnail yet: thumbnails are made for these only, each once.
export function coversWithoutThumb(clusters: PhotoCluster[], thumbs: Record<string, string>): string[] {
  return [...new Set(clusters.map((c) => c.coverId))].filter((id) => !thumbs[id]);
}

// The journey on the timeline: one line through the photos taken until then, in time order.
export function journeyLine(photos: PhotoPoint[], until?: number): Feature<LineString> | null {
  const points = photos.filter((p) => until === undefined || p.takenAt <= until).sort((a, b) => a.takenAt - b.takenAt);
  if (points.length < 2) return null;
  return { type: 'Feature', geometry: { type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) }, properties: {} };
}

const KM_PER_DEG_LAT = 110.57;
const kmPerDegLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

// Up to three rings at round distances, the outer one reaching the farthest event; labels north-east.
export function distanceRings(center: [number, number], farthestKm: number) {
  const [lon, lat] = center;
  const steps = [1, 2, 5, 10, 20, 50, 100].filter((r) => r <= Math.max(farthestKm, 5) * 1.15).slice(-3);
  return steps.map((km) => {
    const coordinates = Array.from({ length: 73 }, (_, i) => {
      const t = (i / 72) * 2 * Math.PI;
      return [lon + (km / kmPerDegLon(lat)) * Math.cos(t), lat + (km / KM_PER_DEG_LAT) * Math.sin(t)];
    });
    const d = km * Math.SQRT1_2;
    const ring: Feature<LineString> = { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} };
    return { km, ring, labelAt: [lon + d / kmPerDegLon(lat), lat + d / KM_PER_DEG_LAT] as [number, number] };
  });
}

// The place under a point at a level, falling back to the next level up where we have no data.
export function placeAt(lon: number, lat: number, level: ZoomLevel): { level: Level; id: string } | null {
  const p = locate(lat, lon);
  if (level === 'province' && p.province) return { level: 'province', id: p.province };
  if (level !== 'country' && p.region) return { level: 'region', id: p.region };
  return p.country ? { level: 'country', id: p.country } : null;
}
