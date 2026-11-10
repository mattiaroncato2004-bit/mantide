# Market research

Collected on 24 October 2026, during the hackathon. Prices from the App Store listings; they vary by country. Free event data sources were researched later: [superpowers/specs/2026-11-10-event-sources-research.md](superpowers/specs/2026-11-10-event-sources-research.md).

## Competitors

| App | Granularity | How it tracks | Price |
|---|---|---|---|
| [Visited](https://apps.apple.com/us/app/id846983349) | countries, regions, cities, lists | by hand | Pro ~$12.99, cities $7.99–9.99, regions $3.99 |
| [been](https://apps.apple.com/us/app/id680148327) | countries, regions | by hand | Premium $19.99/year |
| [NomadMania](https://apps.apple.com/us/app/id6502843543) | 1,381 regions, rankings | by hand | Premium subscription |
| [Polarsteps](https://apps.apple.com/us/app/id947925763) | trips and routes | automatic GPS | Plus €8.99/month or €29.99/year |
| [Fog of World](https://apps.apple.com/us/app/id505367096) | street-level fog | automatic GPS | $30 one-off |
| [Skratch](https://apps.apple.com/us/app/id1457438876) | countries, cities, attractions | from photos | free + Premium + eSIM |
| [Pin Traveler](https://apps.apple.com/us/app/id1335839375) | pins, countries, stats | photo scanner ("Your camera roll knows where you've been") | free + subscription |
| [Where was I?](https://apps.apple.com/us/app/id6758056060) | daily visits | automatic, data on the phone | free + in-app |
| [Stampie](https://apps.apple.com/us/app/id6752670353) | stamps per country | by hand | Pro $19.99 one-off |
| [Travelog](https://apps.apple.com/us/app/id6760092556) | landmarks, achievements | AI diary from photos, "travel DNA" from a quiz | free + in-app |
| [Mindtrip](https://apps.apple.com/us/app/id6503107567) | suggestions where you are | interest chips picked by hand | free |
| [corner](https://apps.apple.com/us/app/id1668282277) | friends' places | import from Instagram and TikTok | free |
| [Beli](https://apps.apple.com/us/app/id1478375386) | restaurants: Been / Want to try / Recs | by hand | free |

## What's missing

- **Photos → map already exists** (Pin Traveler, Skratch). History from EXIF alone isn't enough.
- **Interests are declared** (Mindtrip, chips picked by hand) or come from a quiz (Travelog). Nobody looks at what you actually photograph.
- **The new piece:** inferring tastes and places from the content of the gallery, which is acceptable only if the photos stay on hardware you own. With Gemma 4 running locally, it is.

## Interface patterns worth reusing

| Pattern | Seen in | For Mantide |
|---|---|---|
| A big percentage number | been, Visited | The passport |
| Drill-down country → region → city | Skratch, NomadMania | Zooming through the scales |
| Chronological line between points | Polarsteps | The timeline |
| Been / Want to try | Beli, Visited | Visited places and suggestions as two states of a place |
| Interest chips | Mindtrip | Interests inferred from photos, with the reason |
| Map + bottom sheet | Google Maps, Apple Maps | The place sheet |

## Other useful sources

- [Gemma 4 on LiteRT-LM](https://developers.google.com/edge/litert-lm/models/gemma-4) and [LiteRT-LM on Android](https://developers.google.com/edge/litert-lm/android).
- [Android: media access and ACCESS_MEDIA_LOCATION](https://developer.android.com/training/data-storage/shared/media).
- [Google Maps Timeline deleted for some users (2025)](https://www.gsmarena.com/google_has_inadvertently_deleted_some_peoples_maps_timelines-news-67095.php): location history is fragile.
