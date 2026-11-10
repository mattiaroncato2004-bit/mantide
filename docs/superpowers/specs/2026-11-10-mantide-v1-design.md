# Mantide 1.0: from hackathon prototype to finished open-source app

Design, 10 November 2026. Agreed with Mattia Roncato in conversation; points marked **(my call)** were proposed by the writer and not objected to, everything else was decided by Mattia.

## Intent and why

Mantide won **Best Open-Source AI Project at Hacktoberfest 2026 @ H-FARM** (24 October 2026). The repository is how most people will meet it: they read the README, browse the code, maybe clone and run it. After the hackathon it still read as a prototype: Italian and English mixed, internal team notes up front, an Android app that was never run on a device, invented events.

The product, in one line: **the map in the iPhone Photos app, on Android, plus two things the iPhone doesn't have**: Gemma 4 learns what you love from your photos and suggests real things to do nearby, and the places you've been light up like a game. An Android user should look at it and want the feature iPhone owners have, made better.

## Success

- A founder lands on the repo, understands the product from the README's first screen (screenshots and a GIF), and can try it in one click (web demo) or install it (APK in Releases).
- The code builds and runs. Every claim in the README is true, and anything untested is said to be untested.
- The code reads like a real product's: clean structure, tests, CI green on every push, English throughout.

## Goals

1. Rebuild the main experience around the iPhone Photos map (below), polished to the level of an Apple app.
2. Gemma 4 runs **on the phone** when the phone can take it, with the fallbacks below.
3. **Real events**, free and as open as possible.
4. A public repo on Mattia's account that looks and works like a finished project.

## Non-goals

- iOS builds (Expo could produce one, but it isn't built, tested or claimed).
- Search, routing, directions: this is not a navigation app.
- Accounts, a backend, cloud sync, analytics. There is no server of ours.

## Anti-goals (would make it a failure even if it works)

- A repo that still looks like a hackathon: mixed languages, team notes in the foreground, invented data not declared as such, instructions that don't work.
- Screens full of text. Mattia's rule: every line must earn its place, no line repeats what is already on screen, secondary numbers are small, and the one thing that matters on each screen is the most prominent.
- Any claim in the README that hasn't been verified.

## Constraints

- **Hardware available for testing:** a MacBook (M3, 8 GB RAM) and no Android phone, so no device with 8 GB of RAM to run Gemma on a phone. The on-device path gets one full test later, on a borrowed 8 GB phone.
- **Free:** no paid services. GitHub Pages and GitHub Actions on a public repo are fine.
- **Existing work:** Expo SDK 58 / React Native 0.88 / TypeScript app in `mobile/`, MapLibre GL JS in a WebView, a browser twin of every platform-specific module (`*.web.ts(x)`), Gemma 4 E2B served by `litert-lm serve`, Natural Earth + ISTAT boundaries, the scripts in `mobile/scripts/`. Build on it **(my call)**: nothing is thrown away unless it fails the quality bar.

## Reference material

- Approved mockups, the visual reference for layout and polish: [mockups/1-layouts-chose-A.html](mockups/1-layouts-chose-A.html) (the three layouts; Mattia picked A), [mockups/2-main-screen-zoom-and-sheet.html](mockups/2-main-screen-zoom-and-sheet.html), [mockups/3-place-sheet-approved.html](mockups/3-place-sheet-approved.html) (the place sheet as approved). They were rendered inside a mockup frame, so open them for layout and proportions, not exact pixels.
- Event sources research with endpoints, terms and coverage counts: [2026-11-10-event-sources-research.md](2026-11-10-event-sources-research.md).

## The product

### Main screen (Mattia chose layout "A" from three mockups)

- **The map fills the screen**, as in the Photos app's map. Photo thumbnails sit on it as pins with a white border and a count badge, grouped, splitting as you zoom; the place stays visible under the pin (thumbnails stand above their point).
- **No scale switcher: you just zoom (my call, shown in the mockups and accepted).** What lights up follows the zoom: countries far out, then regions, then provinces. Visited areas are tinted in the accent colour under the photos. Real regions for every country as today (including the regrouping for Spain, France, UK, Portugal).
- **Two floating buttons top-right, as in Apple Maps (my call):** map style (satellite / standard) and "back to where I am".
- **One bottom sheet, three heights, always about the place you're looking at:**
  - *Low:* zoomed out on the world, your level and how far the next one is (one progress bar, one line). Zoomed on a country, its name and two small numbers.
  - *Middle:* the grid of photos currently visible on the map, as in Photos.
  - *High:* the **place sheet** (below). It opens when you tap a place or pull the sheet up.
- **Place sheet (mockup "versione 2", approved):** the place's name; right under it three **small** pills (photos, provinces visited / total, trips); then **"For you here" as the dominant section**: the first suggestion large with an image, date and distance, the others one line each with the reason ("You have 14 photos of architecture"); then the photos, last.
- **Tap a photo group** → grid of its photos, oldest first. **Tap a photo** → full screen, with what Gemma saw in it (the info you get swiping up on an iPhone photo) **(my call)**.
- **Kept and restyled in the same language (my call):** first-launch welcome (one sentence on the idea, two short lines on Gemma 4 and privacy, consent to the gallery or "continue without"), the timeline (drag back through your photos, play the journey), the passport (level, countries and share of the world, regions per country), marking places by hand, GPS.
- **Visual style:** iPhone-native feel: translucent dark materials, smooth spring animations for the sheet and the camera, the spacing of the mockups. Typography: **Inter** (open, close to Apple's SF) replaces Bricolage Grotesque and IBM Plex Mono **(my call)**. The current orange accent stays for "visited" and suggestions.
- **Trying it anywhere (my call):** the welcome has a small third option, "Try with sample photos". It loads the demo gallery bundled in the app, with sample events clearly labelled, so a founder in London can see the whole experience without geotagged photos or local event data. The web demo is the same mode.
- **Languages:** the app in **English and Italian**, following the phone's language **(agreed)**.

### Gemma 4 (Mattia: on-device is indispensable, even if it can't be tested now)

Three cases, decided per device:

1. **Phone with 8 GB of RAM or more:** Gemma 4 E2B runs **on the phone** with **LiteRT-LM** (Google's runtime for Gemma on Android) through a native module **(my call on the library)**. The model (`gemma-4-E2B-it.litertlm`, 2.58 GB, from the `litert-community` Hugging Face page) downloads once inside the app, on Wi-Fi, resumable, after checking free space, with clear progress.
2. **Smaller phone, or on-device fails:** Gemma on **the user's own computer** on their home network (`litert-lm serve`, as at the hackathon). The user enters or discovers the computer's address in the app, no rebuild. It is never anyone else's computer.
3. **Neither:** everything works except personalisation. "For you here" shows nearby events by date, with one line saying how to turn Gemma on **(my call)**.

Gemma does two jobs: labels a sample of photos with the 12 interests (as now), and **classifies event titles and descriptions** into the same interests, in any language **(my call)**. Without Gemma, events are classified by a keyword fallback.

**Honesty:** the README states that on-device Gemma is complete but not yet verified on a device, until Mattia's test. The builder writes a **device test checklist** for that day: exact steps and the expected result of each.

### Real events (Mattia: real, free, open where possible)

**Where suggestions come from (my call, as in the approved place sheet):** "For you here" is about **the place being viewed**: tap Veneto and you get Veneto's events, wherever you are; zoomed on your own area it is what's around you. Fetching is driven by the viewed area and each source declares the area it covers, so only the relevant sources are called. Where no source covers the place, the section shows OSM places for the user's interests and one short line on how to get more events (a Ticketmaster key).

Research on 10 November 2026 found no single free source covering Italy well. The plan **(my call, accepted)**:

1. **Open, keyless sources first, called from the phone:**
   - OpenEventDatabase (many city agendas: Paris, Barcelona, Lisbon…);
   - Open Data Hub Südtirol (CC0);
   - Bologna (CC BY 4.0), Firenze (CC BY 4.0), Emilia-Romagna (CC BY 4.0);
   - Italian Ministry of Culture events (SPARQL);
   - Paris "Que faire" (ODbL), Madrid, Berlin kulturdaten.
   
   Each source is credited in the app as its licence requires.
2. **Ticketmaster Discovery API, optional:** the user pastes their own free key in settings. No key ever ships in the repo.
3. **Places, not just events, for nature, mountains and sea:** trails, viewpoints and beaches from OpenStreetMap, because those passions rarely have events.
4. **Query by date overlap,** so that long exhibitions still show.
5. **Placeholder images** when a source has none.
6. **Privacy:** coordinates are rounded to about 1 km before any third party sees them **(my call)**.
7. **Cached on the device;** a failing source never breaks the screen.
8. **Known gap:** Veneto, Venice, Treviso, Milan and Rome publish no open event feed, so suggestions there will be few without Ticketmaster.
   **Where the readers are:** mostly in the United States, San Francisco above all, and in large European cities. The research above is Europe-only, so the builder **researches and adds free, keyless event sources for San Francisco and the largest US cities** (city open-data portals and similar), and checks the large European cities not covered yet (London is thin today).
9. **Demo:** the demo gallery is around Treviso, so in demo mode the events stay **sample events, clearly labelled**.

## The repository

- **A public copy on Mattia's account: `mattiaroncato2004-bit/mantide`.** The team's original repository stays as it is. The **full commit history** is kept, so the team's hackathon work shows **(my call)**.
- **English everywhere:** README, docs, code comments, commit messages from now on.
- **README:** the hackathon win at the top. Screenshots and a GIF before any text block. A "Try it" link to the web demo and to the APK. A short "how it works". "Real vs sample" kept and updated. Credits: **Mattia Roncato and Giorgio Caligiuri** (Mattia's decision), and every data source. Apache-2.0.
- **Published in stages (Mattia's decision):** the repository should be readable as soon as possible.
  - **Stage 1, as soon as possible:** the public copy with the full history, everything in English, CI green, the web demo of the current app on GitHub Pages, honest README.
  - **Stage 2:** the redesign, real events and on-device Gemma, in the same repo, with README, screenshots and APK updated.
  
  No fixed deadline.
- **Web demo on GitHub Pages:** static export of the browser version with the demo gallery and sample events. Gemma is not available there: it uses the answers Gemma gave earlier on the demo photos, and says so **(my call)**.
- **Releases:** a downloadable APK.
- **CI on GitHub Actions:** type check, the tests, the Android build on every push, with a status badge.
- **Team notes:** `progressi.md` and the Italian `AGENTS.md` become an English hackathon story (`docs/hackathon.md`), a `CHANGELOG.md`, and an English `AGENTS.md` for contributors and coding agents **(my call)**. The untracked `docs/scelte-e-setup-kotlin.md` (a rejected proposal) is not published.

## Verification

- **Android:** the builder verifies the app on an Android **emulator on the Mac** (install, permissions, gallery, map, sheet, events, Gemma via the computer mode at `10.0.2.2`). The 8 GB Mac cannot run Gemma on-device in an emulator. That path is verified only by Mattia's device test.
- **Web:** Playwright runs on the web build at phone size.
- **Unit tests** cover the logic: locate, interests, recommendation, event classification and fallback, source adapters with recorded responses, passport.
- Every README claim gets checked against a run before release.

- **The release does not wait for Mattia's device test (my call).** The checklist for that day covers on-device Gemma and map smoothness on real hardware; until then the README says both are unverified on a device.

## Map architecture (my call)

No mid-range Android is available to measure a WebView map against native, and smoothness is the product. So: **native MapLibre on Android** (MapLibre's React Native bindings), and the existing MapLibre GL JS page stays for the web demo. Style, layers, clustering rules and the visited-area logic are shared data and code; only the rendering layer differs. **Target:** pan, pinch and sheet drags without visible stutter on a mid-range Android with a 10,000-photo gallery.

## Left to the builder

- How large galleries are handled: lazy thumbnails, clustering limits, how many photos Gemma samples and when.
- Sheet and animation implementation; component structure; i18n library; the order of the work.
- APK signing approach for Releases (any secret must be created by Mattia).
- Exact copy, under the minimal-text rule above.
