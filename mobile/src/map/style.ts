// The map's look, shared by both renderers: native MapLibre on Android and MapLibre GL JS on the web
// take the same style-spec objects. Two free basemaps, and the overlays drawn on top of either.
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { C } from '../theme';

export type Basemap = 'satellite' | 'standard';

export const ATTRIBUTION: Record<Basemap, string> = {
  satellite: 'Sentinel-2 cloudless 2016 by EOX IT Services (CC BY 4.0), modified Copernicus Sentinel data',
  standard: 'OpenFreeMap © OpenMapTiles, data © OpenStreetMap contributors',
};

const SATELLITE: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 14,
      attribution: ATTRIBUTION.satellite,
    },
  },
  layers: [
    { id: 'space', type: 'background', paint: { 'background-color': '#071521' } },
    { id: 'satellite', type: 'raster', source: 'satellite' },
  ],
};

// OpenFreeMap: free vector tiles from OpenStreetMap, no key. A remote style: the renderers turn it
// into a globe once it loads, and use FALLBACK_STYLE when it can't be fetched.
const STANDARD = 'https://tiles.openfreemap.org/styles/liberty';

// Nothing remote, so the visited areas and photos still draw when the street map is unreachable.
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {},
  layers: [{ id: 'space', type: 'background', paint: { 'background-color': '#071521' } }],
};

export function baseStyle(basemap: Basemap): StyleSpecification | string {
  return basemap === 'satellite' ? SATELLITE : STANDARD;
}

// GeoJSON sources the app fills; each overlay layer reads the source of the same name.
export const OVERLAY_SOURCES = ['areas', 'journey', 'rings', 'events'] as const;

const VEIL = '#eef3f1';

export const OVERLAY_LAYERS: LayerSpecification[] = [
  // Unvisited areas under a light veil; visited ones light up in the accent colour.
  {
    id: 'areas-fill', type: 'fill', source: 'areas',
    paint: { 'fill-color': ['case', ['get', 'visited'], C.accent, VEIL], 'fill-opacity': ['case', ['get', 'visited'], 0.35, 0.5] },
  },
  {
    id: 'areas-line', type: 'line', source: 'areas',
    paint: {
      'line-color': ['case', ['get', 'visited'], C.accent, '#ffffff'],
      'line-width': ['case', ['get', 'visited'], 2.6, 0.6],
      'line-opacity': 0.9,
    },
  },
  // The journey on the timeline: one solid line through every photo, in the order taken.
  {
    id: 'journey', type: 'line', source: 'journey',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': C.accent, 'line-width': 3, 'line-opacity': 0.95 },
  },
  // Distance rings around you: a distance on a card gets a size on the map.
  {
    id: 'rings', type: 'line', source: 'rings',
    // Solid: Android's emulator renderer doesn't show dashed lines (see scripts/test-map-style.ts).
    paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.7 },
  },
  // Suggested events: accent dots with a white ring; the picked one is bigger.
  {
    id: 'events', type: 'circle', source: 'events',
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 14, 9],
      'circle-color': C.accent,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['case', ['get', 'selected'], 5, 3],
    },
  },
];
