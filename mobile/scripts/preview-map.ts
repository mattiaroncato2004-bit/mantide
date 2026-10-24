// Writes the map page with sample data to a standalone HTML file, to check it in a
// desktop browser. Run: npx tsx scripts/preview-map.ts /tmp/map-preview.html
import { writeFileSync } from 'node:fs';
import countries from '../src/geo/countries.json';
import regions from '../src/geo/it-regions.json';
import provinces from '../src/geo/it-provinces.json';
import worldRegions from '../src/geo/world-regions.json';
import worldGroups from '../src/geo/world-groups.json';
import { withGeo } from '../src/map/mapHtml';
import type { MapPhoto, MapState } from '../src/types';

// A tiny colored SVG stands in for a real JPEG thumbnail.
const thumb = (hue: number, label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue},70%,60%)"/><stop offset="1" stop-color="hsl(${hue + 40},70%,30%)"/>` +
      `</linearGradient></defs><rect width="80" height="80" fill="url(#g)"/>` +
      `<text x="40" y="50" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle">${label}</text></svg>`,
  );

const places: [string, number, number, number][] = [
  // name, lat, lon, how many photos
  ['Venezia', 45.4371, 12.3326, 4],
  ['Roncade', 45.6297, 12.3766, 4],
  ['Dolomiti', 46.54, 12.13, 3],
  ['Roma', 41.9028, 12.4964, 2],
  ['Lisbona', 38.72, -9.14, 2],
];
const photos: MapPhoto[] = places.flatMap(([name, lat, lon, n], i) =>
  Array.from({ length: n }, (_, j) => ({
    id: `${name}-${j}`,
    lat: lat + j * 0.004,
    lon: lon + j * 0.005,
    takenAt: Date.UTC(2026, i, 1 + j),
    // One photo without thumbnail, to check the fallback dot.
    thumb: name === 'Roma' && j === 1 ? undefined : thumb(i * 70 + j * 12, name[0] + (j + 1)),
  })),
);

const sample: Partial<MapState> = {
  visited: {
    country: ['ITA', 'FRA', 'ESP', 'PRT', 'GBR', 'USA', 'JPN'],
    region: ['05', '03', '12', '09'],
    province: ['TV', 'VE', 'PD'],
    hex: [],
  },
  points: [[12.3766, 45.6297]], // current position
  photos,
};

const out = process.argv[2] ?? 'map-preview.html';
const html = withGeo({ countries, regions, provinces, worldRegions, worldGroups })
  .replace('</body>', `<script>window.addEventListener('load', function () { setTimeout(function () { window.mantide.setState(${JSON.stringify(sample)}); }, 500); });</script>\n</body>`);
writeFileSync(out, html);
console.log('wrote', out);
