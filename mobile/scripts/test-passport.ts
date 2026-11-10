// Checks the travel stats on the demo traveller. Run: npx tsx scripts/test-passport.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COUNTRY_INFO, locate, nameOf } from '../src/geo/locate';
import { setLocaleForTests } from '../src/i18n';
import { countTrips, passport, placeStats } from '../src/stats/passport';

setLocaleForTests('en');

// Italy is about 0.2% of the world's land: the area estimate must land close to it.
const italy = COUNTRY_INFO.find((c) => c.id === 'ITA')!;
assert.ok(italy.areaKm2 > 270_000 && italy.areaKm2 < 330_000, `Italy area ${Math.round(italy.areaKm2)} km²`);

const photos: { lat: number; lon: number }[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
const places = photos.map((p) => locate(p.lat, p.lon));
const ids = (key: 'country' | 'region' | 'province') => [...new Set(places.map((p) => p[key]).filter((x): x is string => !!x))];
const p = passport({ country: ids('country'), region: ids('region'), province: ids('province') }, 'ITA');

assert.equal(p.countries.visited, 6);
assert.equal(p.level.name, 'Traveller');
assert.deepEqual(p.level.next, { name: 'Explorer', missing: 4 });
assert.equal(p.continents.find((c) => c.name === 'Europe')?.visited, 6);
assert.ok(p.byCountry.some((c) => c.name === 'France'), 'country names follow the language');
assert.equal(nameOf('country', 'GBR'), 'United Kingdom');
assert.equal(nameOf('province', 'nope'), 'Unknown place');
assert.equal(nameOf('province', 'PRT-746'), 'Lisbon');
assert.equal(nameOf('province', 'VE'), 'Venezia', 'Italian provinces keep their names');
setLocaleForTests('it');
assert.equal(passport({ country: ['ITA', 'FRA', 'ESP'], region: [], province: [] }, '').level.name, 'Viaggiatore');
assert.equal(nameOf('country', 'GBR'), 'Regno Unito');
assert.equal(nameOf('province', 'PRT-746'), 'Lisbona');
setLocaleForTests('en');
assert.equal(p.here?.regions.total, 20);
assert.equal(p.here?.provinces?.total, 110);
assert.equal(passport({ country: [], region: [], province: [] }, '').countries.landPct, 0);

console.log(`${p.countries.visited}/${p.countries.total} countries, ${p.countries.landPct.toFixed(1)}% of the world's land, level ${p.level.name}, ${p.level.next?.missing} more for ${p.level.next?.name}`);
console.log(`Italy: ${p.here?.regions.visited}/${p.here?.regions.total} regions, ${p.here?.provinces?.visited}/${p.here?.provinces?.total} provinces`);
console.log(p.byCountry.map((c) => `${c.name} ${c.regions.visited}/${c.regions.total}`).join(' · '));

// The place sheet's three small numbers: photos, areas inside visited / total, trips.
const DAY = 86_400_000;
assert.equal(countTrips([]), 0);
assert.equal(countTrips([40 * DAY, 0, DAY, 2 * DAY, 10 * DAY, 11 * DAY]), 3, 'a gap of more than 4 days starts a trip');
const shots = [
  { takenAt: 0, country: 'ITA', region: '05', province: 'TV' },
  { takenAt: DAY, country: 'ITA', region: '05', province: 'VE' },
  { takenAt: 30 * DAY, country: 'ITA', region: '05', province: 'TV' },
  { takenAt: 31 * DAY, country: 'ITA', region: '12', province: 'RM' },
];
const seen = { country: ['ITA'], region: ['05', '12'], province: ['TV', 'VE', 'RM'] };
assert.deepEqual(placeStats(shots, seen, 'region', '05'), { photos: 3, children: { visited: 2, total: 7 }, trips: 2 });
assert.deepEqual(placeStats(shots, seen, 'country', 'ITA'), { photos: 4, children: { visited: 2, total: 20 }, trips: 2 });
assert.deepEqual(placeStats(shots, seen, 'province', 'TV'), { photos: 2, trips: 2 });
console.log('passport: ok');
