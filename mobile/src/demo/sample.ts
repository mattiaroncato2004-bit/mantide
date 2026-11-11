// The sample gallery anyone can try, on Android too: the 45 photos of the invented demo traveller
// (demo-data/), loaded from Wikimedia Commons, and the answers Gemma gave on them beforehand
// (local-ai/precompute_demo.py). Pure, so the test scripts read it in Node.
import type { Analysis } from '../ai/parse';
import type { RawPhoto } from '../gallery/source';
import demo from './demo.json';

const DEMO = demo as Record<string, { lat: number; lon: number; takenAt: number; url: string; analysis: Analysis | null }>;

// Newest first, as a gallery reads.
export function samplePhotos(): RawPhoto[] {
  return Object.entries(DEMO)
    .map(([file, p]) => ({ id: file, uri: p.url, filename: file, takenAt: p.takenAt, gps: { latitude: p.lat, longitude: p.lon } }))
    .sort((a, b) => b.takenAt - a.takenAt);
}

export const demoAnalysis = (filename: string): Analysis | null => DEMO[filename]?.analysis ?? null;
