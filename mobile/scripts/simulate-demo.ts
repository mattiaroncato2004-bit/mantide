// Runs the demo's logic on the demo data, without Android: places from GPS, the interest
// profile from Gemma's saved answers, and the events shown at each scale from H-FARM.
// Run: npx tsx scripts/simulate-demo.ts
import { readFileSync } from 'node:fs';
import { DETAILED, levelWords, locate, nameOf, provinceCount, regionCount } from '../src/geo/locate';
import { tc } from '../src/i18n';
import { labelOf, type InterestId } from '../src/ai/interests';
import { EVENTS, profileFromCounts, recommend, recommendIn, why } from '../src/events/recommend';
import type { Focus, Scale } from '../src/types';

type DemoPhoto = { file: string; lat: number; lon: number };
const photos: DemoPhoto[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
const analyses: Record<string, { interests: InterestId[] }> = JSON.parse(readFileSync('../demo-data/analyses.json', 'utf8'));

// Places visited, as the map colours them after "Use my gallery".
const places = photos.map((p) => locate(p.lat, p.lon));
const countries = new Set(places.map((p) => p.country).filter(Boolean));
const regions = new Set(places.map((p) => p.region).filter(Boolean));
const provinces = new Set(places.map((p) => p.province).filter(Boolean));
console.log(`Map: ${countries.size} countries · ${regions.size} regions · ${provinces.size} provinces`);
// Countries with two detailed levels: regions and provinces in Italy, states and counties in the USA.
for (const country of DETAILED.keys()) {
  const here = places.filter((p) => p.country === country);
  if (!here.length) continue;
  const words = levelWords(country);
  const seen = (key: 'region' | 'province') => new Set(here.map((p) => p[key]).filter(Boolean)).size;
  console.log(
    `  ${nameOf('country', country)}: ${seen('region')}/${regionCount(country)} ${tc(`unit.${words.region}`, regionCount(country))}` +
      ` · ${seen('province')}/${provinceCount(country)} ${tc(`unit.${words.province}`, provinceCount(country))}`,
  );
}
console.log('  countries:', [...countries].map((c) => nameOf('country', c)).join(', '));
console.log('  provinces:', [...provinces].map((p) => nameOf('province', p)).join(', '));

// Interests, as the Local panel lists them (Gemma sees at most 3 photos per place and day,
// but the demo gallery has at most 3 per day already).
const counts: Partial<Record<InterestId, number>> = {};
for (const a of Object.values(analyses)) for (const i of a.interests) counts[i] = (counts[i] ?? 0) + 1;
const profile = profileFromCounts(counts);
console.log('\nInterests:', profile.map((w) => `${labelOf(w.id)} ${w.photoCount}`).join(' · '));

// Suggestions at each scale, from the emulator's position at H-FARM (Roncade).
const focus: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };
for (const scale of ['global', 'national', 'regional', 'local'] as Scale[]) {
  const recs = recommend(EVENTS, profile, scale, focus, new Date('2026-10-24'));
  console.log(`\nFor you · ${scale} (${recs.length})`);
  for (const r of recs.slice(0, 3)) console.log(`  ${r.event.title} (${r.event.city}) — ${why(r)}`);
}

// The place sheet, when you tap an area on the map.
const sheets = [
  { label: 'Veneto (region)', inPlace: (e: (typeof EVENTS)[number]) => e.region === '05', photos: places.filter((p) => p.region === '05').length },
  { label: 'Venezia (province)', inPlace: (e: (typeof EVENTS)[number]) => locate(e.lat, e.lon).province === 'VE', photos: places.filter((p) => p.province === 'VE').length },
];
for (const sheet of sheets) {
  const recs = recommendIn(EVENTS, profile, sheet.inPlace, focus, new Date('2026-10-24'));
  console.log(`\nPlace sheet · ${sheet.label}: ${sheet.photos} photos, ${recs.length} events`);
  for (const r of recs.slice(0, 2)) console.log(`  ${r.event.title} (${r.event.city}) — ${why(r)}`);
}

