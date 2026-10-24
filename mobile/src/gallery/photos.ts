// Reads the device gallery: date and GPS of every photo, and the place it belongs to.
// Only photos with GPS are kept; nothing leaves the device here.
import Storage from '../storage';
import { locate, nameOf, type Place } from '../geo/locate';
import demo from '../demo/demo.json';
import { askForAllPhotos, readGallery, requestGallery, type GalleryAccess } from './source';

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

const KEY = 'photos:v1';

export async function scanGallery(
  onProgress: (read: number, withGps: number) => void,
  limit = 3000,
): Promise<Photo[]> {
  const photos: Photo[] = [];
  await readGallery((page, read) => {
    for (const raw of page) {
      const fallback = DEMO[raw.filename];
      const lat = raw.gps?.latitude ?? fallback?.lat;
      const lon = raw.gps?.longitude ?? fallback?.lon;
      if (lat === undefined || lon === undefined) continue;
      photos.push({
        id: raw.id,
        uri: raw.uri,
        filename: raw.filename,
        takenAt: raw.gps ? raw.takenAt : (fallback?.takenAt ?? raw.takenAt),
        lat,
        lon,
        ...locate(lat, lon),
      });
    }
    onProgress(read, photos.length);
  }, limit);
  await Storage.setItem(KEY, JSON.stringify(photos));
  return photos;
}

export async function loadPhotos(): Promise<Photo[]> {
  const saved = await Storage.getItem(KEY);
  return saved ? JSON.parse(saved) : [];
}

export type PlaceGroup = {
  key: string;
  title: string; // "Venezia" or "Francia"
  subtitle: string; // "Veneto · 3 giorni · 41 foto"
  photos: Photo[];
  lat: number;
  lon: number;
  place: Place;
};

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// One group per Italian province or per foreign country, most recent first.
export function groupByPlace(photos: Photo[]): PlaceGroup[] {
  const groups = new Map<string, Photo[]>();
  for (const p of photos) {
    const key = p.province ? `IT-${p.province}` : (p.country ?? 'unknown');
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const first = list[0];
      const days = new Set(list.map((p) => day(p.takenAt))).size;
      const where = first.province ? nameOf('region', first.region) : 'Estero';
      return {
        key,
        title: first.province ? nameOf('province', first.province) : nameOf('country', first.country),
        subtitle: `${where} · ${days} ${days === 1 ? 'giorno' : 'giorni'} · ${list.length} foto`,
        photos: list,
        lat: first.lat,
        lon: first.lon,
        place: { country: first.country, region: first.region, province: first.province },
      };
    })
    .sort((a, b) => b.photos[0].takenAt - a.photos[0].takenAt);
}
