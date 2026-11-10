// Where the bottom sheet comes to rest after a drag. Run: npx tsx scripts/test-sheet.ts
import assert from 'node:assert/strict';
import { detentHeights, settle } from '../src/ui/detents';

const h = detentHeights(844);
assert.deepEqual(h, { low: 132, mid: 388, high: 760 });
assert.deepEqual(detentHeights(844, 34), { low: 166, mid: 388, high: 760 }, 'the low sheet clears the home indicator');

assert.equal(settle(140, 0, h), 'low', 'released near the bottom');
assert.equal(settle(300, 0, h), 'mid', 'released nearer the middle');
assert.equal(settle(200, -1.5, h), 'mid', 'a flick up from low reaches the middle');
assert.equal(settle(400, -3, h), 'high', 'a strong flick up goes all the way');
assert.equal(settle(700, 2, h), 'mid', 'a flick down from high drops to the middle');
assert.equal(settle(900, 0, h), 'high', 'pulled past the top stays at the top');
assert.equal(settle(40, 0, h), 'low', 'pushed below the bottom stays at the bottom');

console.log('sheet: ok');
