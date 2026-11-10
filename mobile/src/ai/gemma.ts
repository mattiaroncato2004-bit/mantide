// Asks Gemma 4 E2B what a photo shows and which interests it reveals.
// Gemma runs on hardware you own: `litert-lm serve` on your computer (see local-ai/README.md).
// The photo is shrunk to 384 px before leaving the app: fewer image tokens, about 6 s per photo
// on a laptop CPU, and the original never leaves the device.
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Storage from '../storage';
import { imageForGemma } from './image';
import { parseAnswer, type Analysis } from './parse';
import type { Photo } from '../gallery/photos';
import demo from '../demo/demo.json';
import { t } from '../i18n';

export type { Analysis } from './parse';

// From the Android emulator, 10.0.2.2 is the computer it runs on; the browser demo runs on that
// computer itself. On a real phone, use the computer's address on the local network.
export const GEMMA_URL = Platform.OS === 'web' ? 'http://127.0.0.1:9379' : 'http://10.0.2.2:9379';
export const GEMMA_MODEL = 'gemma4-e2b';

// Gemma 4 E2B needs about 2–3 GB of RAM with images, so it can run on the phone itself only
// from 8 GB up. Below that it runs on the user's computer: either way, never in a third-party cloud.
const ON_DEVICE_MIN_GB = 8;

export function whereGemmaRuns(): string {
  if (Platform.OS === 'web') return t('gemma.web');
  const gb = Device.totalMemory ? Math.round(Device.totalMemory / 1024 ** 3) : null;
  const device = t(Device.isDevice ? 'device.phone' : 'device.emulator');
  if (gb === null) return t('gemma.unknownRam');
  return t(gb >= ON_DEVICE_MIN_GB ? 'gemma.enoughRam' : 'gemma.littleRam', { device, gb, min: ON_DEVICE_MIN_GB });
}

// Tested on Gemma 4 E2B: a plain instruction gives clean JSON; the server's constrained
// JSON mode produced broken output and worse labels, so we parse the text ourselves.
// One short hint per id: without them Gemma filed most murals under "art" instead of "street-art".
// Keep in sync with local-ai/test_photo.py.
const HINTS =
  'street-art (murals, graffiti), food (dishes, restaurants), sea (sea, beaches), ' +
  'mountains (mountains, hiking), art (museums, paintings, sculptures), architecture (buildings, bridges), ' +
  'live-music (concerts, live music), nature (parks, animals, plants), sport, wine (wine, bars), ' +
  'history (castles, ancient monuments), nightlife (nightlife, clubs)';

const PROMPT =
  'Look at this photo. Which interests of the person who took it does it reveal? ' +
  `Choose 1 to 3 ids, most evident first, ONLY from this list: ${HINTS}. ` +
  'Reply with one line of JSON and nothing else, exactly like: ' +
  '{"scene": "<what you see, in English, max 8 words>", "interests": ["id", "id"]}';

const KEY = 'analysis:v2'; // v2: English interest ids

// Gemma's answers on the invented demo gallery, computed beforehand by local-ai/precompute_demo.py.
// Used only when Gemma can't be reached during a live demo; the app says so on screen.
const DEMO = demo as Record<string, { analysis: Analysis | null }>;
export const demoAnalysis = (filename: string): Analysis | null => DEMO[filename]?.analysis ?? null;

export async function analyzePhoto(uri: string): Promise<Analysis> {
  const image = await imageForGemma(uri);
  const response = await fetch(`${GEMMA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GEMMA_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Gemma ha risposto ${response.status}`);
  const body = await response.json();
  const analysis = parseAnswer(body.choices?.[0]?.message?.content ?? '');
  if (!analysis) throw new Error("Can't read Gemma's answer");
  return analysis;
}

export async function loadAnalyses(): Promise<Record<string, Analysis>> {
  const saved = await Storage.getItem(KEY);
  return saved ? JSON.parse(saved) : {};
}

export const saveAnalyses = (all: Record<string, Analysis>) => Storage.setItem(KEY, JSON.stringify(all));

// Photos of the same place and day mostly say the same thing: Gemma sees at most
// `perGroup` of each, so a gallery of thousands becomes a few minutes of work.
export function sample(photos: Photo[], perGroup = 3, max = 60): Photo[] {
  const seen = new Map<string, number>();
  const picked: Photo[] = [];
  for (const p of photos) {
    const key = `${p.province ?? p.country}-${new Date(p.takenAt).toISOString().slice(0, 10)}`;
    const n = seen.get(key) ?? 0;
    if (n >= perGroup) continue;
    seen.set(key, n + 1);
    picked.push(p);
    if (picked.length >= max) break;
  }
  return picked;
}
