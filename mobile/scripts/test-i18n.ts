// The string layer: language choice and interpolation. Run: npx tsx scripts/test-i18n.ts
import assert from 'node:assert/strict';
import { pickLocale, setLocaleForTests, t, tc } from '../src/i18n';

assert.equal(pickLocale(['it-IT']), 'it');
assert.equal(pickLocale(['de-DE', 'it-CH']), 'it');
assert.equal(pickLocale(['fr-FR', 'en-GB']), 'en');
assert.equal(pickLocale([]), 'en');

setLocaleForTests('en');
assert.equal(t('test.hello', { name: 'Ada' }), 'Hello, Ada');
assert.equal(tc('count.countries', 1), '1 country');
assert.equal(tc('count.countries', 6), '6 countries');

setLocaleForTests('it');
assert.equal(tc('count.countries', 1), '1 paese');
assert.equal(tc('count.countries', 6), '6 paesi');

console.log('i18n: ok');
