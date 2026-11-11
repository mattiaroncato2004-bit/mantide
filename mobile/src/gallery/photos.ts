// Reads the device gallery: date and GPS of every photo, and the place it belongs to.
// Only photos with GPS are kept; nothing leaves the device here.
import Storage from '../storage';
import { locate, type Place } from '../geo/locate';
import demo from '../demo/demo.json';
import { samplePhotos } from '../demo/sample';
import { askForAllPhotos, readGallery, requestGallery, type GalleryAccess, type RawPhoto } from './source';

export { askForAllPhotos, requestGallery, type GalleryAccess };

// The invented demo gallery (demo-data/): same GPS and dates as in the photos' EXIF.
// Used only if a demo photo arrives without GPS, so the demo never depends on the emulator's media scanner.
const DEMO = demo as Record<string, { lat: number; lon: number; takenAt: number }>;

export type Photo = Place & {
  id: string;
  uri: string;
  filename: string;
  takenAt: number; // ms since epoch
  lat: number;
  lon: number;
};

// v2: photos carry the real regions of Spain, France, UK and Portugal (18:20).
const KEY = 'photos:v2';

// A gallery photo with its place, or null without a position.
function toPhoto(raw: RawPhoto): Photo | null {
  const fallback = DEMO[raw.filename];
  const lat = raw.gps?.latitude ?? fallback?.lat;
  const lon = raw.gps?.longitude ?? fallback?.lon;
  if (lat === undefined || lon === undefined) return null;
  return {
    id: raw.id,
    uri: raw.uri,
    filename: raw.filename,
    takenAt: raw.gps ? raw.takenAt : (fallback?.takenAt ?? raw.takenAt),
    lat,
    lon,
    ...locate(lat, lon),
  };
}

export async function scanGallery(
  onProgress: (read: number, withGps: number) => void,
  limit = 3000,
): Promise<Photo[]> {
  const photos: Photo[] = [];
  await readGallery((page, read) => {
    for (const raw of page) {
      const photo = toPhoto(raw);
      if (photo) photos.push(photo);
    }
    onProgress(read, photos.length);
  }, limit);
  await Storage.setItem(KEY, JSON.stringify(photos));
  return photos;
}

// The sample photos instead of the gallery (src/demo/sample.ts).
export async function loadSample(): Promise<Photo[]> {
  const photos = samplePhotos().flatMap((raw) => toPhoto(raw) ?? []);
  await Storage.setItem(KEY, JSON.stringify(photos));
  return photos;
}

// The user excluded the gallery: drop what was read from it.
export const forgetPhotos = () => Storage.setItem(KEY, '[]');

export async function loadPhotos(): Promise<Photo[]> {
  const saved = await Storage.getItem(KEY);
  return saved ? JSON.parse(saved) : [];
}
