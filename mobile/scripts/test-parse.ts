// Checks how the app reads Gemma's answers. Run: npx tsx scripts/test-parse.ts
import assert from 'node:assert/strict';
import { parseAnswer } from '../src/ai/parse';

// A real answer from Gemma 4 E2B.
assert.deepEqual(parseAnswer('{"scene": "Mural on a street wall", "interests": ["street-art", "art"]}'), {
  scene: 'Mural on a street wall',
  interests: ['street-art', 'art'],
});
// Text around the JSON, duplicates and unknown ids are dropped.
assert.deepEqual(parseAnswer('Here: {"scene":"Pizza","interests":["food","food","pizza"]} done'), {
  scene: 'Pizza',
  interests: ['food'],
});
// The Italian ids of the hackathon version are no longer valid.
assert.equal(parseAnswer('{"scene":"x","interests":["cibo","arte"]}'), null);
// At most 3 interests.
assert.equal(parseAnswer('{"scene":"x","interests":["food","sea","art","wine"]}')?.interests.length, 3);
// The broken output of the server's constrained JSON mode, and answers with no usable interest.
assert.equal(parseAnswer('{"scene":": ","landmark":"}'), null);
assert.equal(parseAnswer('{"scene":"x","interests":[]}'), null);
assert.equal(parseAnswer('no JSON here'), null);
console.log('parseAnswer: 7 cases ok');
