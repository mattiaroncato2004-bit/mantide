// Event recommendations: filters the catalog of sample events by map scale and scores events by
// the interests inferred from the photo gallery. Pure functions, no React.
import { InterestId, labelOf } from '../ai/interests';
import { t } from '../i18n';
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
  sample?: boolean; // invented for the demo
};

export const EVENTS = catalog as Event[];

const DAY_MS = 24 * 60 * 60 * 1000;

// Sample events are dated for the hackathon (autumn 2026). Shift them forward by whole weeks,
// keeping each weekday, so the earliest one is never in the past and the demo stays alive.
export function shiftToNow(events: Event[], now: Date): Event[] {
  const first = Math.min(...events.map((e) => Date.parse(e.start)));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weeks = Math.max(0, Math.ceil((today - first) / (7 * DAY_MS)));
  if (weeks === 0) return events;
  const move = (iso: string) => new Date(Date.parse(iso) + weeks * 7 * DAY_MS).toISOString().slice(0, 10);
  return events.map((e) => ({ ...e, start: move(e.start), end: e.end && move(e.end) }));
}

export const SAMPLE_EVENTS = shiftToNow(EVENTS, new Date());

export type InterestWeight = { id: InterestId; weight: number; photoCount: number }; // weight 0..1

export type Recommendation = {
  event: Event;
  score: number;
  matched: InterestWeight[];
  distanceKm: number;
};

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

// Scores the upcoming events that `keep` accepts; events sharing no interest with the profile are dropped.
function rank(
  events: Event[],
  profile: InterestWeight[],
  lat: number,
  lon: number,
  keep: (event: Event, distanceKm: number) => boolean,
  now: Date,
): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const event of events) {
    const endsAt = Date.parse(event.end ?? event.start) + DAY_MS; // end date is inclusive
    if (endsAt <= now.getTime()) continue;
    const distanceKm = haversineKm(lat, lon, event.lat, event.lon);
    if (!keep(event, distanceKm)) continue;
    const matched = profile
      .filter((p) => p.weight > 0 && event.interests.includes(p.id))
      .sort((a, b) => b.weight - a.weight);
    if (matched.length === 0) continue;
    const daysAway = Math.max(0, (Date.parse(event.start) - now.getTime()) / DAY_MS);
    const bonus = SOON_BONUS * Math.max(0, 1 - daysAway / SOON_DAYS);
    const score = matched.reduce((sum, m) => sum + m.weight, 0) + bonus;
    recs.push({ event, score, matched, distanceKm });
  }
  return recs
    .sort((a, b) => b.score - a.score || a.event.start.localeCompare(b.event.start))
    .slice(0, MAX_RESULTS);
}

// Events for the scale you are looking at on the map ("Per te" tab).
export function recommend(
  events: Event[],
  profile: InterestWeight[],
  scale: Scale,
  focus: Focus,
  now = new Date(),
): Recommendation[] {
  return rank(events, profile, focus.lat, focus.lon, (e, d) => inScale(e, scale, focus, d), now);
}

// Events inside one place, chosen by the caller (the place sheet on the map).
export function recommendIn(
  events: Event[],
  profile: InterestWeight[],
  inPlace: (event: Event) => boolean,
  from: { lat: number; lon: number },
  now = new Date(),
): Recommendation[] {
  return rank(events, profile, from.lat, from.lon, (e) => inPlace(e), now);
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} ${t('list.and')} ${parts[parts.length - 1]}`;
}

// "You have 41 photos of street art and 12 of live music"
export function why(rec: Recommendation): string {
  const withPhotos = rec.matched.filter((m) => m.photoCount > 0);
  if (withPhotos.length === 0) {
    return t('why.interest', { list: joinList(rec.matched.map((m) => lower(labelOf(m.id)))) });
  }
  const parts = withPhotos.map((m, i) =>
    t(i === 0 ? 'why.first' : 'why.next', { count: m.photoCount, interest: lower(labelOf(m.id)) }),
  );
  return t('why.photos', { list: joinList(parts) });
}
