// Photos from the web (the sample gallery) are asked for with the app's name: Wikimedia refuses
// Android's generic image loader (okhttp/…: 403). Every photo <Image> goes through photoSource().
// Run: npx tsx scripts/test-photo-source.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { photoSource } from '../src/ui/photoSource';

const web = photoSource('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/b.jpg/330px-b.jpg') as { uri: string; headers?: Record<string, string> };
assert.match(web.headers?.['User-Agent'] ?? '', /^Mantide \(https:\/\/github\.com\/.+\/mantide\)$/, 'a web photo names the app and its repository');
assert.deepEqual(photoSource('file:///storage/emulated/0/DCIM/a.jpg'), { uri: 'file:///storage/emulated/0/DCIM/a.jpg' }, 'a gallery photo needs no headers');
assert.deepEqual(photoSource('data:image/jpeg;base64,AAAA'), { uri: 'data:image/jpeg;base64,AAAA' });

// No screen builds a photo source by hand.
const root = join(__dirname, '..');
const files = [...readdirSync(join(root, 'src/screens')).map((f) => `src/screens/${f}`), 'src/map/MapCanvas.tsx'];
const byHand = files.flatMap((file) =>
  readFileSync(join(root, file), 'utf8')
    .split('\n')
    .flatMap((line, i) => (/source=\{\{\s*uri/.test(line) ? [`${file}:${i + 1}`] : [])),
);
assert.deepEqual(byHand, [], 'photo sources built by hand');
console.log('photo source: ok');
