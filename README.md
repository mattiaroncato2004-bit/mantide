# Mantide · Team Mantide · Hacktoberfest 2026 @ H-FARM

**Where you've been, what you love, what to do near you: all from the photos you already have.**
An open-source Android app for travellers. It turns your photo gallery into a living map of the places you've visited, at four scales: world, country, region and neighbourhood. Then it suggests events near you that match your real passions. Gemma 4 runs on hardware you own: your photos never reach a third-party cloud.

> Built during the Hacktoberfest hack day at H-FARM, 24 October 2026.
> Challenges entered: **02 · Best Open-Source AI Project** (DigitalOcean) and **03 · Best of Gemma 4** (Google).

> [!IMPORTANT]
> **What you'll see at the demo.** Mantide is an Android app, and the plan was to show it in the Android emulator. On the day, the venue Wi-Fi was too unstable to even download Gemma 4 (2.58 GB) onto the emulator machine. So the demo runs **the same app, from the same code, in a browser at phone size**, with **Gemma 4 running for real on a MacBook**. The Android build is written and bundles cleanly, but it was never run on a device. The full story is in [The day, in short](#the-day-in-short).

## Why open source

Your photos and your movements are the most private data that exist: where you live, who you're with, where you go every Tuesday night. A closed app asking for them asks for blind trust. An open one lets you check:

- **No server and no account.** Nothing is uploaded; the code is here for anyone to verify.
- **Gemma 4 runs locally**, on the phone when it has 8 GB of RAM, otherwise on your own computer on your network.
- **Open data and libraries** for the map: MapLibre, Natural Earth, ISTAT boundaries, Sentinel-2 satellite imagery.

## Why

- **Travel trackers charge for the full experience and make you tick boxes by hand.** Been Premium is $19.99 a year, Polarsteps Plus €29.99 a year, Fog of World $30 ([market research](docs/ricerca.md)).
- **Recommendation apps make you pick a filter** like "art" or "food". Nobody is a macro-category: "art" doesn't tell murals in Lisbon from altarpieces.
- **None of them has a model that learns what you really love** to suggest events near you.
- **Your gallery already knows.** Instagram's algorithm ends up knowing you better than you know yourself, because it watches what you do, not what you declare. Your gallery is even more honest: it's what you chose to photograph. Mantide uses that knowledge for you, not for advertisers, and only because the photos stay on your hardware.

## What it does

- **Map of where you've been.** Countries, regions and provinces light up on a satellite globe. Mark them by hand too, like a travel checklist.
- **Your gallery rebuilds your past.** The date and GPS stored in each photo place it on the map. Zoom in and your photos appear where you took them, clustered like the Photos app map. **Tap a cluster** ("4") to see all four photos.
- **Your photos say what you love.** Gemma 4 looks at the content of your photos and builds an interest profile, with the photos that justify each interest. You can remove any interest.
- **Four scales that follow the place you tap.** Global (countries), National (the regions of that country), Regional (its provinces), Local (the land around you). **Tapping a place goes one scale down:** a country opens its regions, a region its provinces. Spain, France, the UK and Portugal show their real regions.
- **Local scale.** A blue **"You are here"** dot, **distance rings** (5, 10, 20 km…), and events around you that match your interests, each with the reason ("you have 14 photos of architecture"). **Tap an event card** and the map flies to it.
- **Timeline.** Drag the handle to travel back through your photos, or press play: the map shows only what you'd seen by then, and an orange line follows the journey from place to place.
- **Your travel passport.** Countries visited and the share of the world's land you've seen, continents, regions and provinces with what's left, and a traveller level (Turista → Viaggiatore → Esploratore → Giramondo → Leggenda).
- **Gallery and consent.** The first screen asks for the gallery in two lines: Gemma 4 and privacy. You can say no and still use the map. The **Galleria** button shows all your photos, and lets you give or withdraw consent at any time.

## The day, in short

| Time | What happened |
|---|---|
| 14:51 | Repo created; idea: a Been-like travel map built from the gallery, plus events matched by Gemma 4 |
| 15:35–16:24 | Expo app skeleton, Android permissions (gallery GPS needs `ACCESS_MEDIA_LOCATION`), shared context file for people and coding agents |
| 16:45 | **Decision: Expo, not native Kotlin.** The home screen was already done, and after one build every change arrives with a `git pull` |
| 16:33–17:20 | Map with 4 scales, gallery reading, Gemma 4 labelling photos, interests, invented events, demo gallery of 45 open-licensed photos |
| 17:31 | **The same app in a browser**, built as a plan B in case Android wasn't ready |
| 17:56 | One-screen redesign, regions for every country, passport, timeline |
| 18:19–18:55 | Real regions for Spain, France, UK and Portugal; visited regions made visible; "You are here" and distance rings; photo clusters; gallery screen |
| 19:00–19:10 | Welcome screen rewritten three times on tester feedback; tap-to-zoom-in between scales; pitch |

**What got in the way**

- **Venue Wi-Fi.** Android Studio and the emulator took most of the afternoon to download on the 16 GB machine, and Gemma 4 never arrived there. The demo moved to the browser version with Gemma on a MacBook.
- **No phone with 8 GB of RAM** in the team, so Gemma 4 runs on a computer, the mode the app already offers for smaller phones.
- **Gemma's structured-output mode returned broken JSON** and wrong interests. A plain prompt with a one-line hint per interest plus a strict parser fixed it (murals had been filed under "art" instead of "street art").
- **Speed.** At 960 px a photo took Gemma over a minute; at 384 px it takes 6–9 seconds, and the app samples at most 3 photos per place and day.
- **Map data.** Natural Earth's first-level units for Spain, France and the UK are provinces, departments and counties, not regions; they had to be regrouped. Overseas territories zoomed France out to the whole world.
- **Browser quirks.** A `srcdoc` iframe has a "null" origin and MapLibre never loaded its data; the map page now loads from a `blob:` URL.
- **Copyright.** A photo's licence doesn't cover the mural in it, so every street-art photo comes from countries with freedom of panorama.

Every decision and its reason, with times and commits: [progressi.md](progressi.md) (Italian).

## How it works

```
Android phone or emulator (mobile/, Expo + React Native + TypeScript)
├── Gallery: date and GPS of every photo (expo-media-library, ACCESS_MEDIA_LOCATION)
├── Places: point → country, region, province, offline (src/geo)
├── Map: MapLibre GL JS in a WebView: globe, 4 scales, visited areas, photo thumbnails
├── Storage: SQLite on the device
└── Interests and events: computed in the app from Gemma's labels
        │  each photo shrunk to 384 px, local network only (from the emulator: 10.0.2.2:9379)
        ▼
Your computer (local-ai/)
└── Gemma 4 E2B (gemma-4-E2B-it.litertlm) via `litert-lm serve` → {"scene": …, "interests": […]}
```

| Part | Choice |
|---|---|
| App | Expo SDK 58 / React Native 0.88 (TypeScript), Android development build; the same code runs in a browser |
| Map | MapLibre GL JS 5.6 in a WebView, globe projection, Sentinel-2 cloudless 2016 tiles, GeoJSON fills, clustered photo thumbnails |
| Boundaries | Natural Earth (countries, and first-level regions of every country, regrouped into real regions for ES/FR/GB/PT), openpolis/geojson-italy from ISTAT (Italian regions and provinces) |
| AI | Gemma 4 E2B (2.58 GB) through the LiteRT-LM server on your own computer; a fixed list of 12 interests |
| Profile and suggestions | Plain code: an interest's weight is its share of labelled photos; events are ranked by matching interests at the current scale |

## Real vs invented

| Part | Status |
|---|---|
| Reading photos, dates and GPS from the gallery | Real |
| Demo gallery | **Invented:** 45 open-licensed photos with made-up GPS and dates for a fictional traveller ([demo-data/](demo-data/)) |
| Map, scales, visited areas, photo thumbnails | Real |
| Interests | Real: Gemma 4 E2B labels each photo on your own computer |
| Events | **Invented:** 46 sample events ([mobile/src/events/events.json](mobile/src/events/events.json)) |
| Demo fallbacks | If Gemma can't be reached during a demo, the app shows the answers Gemma gave earlier on the demo photos ([demo-data/analyses.json](demo-data/analyses.json)) and says so on screen |
| Android app on a device | **Not run:** written, type-checked and bundled (`npx expo export --platform android`), but the emulator machine never got Gemma 4 because of the Wi-Fi |
| Gemma on the phone itself | Not built: it needs a phone with 8 GB of RAM; the demo runs Gemma on the computer |

## Run it

1. **Gemma 4 on your computer:** [local-ai/README.md](local-ai/README.md).
2. **Android toolchain and emulator:** [docs/setup-android.md](docs/setup-android.md).
3. **The app:**
   ```sh
   cd mobile
   npm install
   npx expo run:android
   ```
4. **Demo photos:** push them into the emulator ([demo-data/README.md](demo-data/README.md)), then open the app and choose **Usa la mia galleria**: it reads the photos and Gemma starts on its own. Switch to **Locale** for the events around you.

**Without Android: the same app in a browser** (this is what the demo uses). Start Gemma with `litert-lm serve --port 9379 --cors-origin http://localhost:8081`, then:

```sh
cd mobile
npx expo start --web --port 8081   # open http://localhost:8081 at phone size
```

The browser version reads the demo gallery (photos loaded from Wikimedia Commons) instead of a phone gallery; everything else is the same code. Platform-specific pieces live in `.web.ts` / `.web.tsx` files next to their Android versions.

Checks that run without Android:

```sh
cd mobile
npx tsc --noEmit                               # types
npx expo export --platform android             # bundles the app's JavaScript for Android
npx tsx scripts/test-locate.ts                 # point → country, region, province
npx tsx scripts/test-parse.ts                  # reading Gemma's answers
npx tsx scripts/test-recommend.ts              # events per scale
npx tsx scripts/test-passport.ts               # passport stats on the demo data
npx tsx scripts/check-visited.ts               # every visited region and province lights up on the map
npx tsx scripts/simulate-demo.ts               # the whole demo on the demo data: map, interests, suggestions
npx tsx scripts/preview-map.ts /tmp/map.html   # the map page with sample data, open it in a browser
```

## Repository

| Path | What |
|---|---|
| [mobile/](mobile/) | The Android app |
| [local-ai/](local-ai/) | Running Gemma 4 on your computer, test and batch scripts |
| [demo-data/](demo-data/) | The invented demo gallery, its credits and the script that builds it |
| [docs/](docs/) | Product design, market research, Android setup, demo script and [5-minute pitch](docs/pitch.md) (Italian) |
| [progressi.md](progressi.md) | Project state, decisions and change log (Italian) |
| [AGENTS.md](AGENTS.md) | Start here if you work on the code, person or coding agent |

## Credits

- [Gemma 4](https://ai.google.dev/gemma) by Google (Apache 2.0), run with [LiteRT-LM](https://developers.google.com/edge/litert-lm)
- [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause)
- Satellite imagery: [Sentinel-2 cloudless 2016](https://s2maps.eu) by EOX IT Services (CC BY 4.0), contains modified Copernicus Sentinel data
- Boundaries: [Natural Earth](https://www.naturalearthdata.com) (public domain) and [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) (CC BY 4.0, ISTAT data), see [mobile/src/geo/README.md](mobile/src/geo/README.md)
- Demo photos: Wikimedia Commons authors, listed in [demo-data/CREDITS.md](demo-data/CREDITS.md)
- Written with the help of Claude Code: commits it contributed to are marked as co-authored

## License

[Apache-2.0](LICENSE)
