// The string layer: language choice and interpolation. Run: npx tsx scripts/test-i18n.ts
import assert from 'node:assert/strict';
import { formatCount, formatDate, formatDistance, pickLocale, pickRegion, setLocaleForTests, t, tc } from '../src/i18n';

assert.equal(pickLocale(['it-IT']), 'it');
assert.equal(pickLocale(['de-DE', 'it-CH']), 'it');
assert.equal(pickLocale(['fr-FR', 'en-GB']), 'en');
assert.equal(pickLocale([]), 'en');

setLocaleForTests('en');
assert.equal(t('test.hello', { name: 'Ada' }), 'Hello, Ada');
assert.equal(tc('count.countries', 1), '1 country');
assert.equal(tc('count.countries', 6), '6 countries');

// The public web demo runs on a visitor's browser: nothing of ours runs on their computer.
assert.ok(!t('gemma.web').includes('this computer'), t('gemma.web'));

setLocaleForTests('it');
assert.ok(!t('gemma.web').includes('questo computer'), t('gemma.web'));
assert.equal(tc('count.countries', 1), '1 paese');
assert.equal(tc('count.countries', 6), '6 paesi');

// Region decides miles and the date style.
assert.equal(pickRegion(['en-US']), 'US');
assert.equal(pickRegion(['es-US']), 'US');
assert.equal(pickRegion(['en']), undefined);
const d = Date.UTC(2026, 10, 7, 12);
setLocaleForTests('en', 'US');
assert.equal(formatDate(d, 'day-month'), 'Nov 7');
assert.equal(formatDate(d, 'medium'), 'Nov 7, 2026');
assert.equal(formatDistance(16.09), '10 mi');
assert.equal(formatDistance(8604), '5,346 mi');
assert.equal(t('level.traveller'), 'Traveler');
setLocaleForTests('en', 'GB');
assert.equal(formatDate(d, 'day-month'), '7 Nov');
assert.equal(formatDistance(16.09), '10 mi');
setLocaleForTests('en', 'DE');
assert.equal(formatDistance(16.09), '16 km');
setLocaleForTests('it', 'IT');
assert.equal(formatDate(d, 'day-month'), '7 nov');
assert.equal(formatDistance(16.09), '16 km');


// Thousands separators follow the number locale.
setLocaleForTests('en', 'US');
assert.equal(formatCount(3144), '3,144');
assert.equal(formatCount(14), '14');
assert.equal(tc('count.photos', 1500), '1,500 photos');
setLocaleForTests('en', 'GB');
assert.equal(formatCount(3144), '3,144');
setLocaleForTests('it', 'IT');
assert.equal(formatCount(3144), '3.144');
assert.equal(formatCount(14), '14');

// "All seen" is said once for regions, provinces, states and counties.
assert.ok(!/\bviste\b/.test(t('passport.allSeen')), t('passport.allSeen'));

console.log('i18n: ok');
