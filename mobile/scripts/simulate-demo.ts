// Runs the demo's logic on the demo data, without Android: places from GPS, the interest
// profile from Gemma's saved answers, and the events shown at each scale from H-FARM.
// Run: npx tsx scripts/simulate-demo.ts
import { readFileSync } from 'node:fs';
import { locate, nameOf, TOTALS } from '../src/geo/locate';
import { labelOf, type InterestId } from '../src/ai/interests';
import { EVENTS, profileFromCounts, recommend, recommendIn, why } from '../src/events/recommend';
import type { Focus, Scale } from '../src/types';

type DemoPhoto = { file: string; lat: number; lon: number };
const photos: DemoPhoto[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
const analyses: Record<string, { interests: InterestId[] }> = JSON.parse(readFileSync('../demo-data/analyses.json', 'utf8'));

// Places visited, as the map will color them after "Leggi la galleria".
const places = photos.map((p) => locate(p.lat, p.lon));
const countries = new Set(places.map((p) => p.country).filter(Boolean));
const regions = new Set(places.map((p) => p.region).filter(Boolean));
const provinces = new Set(places.map((p) => p.province).filter(Boolean));
console.log(`Mappa: ${countries.size} paesi · ${regions.size}/${TOTALS.region} regioni · ${provinces.size}/${TOTALS.province} province`);
console.log('  paesi:', [...countries].map((c) => nameOf('country', c)).join(', '));
console.log('  province:', [...provinces].map((p) => nameOf('province', p)).join(', '));

// Interests, as the Interessi tab will list them (Gemma sees at most 3 photos per place and day,
// but the demo gallery has at most 3 per day already).
const counts: Partial<Record<InterestId, number>> = {};
for (const a of Object.values(analyses)) for (const i of a.interests) counts[i] = (counts[i] ?? 0) + 1;
const profile = profileFromCounts(counts);
console.log('\nInteressi:', profile.map((w) => `${labelOf(w.id)} ${w.photoCount}`).join(' · '));

// Per te, from the emulator's position at H-FARM (Roncade).
const focus: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };
for (const scale of ['global', 'national', 'regional', 'local'] as Scale[]) {
  const recs = recommend(EVENTS, profile, scale, focus, new Date('2026-10-24'));
  console.log(`\nPer te · ${scale} (${recs.length})`);
  for (const r of recs.slice(0, 3)) console.log(`  ${r.event.title} (${r.event.city}) — ${why(r)}`);
}

// The place sheet, when you tap an area on the map.
const sheets = [
  { label: 'Regione Veneto', inPlace: (e: (typeof EVENTS)[number]) => e.region === '05', photos: places.filter((p) => p.region === '05').length },
  { label: 'Provincia di Venezia', inPlace: (e: (typeof EVENTS)[number]) => locate(e.lat, e.lon).province === 'VE', photos: places.filter((p) => p.province === 'VE').length },
];
for (const sheet of sheets) {
  const recs = recommendIn(EVENTS, profile, sheet.inPlace, focus, new Date('2026-10-24'));
  console.log(`\nScheda · ${sheet.label}: ${sheet.photos} foto, ${recs.length} eventi`);
  for (const r of recs.slice(0, 2)) console.log(`  ${r.event.title} (${r.event.city}) — ${why(r)}`);
}

