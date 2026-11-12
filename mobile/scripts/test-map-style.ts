// The map style shared by the Android and web renderers must be valid MapLibre style.
// Run: npx tsx scripts/test-map-style.ts
import assert from 'node:assert/strict';
import { validateStyleMin, type StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { ATTRIBUTION, baseStyle, FALLBACK_STYLE, OVERLAY_LAYERS, OVERLAY_SOURCES } from '../src/map/style';
import { C } from '../src/theme';

const satellite = baseStyle('satellite');
assert.equal(typeof satellite, 'object');
assert.deepEqual(validateStyleMin(satellite as StyleSpecification), [], 'satellite style is valid');
assert.equal(baseStyle('standard'), 'https://tiles.openfreemap.org/styles/liberty');

// When the street map's style can't be fetched, the map falls back to a style with nothing remote,
// so the visited areas and photos still draw.
assert.deepEqual(validateStyleMin(FALLBACK_STYLE), [], 'fallback style is valid');
assert.equal(JSON.stringify(FALLBACK_STYLE).includes('http'), false, 'fallback style loads nothing remote');
assert.deepEqual(FALLBACK_STYLE.projection, { type: 'globe' }, 'fallback style is a globe like the others');

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
