// Checks the travel stats on the demo traveler. Run: npx tsx scripts/test-passport.ts
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
// The demo traveler lives in San Francisco (the app's demo home): "where you are" is the USA.
const home = locate(37.7599, -122.4148);
const p = passport({ country: ids('country'), region: ids('region'), province: ids('province') }, home.country ?? '');

assert.equal(p.countries.visited, 6);
assert.equal(p.level.name, 'Traveler');
assert.deepEqual(p.level.next, { name: 'Explorer', missing: 4 });
const continent = (name: string) => p.continents.find((c) => c.name === name)?.visited;
assert.deepEqual([continent('North America'), continent('Europe'), continent('Asia')], [3, 2, 1]);
assert.ok(p.byCountry.some((c) => c.name === 'Japan'), 'country names follow the language');
assert.equal(nameOf('country', 'GBR'), 'United Kingdom');
assert.equal(nameOf('province', 'nope'), 'Unknown place');
assert.equal(nameOf('province', 'PRT-746'), 'Lisbon');
assert.equal(nameOf('province', 'VE'), 'Venezia', 'Italian provinces keep their names');
setLocaleForTests('it');
assert.equal(passport({ country: ['ITA', 'FRA', 'ESP'], region: [], province: [] }, '').level.name, 'Viaggiatore');
assert.equal(nameOf('country', 'GBR'), 'Regno Unito');
assert.equal(nameOf('province', 'PRT-746'), 'Lisbona');
setLocaleForTests('en');
assert.equal(p.here?.name, 'United States of America');
assert.deepEqual(p.here?.regions, { visited: 6, total: 51 });
assert.equal(p.here?.provinces?.total, 3144);
assert.equal(passport({ country: [], region: [], province: [] }, '').countries.landPct, 0);

console.log(`${p.countries.visited}/${p.countries.total} countries, ${p.countries.landPct.toFixed(1)}% of the world's land, level ${p.level.name}, ${p.level.next?.missing} more for ${p.level.next?.name}`);
console.log(`${p.here?.name}: ${p.here?.regions.visited}/${p.here?.regions.total} states, ${p.here?.provinces?.visited}/${p.here?.provinces?.total} counties`);
console.log(p.byCountry.map((c) => `${c.name} ${c.regions.visited}/${c.regions.total}`).join(' · '));

// A gallery with Italian and US photos: "where you are" counts only that country's provinces or counties.
const both = { country: ['ITA', 'USA'], region: ['05', 'US-CA', 'US-NY'], province: ['TV', 'VE', 'US-06075'] };
const usa = passport(both, 'USA').here!;
assert.deepEqual(usa.regions, { visited: 2, total: 51 });
assert.equal(usa.provinces?.visited, 1);
assert.equal(usa.words.province, 'county');
assert.equal(usa.words.region, 'state');
const ita = passport(both, 'ITA').here!;
assert.deepEqual(ita.provinces, { visited: 2, total: 110 });
assert.deepEqual(ita.words, { region: 'region', province: 'province' });
assert.equal(passport(both, 'FRA').here?.provinces, undefined);
// Marks saved by 0.3.0 with Natural Earth's US ids are never counted.
assert.equal(passport({ country: ['USA'], region: ['USA-3521'], province: [] }, 'USA').here?.regions.visited, 0);
console.log(`USA: ${usa.regions.visited}/${usa.regions.total} states, ${usa.provinces?.visited}/${usa.provinces?.total} counties`);

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
