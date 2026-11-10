# The hackathon: 24 October 2026

Mantide was built in one afternoon at the Hacktoberfest hack day at H-FARM, Roncade, by Mattia Roncato and Giorgio Caligiuri, with Claude Code. It entered challenge **02 · Best Open-Source AI Project** (DigitalOcean) and **03 · Best of Gemma 4** (Google), and **won Best Open-Source AI Project**.

This page is the record of that day. What the app does now is in the [README](../README.md); what changed since is in the [CHANGELOG](../CHANGELOG.md).

## The idea

Two ideas, merged at 15:00:

- a [Been](https://apps.apple.com/us/app/id680148327)-like map of the countries, regions and places you've visited, built from the date and GPS in your photos;
- a model that looks at what you photograph and suggests what to do near you.

Reading a whole gallery is acceptable only if it never leaves hardware you own. An open-weight model running locally, Gemma 4, makes that possible: that became the point of the project.

## The afternoon

| Time | What happened |
|---|---|
| 14:51 | Repo created |
| 15:35–16:24 | Expo app skeleton; Android permissions (the GPS of gallery photos needs `ACCESS_MEDIA_LOCATION`); a shared context file for people and coding agents |
| 16:45 | **Expo, not native Kotlin:** the home screen was already done, and after one build every change arrives with a `git pull` |
| 16:33–17:20 | Map with four scales, gallery reading, Gemma 4 labelling photos, interests, sample events, a demo gallery of 45 open-licensed photos |
| 17:31 | **The same app in a browser**, as a plan B in case Android wasn't ready |
| 17:56 | One-screen redesign, regions for every country, passport, timeline |
| 18:19–18:55 | Real regions for Spain, France, UK and Portugal; visited regions made visible; "you are here" and distance rings; photo clusters; gallery screen |
| 19:00–19:10 | The welcome screen rewritten three times on tester feedback; tapping a place zooms in; the pitch |
| 19:15 | Submission. Demo night from 19:20 |

## Decisions and why

- **Expo development build, not Expo Go:** Expo Go can't add native permissions, and without `ACCESS_MEDIA_LOCATION` Android strips the GPS from photos.
- **MapLibre GL JS in a WebView:** a globe, coloured areas from GeoJSON, and the same page runs in a browser.
- **Sentinel-2 cloudless 2016 imagery (EOX, CC BY 4.0):** a physical, green look under an open licence; later years are non-commercial.
- **Gemma 4 E2B, not E4B:** labelling a photo is classification; the small model (2.58 GB) is enough.
- **The official `litert-lm serve`,** OpenAI-compatible, instead of a server of our own.
- **A plain prompt, not constrained JSON:** the server's JSON mode returned broken output and worse labels. One short hint per interest fixed murals being filed under "art".
- **384 px photos and a sample** (at most 3 per place and day): at 960 px a photo took Gemma over a minute.
- **The profile and the suggestions are plain code,** not the model: an interest's weight is its share of labelled photos.
- **Declared fallbacks:** if Gemma can't be reached, the app shows the answers Gemma gave earlier on the demo photos, and says so.

## What got in the way

- **Venue Wi-Fi.** Android Studio and the emulator took most of the afternoon to download on the 16 GB machine, and Gemma 4 never arrived there. The demo ran the browser version, from the same code, with Gemma on a MacBook.
- **No phone with 8 GB of RAM** in the team, so Gemma ran on a computer, the mode the app offers for smaller phones.
- **Map data.** Natural Earth's first-level units for Spain, France and the UK are provinces, departments and counties, not regions; they had to be regrouped. Overseas territories zoomed France out to the whole world.
- **Browser quirks.** A `srcdoc` iframe has a "null" origin and MapLibre never loaded its data; the map page moved to a `blob:` URL.
- **Copyright.** A photo's licence doesn't cover the mural in it, so every street-art photo comes from countries with freedom of panorama.

## The pitch, in five minutes

1. **Opening:** "Raise your hand if you have more than a thousand photos on your phone." That gallery is the most honest diary you have.
2. **The problem:** travel trackers charge for the full experience and make you tick places by hand; recommendation apps make you pick a macro-category.
3. **The insight:** Instagram's algorithm knows you because it watches what you do. Your gallery is even more honest, and here that knowledge works for you, not for advertisers.
4. **Demo:** gallery → map lighting up → Local with events and their reasons → timeline → passport, with a note on why it ran in a browser.
5. **Why open source:** photos and movements are the most private data there are. "A closed app that asks for them asks for blind trust. An open one lets you check."

## After the hackathon

Mattia made this public copy (the team repository stays private) and is finishing the project in stages. Stage 1 made it English, tested and verifiable (CI, an Android build smoke-tested on an emulator, a web demo). Stage 2 is the redesign around the iPhone Photos map, real events from open data, and Gemma 4 on the phone: [design](superpowers/specs/2026-11-10-mantide-v1-design.md).
