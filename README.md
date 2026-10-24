# Team Mantide · Hacktoberfest 2026 @ H-FARM

**Your photo gallery already knows where you've been and what you love.**
An open-source Android app that turns your gallery into a living map of the places you've visited, and suggests what to do next at four scales: world, country, region and neighbourhood. Gemma 4 runs locally: your photos never reach a third-party cloud.

> Status: work in progress, built during the Hacktoberfest hack day at H-FARM on 24 October 2026.
> Challenges entered: **02 · Best Open-Source AI Project** (DigitalOcean) and **03 · Best of Gemma 4** (Google).

## What it does

- **Map of where you've been.** Mark countries, regions, provinces and micro-areas by hand, like a travel checklist.
- **GPS.** Your current position marks the area you're in.
- **Your gallery rebuilds your past.** The date and GPS stored in each photo place it on the map and on a timeline. Every place shows the photos you took there.
- **Your photos say what you love.** Gemma 4 looks at the content of your photos and builds an interest profile, with the photos that justify each interest. You can remove any interest.
- **Suggestions at four scales.** Global (countries), National (regions), Regional (provinces), Local (hexagons of about 0.7 km²). At each scale the app suggests events that match your interests, and says why.

## Why

Travel trackers make you tick boxes by hand. Recommendation apps make you pick a "foodie" or "art lover" filter. Your photos already describe both, more honestly than any filter. Reading a whole gallery is only acceptable if it stays on hardware you own, which an open-weight model like Gemma 4 makes possible.

## Architecture (planned)

| Part | Choice |
|---|---|
| App | Expo / React Native (TypeScript), Android development build |
| Map | MapLibre GL JS 5.6 in a WebView, globe projection, Sentinel-2 cloudless 2016 satellite tiles by EOX (CC BY 4.0), GeoJSON fills for visited areas, clustered photo thumbnails |
| Boundaries | Natural Earth (countries, regions), ISTAT / geoBoundaries (Italian regions and provinces), H3 hexagons (micro-areas) |
| Local data | SQLite on the device |
| AI | Gemma 4 E2B (`gemma-4-E2B-it.litertlm`, 2.58 GB) through LiteRT-LM (`litert-lm serve`) on your own computer; the app sends photos shrunk to 384 px |
| Events | Invented JSON catalog, recommended by matching your interests at the current scale |

## Real vs mocked

Kept up to date as the code lands.

| Part | Status |
|---|---|
| Reading photos, dates and GPS from the gallery | Real (Android media library with `ACCESS_MEDIA_LOCATION`) |
| Demo gallery | **Invented:** open-licensed photos with made-up GPS and dates for a fictional traveller ([demo-data/](demo-data/)) |
| Map, scales, visited areas, photo thumbnails | Real |
| Interests | Real: Gemma 4 E2B labels each photo, on your own computer |
| Events | **Invented:** 46 sample events ([mobile/src/events/events.json](mobile/src/events/events.json)) |
| Gemma on the phone itself | Not built: needs a phone with 8 GB of RAM; the demo runs Gemma on the computer |

## Run it

1. **Gemma 4 on your computer:** follow [local-ai/README.md](local-ai/README.md) (`pip install litert-lm`, import the model, `litert-lm serve --port 9379`).
2. **Android toolchain and emulator:** follow [docs/setup-android.md](docs/setup-android.md) (Android Studio, SDK 36, an emulator with 4–6 GB of RAM).
3. **The app:**
   ```sh
   cd mobile
   npm install
   npx expo run:android
   ```
4. **Demo photos:** push the invented demo gallery into the emulator (see [demo-data/README.md](demo-data/README.md)), then in the app: **Galleria → Leggi la galleria**, **Interessi → Analizza le foto con Gemma**, **Per te**.

Checks that run without Android:

```sh
cd mobile
npx tsc --noEmit                      # types
npx tsx scripts/test-locate.ts        # point → country, region, province
npx tsx scripts/test-recommend.ts     # events per scale
npx tsx scripts/preview-map.ts /tmp/map.html   # the map page with sample data, open it in a browser
```

## Docs

- [Plan and technical choices](docs/piano.md) (Italian)
- [Market and UI research](docs/ricerca.md) (Italian)

## License

[Apache-2.0](LICENSE)
