// The map model shared by the Android and web renderers. Run: npx tsx scripts/test-map-model.ts
import assert from 'node:assert/strict';
import { areasInView, distanceRings, levelForZoom, makePhotoIndex, placeAt } from '../src/map/model';

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

console.log('map model: ok');
