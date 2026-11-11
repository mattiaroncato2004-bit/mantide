// The sample gallery anyone can try, on Android too: the 45 demo photos, loaded from Wikimedia
// Commons, with the answers Gemma gave on them. Run: npx tsx scripts/test-sample.ts
import assert from 'node:assert/strict';
import { demoAnalysis, samplePhotos } from '../src/demo/sample';
import { locate } from '../src/geo/locate';

const photos = samplePhotos();
assert.equal(photos.length, 45);
for (const p of photos) {
  assert.ok(p.gps && Number.isFinite(p.gps.latitude) && Number.isFinite(p.gps.longitude), `${p.filename} has a position`);
  assert.ok(Number.isFinite(p.takenAt) && p.takenAt > 0, `${p.filename} has a date`);
  assert.match(p.uri, /^https:\/\//, `${p.filename} loads from the web`);
  assert.ok(demoAnalysis(p.filename), `${p.filename} has Gemma's prepared answer`);
}
assert.equal(new Set(photos.map((p) => p.id)).size, 45, 'ids are unique');
assert.ok(photos.every((p, i) => i === 0 || photos[i - 1].takenAt >= p.takenAt), 'newest first, like a gallery');

// The traveler lives in San Francisco: six countries, several US states, back home at the end.
const places = photos.map((p) => locate(p.gps!.latitude, p.gps!.longitude));
const countries = new Set(places.map((p) => p.country));
assert.equal(countries.size, 6, `six countries: ${[...countries].join(', ')}`);
for (const c of ['USA', 'MEX', 'CAN', 'JPN']) assert.ok(countries.has(c), `a photo in ${c}`);
const states = new Set(places.filter((p) => p.country === 'USA').map((p) => p.region));
assert.ok(states.size >= 6 && [...states].every((s) => s?.startsWith('US-')), `at least six US states: ${[...states].join(', ')}`);
assert.equal(places[0].region, 'US-CA', 'the newest photo is in California');
for (const p of photos) assert.match(p.filename, /^\d{4}-\d{2}-\d{2}_[a-z-]+_[a-z-]+-\d{2}\.jpg$/);
console.log('sample: ok');
