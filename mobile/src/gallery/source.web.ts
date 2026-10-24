// Browser version of source.ts: a browser can't read a phone gallery, so the web demo uses the
// invented demo gallery (demo-data/), with each photo loaded from Wikimedia Commons.
import demo from '../demo/demo.json';
import type { GalleryAccess, RawPhoto } from './source';

export type { GalleryAccess, RawPhoto } from './source';

const DEMO = demo as Record<string, { lat: number; lon: number; takenAt: number; url: string }>;

export async function requestGallery(): Promise<GalleryAccess> {
  return 'all';
}

export async function askForAllPhotos(): Promise<void> {}

export async function readGallery(onPage: (photos: RawPhoto[], read: number) => void): Promise<void> {
  const photos = Object.entries(DEMO)
    .map(([file, p]) => ({ id: file, uri: p.url, filename: file, takenAt: p.takenAt, gps: { latitude: p.lat, longitude: p.lon } }))
    .sort((a, b) => b.takenAt - a.takenAt);
  onPage(photos, photos.length);
}
