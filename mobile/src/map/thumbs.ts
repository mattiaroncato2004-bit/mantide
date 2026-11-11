// Small JPEG thumbnails of the photos for the map markers, as data URIs.
// Computed once per photo and cached in the key-value store under "thumbs:v1".
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Storage from '../storage';

const KEY = 'thumbs:v1';
const BATCH = 4; // photos resized in parallel
const SAVE_EVERY = 24; // new thumbnails between two saves of the cache

let cache: Record<string, string> | null = null;
let running: Promise<unknown> = Promise.resolve();

async function load(): Promise<Record<string, string>> {
  if (cache) return cache;
  try {
    const raw = await Storage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(all: Record<string, string>) {
  try {
    await Storage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[thumbs] save failed', e);
  }
}

async function run(photos: { id: string; uri: string }[], size: number) {
  const all = await load();
  const missing = photos.filter((p) => !all[p.id]);
  let unsaved = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    await Promise.all(
      missing.slice(i, i + BATCH).map(async (p) => {
        // The sample photos come from the web, already small: they are their own thumbnails.
        if (/^https?:/.test(p.uri)) {
          all[p.id] = p.uri;
          unsaved++;
          return;
        }
        try {
          const r = await manipulateAsync(p.uri, [{ resize: { width: size } }], {
            compress: 0.6,
            format: SaveFormat.JPEG,
            base64: true,
          });
          if (r.base64) {
            all[p.id] = `data:image/jpeg;base64,${r.base64.replace(/\s+/g, '')}`;
            unsaved++;
          }
        } catch {
          // Unreadable or unsupported file: no thumbnail, the map shows a dot.
        }
      }),
    );
    if (unsaved >= SAVE_EVERY) {
      unsaved = 0;
      await save(all);
    }
  }
  if (unsaved > 0) await save(all);
  const out: Record<string, string> = {};
  for (const p of photos) if (all[p.id]) out[p.id] = all[p.id];
  return out;
}

export async function makeThumbs(photos: { id: string; uri: string }[], size = 160): Promise<Record<string, string>> {
  // One run at a time, so two calls never resize the same photo twice.
  const next = running.then(() => run(photos, size));
  running = next.catch(() => undefined);
  return next;
}
