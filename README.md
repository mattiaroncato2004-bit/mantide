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
| Map | MapLibre GL JS in a WebView, Natural Earth II physical relief (public domain), GeoJSON fills for visited areas |
| Boundaries | Natural Earth (countries, regions), ISTAT / geoBoundaries (Italian regions and provinces), H3 hexagons (micro-areas) |
| Local data | SQLite on the device |
| AI | Gemma 4 E2B (`.litertlm`, 2.58 GB) through LiteRT-LM: on the phone when it has 8 GB of RAM or more, otherwise on your own computer over the local network |
| Events | Curated JSON dataset plus public events from h-farm.com |

## Real vs mocked

Kept up to date as the code lands.

| Part | Status |
|---|---|
| Photos, dates, GPS positions | Real, read from the device gallery |
| Interest profile | Real, produced by Gemma 4 from the photos |
| Events | Mocked: curated dataset, plus public h-farm.com events |

## Run it

Instructions will be added with the first runnable version.

## Docs

- [Plan and technical choices](docs/piano.md) (Italian)
- [Market and UI research](docs/ricerca.md) (Italian)

## License

[Apache-2.0](LICENSE)
