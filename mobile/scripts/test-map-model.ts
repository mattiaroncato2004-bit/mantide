// The map model shared by the Android and web renderers. Run: npx tsx scripts/test-map-model.ts
import assert from 'node:assert/strict';
import { areasInView, coversWithoutThumb, distanceRings, frameOf, levelForZoom, makePhotoIndex, placeAt, placeLevelForZoom } from '../src/map/model';

// Zoom decides what lights up.
assert.equal(levelForZoom(1.4), 'country');
assert.equal(levelForZoom(5), 'region');
assert.equal(levelForZoom(8), 'province');

// Regions of every country in view, with the visited flag; neighbours show their real regions.
const italy = areasInView('region', [6, 36, 19, 47.5], { country: [], region: ['05'], province: [] });
assert.equal(italy.features.filter((f) => f.properties.id === '05')[0].properties.visited, true);
assert.equal(italy.features.filter((f) => f.properties.id === '03')[0].properties.visited, false);
assert.ok(italy.features.some((f) => f.properties.id.startsWith('FRA-')), 'neighbours show their real regions');

// A view across the antimeridian keeps both sides.
const pacific = areasInView('country', [170, -50, -170, 10], { country: [], region: [], province: [] });
assert.ok(['NZL', 'FJI'].every((id) => pacific.features.some((f) => f.properties.id === id)), 'both sides of the antimeridian');

// Provinces: Italian ones, units of the four regrouped countries; elsewhere the first-level units.
const veneto = areasInView('province', [11.5, 45, 13, 46], { country: [], region: [], province: ['TV'] });
assert.equal(veneto.features.find((f) => f.properties.id === 'TV')?.properties.level, 'province');
assert.equal(veneto.features.find((f) => f.properties.id === 'TV')?.properties.visited, true);

// 10,000 photos: build once, then each view well inside a frame, at most 60 markers.
const many = Array.from({ length: 10_000 }, (_, i) => ({ id: String(i), lon: -10 + (i % 200) / 10, lat: 36 + (i % 150) / 10, takenAt: i }));
const index = makePhotoIndex(many);
const t0 = performance.now();
const clusters = index.clusters([-180, -85, 180, 85], 4);
assert.ok(performance.now() - t0 < 16, `clusters took ${(performance.now() - t0).toFixed(1)} ms`);
assert.ok(clusters.length > 0 && clusters.length <= 60, `${clusters.length} markers`);
assert.ok(clusters.reduce((n, c) => n + c.count, 0) <= 10_000);
const first = clusters[0];
assert.equal(index.leaves(first.key).length, first.count);
assert.deepEqual(index.leaves(first.key), [...index.leaves(first.key)].sort((a, b) => Number(a) - Number(b)), 'oldest first');
assert.ok(index.leaves(first.key).includes(first.coverId), 'the cover is one of its photos');
// A single photo is its own marker, keyed by its id.
const lone = makePhotoIndex([{ id: 'x', lon: 12, lat: 45, takenAt: 1 }]).clusters([-180, -85, 180, 85], 10);
assert.deepEqual(lone.map((c) => [c.key, c.count, c.coverId]), [['px', 1, 'x']]);

// Rings up to the farthest event; the place under a point at each level.
assert.equal(distanceRings([12.37, 45.63], 25).map((r) => r.km).join(','), '5,10,20');
assert.deepEqual(placeAt(12.37, 45.63, 'province'), { level: 'province', id: 'TV' });
assert.deepEqual(placeAt(12.37, 45.63, 'region'), { level: 'region', id: '05' });
assert.deepEqual(placeAt(-30, 40, 'country'), null);

// The sheet talks about the place around the lit areas: the world far out, the country while its
// regions are lit, the region while its provinces are, the province up close.
assert.equal(placeLevelForZoom(1.4), null);
assert.equal(placeLevelForZoom(5), 'country');
assert.equal(placeLevelForZoom(7), 'region');
assert.equal(placeLevelForZoom(10), 'province');

// Tapping an area flies one step in, so the sheet then talks about that area.
for (const [level, id] of [['country', 'ITA'], ['country', 'FRA'], ['region', '12'], ['region', '05'], ['province', 'TV']] as const) {
  const frame = frameOf(level, id)!;
  assert.equal(placeLevelForZoom(frame.zoom), level, `${id}: zoom ${frame.zoom}`);
  assert.deepEqual(placeAt(frame.center[0], frame.center[1], level), { level, id }, `${id}: centre ${frame.center}`);
}
assert.ok(frameOf('country', 'RUS')!.zoom < frameOf('country', 'ITA')!.zoom, 'a bigger country is framed from farther');
assert.equal(frameOf('region', 'nowhere'), null);

// Thumbnails are made only for the pins on screen, each once.
const pins = [
  { key: 'c1', lon: 0, lat: 0, count: 3, coverId: 'a' },
  { key: 'pb', lon: 1, lat: 1, count: 1, coverId: 'b' },
  { key: 'c2', lon: 2, lat: 2, count: 2, coverId: 'a' },
];
assert.deepEqual(coversWithoutThumb(pins, { b: 'data:…' }), ['a']);
assert.deepEqual(coversWithoutThumb(pins, { a: 'x', b: 'y' }), []);

console.log('map model: ok');
