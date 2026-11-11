# Stage 2b: America Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app and the web demo read as American:
- US states, then counties;
- a San Francisco demo traveler and sample events around the US;
- miles and US date formats, American spelling;
- the map opens on North America, and the README media show the US.

**Architecture:**
- **One table in `src/geo/locate.ts` lists the countries with two detailed levels:** Italy (ISTAT regions and provinces) and the USA (Census states and counties). Every module that special-cased `'ITA'` reads that table instead.
- **Distance units and date formats** come from the device region, read in `src/i18n/index.ts` next to the language.
- **The demo gallery, Gemma's answers and the sample events are data files** rebuilt with the existing scripts.

**Tech Stack:**
- Expo SDK 58 / React Native 0.88 / TypeScript.
- Data: mapshaper (`npx mapshaper`) for the boundaries; Python 3 with Pillow and piexif for `demo-data/make_demo_photos.py`; `litert-lm serve` for Gemma.
- Tests: `tsx` scripts (`npm test`), Playwright (`npm run e2e`), Maestro in CI.

**Spec:** `docs/superpowers/specs/2026-11-11-america-design.md`.

## Global Constraints

- **Branch:** work on `stage-2b-america`, merge to `main` at the end.
- **Ids:** US states are `US-<postal>` (`US-CA`), counties are `US-<5-digit GEOID>` (`US-06075`). The 50 states and DC; Puerto Rico and the territories stay countries.
- **Size:** `us-states.json` + `us-counties.json` under 1.5 MB together (raised from 900 KB, see the design).
- **Level names:** in the USA, "state"/"county" (Italian "stato"/"contea"); everywhere else, "region"/"province".
- **Miles** when the device region is `US` or `GB`, km otherwise. Ring steps 1, 2, 5, 10, 20 (mi or km). US date formats ("Nov 7", "Nov 7, 2026") for English with region `US`, British for other English, Italian unchanged.
- **English strings and the README use American spelling** ("Traveler").
- **The demo gallery:**
  - 45 photos from March 2024 to October 2026 by a traveler living in the Mission District;
  - exactly 6 countries: USA, MEX, CAN, JPN and two in Europe;
  - at least 6 US states;
  - home `{ lat: 37.7599, lon: -122.4148 }`;
  - open-licensed (the existing licence filter), with invented GPS and dates.
- **Sample events:** stay invented, `sample: true`, labelled. An event's `region` is set if and only if its country has detailed levels.
- **Every commit:**
  - updates `CHANGELOG.md` under `## Unreleased`;
  - passes `npm run typecheck && npm test` in `mobile/`, plus `npm run export:web && npm run e2e` when the web build changes;
  - routes every visible string through `t()` in English and Italian.
- **No README claim without a run.** Minimal text on screen.

## Review Focus

1. **A US photo on a coast or island lost by simplification** (Key West, the Bay shore). Expected: it snaps to the nearest county within 0.25°, as Venice does. Pinned in Task 1.
2. **Alaska's Aleutians cross the antimeridian.** Expected: tapping Alaska frames the mainland, not the Pacific. Pinned in Task 2.
3. **A gallery with both Italian and US photos.** Expected: the passport's "where you are" counts only the provinces or counties of that country. Pinned in Task 2.
4. **A device in a language we don't have but in the US** (`es-US`). Expected: English text with miles and US dates. Pinned in Task 3.
5. **Saved marks from 0.3.0 with ids that no longer exist** (Natural Earth's `USA-3521`). Expected: ignored, never counted, never shown as an unknown place. Pinned in Task 2.

---

### Task 1: US states and counties, and the detailed-countries table

**Files:**
- Create: `mobile/src/geo/us-states.json`, `mobile/src/geo/us-counties.json`
- Modify: `mobile/src/geo/world-regions.json` (drop the USA's features), `mobile/src/geo/locate.ts`, `mobile/src/geo/README.md` (two rows, the commands, Census credit), `mobile/scripts/test-locate.ts`, `mobile/scripts/check-visited.ts`

**Interfaces:**
- Produces, in `src/geo/locate.ts`:
  - `type Detailed = { regions: AreaFeature[]; provinces: AreaFeature[]; words: { region: 'region' | 'state'; province: 'province' | 'county' } }`
  - `const DETAILED: ReadonlyMap<string, Detailed>` with keys `'ITA'` and `'USA'`, and `isDetailed(country: string): boolean`.
  - `levelWords(country: string): Detailed['words']` returns `{ region: 'region', province: 'province' }` for every country not in the table.
  - `AREAS` becomes `{ countries, detailed: DETAILED, worldRegionsByCountry, worldGroupsByCountry }`; `italianRegions` and `italianProvinces` are gone.
  - `provinceCount(country: string): number` replaces `TOTALS` (removed): 110 for ITA, the county count for USA, 0 elsewhere.
  - `locate`, `regionCount`, `countryOfRegion`, `placeOfProvince`, `childrenOf`, `mainBoxOf`, `centerOf` and `nameOf` cover the US features. Feature properties: states `{ id, name, name_it? }`; counties `{ id, name, region }`, where `region` is the state id. `nameOf` returns `name_it` when the locale is Italian and it exists.
- No `'ITA'` or `"ITA"` literal remains in `mobile/src/**` or `mobile/App.tsx` outside `src/geo/locate.ts`.

- [ ] **Step 1: Build the data.** In a scratch directory outside the repo, download `https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip` and `.../cb_2024_us_county_20m.zip`.
  - Use mapshaper to:
    - keep `STATEFP <= 56`;
    - map `id='US-'+STUSPS`, `name=NAME` for states, and `id='US-'+GEOID`, `name=NAME`, `region='US-'+<the state's STUSPS>` for counties;
    - simplify with `keep-shapes` until both files together are under the size budget.
  - Add `name_it` to states from Natural Earth 10m admin-1 (`adm0_a3 == 'USA'`, joined on `postal`) where it differs from `name`.
  - Remove the USA's features from `world-regions.json`, and their now-unused entries from `region-names-en.json`.
  - Write the exact commands in `src/geo/README.md`.
- [ ] **Step 2: Write the failing tests** in `scripts/test-locate.ts`, keeping every Italian case:

```ts
const US: [string, number, number, Place][] = [
  ['San Francisco', 37.7749, -122.4194, { country: 'USA', region: 'US-CA', province: 'US-06075' }],
  ['Los Angeles', 34.0522, -118.2437, { country: 'USA', region: 'US-CA', province: 'US-06037' }],
  ['Manhattan', 40.7831, -73.9712, { country: 'USA', region: 'US-NY', province: 'US-36061' }],
  ['Honolulu', 21.3069, -157.8583, { country: 'USA', region: 'US-HI', province: 'US-15003' }],
  ['Anchorage', 61.2181, -149.9003, { country: 'USA', region: 'US-AK', province: 'US-02020' }],
  ['Miami Beach', 25.7907, -80.13, { country: 'USA', region: 'US-FL', province: 'US-12086' }],
  ['Key West (island)', 24.5551, -81.78, { country: 'USA', region: 'US-FL', province: 'US-12087' }],
  ['Bay off Pier 39 (water)', 37.811, -122.41, { country: 'USA', region: 'US-CA', province: 'US-06075' }],
];
for (const [name, lat, lon, expected] of US) assert.deepEqual(locate(lat, lon), expected, name);
assert.equal(childrenOf('country', 'USA').length, 51);
assert.equal(childrenOf('region', 'US-CA').length, 58, "California's counties");
assert.equal(regionCount('USA'), 51);
assert.ok(provinceCount('USA') > 3100 && provinceCount('USA') < 3200);
assert.equal(provinceCount('ITA'), 110);
assert.deepEqual(levelWords('USA'), { region: 'state', province: 'county' });
assert.deepEqual(levelWords('FRA'), { region: 'region', province: 'province' });
assert.equal(nameOf('region', 'US-CA'), 'California');
assert.deepEqual(placeOfProvince('US-06075'), { country: 'USA', region: 'US-CA' });
assert.ok(statSync('src/geo/us-states.json').size + statSync('src/geo/us-counties.json').size < 900 * 1024);
// No Italy special case left outside the table.
```

  The last check walks `src/` and `App.tsx` and fails on `/['"]ITA['"]/` outside `src/geo/locate.ts`.
- [ ] **Step 3: Run** `npx tsx scripts/test-locate.ts`. Expected: FAIL (`provinceCount` is not exported).
- [ ] **Step 4: Implement the table in `locate.ts`.** Replace each `'ITA'` branch with a `DETAILED.get(country)` lookup. Order inside `locate`: first a province of any detailed country, then the country; for a detailed country, the nearest province; then world units, as today. Update `check-visited.ts` to use `DETAILED`.
- [ ] **Step 5: Run** `npx tsx scripts/test-locate.ts && npx tsx scripts/check-visited.ts`. Expected: PASS. `npm run typecheck` will still fail in modules updated by Task 2: do Task 2 before committing.

### Task 2: Map, passport, events and place sheet read the table

**Files:**
- Modify: `mobile/src/map/model.ts`, `mobile/src/stats/passport.ts`, `mobile/src/events/recommend.ts`, `mobile/src/types.ts` (comments), `mobile/src/screens/PlaceSheet.tsx`, `mobile/src/screens/PassportSheet.tsx`, `mobile/src/i18n/en.ts`, `mobile/src/i18n/it.ts`, `mobile/scripts/simulate-demo.ts`, `mobile/scripts/test-map-model.ts`, `mobile/scripts/test-passport.ts`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `DETAILED`, `isDetailed`, `levelWords`, `provinceCount` from Task 1.
- Produces:
  - `Passport['here']` becomes `{ name: string; words: Detailed['words']; regions: Count; provinces?: Count }`. `provinces` is set for detailed countries and counts only that country's provinces (via `placeOfProvince`).
  - New strings, in both `en.ts` and `it.ts`:

    | Key | English | Italian |
    |---|---|---|
    | `unit.state_one` / `unit.state_other` | state / states | stato / stati |
    | `unit.county_one` / `unit.county_other` | county / counties | contea / contee |
    | `passport.states` | States | Stati |
    | `passport.counties` | Counties | Contee |

- [ ] **Step 1: Write the failing tests.**
  - In `test-map-model.ts`:
    - `areasInView('region', [-125, 32, -114, 42], none)` has a feature `US-CA` at level `region`;
    - `areasInView('province', [-122.6, 37.6, -122.3, 37.9], none)` has `US-06075` at level `province`;
    - `placeAt(-122.42, 37.77, 'province')` is `{ level: 'province', id: 'US-06075' }`;
    - `frameOf('region', 'US-AK')!.center[0]` is between -170 and -140.
  - In `test-passport.ts`:
    - `passport({ country: ['ITA', 'USA'], region: ['05', 'US-CA', 'US-NY'], province: ['TV', 'VE', 'US-06075'] }, 'USA').here` has `regions = { visited: 2, total: 51 }`, `provinces.visited = 1`, and `words.province = 'county'`;
    - the same visited set with `'ITA'` gives `provinces.visited = 2`, total 110;
    - `passport({ country: ['USA'], region: ['USA-3521'], province: [] }, 'USA').here.regions.visited` is 0.
- [ ] **Step 2: Run** `npx tsx scripts/test-map-model.ts && npx tsx scripts/test-passport.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `areasInView` draws `detailed.regions` / `detailed.provinces` for any detailed country.
  - `recommend`'s national scale uses `isDetailed(focus.country)`.
  - `passport` fills `here.words` and `here.provinces` as above.
  - `PlaceSheet`'s child unit and `PassportSheet`'s two labels come from `levelWords(country)`.
  - `simulate-demo.ts` prints per detailed country instead of "in Italy".
- [ ] **Step 4: Run** `npm run typecheck && npm test` in `mobile/`. Expected: PASS.
- [ ] **Step 5: Commit** Tasks 1 and 2 together: "US states and counties, at the same depth as Italy's regions and provinces". CHANGELOG line, with the Census Bureau credited in `mobile/src/geo/README.md`.

### Task 3: Miles, US dates, American spelling

**Files:**
- Modify: `mobile/src/i18n/index.ts`, `mobile/src/i18n/en.ts`, `mobile/src/map/model.ts` (`distanceRings`), `mobile/src/map/MapCanvas.tsx`, `mobile/src/map/MapCanvas.web.tsx`, `mobile/src/screens/PlaceSheet.tsx`, `mobile/App.tsx` (the rings call), `mobile/scripts/test-i18n.ts`, `mobile/scripts/test-map-model.ts`, `mobile/e2e/web-demo.spec.ts` ("Traveler"), `CHANGELOG.md`

**Interfaces:**
- Produces, in `src/i18n/index.ts`:
  - `pickRegion(tags: readonly string[]): string | undefined`: the upper-case region of the first tag that has one.
  - `export let distanceUnit: 'km' | 'mi'`.
  - `formatDistance(km: number): string`: rounded, `"10 mi"` or `"16 km"`.
  - `setLocaleForTests(l: Locale, region?: string)` also sets `distanceUnit` and the date locale. Date locale: `en-US` for English in region `US`, `en-GB` for other English, `it-IT`.
- Produces, in `src/map/model.ts`: `distanceRings(center, farthestKm, unit: 'km' | 'mi')` returns `{ km: number; label: string; ring; labelAt }[]`. Steps `[1, 2, 5, 10, 20, 50, 100]` in that unit, with the same filter and `slice(-3)` as today. `label` is e.g. `"5 mi"`. Both MapCanvas renderers draw `label`.

- [ ] **Step 1: Write the failing tests.**
  - In `test-i18n.ts`:
    - `pickRegion(['en-US'])` is `'US'`, `pickRegion(['es-US'])` is `'US'`, `pickRegion(['en'])` is `undefined`;
    - with `setLocaleForTests('en', 'US')`, for `const d = Date.UTC(2026, 10, 7, 12)`: `formatDate(d, 'day-month')` is `'Nov 7'`, `formatDate(d, 'medium')` is `'Nov 7, 2026'`, `formatDistance(16.09)` is `'10 mi'`, and `t('level.traveller')` is `'Traveler'`;
    - with `('en', 'GB')`: `'7 Nov'` and `'10 mi'`;
    - with `('en', 'DE')`: `'16 km'`;
    - with `('it', 'IT')`: `'7 nov'` and `'16 km'`.
  - In `test-map-model.ts`:
    - `distanceRings([-122.42, 37.76], 25, 'mi').map((r) => r.label)` is `['2 mi', '5 mi', '10 mi']`;
    - `distanceRings([12.37, 45.63], 25, 'km').map((r) => r.label)` is `['5 km', '10 km', '20 km']`.
- [ ] **Step 2: Run** `npx tsx scripts/test-i18n.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The region comes from the same device tags as the language. Hermes gives `Intl.DateTimeFormat().resolvedOptions().locale`, e.g. `en-US`.
  - Replace British spellings in `en.ts` (keys stay; only values change), and `'Traveller'` in the e2e test.
  - Keep `LOCAL_RADIUS_KM` in km internally.
- [ ] **Step 4: Run** `npm run typecheck && npm test`, then `npm run export:web && npm run e2e`. Expected: PASS. Playwright's default locale is `en-US`, so the e2e run sees miles.
- [ ] **Step 5: Commit** "Miles and US dates in the US, American spelling". CHANGELOG line.

### Task 4: A San Francisco demo traveler

**Files:**
- Modify: `demo-data/make_demo_photos.py` (the `PLAN`, persona text, time zones), `demo-data/README.md`
- Regenerate: `demo-data/photos/` (old photos removed), `demo-data/photos.json`, `demo-data/CREDITS.md`, `demo-data/analyses.json`, `mobile/src/demo/demo.json`
- Test: `mobile/scripts/test-sample.ts`
- `CHANGELOG.md`

**Interfaces:**
- Consumes: `locate` from Task 1.
- Produces:
  - file names `YYYY-MM-DD_<place-slug>_<theme-id>-NN.jpg`, with the English theme ids from `THEME_IDS`' values;
  - `photos.json` and `demo.json` in today's shape.

- [ ] **Step 1: Write the failing test.** Add to `test-sample.ts`:
  - the countries of `locate(gps)` over the 45 photos are exactly 6 and include `USA`, `MEX`, `CAN` and `JPN`;
  - the US photos cover at least 6 distinct `US-` regions;
  - the newest photo is in `US-CA`;
  - every file name matches `/^\d{4}-\d{2}-\d{2}_[a-z-]+_[a-z-]+-\d{2}\.jpg$/`.
- [ ] **Step 2: Run** `npx tsx scripts/test-sample.ts`. Expected: FAIL (the countries are ITA, PRT and others).
- [ ] **Step 3: Write the new `PLAN`.**
  - 45 rows following the spec's trips, with the interest mix of today's set: street art, food, mountains, live music and architecture lead; one or two each of sea, art, nature, history, wine and nightlife.
  - Use realistic coordinates inside each place, and correct UTC offsets (PST/PDT, EST/EDT, CST/CDT, HST, JST, Mexico City −06:00, the European zones).
  - Find candidates with `python3 -I make_demo_photos.py search "<query>"`. Accept a photo only after viewing its thumbnail: phone-like, no watermark, no identifiable person as the subject.
- [ ] **Step 4: Build.** Run `python3 -I make_demo_photos.py build` from `demo-data/` (needs Pillow and piexif).
  - Expected: 45 files, all with EXIF GPS and dates read back, and `CREDITS.md` listing each author and licence.
  - Delete the old photos.
- [ ] **Step 5: Regenerate Gemma's answers.**
  - Start `litert-lm serve --port 9379` with the model in `models/`, as in `local-ai/README.md`. Create the venv at the repo root if missing.
  - Run `python3 local-ai/precompute_demo.py`, then `cd mobile && npx tsx scripts/build-demo.ts`.
  - Expected: "45 with Gemma's answer". If Gemma cannot run on this Mac, stop and report: invented answers are not allowed.
- [ ] **Step 6: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 7: Commit** "Demo traveler from San Francisco: 45 new photos and Gemma's answers". CHANGELOG line; `demo-data/README.md` updated.

### Task 5: Sample events around the US

**Files:**
- Modify: `mobile/src/events/events.json`, `mobile/src/events/recommend.ts` (the `region` comment), `mobile/scripts/test-recommend.ts`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `isDetailed` (Task 1), the demo profile from `demo.json` (Task 4).
- Produces: about 46 events in today's `Event` shape, all `sample: true`.

- [ ] **Step 1: Rewrite the test** with `const SF: Focus = { country: 'USA', region: 'US-CA', lat: 37.7599, lon: -122.4148 }` in place of `RONCADE`. For every event:
  - `e.region !== undefined` equals `isDetailed(e.country)`;
  - global events are not in the USA;
  - national events are in the USA, outside `US-CA`;
  - regional and local events are in `US-CA`;
  - local events are within 26 km of SF.
  
  Then, with the profile built from the demo answers, `recommend` returns at least 2 events at each scale, and `why()` of the first local one matches `/^You have \d+ photos? of/`.
- [ ] **Step 2: Run** `npx tsx scripts/test-recommend.ts`. Expected: FAIL.
- [ ] **Step 3: Write the events.**
  - Local in San Francisco; regional across California; national in at least 6 other states; global in Mexico City, Tokyo, Vancouver, Paris, London and Rome (Rome's with its ISTAT `region`).
  - Dates between 2026-11-12 and 2027-02-28; prices in local currency ("$25", "Free", "¥3,000", "MX$250", "€15", "£12", "CA$30").
  - Titles and descriptions invented; no real brand presented as a real event.
- [ ] **Step 4: Run** `npm run typecheck && npm test && npx tsx scripts/simulate-demo.ts`. Expected: PASS, and the simulation prints suggestions at every scale and a California place sheet with events.
- [ ] **Step 5: Commit** "Sample events around the US". CHANGELOG line.

### Task 6: Home, first view and tests in San Francisco

**Files:**
- Modify: `mobile/App.tsx` (`DEFAULT_HOME`), `mobile/src/map/MapCanvas.tsx` and `MapCanvas.web.tsx` (initial center), `mobile/e2e/web-demo.spec.ts`, `mobile/.maestro/gallery.yaml`, `.github/workflows/android.yml`, `docs/android-setup.md`, `CHANGELOG.md`

- [ ] **Step 1: Update the e2e test.**
  - The place-sheet test jumps to `{ center: [-122.3, 37.6], zoom: 7 }` and expects headings `['California', 'For you here', 'Photos']`.
  - A new test, "distances in miles in the US": the first suggestion shows `first.getByText(/ · \d+ mi$/)`.
  - Countries stay "6 countries", the timeline "photo 45 of 45", the passport "4 more countries to become Explorer".
- [ ] **Step 2: Run** `npm run export:web && npm run e2e`. Expected: FAIL on "California".
- [ ] **Step 3: Implement.**
  - `DEFAULT_HOME = { lat: 37.7599, lon: -122.4148 }`; both renderers start at `[-98, 39]`, zoom 1.4.
  - `android.yml`: `adb emu geo fix -122.4148 37.7599`.
  - `gallery.yaml`: `setLocation` `37.7599` / `-122.4148`.
  - Comments say San Francisco and the demo traveler.
  - `docs/android-setup.md` §8 and §9: San Francisco, events around San Francisco, "Traveler".
- [ ] **Step 4: Run** `npm run typecheck && npm test && npm run export:web && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Show it** in the phone-sized Chrome window on the Mac, at `http://localhost:8081` (`npx expo start --web`): the world, the US by state, San Francisco's place sheet, the passport.
- [ ] **Step 6: Commit** "Home and first view in San Francisco". CHANGELOG line. Push the branch; CI's Android run must pass with the new gallery.

### Task 7: README, media, merge and release

**Files:**
- Modify: `mobile/scripts/readme-media.ts`, `docs/images/*`, `README.md`, `mobile/src/geo/README.md` (if not done), `CHANGELOG.md`

- [ ] **Step 1: Update `readme-media.ts`.**
  - Shot 1: the world from North America.
  - Shot 2: the US by state, `jumpTo({ center: [-98, 39], zoom: 3.8 })`.
  - Shot 3: San Francisco's place sheet, `jumpTo({ center: [-122.44, 37.76], zoom: 9.5 })` with the sheet raised.
  - Shot 4: the passport.
  - The GIF: globe → `flyTo` San Francisco → a pin's photos → the sheet raised.
- [ ] **Step 2: Run** `npm run export:web && npx tsx scripts/readme-media.ts`, then look at every image. Expected: US states lit in shot 2, San Francisco events in miles in shot 3.
- [ ] **Step 3: Update the README.**
  - American spelling.
  - The tagline paragraph says states and counties in the US, regions and provinces elsewhere.
  - Alt texts describe the new images.
  - "Real vs sample": events are invented samples around the US and abroad; the demo gallery is a fictional San Francisco traveler.
  - Credits: "US Census Bureau cartographic boundary files (public domain)".
  - Only what the runs above showed.
- [ ] **Step 4: Run** `npm test`. `check-doc-links` and `check-readme-commands` must pass.
- [ ] **Step 5: Commit, merge and release.**
  - Commit "README: the US".
  - Merge `stage-2b-america` into `main` and push.
  - Check that ci.yml and android.yml are green and that the web demo on GitHub Pages shows the US.
  - Move `## Unreleased` under `## 0.4.0 · Stage 2b: America`, tag `v0.4.0`, and create the GitHub release with the changelog section.
