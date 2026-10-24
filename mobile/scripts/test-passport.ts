// Checks the travel stats on the demo traveller. Run: npx tsx scripts/test-passport.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRY_INFO, locate } from '../src/geo/locate';
import { passport } from '../src/stats/passport';

// Italy is about 0.2% of the world's land: the area estimate must land close to it.
const italy = COUNTRY_INFO.find((c) => c.id === 'ITA')!;
assert.ok(italy.areaKm2 > 270_000 && italy.areaKm2 < 330_000, `Italy area ${Math.round(italy.areaKm2)} km²`);

const photos: { lat: number; lon: number }[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
const places = photos.map((p) => locate(p.lat, p.lon));
const ids = (key: 'country' | 'region' | 'province') => [...new Set(places.map((p) => p[key]).filter((x): x is string => !!x))];
const p = passport({ country: ids('country'), region: ids('region'), province: ids('province') }, 'ITA');

assert.equal(p.countries.visited, 6);
assert.equal(p.level.name, 'Viaggiatore');
assert.deepEqual(p.level.next, { name: 'Esploratore', missing: 4 });
assert.equal(p.continents.find((c) => c.name === 'Europa')?.visited, 6);
assert.equal(p.here?.regions.total, 20);
assert.equal(p.here?.provinces?.total, 110);
assert.equal(passport({ country: [], region: [], province: [] }, '').countries.landPct, 0);

console.log(`${p.countries.visited}/${p.countries.total} paesi, ${p.countries.landPct.toFixed(1)}% delle terre emerse, livello ${p.level.name}, mancano ${p.level.next?.missing} a ${p.level.next?.name}`);
console.log(`Italia: ${p.here?.regions.visited}/${p.here?.regions.total} regioni, ${p.here?.provinces?.visited}/${p.here?.provinces?.total} province`);
console.log(p.byCountry.map((c) => `${c.name} ${c.regions.visited}/${c.regions.total}`).join(' · '));
console.log('passport: ok');
