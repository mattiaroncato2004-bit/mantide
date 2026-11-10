# Stage 1: Public English Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the current Mantide app as a clean, English, verifiably working public repo on `mattiaroncato2004-bit/mantide`, with CI, an Android build smoke-tested on an emulator, and a one-click web demo on GitHub Pages.

**Architecture:** The app stays as it is (Expo / React Native / MapLibre in a WebView). This stage adds an English/Italian string layer, renames the internal Italian identifiers, makes the web build deployable under a subpath, adds GitHub Actions (checks, Android release build + emulator smoke test, Pages deploy), and rewrites the docs in English. Stage 2 (redesign, real events, on-device Gemma) gets its own plans.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript 6, `tsx` test scripts with `node:assert`, Playwright (`@playwright/test`), GitHub Actions, `reactivecircus/android-emulator-runner`, Maestro, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-10-mantide-v1-design.md` (Stage 1 is its "Published in stages" first bullet, plus "The repository" and "Verification").

## Global Constraints

- English everywhere in the repo: README, docs, code comments, commit messages. App UI in English and Italian, following the device language; anything not Italian falls back to English.
- Minimal text: no line repeats what is on screen already; one sentence where one is enough.
- Every README claim is verified by a run before it is written; what is untested is said to be untested (Android on a real device, Gemma on a phone).
- Credits: Mattia Roncato and Giorgio Caligiuri; every data source credited as its licence requires.
- Full commit history kept. `docs/scelte-e-setup-kotlin.md` (untracked) is never committed.
- No paid services; no secrets in the repo.
- Node version: the one in `.nvmrc` (`26`), used locally and in CI.
- All work happens on branch `stage-1`; the repo stays **private** until Task 9.

## Review Focus

1. **Web demo under the `/mantide/` subpath on GitHub Pages** → the page renders fully (Pages hides `_expo/` without `.nojekyll`, and absolute asset paths break under a subpath). Pinned by Task 5's e2e test and Task 9's live check.
2. **A device or browser language other than English or Italian** (`de-DE`, `en-GB`, `it-CH`) → English for unsupported languages, Italian for any `it-*`. Pinned by Task 2's tests.
3. **Gemma unreachable** (the HTTPS demo cannot call `http://127.0.0.1`, or nothing is running) → the precomputed demo answers load, interests appear, and the header status does not hang. Pinned by Task 5's e2e test.
4. **A stranger follows the README from a fresh clone** → `npm ci` and every documented command work with the pinned Node. Pinned by Task 6: CI runs exactly the README commands.
5. **The release APK launched without a development server** → the welcome screen appears, with no red error screen. Pinned by Task 7's Maestro flow.

---

### Task 1: Private copy on Mattia's GitHub

**Files:** none in the repo (git remotes and history only).

- [ ] **Step 1: Ask Mattia which author email the public history should show.** Today 42 commits carry his personal Gmail address. The options are to keep it, or to rewrite it to his GitHub no-reply address: `<id>+mattiaroncato2004-bit@users.noreply.github.com`, where `<id>` comes from `gh api user --jq .id`. Rewriting changes every commit hash, which is acceptable because this is a new copy. Do not continue without his answer.
- [ ] **Step 2: If he chose the no-reply address, rewrite the history.** Run `brew install git-filter-repo`, write a mailmap mapping the Gmail address to the no-reply one, then run `git filter-repo --mailmap <file> --force` on a fresh clone in the scratchpad.
  Expected: `git log --format='%ae' | sort -u` shows only the no-reply addresses.
- [ ] **Step 3: Scan the history for secrets and large files.**
  Run: `git log -p | grep -iE "api[_-]?key|secret|token|password" | head` and `git rev-list --objects --all | git cat-file --batch-check='%(objectsize) %(rest)' | sort -n | tail -5`.
  Expected: no credentials; the largest blobs are the geo JSON and demo photos already known.
- [ ] **Step 4: Create the private repo and push.**
  Run: `gh repo create mattiaroncato2004-bit/mantide --private --description "The iPhone Photos map, on Android — plus Gemma 4 that learns what you love from your photos. Winner, Best Open-Source AI Project, Hacktoberfest 2026."`. Then add it as remote `public`, run `git push public main`, and `git switch -c stage-1`.
  Expected: `gh repo view mattiaroncato2004-bit/mantide --json visibility,defaultBranchRef` shows `PRIVATE`, `main`.

### Task 2: String layer (English and Italian)

**Files:**
- Create: `mobile/src/i18n/index.ts`, `mobile/src/i18n/en.ts`, `mobile/src/i18n/it.ts`
- Test: `mobile/scripts/test-i18n.ts`
- Modify: `mobile/package.json` (scripts `typecheck`, `test`), create `.nvmrc` (`26`)

**Interfaces:**
- Produces:
  - `type Locale = 'en' | 'it'`
  - `type StringKey = keyof typeof en`
  - `pickLocale(tags: readonly string[]): Locale`: the first tag starting with `it` gives `'it'`, otherwise `'en'`.
  - `locale: Locale`: from `navigator.languages` on web, `Intl.DateTimeFormat().resolvedOptions().locale` on Android.
  - `t(key: StringKey, params?: Record<string, string | number>): string`: replaces `{name}` placeholders.
  - `tc(base: string, count: number, params?): string`: uses `${base}_one` / `${base}_other`.
  - `formatDate(ms: number, style: 'day-month' | 'long' | 'month-year'): string`
  - `setLocaleForTests(l: Locale): void`: only the test scripts call it.
- Typing: `en.ts` is the source of truth (`as const`); `it.ts` is `satisfies Record<StringKey, string>`, so a missing Italian string fails `tsc`.

- [ ] **Step 1: Write the failing test** `scripts/test-i18n.ts`:
  ```ts
  assert.equal(pickLocale(['it-IT']), 'it');
  assert.equal(pickLocale(['de-DE', 'it-CH']), 'it');
  assert.equal(pickLocale(['fr-FR', 'en-GB']), 'en');
  assert.equal(pickLocale([]), 'en');
  assert.equal(t('test.hello', { name: 'Ada' }), 'Hello, Ada');   // locale forced to 'en' via setLocaleForTests('en')
  assert.equal(tc('count.countries', 1), '1 country');
  assert.equal(tc('count.countries', 6), '6 countries');
  ```
- [ ] **Step 2: Run** `npx tsx scripts/test-i18n.ts`. Expected: it fails because the module is missing.
- [ ] **Step 3: Implement** `i18n/index.ts`, `en.ts` and `it.ts`, holding the keys the tests use (`test.hello`, `count.countries_one/_other`). Add `package.json` scripts:
  - `"typecheck": "tsc --noEmit"`
  - `"test": "tsx scripts/test-i18n.ts && tsx scripts/test-locate.ts && tsx scripts/test-parse.ts && tsx scripts/test-recommend.ts && tsx scripts/test-passport.ts && tsx scripts/check-visited.ts"`
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: all pass.
- [ ] **Step 5: Commit** with the message `Add English/Italian string layer`.

### Task 3: English identifiers and sample data

**Files:**
- Modify:
  - `mobile/src/ai/interests.ts` (ids and labels);
  - `mobile/src/ai/gemma.ts` (`HINTS`, `PROMPT`, storage key);
  - `mobile/src/ai/parse.ts`;
  - `mobile/src/events/events.json`;
  - `mobile/src/events/recommend.ts` (`why()` through `t`);
  - `local-ai/test_photo.py` (same prompt as the app);
  - `local-ai/precompute_demo.py`;
  - `demo-data/analyses.json`, `mobile/src/demo/demo.json` (regenerated).
- Test: `mobile/scripts/test-parse.ts`, `mobile/scripts/test-recommend.ts`

**Interfaces:**
- Produces: `InterestId` = `'street-art' | 'food' | 'sea' | 'mountains' | 'art' | 'architecture' | 'live-music' | 'nature' | 'sport' | 'wine' | 'history' | 'nightlife'` (same order as today: street-art←street-art, food←cibo, sea←mare, mountains←montagna, art←arte, architecture←architettura, live-music←musica, nature←natura, sport←sport, wine←vino, history←storia, nightlife←notte). `labelOf(id)` returns `t(\`interest.${id}\`)`.
- Storage key `analysis:v1` → `analysis:v2`, so analyses stored with the old ids are dropped and redone.

- [ ] **Step 1: Update the tests first.**
  - `test-parse.ts` uses the English ids: `parseAnswer('{"scene":"Mural on a street wall","interests":["street-art","art"]}')` gives `{ scene: 'Mural on a street wall', interests: ['street-art', 'art'] }`, and `"cibo"` is now rejected as an unknown id.
  - `test-recommend.ts` asserts, with the locale set to `'en'`, that `why(r)` for the Treviso murals tour reads `You have 41 photos of street art`. Use the exact count printed by the current test.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL on the ids.
- [ ] **Step 3: Rename the ids, wire the labels and update the prompt.**
  - Rename the ids everywhere; labels go through `t`, with Italian labels identical to today's.
  - In `events.json`, write the titles in English (keep place names), map the interest ids, and add `"sample": true` to every event.
  - In `PROMPT`, ask for `"<what you see, in English, max 8 words>"` and list the English ids with the same hints. Copy the identical prompt into `local-ai/test_photo.py`.
- [ ] **Step 4: Regenerate the demo answers.**
  - Start Gemma: `litert-lm serve --port 9379`, as in `local-ai/README.md`.
  - Run `python3 local-ai/precompute_demo.py`, then `cd mobile && npx tsx scripts/build-demo.ts`.
  - Expected: every one of the 45 entries in `demo-data/analyses.json` has English `scene` text and only the new ids. A theme's id is among the interests in at least 40 of 45 (at the hackathon it was 43). If it's lower, report it before going on.
- [ ] **Step 5: Run** `npm run typecheck && npm test && npx tsx scripts/simulate-demo.ts`. Expected: everything passes, and the simulation prints English interests.
- [ ] **Step 6: Commit** with the message `Use English interest ids and sample data; regenerate demo answers`.

### Task 4: Translate the interface

**Files:**
- Modify: `mobile/App.tsx`; every file in `mobile/src/screens/`; `mobile/src/storage.web.ts` (the error box text); `mobile/src/map/mapHtml.ts` and `mobile/src/types.ts` (map labels); `mobile/src/ai/gemma.ts` (`whereGemmaRuns()` text)
- Create: `mobile/scripts/check-ui-strings.ts`

**Interfaces:**
- Produces: `MapState.labels: { youAreHere: string; distancesFromHere: string }`. The map page reads `state.labels` instead of its hard-coded Italian. The ring labels stay `N km`.

- [ ] **Step 1: Write the failing check** `check-ui-strings.ts`. It scans `App.tsx` and `src/screens/*.tsx` and fails, printing file:line, on:
  - any JSX text node with 3+ letters (`>Some text</`);
  - any `accessibilityLabel="literal"`;
  - any `'it-IT'` locale literal.
  
  Add it to `npm test`.
- [ ] **Step 2: Run** `npx tsx scripts/check-ui-strings.ts`. Expected: FAIL with today's Italian strings listed.
- [ ] **Step 3: Move every visible string into `en.ts` / `it.ts`, and every date into `formatDate`.**
  - English copy follows the minimal-text rule.
  - Italian keeps today's wording.
  - `?nuovo` becomes `?reset`, with an English comment.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Look at it.**
  - Run `npx expo start --web --port 8081` and open it with Playwright at 390×844, `locale: 'en-US'` and then `'it-IT'`.
  - Check every screen: welcome, map, place sheet, Local panel, timeline, passport, gallery, photo group, photo preview.
  - Expected: English in en-US, Italian in it-IT, no mixed strings. Save the screenshots in the scratchpad.
- [ ] **Step 6: Commit** with the message `Translate the interface (English default, Italian)`.

### Task 5: Web demo deployable under `/mantide/`

**Files:**
- Create:
  - `mobile/app.config.ts` (reads `app.json`, sets `experiments.baseUrl = process.env.EXPO_BASE_URL ?? ''`);
  - `mobile/e2e/web-demo.spec.ts`;
  - `mobile/playwright.config.ts`;
  - `mobile/scripts/export-web.sh`.
- Modify: `mobile/App.tsx` (no location request on web), `mobile/package.json` (adds `@playwright/test` to devDependencies, and the scripts `export:web` and `e2e`)

**Interfaces:**
- Produces:
  - `npm run export:web`: runs `EXPO_BASE_URL=/mantide expo export --platform web --output-dir dist-web`, then writes an empty `dist-web/.nojekyll`.
  - `npm run e2e`: Playwright serves `dist-web` at `http://127.0.0.1:4173/mantide/` (a static server mapping `/mantide/` to `dist-web/`, started via `webServer` in the config) and runs the spec.

- [ ] **Step 1: Write the failing e2e test** `web-demo.spec.ts`, at viewport 390×844 with `locale: 'en-US'`:
  - go to `/mantide/?reset`;
  - expect the text `Use my gallery` within 10 s, then click it;
  - expect the header to show `6 countries` within 30 s;
  - click the `Local` tab and expect at least one interest chip;
  - expect the Gemma fallback note in the Local panel;
  - collect `pageerror` events and expect none.
- [ ] **Step 2: Run** `npm run export:web && npm run e2e`. Expected: FAIL. Assets 404 under `/mantide/`, or the test finds Italian text if Task 4 isn't merged yet.
- [ ] **Step 3: Implement `app.config.ts`, the export script, and skip `Location.requestForegroundPermissionsAsync` when `Platform.OS === 'web'`.** The demo is a fixed traveller, so the browser never asks for location.
- [ ] **Step 4: Run** `npm run export:web && npm run e2e`. Expected: PASS. Also confirm that `npx expo start --web` still serves at `/`, since dev must not get the base URL.
- [ ] **Step 5: Commit** with the message `Deployable web demo under /mantide with an end-to-end test`.

### Task 6: CI checks and Pages deploy

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the scripts `typecheck`, `test`, `export:web` and `e2e` from Tasks 2 to 5.
- Produces: a job named `check`, whose status badge goes in the README. The `deploy-pages` job runs only on `main`.

- [ ] **Step 1: Write `ci.yml`.**
  - Trigger: `push` and `pull_request`.
  - Job `check` (ubuntu-latest, `working-directory: mobile`): `actions/setup-node` with `node-version-file: .nvmrc` and npm cache, then `npm ci`, `npm run typecheck`, `npm test`, `npx expo export --platform android --output-dir /tmp/android-bundle`, `npm run export:web`, `npx playwright install --with-deps chromium`, `npm run e2e`. On `main` it ends with `actions/upload-pages-artifact` of `mobile/dist-web`.
  - Job `deploy-pages` (`needs: check`, `if: github.ref == 'refs/heads/main'`): `permissions: pages: write, id-token: write`, `environment: github-pages`, `actions/deploy-pages`.
- [ ] **Step 2: Push** `stage-1` to `public` and run `gh run watch` on the new run. Expected: `check` is green. `deploy-pages` is skipped, because this isn't `main`.
- [ ] **Step 3: Commit any fixes** with the message `Fix CI: <what>`, until it's green.

### Task 7: Android release build and emulator smoke test

**Files:**
- Create: `.github/workflows/android.yml`, `mobile/.maestro/smoke.yaml`

**Interfaces:**
- Produces: the workflow artifact `mantide-release-apk` (debug-signed release APK with the JS bundled), which Stage 2 reuses for GitHub Releases.

- [ ] **Step 1: Write the Maestro flow** `smoke.yaml` (appId `com.mantide.app`):
  - `launchApp: {clearState: true}`;
  - `assertVisible: "Use my gallery"`;
  - `tapOn: "Continue without gallery"`;
  - `assertVisible: "Global"`;
  - `tapOn: "Local"`;
  - `assertVisible: "For you here"` (the Local panel's English title from Task 4);
  - `assertNotVisible: "Error"`.
  
  This emulator run on GitHub stands in for the Mac emulator named in the spec's Verification section: it is the same check, and anyone can see it.
- [ ] **Step 2: Write `android.yml`.**
  - Trigger: `push` to `main` and `stage-1`, and `workflow_dispatch`.
  - Setup: Java 17 (temurin), Node from `.nvmrc`.
  - Build:
    - `npm ci`;
    - `npx expo prebuild --platform android --no-install` (`android/` stays generated and ignored);
    - `cd android && ./gradlew assembleRelease`;
    - upload `android/app/build/outputs/apk/release/app-release.apk` as `mantide-release-apk`.
  - Second job: `reactivecircus/android-emulator-runner@v2`, `api-level: 34`, `arch: x86_64`, with KVM enabled as that action's README shows. It downloads the artifact, runs `adb install`, installs Maestro with `curl -Ls "https://get.maestro.mobile.dev" | bash`, then runs `maestro test mobile/.maestro/smoke.yaml`.
- [ ] **Step 3: Push and watch.**
  Run: `gh run watch`.
  Expected: both jobs green. If the build fails on a native config (`app.json` plugins), fix it in `app.json`, never in the generated `android/`.
- [ ] **Step 4: Commit fixes** until it's green.

### Task 8: English docs; retire the team notes

**Files:**
- Rewrite: `README.md`, `AGENTS.md`, `mobile/AGENTS.md`
- Create:
  - `docs/hackathon.md`: the story of 24 October, the decisions and the difficulties, the pitch summary, the win, drawn from `progressi.md`, `docs/demo.md` and `docs/pitch.md`;
  - `CHANGELOG.md`: `0.1.0`, 24 Oct 2026, the hackathon build; `0.2.0`, this stage;
  - `docs/android-setup.md`, translated from `docs/setup-android.md`;
  - `docs/market-research.md`, translated from `docs/ricerca.md`;
  - `docs/images/`: screenshots;
  - `mobile/scripts/check-doc-links.ts`.
- Delete: `progressi.md`, `docs/prodotto.md`, `docs/demo.md`, `docs/pitch.md`, `docs/setup-android.md`, `docs/ricerca.md`
- Check that these are English and still accurate: `local-ai/README.md`, `demo-data/README.md`, `demo-data/CREDITS.md`, `mobile/src/geo/README.md`, and every code comment (`grep -rn "[àèéìòù]" mobile/src mobile/App.tsx local-ai` lists the remaining Italian outside `it.ts` and the geo data)

- [ ] **Step 1: Write `check-doc-links.ts` and add it to `npm test`.** It parses every `[..](relative/path)` in `../*.md` and `../docs/**/*.md`, and fails on a target that doesn't exist.
- [ ] **Step 2: Take the README screenshots** with Playwright from `dist-web`, in English at 390×844: globe with visited countries, a country with photo pins, the Local panel with the "you are here" dot and rings, the passport. Save them as `docs/images/*.png`.
- [ ] **Step 3: Write the README.**
  - **Order:**
    - title and one-line tagline;
    - badges: CI, licence, "Winner · Best Open-Source AI Project · Hacktoberfest 2026";
    - the screenshot row;
    - **Try it:** the web demo link (live after Task 9) and "APK: in Stage 2";
    - what it does, in 5 bullets;
    - why it's open source;
    - how it works (the diagram);
    - Real vs sample;
    - Run it: the same commands as `ci.yml`;
    - Status and roadmap: Stage 2 items, with on-device Gemma marked "in progress, not yet verified on a device";
    - Credits: Mattia Roncato, Giorgio Caligiuri, data sources;
    - Licence.
  - **Claims:** only verified ones. "Runs on Android" may cite the emulator smoke test, never a phone.
- [ ] **Step 4: Write `AGENTS.md`** in English. Rule: every change updates `CHANGELOG.md` under `## Unreleased` in the same commit. It keeps the conventions table, the `[native: rebuild]` tag and the pre-commit checks (`npm run typecheck && npm test`). `CLAUDE.md` stays `@AGENTS.md`.
- [ ] **Step 5: Run** `npm test`, which now includes the link check.
  Expected: PASS. Also `git grep -n "progressi.md"` returns nothing outside `docs/hackathon.md`.
- [ ] **Step 6: Commit** with the message `English docs; retire hackathon team notes`.

### Task 9: Go public

- [ ] **Step 1: Run the full verification on `stage-1`.** CI green on both workflows, `npm run typecheck && npm test && npm run export:web && npm run e2e` locally, `git status` clean, `docs/scelte-e-setup-kotlin.md` untracked.
- [ ] **Step 2: Ask Mattia to confirm before anything becomes public.** Show him the README rendered on GitHub (`gh browse`) while the repo is still private.
- [ ] **Step 3: Merge and publish.**
  - Merge `stage-1` into `main` (fast-forward) and push.
  - Run `gh repo edit mattiaroncato2004-bit/mantide --visibility public --accept-visibility-change-consequences`.
  - Enable Pages from Actions: `gh api -X POST repos/mattiaroncato2004-bit/mantide/pages -f build_type=workflow`.
  - Re-run the `main` CI so `deploy-pages` runs.
- [ ] **Step 4: Verify live.** Run the Task 5 e2e spec against `https://mattiaroncato2004-bit.github.io/mantide/` (`BASE_URL` env in the Playwright config). Expected: PASS. Then click every README link on GitHub.
- [ ] **Step 5: Make it findable.**
  - Run `gh repo edit --homepage https://mattiaroncato2004-bit.github.io/mantide/`.
  - Add the topics `gemma`, `gemma-4`, `on-device-ai`, `react-native`, `expo`, `android`, `maplibre`, `travel`, `photos`, `open-source`, `hacktoberfest`.
  - Pin the repo on his profile: tell Mattia how, since `gh` has no command for it.
- [ ] **Step 6: Update the CHANGELOG** to release `0.2.0`, push, and tag `v0.2.0`.
