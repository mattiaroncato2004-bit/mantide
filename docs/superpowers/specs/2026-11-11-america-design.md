# Mantide for America (Stage 2b)

Design, 11 November 2026. Mattia asked for the app to be America-oriented (English, US places, US events) and gave the writer full control ("hai pieno controllo, approvo le tue scelte"). Everything below is the writer's call unless it says Mattia's.

## Intent and why

Mattia sends the repository to about 150 startups in the United States (about 100 in San Francisco) and about 50 in Europe. They open the README and the web demo first. Today they meet a traveller from Treviso: the GIF zooms into Veneto, Italy is the only country with provinces, 37 of the 46 sample events are in Italy, distances are in kilometres and dates are British. A founder in San Francisco should see their own world in the first ten seconds: California lighting up, then counties, a gallery that looks like someone from SF, events nearby, miles.

## Success

- Opened from a US browser, the web demo starts on North America. "Try with sample photos" shows a San Francisco traveler. Zooming into the US lights states, then counties. The San Francisco place sheet suggests nearby events with the reason, distances in miles, dates like "Nov 14".
- The README's GIF and screenshots show the US.
- A real Italian gallery still gets ISTAT regions and provinces, and the app is still fully Italian on an Italian phone.
- CI is green: unit tests, the web end-to-end test, the Android emulator run with the new demo gallery.

## Goals

1. **US geography at the same depth as Italy:** states, then counties.
2. **A new demo traveler from San Francisco:** 45 open-licensed photos with invented GPS and dates, and Gemma's real answers on them, regenerated on the Mac.
3. **Sample events centred on the US.**
4. **Local conventions from the device region:** miles and US date formats in the US, American spelling in the English strings.
5. **Defaults and docs:** the map opens on North America, the demo home and the emulator location are San Francisco, README media regenerated.

## Non-goals

- Real event sources, in the US or in Europe. They are the next stage in the [v1 design](2026-11-10-mantide-v1-design.md), which already asks for US sources.
- On-device Gemma, iOS.
- A third level for countries other than Italy and the US.

## Anti-goals

- A demo gallery that looks like stock photos or a tourist brochure. It must read as one person's phone: plates of food, a concert from the crowd, a trail, a mural, as the current set does.
- Breaking Italy.
- A README claim that no run has checked.
- More text on screen (Mattia's rule from the v1 design).

## The demo traveler

- **Lives in San Francisco (Mission District).** 45 photos from March 2024 to October 2026, with the same 12 interests, weighted like today: street art, food, mountains, live music and architecture lead.
- **Trips (indicative):** the builder may swap a place when Commons has no good photo for it.
  - **Home, San Francisco:** Mission murals, Ferry Building food, SFMOMA, Golden Gate and Ocean Beach, a concert at the Fillmore.
  - **California:** Napa Valley (wine), Yosemite (mountains, two summers, as the Dolomites were), Big Sur (sea), Los Angeles (street art, tacos).
  - **Other states:** New York (architecture, art, jazz, pizza, a night out), Chicago (architecture), New Orleans (live music, food), Austin (live music), Hawaii (sea).
  - **Abroad, so the passport has something to say:** Mexico City (street art, food), the Canadian Rockies or Vancouver (mountains), Tokyo (food, nightlife), and two in Europe: Rome and Paris or London.
- **Exactly six countries** (USA, MEX, CAN, JPN and two in Europe), so the passport reads "Traveler, 4 more countries to become Explorer" as today. The US part covers at least six states.
- **Built by `demo-data/make_demo_photos.py` with a new plan.**
  - File names use the English theme names.
  - The licence filter is unchanged, and `CREDITS.md` is regenerated.
  - Each photo is chosen by looking at it: phone-like, no watermark, no identifiable person as the subject.
- **Gemma's answers are regenerated** with `local-ai/precompute_demo.py` on the Mac (the model is already in `models/`), then `scripts/build-demo.ts`. They are real answers, as now.
- The Italian gallery leaves the working tree; git history keeps it.

## US geography

- **Source:** US Census Bureau cartographic boundary files, latest year, states and counties, public domain. The 50 states and DC; Puerto Rico and the other territories stay countries, as in Natural Earth.
- **Files:** `mobile/src/geo/us-states.json` and `us-counties.json`.
  - **Ids:** `US-CA` and `US-06075`, prefixed so they never collide with ISTAT codes or Natural Earth ids.
  - **Names:** English. Italian state names come from Natural Earth's `name_it` where they differ.
  - **Size:** the two files together stay under 1.5 MB, enough for about 100 m precision (raised from 900 KB once the coarser data put Manhattan in Queens).
  - **Rebuild:** commands in `mobile/src/geo/README.md`, like the existing files.
- **Natural Earth's US states leave `world-regions.json`;** the Census states replace them.
- **One table for countries with two detailed levels (ITA, USA).** Today Italy is a special case in `locate`, the map model, the passport and `recommend`. After this change those modules all read the table, and no `'ITA'` literal is left outside it.
- **Level names follow the country.** In the US the two levels are states and counties (Italian: stati, contee). In Italy and everywhere else they stay regions and provinces. This applies wherever the UI names a level: the place sheet's small numbers, the passport, counts.

## Events

- **The 46 sample events are replaced by about 46 centred on the US.** They stay invented, marked `sample: true` and labelled as samples. Scales:
  - **local:** around the San Francisco home;
  - **regional:** California;
  - **national:** other states (New York, Illinois, Louisiana, Texas, Hawaii and more);
  - **global:** abroad, including the demo's foreign trips and a few in Italy.
- Dates stay in autumn 2026; `shiftToNow` keeps them current. Prices are in local currency.
- An event's `region` is the region id of a detailed country: ISTAT in Italy, `US-CA` in the US.

## Conventions from the device region

- **The device region** comes from the same tags as the language: `en-US` → US. On Android it comes from the system locale, as the language does now.
- **Miles in the US and the UK,** kilometres elsewhere. This covers the distance on an event card and the distance rings, which become round miles (1, 2, 5, 10, 20 mi).
- **Dates:** US formats in the US ("Nov 7", "Nov 7, 2026"), British for English elsewhere, Italian unchanged.
- **The English strings and the README use American spelling** ("Traveler"), because most readers are American.

## Defaults and docs

- **Map and home:** the demo and default home is the Mission District. The map opens centred on North America.
- **Emulator location:** San Francisco, both in `android.yml` and in [docs/android-setup.md](../../android-setup.md).
- **README:**
  - the GIF goes from the globe to California to San Francisco;
  - the screenshots show the world, the US by state, the San Francisco place sheet and the passport, with alt texts to match;
  - "Real vs sample" and Credits are updated (US Census Bureau).
- `docs/hackathon.md` stays as it is: it is the story of the day.

## Verification

- **Unit tests:**
  - `locate`: San Francisco, Los Angeles, Manhattan, Honolulu, Anchorage, Miami Beach, and a point in the Bay snapping to a county. The Italian cases are unchanged.
  - The map model with US states and counties, the passport's US counts, `recommend` from San Francisco.
  - Units and dates for `en-US`, `en-GB` and `it`.
- **End to end (web):** the demo in `en-US`: "6 countries", the San Francisco place sheet with miles, "Traveler".
- **Android emulator in CI:** the new gallery, located in San Francisco.
- **On the Mac:** every changed screen is shown to Mattia in the phone-sized web demo, as he asked.

## Release

Work on a branch, merged to `main` (which deploys the web demo). `CHANGELOG.md` gets a line per commit, then the release is tagged `v0.4.0`, "Stage 2b: America", as for 0.3.0.

## Left to the builder

- Exact photos, places, event titles and prices.
- Simplification settings within the size budget, and the ring steps in miles.
- How the region is read on Android, and the order of the work.
