// The map style shared by the Android and web renderers must be valid MapLibre style.
// Run: npx tsx scripts/test-map-style.ts
import assert from 'node:assert/strict';
import { validateStyleMin, type StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { ATTRIBUTION, baseStyle, OVERLAY_LAYERS, OVERLAY_SOURCES } from '../src/map/style';
import { C } from '../src/theme';

const satellite = baseStyle('satellite');
assert.equal(typeof satellite, 'object');
assert.deepEqual(validateStyleMin(satellite as StyleSpecification), [], 'satellite style is valid');
assert.equal(baseStyle('standard'), 'https://tiles.openfreemap.org/styles/liberty');

// The overlays, in drawing order, each reading a GeoJSON source of the same name.
assert.deepEqual(OVERLAY_LAYERS.map((l) => l.id), ['areas-fill', 'areas-line', 'journey', 'rings', 'events']);
const withOverlays: StyleSpecification = {
  version: 8,
  sources: Object.fromEntries(OVERLAY_SOURCES.map((id) => [id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }])),
  layers: OVERLAY_LAYERS,
};
assert.deepEqual(validateStyleMin(withOverlays), [], 'overlay layers are valid');
assert.ok(JSON.stringify(OVERLAY_LAYERS[0]).includes(C.accent), 'visited areas use the accent colour');

// No dashed lines: on Android's emulator renderer a dashed line is counted as drawn but never
// appears (Android run 42929808655: plain rings showed, dashed ones didn't).
for (const layer of OVERLAY_LAYERS) {
  assert.ok(!JSON.stringify(layer).includes('line-dasharray'), `${layer.id} draws a dashed line`);
}

assert.match(ATTRIBUTION.satellite, /EOX/);
assert.match(ATTRIBUTION.standard, /OpenStreetMap/);
console.log('map style: ok');
