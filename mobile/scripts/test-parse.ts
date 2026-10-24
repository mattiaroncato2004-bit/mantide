// Checks how the app reads Gemma's answers. Run: npx tsx scripts/test-parse.ts
import assert from 'node:assert/strict';
import { parseAnswer } from '../src/ai/parse';

// A real answer from Gemma 4 E2B.
assert.deepEqual(parseAnswer('{"scene": "Murale su muro di strada", "interests": ["street-art", "arte"]}'), {
  scene: 'Murale su muro di strada',
  interests: ['street-art', 'arte'],
});
// Text around the JSON, duplicates and unknown ids are dropped.
assert.deepEqual(parseAnswer('Ecco: {"scene":"Pizza","interests":["cibo","cibo","pizza"]} fine'), {
  scene: 'Pizza',
  interests: ['cibo'],
});
// At most 3 interests.
assert.equal(parseAnswer('{"scene":"x","interests":["cibo","mare","arte","vino"]}')?.interests.length, 3);
// The broken output of the server's constrained JSON mode, and answers with no usable interest.
assert.equal(parseAnswer('{"scene":": ","landmark":"}'), null);
assert.equal(parseAnswer('{"scene":"x","interests":[]}'), null);
assert.equal(parseAnswer('nessun JSON'), null);
console.log('parseAnswer: 6 cases ok');
