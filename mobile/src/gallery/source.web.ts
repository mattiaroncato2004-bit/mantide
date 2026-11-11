// Browser version of source.ts: a browser can't read a phone gallery, so the web demo reads the
// sample gallery (src/demo/sample.ts), each photo loaded from Wikimedia Commons.
import { samplePhotos } from '../demo/sample';
import type { GalleryAccess, RawPhoto } from './source';

export type { GalleryAccess, RawPhoto } from './source';

export async function requestGallery(): Promise<GalleryAccess> {
  return 'all';
}

export async function askForAllPhotos(): Promise<void> {}

export async function readGallery(onPage: (photos: RawPhoto[], read: number) => void): Promise<void> {
  const photos = samplePhotos();
  onPage(photos, photos.length);
}
