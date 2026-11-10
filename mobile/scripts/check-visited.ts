// For every country of the demo photos, checks that each visited region is one of the areas the
// map draws at the national scale, and each visited province one of the areas at the regional
// scale (the hackathon's scale rules; src/map/model.ts areasInView() now draws by zoom). Run: npx tsx scripts/check-visited.ts
import { readFileSync } from 'node:fs';
import regions from '../src/geo/it-regions.json';
import provinces from '../src/geo/it-provinces.json';
import worldRegions from '../src/geo/world-regions.json';
import worldGroups from '../src/geo/world-groups.json';
import { locate, nameOf } from '../src/geo/locate';

type F = { properties: { id: string; country?: string; group?: string; region?: string } };
const units = worldRegions.features as unknown as F[];
const groups = worldGroups.features as unknown as F[];

function nationalIds(country: string): string[] {
  if (country === 'ITA') return (regions.features as unknown as F[]).map((f) => f.properties.id);
  const g = groups.filter((f) => f.properties.country === country);
  if (g.length) return g.map((f) => f.properties.id);
  return units.filter((f) => f.properties.country === country).map((f) => f.properties.id);
}

function regionalIds(country: string, region: string): { level: string; ids: string[] } {
  if (country === 'ITA') return { level: 'province', ids: (provinces.features as unknown as F[]).filter((f) => f.properties.region === region).map((f) => f.properties.id) };
  const inside = units.filter((f) => f.properties.country === country && f.properties.group === region);
  if (inside.length) return { level: 'province', ids: inside.map((f) => f.properties.id) };
  return { level: 'region', ids: units.filter((f) => f.properties.id === region).map((f) => f.properties.id) };
}

const photos: { file: string; lat: number; lon: number }[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
let problems = 0;
const byCountry = new Map<string, { file: string; region?: string; province?: string }[]>();
for (const p of photos) {
  const place = locate(p.lat, p.lon);
  const list = byCountry.get(place.country ?? '?') ?? [];
  list.push({ file: p.file, region: place.region, province: place.province });
  byCountry.set(place.country ?? '?', list);
}

for (const [country, list] of byCountry) {
  const national = new Set(nationalIds(country));
  const visitedRegions = [...new Set(list.map((p) => p.region).filter(Boolean))] as string[];
  console.log(`\n${nameOf('country', country)} (${country}): ${national.size} areas at National, ${list.length} photos`);
  for (const r of visitedRegions) {
    const okN = national.has(r);
    const regional = regionalIds(country, r);
    const provs = [...new Set(list.filter((p) => p.region === r).map((p) => (regional.level === 'province' ? p.province : p.region)).filter(Boolean))] as string[];
    const missing = provs.filter((id) => !regional.ids.includes(id));
    if (!okN || missing.length || !regional.ids.length) problems++;
    console.log(
      `  ${okN ? 'ok ' : 'NO '} National  ${nameOf('region', r)} [${r}]` +
        `\n  ${missing.length || !regional.ids.length ? 'NO ' : 'ok '} Regional  ${regional.ids.length} ${regional.level === 'province' ? 'provinces' : 'areas'}; visited: ${provs.map((id) => (regional.level === 'province' ? nameOf('province', id) : nameOf('region', id))).join(', ')}${missing.length ? '  MISSING: ' + missing.join(', ') : ''}`,
    );
  }
  const noRegion = list.filter((p) => !p.region);
  if (noRegion.length) {
    problems++;
    console.log(`  NO  photos without a region: ${noRegion.map((p) => p.file).join(', ')}`);
  }
}
console.log(problems ? `\n${problems} PROBLEMS` : '\nAll ok');
process.exitCode = problems ? 1 : 0;
