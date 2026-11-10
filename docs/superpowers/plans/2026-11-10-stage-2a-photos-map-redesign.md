# Stage 2a: The Photos-Map Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Mantide's main experience around the iPhone Photos map: a full-screen map whose zoom decides what lights up, one bottom sheet with three heights that always talks about the place on screen, native MapLibre on Android and MapLibre GL JS on the web.

**Architecture:**
- **Shared pure modules,** tested in Node, hold everything that isn't drawing:
  - the map model (`src/map/model.ts`): level by zoom, areas in view, photo clusters, journey, distance rings, place at a point;
  - the map style (`src/map/style.ts`);
  - the sheet physics (`src/ui/sheet.ts`).
- **Two thin renderers with the same props:** `MapCanvas.tsx` (`@maplibre/maplibre-react-native` v11, which takes MapLibre style-spec layers) and `MapCanvas.web.tsx` (`maplibre-gl` in a `div`).
- The WebView, `mapHtml.ts` and the iframe go away. `App.tsx` shrinks to state and composition; screens live in `src/screens/` and generic UI in `src/ui/`.

**Tech Stack:**
- Expo SDK 58, React Native 0.88, TypeScript 6.
- `@maplibre/maplibre-react-native` 11.5.1 (Expo config plugin), `maplibre-gl` 5.x (web), `@maplibre/maplibre-gl-style-spec` (validation in tests), `supercluster` 8.x.
- `@expo-google-fonts/inter`, React Native `Animated` + `PanResponder` (no new native animation library).
- Tests: Playwright (web), Maestro (Android, in CI), `tsx` scripts.

**Spec:** `docs/superpowers/specs/2026-11-10-mantide-v1-design.md`: "The product" (main screen, place sheet, visual style, trying it anywhere), "Map architecture", and the approved mockups in `docs/superpowers/specs/mockups/`. Real events, on-device Gemma and the APK release are later plans; this plan keeps today's sample events and Gemma-on-a-computer.

## Global Constraints

- Layout A from the approved mockups: the map fills the screen. One bottom sheet, three heights (low, middle, high). Two floating buttons top-right, map style and "back to where I am". No scale switcher.
- What lights up follows the zoom: countries far out, then regions, then provinces. Visited areas are tinted in the accent colour (`#ff6b35`) under the photos.
- Place sheet as approved:
  - the name;
  - three small pills (photos, provinces visited/total, trips);
  - "For you here" as the dominant section: the first suggestion large with an image, date and distance, the others one line each with the reason;
  - photos last.
- Minimal text: no line repeats what is on screen; secondary numbers small; one sentence where one is enough.
- Every visible string goes through `t()` in English and Italian (`npm test` enforces it).
- Typography: Inter replaces Bricolage Grotesque and IBM Plex Mono.
- Free services only:
  - basemaps: EOX Sentinel-2 cloudless 2016 (CC BY 4.0) for satellite, OpenFreeMap "liberty" (`https://tiles.openfreemap.org/styles/liberty`, no key) for standard;
  - each basemap credited in the map's attribution.
- A commit that adds or removes a native dependency or edits `app.json` has `[native: rebuild]` in its title. Every commit updates `CHANGELOG.md` under `## Unreleased`.
- Target: pan, pinch and sheet drags without visible stutter on a mid-range Android with a 10,000-photo gallery.
- README claims only after a run proves them; what is untested is said to be untested.

## Review Focus

1. **A 10,000-photo gallery.** Expected: clustering stays under the frame budget, and no more than 60 photo markers are mounted. Pinned by Task 1's performance test and Task 3/4's marker cap.
2. **A view that crosses the antimeridian** (zoomed out over the Pacific, where west > east). Expected: areas and clusters on both sides, no empty map. Pinned by Task 1.
3. **No gallery** ("Continue without gallery", or a gallery with no GPS). Expected: the map shows the world, the sheet shows something useful (the passport line and the "connect your gallery" prompt), nothing crashes. Pinned by Task 6's e2e test.
4. **The basemap fails to load** (offline, tile server down). Expected: the visited areas and photos still draw on the background colour, and the app stays usable. Pinned by Task 3's e2e test.
5. **Android back button.** Expected: it closes the full-screen photo, then the photo grid, then lowers the sheet, and only then leaves the app. Pinned by Task 6's Maestro flow.

---

### Task 1: Shared map model

**Files:**
- Create: `mobile/src/map/model.ts`, `mobile/scripts/test-map-model.ts`
- Modify: `mobile/package.json` (add `supercluster`, `@types/supercluster`, `@types/geojson`; add the test to `npm test`)

**Interfaces:**
- Produces (all pure, no React Native imports):
  - `type ZoomLevel = 'country' | 'region' | 'province'`; `type BBox = [west: number, south: number, east: number, north: number]`.
  - `levelForZoom(zoom: number): ZoomLevel`: `< 3.5` country, `< 6.5` region, else province. Constants `REGION_ZOOM = 3.5`, `PROVINCE_ZOOM = 6.5`.
  - `areasInView(level: ZoomLevel, bounds: BBox, visited: Record<Level, string[]>): FeatureCollection<Polygon | MultiPolygon, { id: string; level: Level; visited: boolean }>`.
    - Country level: every country.
    - Region level, for each country whose bbox intersects `bounds`: Italy's ISTAT regions; Spain, France, UK, Portugal their `world-groups`; any other country its `world-regions` units, with level `region`.
    - Province level: Italy's provinces; the units of those four countries with level `province`; any other country its units with level `region`.
    - A view with `west > east` (antimeridian) is two boxes.
  - `makePhotoIndex(photos: { id: string; lon: number; lat: number; takenAt: number }[]): PhotoIndex`, built once with supercluster (`radius: 60`, `maxZoom: 16`, reducing to the newest photo of each cluster).
  - `interface PhotoIndex { clusters(bounds: BBox, zoom: number, max?: number): PhotoCluster[]; leaves(key: string): string[] }`. `max` defaults to 60 and keeps the largest clusters.
  - `type PhotoCluster = { key: string; lon: number; lat: number; count: number; coverId: string }`. `key` is `c<clusterId>` for a cluster and `p<photoId>` for a single photo. `leaves()` returns photo ids oldest first.
  - `journeyLine(photos, until?: number): Feature<LineString> | null`: photos with `takenAt <= until`, in time order.
  - `distanceRings(center: [number, number], farthestKm: number): { km: number; ring: Feature<LineString>; labelAt: [number, number] }[]`. Moved from `mapHtml.ts`: at most 3 rings from 1, 2, 5, 10, 20, 50, 100 km, labels north-east.
  - `placeAt(lon: number, lat: number, level: ZoomLevel): { level: Level; id: string } | null`, built on `locate()`.

- [ ] **Step 1: Write the failing test** `scripts/test-map-model.ts`:
  ```ts
  assert.equal(levelForZoom(1.4), 'country'); assert.equal(levelForZoom(5), 'region'); assert.equal(levelForZoom(8), 'province');
  const italy = areasInView('region', [6, 36, 19, 47.5], { country: [], region: ['05'], province: [] });
  assert.equal(italy.features.filter((f) => f.properties.id === '05')[0].properties.visited, true);
  assert.ok(italy.features.some((f) => f.properties.id.startsWith('FRA-')), 'neighbours show their real regions');
  const pacific = areasInView('country', [170, -50, -170, 10], { country: [], region: [], province: [] });
  assert.ok(['NZL', 'FJI'].every((id) => pacific.features.some((f) => f.properties.id === id)), 'both sides of the antimeridian');
  // 10,000 photos: build once, then each view under 16 ms, at most 60 markers.
  const many = Array.from({ length: 10_000 }, (_, i) => ({ id: String(i), lon: -10 + (i % 200) / 10, lat: 36 + (i % 150) / 10, takenAt: i }));
  const index = makePhotoIndex(many);
  const t0 = performance.now(); const cs = index.clusters([-180, -85, 180, 85], 4); assert.ok(performance.now() - t0 < 16);
  assert.ok(cs.length <= 60);
  assert.equal(cs.reduce((n, c) => n + c.count, 0) <= 10_000, true);
  const one = cs[0]; assert.equal(index.leaves(one.key).length, one.count);
  assert.deepEqual(index.leaves(one.key), [...index.leaves(one.key)].sort((a, b) => Number(a) - Number(b)), 'oldest first');
  assert.equal(distanceRings([12.37, 45.63], 25).map((r) => r.km).join(','), '5,10,20');
  assert.deepEqual(placeAt(12.37, 45.63, 'province'), { level: 'province', id: 'TV' });
  ```
- [ ] **Step 2: Run** `npx tsx scripts/test-map-model.ts`. Expected: FAIL, because `src/map/model` is missing.
- [ ] **Step 3: Implement** `model.ts`. Precompute country bboxes once at import, and reuse `locate.ts` data and helpers instead of copying them.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Shared map model: level by zoom, areas in view, photo clusters`, plus a CHANGELOG line.

### Task 2: Shared map style

**Files:**
- Create: `mobile/src/map/style.ts`, `mobile/scripts/test-map-style.ts`
- Modify: `mobile/package.json` (add `@maplibre/maplibre-gl-style-spec` as a devDependency)

**Interfaces:**
- Produces:
  - `type Basemap = 'satellite' | 'standard'`.
  - `baseStyle(basemap: Basemap): StyleSpecification | string`:
    - **satellite:** the EOX raster style, as in `mapHtml.ts` today, with a globe projection;
    - **standard:** the OpenFreeMap liberty URL.
  - `OVERLAY_LAYERS: LayerSpecification[]`, the overlays in this order:
    - `areas-fill` (visited `#ff6b35` at 0.35, others a light veil);
    - `areas-line` (visited 2.6 px);
    - `journey`;
    - `rings`;
    - `events` (selected radius 14, others 9).
  
    Each layer reads a GeoJSON source of the same name.
  - `ATTRIBUTION: Record<Basemap, string>`.

- [ ] **Step 1: Write the failing test.** It validates `baseStyle('satellite')` with the style spec's `validateStyleMin` (zero errors), and validates every `OVERLAY_LAYERS` entry inside a style that declares its sources (zero errors). It also asserts:
  - the layer ids in the order above;
  - `ATTRIBUTION.satellite` contains `EOX` and `ATTRIBUTION.standard` contains `OpenStreetMap`.
- [ ] **Step 2: Run** it. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement** `style.ts`, moving the paint values from `mapHtml.ts` unchanged.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Shared map style for web and Android`, plus a CHANGELOG line.

### Task 3: Web map renderer

**Files:**
- Create: `mobile/src/map/MapCanvas.web.tsx`, `mobile/src/map/types.ts`
- Delete: `mobile/src/map/MapView.web.tsx` (the blob-iframe page)
- Modify: `mobile/package.json` (`maplibre-gl`), `mobile/e2e/web-demo.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`PhotoCluster`, `BBox`, `distanceRings` output) and Task 2 (`baseStyle`, `OVERLAY_LAYERS`, `ATTRIBUTION`).
- Produces `MapCanvasProps` in `src/map/types.ts`, which Task 4 implements identically:
  ```ts
  type MapCanvasProps = {
    basemap: Basemap;
    areas: FeatureCollection; clusters: PhotoCluster[]; thumbs: Record<string, string>;
    journey: Feature<LineString> | null; events: { id: string; lon: number; lat: number; selected: boolean }[];
    you: { lon: number; lat: number; label: string } | null; rings: ReturnType<typeof distanceRings>;
    camera: { key: number } & ({ center: [number, number]; zoom: number } | { bounds: BBox });
    sheetHeight: number; // the map keeps its centre above the sheet
    onViewChange(v: { zoom: number; bounds: BBox; center: [number, number] }): void;
    onAreaPress(level: Level, id: string): void; onClusterPress(key: string): void; onPhotoPress(id: string): void; onEventPress(id: string): void;
  };
  ```
  Photo markers are HTML elements: rounded thumbnail, white border, count badge, pin point under it. The "you" marker is the blue dot with its label.

- [ ] **Step 1: Write the failing e2e test.** Add `the map draws visited areas and photo pins without basemap tiles` to `web-demo.spec.ts`:
  - abort every request to `tiles.maps.eox.at` and `tiles.openfreemap.org`;
  - start with "Use my gallery";
  - expect at least one element `[data-testid="photo-pin"]` within 30 s;
  - expect `window.__mantideMap.querySourceFeatures('areas').some(f => f.properties.visited)` to be true;
  - expect no `pageerror`.
- [ ] **Step 2: Run** `npm run export:web && npm run e2e`. Expected: FAIL (no `photo-pin`).
- [ ] **Step 3: Implement** `MapCanvas.web.tsx`:
  - it creates one `maplibregl.Map` (exposed as `window.__mantideMap`) and swaps the base style with `setStyle(..., { diff: true })`, re-adding the overlays;
  - markers are reconciled by `key`;
  - `onViewChange` fires on `moveend`.
  
  For now `App.tsx` renders it in place of `MapView`, mapping today's state to the props. Task 6 replaces that wiring.
- [ ] **Step 4: Run** `npm run typecheck && npm test && npm run export:web && npm run e2e`. Expected: PASS, both e2e tests.
- [ ] **Step 5: Commit** with the message `Web map renderer on maplibre-gl, no iframe`, plus a CHANGELOG line.

### Task 4: Native map renderer `[native: rebuild]`

**Files:**
- Create: `mobile/src/map/MapCanvas.tsx`
- Delete: `mobile/src/map/MapView.tsx`, `mobile/src/map/mapHtml.ts`
- Modify:
  - `mobile/app.json`: add the `@maplibre/maplibre-react-native` plugin;
  - `mobile/package.json`: add `@maplibre/maplibre-react-native@11.5.1` with `npx expo install`, remove `react-native-webview`;
  - `mobile/.maestro/smoke.yaml`.

**Interfaces:**
- Consumes: `MapCanvasProps` (Task 3), `baseStyle`, `OVERLAY_LAYERS` (Task 2).
- Produces the same component name and props as the web renderer.
  - `<Map mapStyle={baseStyle(basemap)}>` holds one `<GeoJSONSource>` per overlay with its `<Layer {...spec}>` from `OVERLAY_LAYERS`.
  - Photo pins are `<Marker lngLat anchor="bottom">` with an `expo-image`-free `<Image>`, capped at the clusters given.
  - `onViewChange` fires from the region-did-change event.

- [ ] **Step 1: Write the failing Maestro check.** In `smoke.yaml`, after "Continue without gallery", add `assertVisible: { id: "map-canvas" }` (the `testID` of the native `Map`).
- [ ] **Step 2: Run** the Android workflow on the branch (`gh workflow run android.yml --ref <branch>`, then `gh run watch`). Expected: smoke FAIL on `map-canvas` (today's map is a WebView).
- [ ] **Step 3: Implement** `MapCanvas.tsx`, then remove the WebView code.
  - **Globe projection:** if MapLibre Native ignores the style's `projection`, accept the flat map and record a ruling.
  - **Typecheck:** `npm run typecheck` must pass with `react-native-webview` gone.
- [ ] **Step 4: Run** the Android workflow. Expected: both Maestro flows PASS. Keep the `maestro-output` screenshot and check that the satellite basemap or the background, the areas and the pins are visible.
- [ ] **Step 5: Commit** with the message `Native MapLibre map on Android [native: rebuild]`, plus a CHANGELOG line.

### Task 5: Theme, Inter, and the sheet

**Files:**
- Modify: `mobile/src/theme.ts` (fonts and materials), `mobile/App.tsx` (font loading), `mobile/package.json` (`@expo-google-fonts/inter`; remove the Bricolage and Plex packages)
- Create: `mobile/src/ui/sheet.ts`, `mobile/src/ui/Sheet.tsx`, `mobile/scripts/test-sheet.ts`, `mobile/scripts/check-theme.ts`

**Interfaces:**
- Produces:
  - **Font roles:** `F` keeps its role names (`body`, `medium`, `semi`, `bold`, `display`, `mono`…), all mapped to Inter weights 400/500/600/700/800. `mono` becomes Inter with `fontVariant: ['tabular-nums']` at the call sites.
  - **Material colours:** `C.material` = `'rgba(28, 28, 30, 0.92)'`, `C.materialLine` = `'rgba(255, 255, 255, 0.10)'`.
  - **Detents:** `type Detent = 'low' | 'mid' | 'high'`; `detentHeights(screenHeight: number): Record<Detent, number>` gives low `132`, mid `round(0.46 h)` and high `round(0.9 h)`.
  - **Settling:** `settle(height: number, velocity: number, heights): Detent` projects `height − velocity × 0.2` (velocity in px/ms, upward negative) and picks the nearest detent.
  - **`<Sheet detent onDetentChange header children>`:** a spring-animated (`Animated.spring`, damping 22, stiffness 220) sheet with a grab handle. It is draggable from the handle and from the header, and its content scrolls only at `high`.

- [ ] **Step 1: Write the failing tests.**
  - `test-sheet.ts`:
    ```ts
    const h = detentHeights(844);
    assert.deepEqual(h, { low: 132, mid: 388, high: 760 });
    assert.equal(settle(140, 0, h), 'low');
    assert.equal(settle(300, 0, h), 'mid');
    assert.equal(settle(200, -1.5, h), 'mid');
    assert.equal(settle(400, -3, h), 'high');
    assert.equal(settle(700, 2, h), 'mid');
    ```
  - `check-theme.ts`: fails if `Bricolage` or `IBMPlex` appears in `App.tsx` or `src/`.
- [ ] **Step 2: Run** both. Expected: FAIL.
- [ ] **Step 3: Implement** them, swap the fonts, and add both scripts to `npm test`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Inter typography, material tokens, and a three-height sheet [native: rebuild]` (the font packages change), plus a CHANGELOG line.

### Task 6: The new main screen

**Files:**
- Rewrite: `mobile/App.tsx` (state and composition only, no styles for screens)
- Create:
  - `mobile/src/screens/MapButtons.tsx`: the two floating buttons, map style and back to me;
  - `mobile/src/screens/WorldSummary.tsx`: the low sheet far out, with the `▶ Timeline` chip (the journey is a whole-world view, and the spec allows only two floating buttons);
  - `mobile/src/screens/AreaPhotos.tsx`: the middle sheet, a grid of the photos in view;
  - `mobile/src/screens/PhotoViewer.tsx`: full screen, with "Gemma saw".
- Rewrite: `mobile/src/screens/PlaceSheet.tsx` (the approved v2), `mobile/src/screens/PhotoGroup.tsx` (restyled grid)
- Delete: the header, the scale switcher, `LocalPanel.tsx` (its parts move into `PlaceSheet` and the map)
- Modify: `mobile/src/i18n/en.ts`, `it.ts`, `mobile/e2e/web-demo.spec.ts`; create `mobile/.maestro/back.yaml`

**Interfaces:**
- Consumes: Tasks 1–5. Recommendations come from `recommendIn` for the place returned by `placeAt(center[0], center[1], level)`, and at zoom ≥ 9 from `recommend(…, 'local', focus)`, with `focus` built from `locate(center)` and the centre's coordinates.
- Produces the behaviour:
  - **Moving the map:** the view drives `level` and `place`, and the sheet title is that place's name.
  - **The low sheet:**
    - far out: `WorldSummary`, which shows the passport line `6 countries · 2.6% of the world`, the level and the bar to the next level;
    - on a country, region or province: its name and two pills;
    - tapping `WorldSummary` opens the passport.
  - **The middle sheet:** the photos in view (`AreaPhotos`).
  - **The high sheet:** the `PlaceSheet` of the place in view. Tapping an area flies to it and opens the high sheet.
  - **Photos:**
    - tapping a cluster opens `PhotoGroup` (leaves oldest first);
    - tapping a photo opens `PhotoViewer`.
  - **Android back:** closes the viewer, then the group, then lowers the sheet one step, and only then exits.
  - **No gallery:** the middle sheet shows "Connect your gallery" with the consent button; the passport footer has "Stop using the gallery".
- Copy, in English (the Italian goes in `it.ts`): `Your world`, `{count} countries · {pct}% of the world`, `For you here`, `Photos`, `See all`, `Connect your gallery`, `Map style`, `Back to me`, `▶ Timeline`.

- [ ] **Step 1: Write the failing e2e tests.** Rewrite `web-demo.spec.ts`:
  - `far out, the sheet shows your world`: start with "Use my gallery", then expect `Your world` and `6 countries · ` visible.
  - `tapping a numbered pin shows its photos oldest first`: click the first `[data-testid="photo-pin"]` that has a badge, then expect a grid whose image count equals the badge number.
  - `the place sheet leads with suggestions`: zoom to Veneto (`__mantideMap.jumpTo({ center: [12.3, 45.6], zoom: 7 })`) and drag the sheet to high. Expect the order of headings: the place name, then `For you here`, then `Photos`. Expect the first suggestion card to contain an image and a line matching `/^You have \d+ photos of/`.
  - `without the gallery the app still works`: choose "Continue without gallery", then expect `Connect your gallery` in the middle sheet and no `pageerror`.
  - The Gemma-fallback test from Stage 1, adapted to the new place sheet.
  
  Create `back.yaml`: open a numbered pin, open a photo, then `back` → grid visible, `back` → grid gone and sheet visible, `back` → sheet lower, `back` → app in the background (`assertNotVisible: "Your world"`).
- [ ] **Step 2: Run** `npm run export:web && npm run e2e`. Expected: FAIL on the new texts.
- [ ] **Step 3: Implement** the screens and the new `App.tsx`, and add the new strings in both languages.
- [ ] **Step 4: Run**:
  - `npm run typecheck && npm test && npm run export:web && npm run e2e`. Expected: PASS.
  - Then the Android workflow with `smoke.yaml`, `gallery.yaml` (updated to assert `6 countries · ` in the sheet instead of the old header) and `back.yaml`. Expected: PASS.
- [ ] **Step 5: Look at it.** Take Playwright screenshots at 390×844 in English and Italian (far out, Italy, Veneto with the high sheet, a photo group, the viewer), and compare them with the approved mockups. Fix what doesn't match.
- [ ] **Step 6: Commit** with the message `Main screen: full map, zoom-driven areas, one sheet`, plus a CHANGELOG line.

### Task 7: Trying it anywhere: sample photos on Android

**Files:**
- Create: `mobile/src/demo/sample.ts` (the demo gallery list, moved out of `src/gallery/source.web.ts`)
- Modify: `mobile/src/gallery/source.ts`, `mobile/src/gallery/source.web.ts`, `mobile/src/screens/Welcome.tsx`, `mobile/App.tsx` (the choice is now `'all' | 'none' | 'sample'`), the strings, `mobile/.maestro/smoke.yaml`
- Test: `mobile/scripts/test-sample.ts`

**Interfaces:**
- Produces:
  - `samplePhotos(): RawPhoto[]`: the 45 demo photos with their Wikimedia URLs, GPS and dates, and `filename` equal to the demo file name, so `demoAnalysis()` matches. The web version reads the same list.
  - The welcome adds a small third option, `Try with sample photos`. It sets the choice to `'sample'`, reads `samplePhotos()`, uses the prepared Gemma answers, and labels events as samples.

- [ ] **Step 1: Write the failing tests.**
  - `test-sample.ts` asserts:
    - 45 photos, all with lat/lon and `takenAt`;
    - every `filename` has a `demoAnalysis()`;
    - ids are unique.
  - In `smoke.yaml`, replace "Continue without gallery" with `tapOn: "Try with sample photos"`, then `extendedWaitUntil: visible: "6 countries · .*"` (60 s).
- [ ] **Step 2: Run** `test-sample.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** them.
- [ ] **Step 4: Run** `npm run typecheck && npm test && npm run e2e`, then the Android workflow. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Try with sample photos, on Android too`, plus a CHANGELOG line.

### Task 8: Timeline and passport, restyled

**Files:**
- Modify: `mobile/src/screens/TimelineBar.tsx`, `mobile/src/screens/PassportSheet.tsx`, the strings, `mobile/e2e/web-demo.spec.ts`

**Interfaces:**
- Consumes:
  - `journeyLine(photos, until)` (Task 1), drawn by both renderers;
  - the `▶ Timeline` chip in `WorldSummary` (Task 6).
- Produces:
  - **The timeline:** it replaces the sheet while open (same material and corner radius) and plays as today (one photo per 0.5 s). Closing it restores the previous detent.
  - **The passport:** it opens from `WorldSummary` as a full-height sheet with Inter and the new tokens, and has "Stop using the gallery" at the bottom.

- [ ] **Step 1: Write the failing e2e tests.**
  - `the timeline replays the journey`: tap `▶ Timeline`, wait for `photo 45 of 45` (60 s), and expect the `journey` source to have one line with 45 points.
  - `the passport opens from your world`: tap `Your world`, then expect `Traveller` and `4 more countries to become Explorer`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the restyle.
- [ ] **Step 4: Run** the full checks. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Timeline and passport in the new design`, plus a CHANGELOG line.

### Task 9: README, screenshots, GIF, release notes

**Files:**
- Modify: `README.md`, `CHANGELOG.md` (release `0.3.0`), `docs/images/*`, `mobile/AGENTS.md` (the layout table)
- Create: `mobile/scripts/readme-media.ts` (Playwright screenshots, plus a GIF made of 30 frames with `gifenc`)

- [ ] **Step 1: Generate** the four screenshots and `docs/images/demo.gif` (zoom from the world to Veneto, open a pin, raise the sheet) from the exported web demo in English at 390×844. Keep the GIF under 4 MB.
- [ ] **Step 2: Update the README.**
  - Screenshots and the GIF above "What it does".
  - "What it does" rewritten for the new map.
  - "Status" lists what the e2e and Maestro flows now verify, and keeps "Not yet verified: a physical phone; Gemma called from a phone".
- [ ] **Step 3: Run** `npm test` (doc links, README commands) and the Android workflow on `main` after merging. Expected: PASS.
- [ ] **Step 4: Release.** Move `## Unreleased` to `## 0.3.0`, tag `v0.3.0`, and check that the Pages demo matches the README (`BASE_URL=… npm run e2e`).
