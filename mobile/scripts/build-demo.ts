// Builds src/demo/demo.json from the demo gallery: for each demo photo, its invented GPS and
// date (the same values written in its EXIF) and Gemma's answer from demo-data/analyses.json.
// The app uses it only as a fallback during a live demo. Run: npx tsx scripts/build-demo.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

type DemoPhoto = { file: string; lat: number; lon: number; takenAt: string };
type Analysis = { scene: string; interests: string[] };

const photos: DemoPhoto[] = JSON.parse(readFileSync('../demo-data/photos.json', 'utf8'));
const analysesPath = '../demo-data/analyses.json';
const analyses: Record<string, Analysis> = existsSync(analysesPath) ? JSON.parse(readFileSync(analysesPath, 'utf8')) : {};

const demo = Object.fromEntries(
  photos.map((p) => [p.file, { lat: p.lat, lon: p.lon, takenAt: Date.parse(p.takenAt), analysis: analyses[p.file] ?? null }]),
);
writeFileSync('src/demo/demo.json', JSON.stringify(demo) + '\n');
console.log(`wrote src/demo/demo.json: ${photos.length} photos, ${Object.keys(analyses).length} with Gemma's answer`);
