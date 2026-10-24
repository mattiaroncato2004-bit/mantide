// Reads the device gallery: date and GPS of every photo, and the place it belongs to.
// Only photos with GPS are kept; nothing leaves the device here.
import * as MediaLibrary from 'expo-media-library/legacy'; // the non-legacy import throws at runtime in SDK 58
import Storage from 'expo-sqlite/kv-store';
import { locate, nameOf, type Place } from '../geo/locate';
import demo from '../demo/demo.json';

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

export type GalleryAccess = 'all' | 'limited' | 'denied';

const KEY = 'photos:v1';
const PAGE = 100;

export async function requestGallery(): Promise<GalleryAccess> {
  const res = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  if (!res.granted) return 'denied';
  return res.accessPrivileges === 'limited' ? 'limited' : 'all';
}

// Android 14+: lets a user who shared only some photos share the rest.
export const askForAllPhotos = () => MediaLibrary.presentPermissionsPickerAsync(['photo']);

export async function scanGallery(
  onProgress: (read: number, withGps: number) => void,
  limit = 3000,
): Promise<Photo[]> {
  const photos: Photo[] = [];
  let read = 0;
  let after: string | undefined;
  do {
    // resolveWithFullInfo is what fills `location` on Android (about 5× slower, still fine).
    const page = await MediaLibrary.getAssetsAsync({
      first: PAGE,
      after,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      resolveWithFullInfo: true,
    });
    for (const asset of page.assets) {
      read++;
      const gps = asset.location && (asset.location.latitude || asset.location.longitude) ? asset.location : null;
      const fallback = DEMO[asset.filename];
      const lat = gps?.latitude ?? fallback?.lat;
      const lon = gps?.longitude ?? fallback?.lon;
      if (lat === undefined || lon === undefined) continue;
      photos.push({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        takenAt: gps ? asset.creationTime : (fallback?.takenAt ?? asset.creationTime),
        lat,
        lon,
        ...locate(lat, lon),
      });
    }
    onProgress(read, photos.length);
    after = page.hasNextPage ? page.endCursor : undefined;
  } while (after && read < limit);
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
