# Mantide · Team Mantide · Hacktoberfest 2026 @ H-FARM

**Your photo gallery already knows where you've been and what you love.**
An open-source Android app that turns your gallery into a living map of the places you've visited, and suggests what to do next at four scales: world, country, region and neighbourhood. Gemma 4 runs on hardware you own: your photos never reach a third-party cloud.

> Built during the Hacktoberfest hack day at H-FARM, 24 October 2026.
> Challenges entered: **02 · Best Open-Source AI Project** (DigitalOcean) and **03 · Best of Gemma 4** (Google).

## What it does

- **Map of where you've been.** Countries, regions, provinces and micro-areas light up on a satellite globe. Mark them by hand, like a travel checklist.
- **GPS.** Your current position marks the area you're in.
- **Your gallery rebuilds your past.** The date and GPS stored in each photo place it on the map. Zoom in and your photos appear where you took them, clustered like the Photos app map.
- **Your photos say what you love.** Gemma 4 looks at the content of your photos and builds an interest profile, with the photos that justify each interest. You can remove any interest.
- **Four scales that follow where you are.** Global (countries), National (the regions of the country you're in), Regional (its provinces in Italy, your region elsewhere), Local (the land around you).
- **Timeline.** Drag the handle to travel back through your photos, or press play: the map shows only what you'd seen by then, and an orange line follows the journey from place to place.
- **Your travel passport.** Tap the counter: countries visited and the share of the world's land you've seen, continents, regions and provinces of the country you're in with what's left, regions per country, and a traveller level (Turista → Viaggiatore → Esploratore → Giramondo → Leggenda) with the countries missing to the next one.
- **Events for you, nearby.** At the local scale the map shows events around you that match your interests, and says why. Tap any region or country for the events there.

## Why

Travel trackers make you tick boxes by hand. Recommendation apps make you pick a "foodie" or "art lover" filter. Your photos already describe both, more honestly than any filter. Reading a whole gallery is only acceptable if it stays on hardware you own, which an open-weight model like Gemma 4 makes possible.

## How it works

```
Android phone or emulator (mobile/, Expo + React Native + TypeScript)
├── Gallery: date and GPS of every photo (expo-media-library, ACCESS_MEDIA_LOCATION)
├── Places: point → country, Italian region, province, offline (src/geo)
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
| App | Expo SDK 58 / React Native 0.88 (TypeScript), Android development build |
| Map | MapLibre GL JS 5.6 in a WebView, globe projection, Sentinel-2 cloudless 2016 tiles, GeoJSON fills, clustered photo thumbnails |
| Boundaries | Natural Earth (countries, and first-level regions of every country), openpolis/geojson-italy from ISTAT (Italian regions and provinces) |
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

**Without Android: the same app in a browser.** Start Gemma with `litert-lm serve --port 9379 --cors-origin http://localhost:8081`, then:

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
| [docs/](docs/) | Product design, market research, Android setup, demo script (Italian) |
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
