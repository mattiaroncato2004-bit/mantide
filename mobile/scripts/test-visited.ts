// How places become visited and stop being visited. Run: npx tsx scripts/test-visited.ts
import assert from 'node:assert/strict';
import { addMarks, removeSource, type Visited } from '../src/state/marks';

const empty = (): Visited => ({ country: {}, region: {}, province: {} });
const treviso = { country: 'ITA', region: '05', province: 'TV' };
const lisbon = { country: 'PRT', region: 'PRT-Lisbon' };

const v = empty();
addMarks(v, 'photo', [treviso, lisbon]);
addMarks(v, 'gps', [treviso]);
v.country.FRA = ['manual'];
assert.deepEqual(v.province.TV, ['photo', 'gps']);
assert.deepEqual(v.region['PRT-Lisbon'], ['photo']);

// Stopping the gallery (or leaving the sample photos) forgets what the photos marked, and only that.
removeSource(v, 'photo');
assert.deepEqual(v.province.TV, ['gps'], 'GPS still marks Treviso');
assert.equal(v.region['PRT-Lisbon'], undefined, 'Lisbon was only in the photos');
assert.equal(v.country.PRT, undefined);
assert.deepEqual(v.country.FRA, ['manual'], 'marks by hand stay');
console.log('visited: ok');
