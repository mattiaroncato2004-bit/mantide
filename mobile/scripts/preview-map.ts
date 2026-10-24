// Writes the map page with sample data to a standalone HTML file, to check it in a
// desktop browser. Run: npx tsx scripts/preview-map.ts /tmp/map-preview.html
import { writeFileSync } from 'node:fs';
import countries from '../src/geo/countries.json';
import regions from '../src/geo/it-regions.json';
import provinces from '../src/geo/it-provinces.json';
import { mapHtml } from '../src/map/mapHtml';
import type { MapState } from '../src/types';

const sample: Partial<MapState> = {
  visited: {
    country: ['ITA', 'FRA', 'ESP', 'PRT', 'GBR', 'USA', 'JPN'],
    region: ['05', '03', '12', '09'],
    province: ['TV', 'VE', 'PD'],
    hex: [],
  },
  points: [
    [12.3766, 45.6297], [12.3326, 45.4371], [12.373, 45.4115], [12.4167, 45.4853],
    [12.39, 45.62], [12.36, 45.64], [12.41, 45.61],
  ],
};

const out = process.argv[2] ?? 'map-preview.html';
const html = mapHtml
  .replace('<script>\n(function () {', `<script>window.__MANTIDE_GEO = ${JSON.stringify({ countries, regions, provinces })};</script>\n<script>\n(function () {`)
  .replace('</body>', `<script>window.addEventListener('load', function () { setTimeout(function () { window.mantide.setState(${JSON.stringify(sample)}); }, 500); });</script>\n</body>`);
writeFileSync(out, html);
console.log('wrote', out);
