// Checks the events catalog and recommend() on a sample profile. Run: npx tsx scripts/test-recommend.ts
import assert from 'node:assert/strict';
import { INTEREST_IDS } from '../src/ai/interests';
import { EVENTS, haversineKm, recommend, shiftToNow, why, type InterestWeight } from '../src/events/recommend';
import { setLocaleForTests } from '../src/i18n';
import type { Focus, Scale } from '../src/types';

const NOW = new Date('2026-10-24T12:00:00Z');
const RONCADE: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };

// --- Catalog sanity ---
const ids = new Set<string>();
const perScale: Record<string, number> = {};
const perInterest: Record<string, number> = {};
for (const e of EVENTS) {
  assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
  ids.add(e.id);
  assert.ok(e.description.length <= 140, `${e.id}: description ${e.description.length} chars`);
  assert.ok(e.interests.length >= 1 && e.interests.length <= 3, `${e.id}: 1-3 interests`);
  for (const i of e.interests) assert.ok(INTEREST_IDS.includes(i), `${e.id}: unknown interest ${i}`);
  assert.ok(e.start >= '2026-10-25' && (e.end ?? e.start) <= '2027-03-31', `${e.id}: date out of range`);
  assert.ok(!e.end || e.end >= e.start, `${e.id}: end before start`);
  assert.equal(e.region !== undefined, e.country === 'ITA', `${e.id}: region only for Italy`);
  if (e.scale === 'global') assert.notEqual(e.country, 'ITA', `${e.id}: global event in Italy`);
  if (e.scale === 'national') assert.ok(e.country === 'ITA' && e.region !== '05', `${e.id}: national outside Veneto`);
  if (e.scale === 'regional' || e.scale === 'local') assert.equal(e.region, '05', `${e.id}: Veneto`);
  if (e.scale === 'local') {
    const km = haversineKm(RONCADE.lat, RONCADE.lon, e.lat, e.lon);
    assert.ok(km <= 26, `${e.id}: ${km.toFixed(1)} km from Roncade`);
  }
  perScale[e.scale] = (perScale[e.scale] ?? 0) + 1;
  for (const i of e.interests) perInterest[i] = (perInterest[i] ?? 0) + 1;
}
for (const i of INTEREST_IDS) assert.ok(perInterest[i] > 0, `interest ${i} not covered`);
console.log(`ok catalog: ${EVENTS.length} events`, JSON.stringify(perScale));
console.log('   interests', JSON.stringify(perInterest));

// --- Recommendations ---
const profile: InterestWeight[] = [
  { id: 'street-art', weight: 0.4, photoCount: 41 },
  { id: 'food', weight: 0.25, photoCount: 26 },
  { id: 'mountains', weight: 0.2, photoCount: 20 },
  { id: 'live-music', weight: 0.15, photoCount: 12 },
];
const wanted = new Set(profile.map((p) => p.id));

for (const scale of ['global', 'national', 'regional', 'local'] as Scale[]) {
  const recs = recommend(EVENTS, profile, scale, RONCADE, NOW);
  assert.ok(recs.length > 0 && recs.length <= 10, `${scale}: ${recs.length} results`);
  for (let k = 1; k < recs.length; k++) assert.ok(recs[k - 1].score >= recs[k].score, `${scale}: sorted`);
  for (const r of recs) {
    const e = r.event;
    assert.ok(r.matched.length > 0 && e.interests.some((i) => wanted.has(i)), `${e.id}: matched`);
    if (scale === 'global') assert.equal(e.scale, 'global');
    if (scale === 'national') assert.ok(e.country === 'ITA' && (e.scale === 'national' || e.scale === 'regional'));
    if (scale === 'regional') assert.ok(e.region === '05' && (e.scale === 'regional' || e.scale === 'local'));
    if (scale === 'local') assert.ok(r.distanceKm <= 30);
  }
  console.log(`ok ${scale}: ${recs.length} results, top 3:`);
  for (const r of recs.slice(0, 3)) {
    console.log(`   ${r.score.toFixed(2)}  ${r.event.title} (${r.event.city}, ${r.event.start}, ${r.distanceKm.toFixed(0)} km) — ${why(r)}`);
  }
}

// Past events are skipped, profile without matches gives nothing.
const late = recommend(EVENTS, profile, 'local', RONCADE, new Date('2027-03-10'));
assert.ok(late.every((r) => (r.event.end ?? r.event.start) >= '2027-03-10'), 'past events skipped');
assert.equal(recommend(EVENTS, [], 'global', RONCADE, NOW).length, 0, 'empty profile');

// why() phrasing, in both languages.
const two = { event: EVENTS[0], score: 1, distanceKm: 0, matched: [profile[0], profile[3]] };
const three = { event: EVENTS[0], score: 1, distanceKm: 0, matched: [profile[0], profile[1], profile[3]] };
const none = { event: EVENTS[0], score: 1, distanceKm: 0, matched: [{ ...profile[1], photoCount: 0 }] };
setLocaleForTests('en');
assert.equal(why(two), 'You have 41 photos of street art and 12 of live music');
assert.equal(why(three), 'You have 41 photos of street art, 26 of food and restaurants and 12 of live music');
assert.equal(why(none), "You're into food and restaurants");
setLocaleForTests('it');
assert.equal(why(two), 'Hai 41 foto di street art e 12 di musica dal vivo');
assert.equal(why(three), 'Hai 41 foto di street art, 26 di cibo e ristoranti e 12 di musica dal vivo');
setLocaleForTests('en');

// Sample events move forward by whole weeks, so the demo never runs out of upcoming events.
const later = shiftToNow(EVENTS, new Date('2027-06-15T12:00:00Z'));
const firstStart = (list: typeof EVENTS) => list.map((e) => e.start).sort()[0];
assert.ok(firstStart(later) >= '2027-06-15', `shifted catalog starts ${firstStart(later)}`);
assert.equal(new Date(later[0].start).getUTCDay(), new Date(EVENTS[0].start).getUTCDay(), 'same weekday');
assert.ok(later.every((e, k) => !e.end || e.end >= e.start) && later.length === EVENTS.length);
assert.deepEqual(shiftToNow(EVENTS, NOW), EVENTS, 'no shift before the catalog starts');
console.log('ok past events, empty profile, why(), shiftToNow()');
