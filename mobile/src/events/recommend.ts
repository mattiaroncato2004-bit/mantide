// Event recommendations: filters the (mocked) catalog by map scale and scores events by the
// interests inferred from the photo gallery. Pure functions, no React.
import { InterestId, labelOf } from '../ai/interests';
import type { Focus, Scale } from '../types';
import catalog from './events.json';

export type Event = {
  id: string;
  title: string;
  description: string;
  start: string; // ISO date, e.g. "2026-11-07"
  end?: string; // ISO date, inclusive
  city: string;
  country: string; // Natural Earth ADM0_A3
  region?: string; // ISTAT region code, only for Italy
  lat: number;
  lon: number;
  scale: Scale;
  interests: InterestId[];
  price: string;
};

export const EVENTS = catalog as Event[];

export type InterestWeight = { id: InterestId; weight: number; photoCount: number }; // weight 0..1

export type Recommendation = {
  event: Event;
  score: number;
  matched: InterestWeight[];
  distanceKm: number;
};

const DAY = 24 * 60 * 60 * 1000;
const LOCAL_RADIUS_KM = 30;
const MAX_RESULTS = 10;
const SOON_BONUS = 0.1; // added to events starting now, fading to 0 at SOON_DAYS
const SOON_DAYS = 120;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Builds a profile from photo counts per interest: weight = share of labeled photos.
export function profileFromCounts(counts: Partial<Record<InterestId, number>>): InterestWeight[] {
  const entries = Object.entries(counts) as [InterestId, number][];
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return [];
  return entries
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, weight: n / total, photoCount: n }))
    .sort((a, b) => b.weight - a.weight);
}

function inScale(e: Event, scale: Scale, focus: Focus, distanceKm: number): boolean {
  switch (scale) {
    case 'global':
      return e.scale === 'global';
    case 'national':
      if (e.country !== focus.country) return false;
      return focus.country !== 'ITA' || e.scale === 'national' || e.scale === 'regional';
    case 'regional':
      return e.region === focus.region && (e.scale === 'regional' || e.scale === 'local');
    case 'local':
      return distanceKm <= LOCAL_RADIUS_KM;
  }
}

export function recommend(
  events: Event[],
  profile: InterestWeight[],
  scale: Scale,
  focus: Focus,
  now = new Date(),
): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const event of events) {
    const endsAt = Date.parse(event.end ?? event.start) + DAY; // end date is inclusive
    if (endsAt <= now.getTime()) continue;
    const distanceKm = haversineKm(focus.lat, focus.lon, event.lat, event.lon);
    if (!inScale(event, scale, focus, distanceKm)) continue;
    const matched = profile
      .filter((p) => p.weight > 0 && event.interests.includes(p.id))
      .sort((a, b) => b.weight - a.weight);
    if (matched.length === 0) continue;
    const daysAway = Math.max(0, (Date.parse(event.start) - now.getTime()) / DAY);
    const bonus = SOON_BONUS * Math.max(0, 1 - daysAway / SOON_DAYS);
    const score = matched.reduce((sum, m) => sum + m.weight, 0) + bonus;
    recs.push({ event, score, matched, distanceKm });
  }
  return recs
    .sort((a, b) => b.score - a.score || a.event.start.localeCompare(b.event.start))
    .slice(0, MAX_RESULTS);
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function joinIt(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

// "Hai 41 foto di street art e 12 di musica dal vivo"
export function why(rec: Recommendation): string {
  const withPhotos = rec.matched.filter((m) => m.photoCount > 0);
  if (withPhotos.length === 0) {
    return `Ti interessa ${joinIt(rec.matched.map((m) => lower(labelOf(m.id))))}`;
  }
  const parts = withPhotos.map((m, i) => `${m.photoCount} ${i === 0 ? 'foto ' : ''}di ${lower(labelOf(m.id))}`);
  return `Hai ${joinIt(parts)}`;
}
