// The sample gallery anyone can try, on Android too: the 45 demo photos, loaded from Wikimedia
// Commons, with the answers Gemma gave on them. Run: npx tsx scripts/test-sample.ts
import assert from 'node:assert/strict';
import { demoAnalysis, samplePhotos } from '../src/demo/sample';

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
console.log('sample: ok');
