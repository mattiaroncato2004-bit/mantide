// Checks locate() on known places. Run: npx tsx scripts/test-locate.ts
import assert from 'node:assert/strict';
import { locate } from '../src/geo/locate';

const cases: [string, number, number, ReturnType<typeof locate>][] = [
  ['Roncade (H-FARM)', 45.6297, 12.3766, { country: 'ITA', region: '05', province: 'TV' }],
  ['Venezia', 45.4371, 12.3326, { country: 'ITA', region: '05', province: 'VE' }],
  ['Roma', 41.9028, 12.4964, { country: 'ITA', region: '12', province: 'RM' }],
  ['Milano', 45.4642, 9.19, { country: 'ITA', region: '03', province: 'MI' }],
  ['Palermo', 38.1157, 13.3615, { country: 'ITA', region: '19', province: 'PA' }],
  ['Parigi', 48.8566, 2.3522, { country: 'FRA' }],
  ['New York', 40.7128, -74.006, { country: 'USA' }],
  ['Lido di Venezia (spiaggia)', 45.4115, 12.3730, { country: 'ITA', region: '05', province: 'VE' }],
  ['Burano (isola)', 45.4853, 12.4167, { country: 'ITA', region: '05', province: 'VE' }],
  ['Nizza (vicino al confine)', 43.7102, 7.262, { country: 'FRA' }],
  ['Oceano Atlantico', 40, -30, { country: undefined }],
];

for (const [name, lat, lon, expected] of cases) {
  const got = locate(lat, lon);
  assert.deepEqual(expected.country === 'ITA' ? got : { country: got.country }, expected, name);
  console.log('ok', name, JSON.stringify(expected));
}

// Regions outside Italy (Natural Earth admin-1).
const beijing = locate(39.9042, 116.4074);
assert.equal(beijing.country, 'CHN');
assert.ok(beijing.region?.startsWith('CHN-'), 'Pechino has a Chinese region');
const lisbon = locate(38.7223, -9.1393);
assert.equal(lisbon.country, 'PRT');
assert.ok(lisbon.region, 'Lisbona has a region');
console.log('ok regions abroad', JSON.stringify(beijing), JSON.stringify(lisbon));
