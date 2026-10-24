// Asks Gemma 4 E2B what a photo shows and which interests it reveals.
// Gemma runs on hardware you own: `litert-lm serve` on your computer (see local-ai/README.md).
// The photo is shrunk to 384 px before leaving the app: fewer image tokens, about 6 s per photo
// on a laptop CPU, and the original never leaves the device.
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Storage from 'expo-sqlite/kv-store';
import { INTEREST_IDS, type InterestId } from './interests';
import type { Photo } from '../gallery/photos';
import demo from '../demo/demo.json';

// From the Android emulator, 10.0.2.2 is the computer it runs on.
// On a real phone, use the computer's address on the local network.
export const GEMMA_URL = 'http://10.0.2.2:9379';
export const GEMMA_MODEL = 'gemma4-e2b';

export type Analysis = { scene: string; interests: InterestId[] };

// Tested on Gemma 4 E2B: a plain instruction gives clean JSON; the server's constrained
// JSON mode produced broken output and worse labels, so we parse the text ourselves.
// One short hint per id: without them Gemma filed most murals under "arte" instead of "street-art".
// Keep in sync with local-ai/test_photo.py.
const HINTS =
  'street-art (murals, graffiti), cibo (dishes, restaurants), mare (sea, beaches), ' +
  'montagna (mountains, hiking), arte (museums, paintings, sculptures), architettura (buildings, bridges), ' +
  'musica (concerts, live music), natura (parks, animals, plants), sport, vino (wine, bars), ' +
  'storia (castles, ancient monuments), notte (nightlife, clubs)';

const PROMPT =
  'Look at this photo. Which interests of the person who took it does it reveal? ' +
  `Choose 1 to 3 ids, most evident first, ONLY from this list: ${HINTS}. ` +
  'Reply with one line of JSON and nothing else, exactly like: ' +
  '{"scene": "<what you see, in Italian, max 8 words>", "interests": ["id", "id"]}';

const KEY = 'analysis:v1';

// Gemma's answers on the invented demo gallery, computed beforehand by local-ai/precompute_demo.py.
// Used only when Gemma can't be reached during a live demo; the app says so on screen.
const DEMO = demo as Record<string, { analysis: Analysis | null }>;
export const demoAnalysis = (filename: string): Analysis | null => DEMO[filename]?.analysis ?? null;

// Keeps only what we can trust: the first {...} block, known interest ids, no duplicates.
export function parseAnswer(text: string): Analysis | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]);
    const interests = [...new Set<string>(Array.isArray(raw.interests) ? raw.interests : [])]
      .filter((id): id is InterestId => (INTEREST_IDS as string[]).includes(id))
      .slice(0, 3);
    if (!interests.length) return null;
    return { scene: String(raw.scene ?? '').slice(0, 80), interests };
  } catch {
    return null;
  }
}

export async function analyzePhoto(uri: string): Promise<Analysis> {
  const small = await manipulateAsync(uri, [{ resize: { width: 384 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
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
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${small.base64}` } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Gemma ha risposto ${response.status}`);
  const body = await response.json();
  const analysis = parseAnswer(body.choices?.[0]?.message?.content ?? '');
  if (!analysis) throw new Error('Risposta di Gemma non leggibile');
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
