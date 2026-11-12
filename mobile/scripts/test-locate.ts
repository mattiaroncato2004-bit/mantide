// Checks locate() on known places. Run: npx tsx scripts/test-locate.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  childrenOf, countryOfRegion, isDetailed, levelWords, locate, nameOf, placeOfProvince, provinceCount, regionCount, type Place,
} from '../src/geo/locate';
import { setLocaleForTests } from '../src/i18n';

const cases: [string, number, number, ReturnType<typeof locate>][] = [
  ['Roncade (H-FARM)', 45.6297, 12.3766, { country: 'ITA', region: '05', province: 'TV' }],
  ['Venice', 45.4371, 12.3326, { country: 'ITA', region: '05', province: 'VE' }],
  ['Rome', 41.9028, 12.4964, { country: 'ITA', region: '12', province: 'RM' }],
  ['Milan', 45.4642, 9.19, { country: 'ITA', region: '03', province: 'MI' }],
  ['Palermo', 38.1157, 13.3615, { country: 'ITA', region: '19', province: 'PA' }],
  ['Paris', 48.8566, 2.3522, { country: 'FRA' }],
  ['New York', 40.7128, -74.006, { country: 'USA' }],
  ['Lido di Venezia (beach)', 45.4115, 12.3730, { country: 'ITA', region: '05', province: 'VE' }],
  ['Burano (island)', 45.4853, 12.4167, { country: 'ITA', region: '05', province: 'VE' }],
  ['Nice (near the border)', 43.7102, 7.262, { country: 'FRA' }],
  ['Atlantic Ocean', 40, -30, { country: undefined }],
];

for (const [name, lat, lon, expected] of cases) {
  const got = locate(lat, lon);
  assert.deepEqual(expected.country === 'ITA' ? got : { country: got.country }, expected, name);
  console.log('ok', name, JSON.stringify(expected));
}

// Regions outside Italy (Natural Earth admin-1).
const beijing = locate(39.9042, 116.4074);
assert.equal(beijing.country, 'CHN');
assert.ok(beijing.region?.startsWith('CHN-'), 'Beijing has a Chinese region');
const lisbon = locate(38.7223, -9.1393);
assert.equal(lisbon.country, 'PRT');
assert.ok(lisbon.region, 'Lisbon has a region');
console.log('ok regions abroad', JSON.stringify(beijing), JSON.stringify(lisbon));

// The areas one level down: what the place sheet counts as "4/7 provinces".
assert.equal(childrenOf('country', 'ITA').length, 20);
assert.equal(childrenOf('region', '05').length, 7, "Veneto's provinces");
assert.ok(childrenOf('region', '05').includes('TV'));
assert.equal(childrenOf('country', 'ESP').length, regionCount('ESP'));
assert.ok(childrenOf('region', locate(40.4168, -3.7038).region!).length > 0, 'a Spanish region has provinces');
assert.deepEqual(childrenOf('province', 'TV'), []);
console.log('ok children');

// The USA at the same depth as Italy: Census states and counties.
const US: [string, number, number, Place][] = [
  ['San Francisco', 37.7749, -122.4194, { country: 'USA', region: 'US-CA', province: 'US-06075' }],
  ['Los Angeles', 34.0522, -118.2437, { country: 'USA', region: 'US-CA', province: 'US-06037' }],
  ['Manhattan', 40.7831, -73.9712, { country: 'USA', region: 'US-NY', province: 'US-36061' }],
  ['Honolulu', 21.3069, -157.8583, { country: 'USA', region: 'US-HI', province: 'US-15003' }],
  ['Anchorage', 61.2181, -149.9003, { country: 'USA', region: 'US-AK', province: 'US-02020' }],
  ['Miami Beach', 25.7907, -80.13, { country: 'USA', region: 'US-FL', province: 'US-12086' }],
  ['Key West (island)', 24.5551, -81.78, { country: 'USA', region: 'US-FL', province: 'US-12087' }],
  ['Bay off Pier 39 (water)', 37.811, -122.41, { country: 'USA', region: 'US-CA', province: 'US-06075' }],
  // No country within 0.25° (Natural Earth's 1:50m USA has no Keys): the nearest county.
  ['Sea off Key West (water)', 24.5, -81.8, { country: 'USA', region: 'US-FL', province: 'US-12087' }],
  // Small counties and independent cities: they need ~100 m precision.
  ['The Met, Manhattan', 40.7794, -73.9632, { country: 'USA', region: 'US-NY', province: 'US-36061' }],
  ['Upper East Side', 40.7736, -73.9566, { country: 'USA', region: 'US-NY', province: 'US-36061' }],
  ['Harlem', 40.8116, -73.9465, { country: 'USA', region: 'US-NY', province: 'US-36061' }],
  ['Bushwick, Brooklyn', 40.7061, -73.9214, { country: 'USA', region: 'US-NY', province: 'US-36047' }],
  ['The Bronx', 40.8448, -73.8648, { country: 'USA', region: 'US-NY', province: 'US-36005' }],
  ['St. Louis (independent city)', 38.627, -90.1994, { country: 'USA', region: 'US-MO', province: 'US-29510' }],
  ['Baltimore (independent city)', 39.2904, -76.6122, { country: 'USA', region: 'US-MD', province: 'US-24510' }],
  ['Alexandria VA (independent city)', 38.8048, -77.0469, { country: 'USA', region: 'US-VA', province: 'US-51510' }],
  ['Arlington VA', 38.8816, -77.091, { country: 'USA', region: 'US-VA', province: 'US-51013' }],
  ['Richmond VA (independent city)', 37.5407, -77.436, { country: 'USA', region: 'US-VA', province: 'US-51760' }],
];
for (const [name, lat, lon, expected] of US) {
  assert.deepEqual(locate(lat, lon), expected, name);
  console.log('ok', name, JSON.stringify(expected));
}
assert.equal(childrenOf('country', 'USA').length, 51);
assert.equal(childrenOf('region', 'US-CA').length, 58, "California's counties");
assert.equal(regionCount('USA'), 51);
assert.ok(provinceCount('USA') > 3100 && provinceCount('USA') < 3200);
assert.equal(provinceCount('ITA'), 110);
assert.equal(provinceCount('FRA'), 0);
assert.deepEqual(levelWords('USA'), { region: 'state', province: 'county' });
assert.deepEqual(levelWords('ITA'), { region: 'region', province: 'province' });
assert.deepEqual(levelWords('FRA'), { region: 'region', province: 'province' });
assert.ok(isDetailed('USA') && isDetailed('ITA') && !isDetailed('FRA'));
assert.equal(nameOf('region', 'US-CA'), 'California');
// The six independent cities share a name with their county: they keep the Census "city" name.
assert.equal(nameOf('province', 'US-24510'), 'Baltimore city');
assert.equal(nameOf('province', 'US-24005'), 'Baltimore');
assert.equal(nameOf('province', 'US-29510'), 'St. Louis city');
assert.equal(locate(29.9637, -90.0577).province, 'US-22071');
assert.deepEqual(placeOfProvince('US-06075'), { country: 'USA', region: 'US-CA' });
assert.ok(statSync('src/geo/us-states.json').size + statSync('src/geo/us-counties.json').size < 1.5 * 1024 * 1024);
// Natural Earth's US states left world-regions.json: the Census states replace them.
assert.equal(countryOfRegion('USA-3521'), undefined);
// State names in Italian where they differ.
setLocaleForTests('it');
assert.equal(nameOf('region', 'US-ND'), 'Dakota del Nord');
setLocaleForTests('en');
assert.equal(nameOf('region', 'US-ND'), 'North Dakota');
// The capital is not mistaken for the state, and Mexico City is not "Mexico".
assert.equal(nameOf('region', 'US-DC'), 'District of Columbia');
assert.equal(nameOf('region', 'US-WA'), 'Washington');
const mexicoCity = locate(19.4326, -99.1332).region;
assert.equal(nameOf('region', mexicoCity), 'Mexico City');
setLocaleForTests('it');
assert.equal(nameOf('region', 'US-DC'), 'Washington D.C.');
assert.equal(nameOf('region', mexicoCity), 'Città del Messico');
setLocaleForTests('en');
console.log('ok USA');

// No Italy special case left outside the table.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}
const special = ['App.tsx', ...sources('src')]
  .filter((file) => file !== join('src', 'geo', 'locate.ts'))
  .filter((file) => /['"]ITA['"]/.test(readFileSync(file, 'utf8')));
assert.deepEqual(special, [], 'files that still special-case Italy');
console.log('ok one table');
