# Changelog

## Unreleased

- One map style for Android and the web: Sentinel-2 satellite or OpenFreeMap standard, with the visited areas, journey, distance rings and events on top.
- A map model shared by the Android and web maps: what lights up at each zoom, the areas in view, photo clusters (10,000 photos in under a frame), the journey, distance rings.
- Plan for the Photos-map redesign: [docs/superpowers/plans/2026-11-10-stage-2a-photos-map-redesign.md](docs/superpowers/plans/2026-11-10-stage-2a-photos-map-redesign.md).

## 0.2.0 · Stage 1: public, English, verifiable

- English interface by default, Italian when the device is in Italian; country and region names in both.
- English identifiers throughout (interest ids, sample events); Gemma now describes photos in English, and the 45 demo answers were regenerated.
- Sample events move forward by whole weeks, so the demo never runs out of upcoming events.
- Web demo deployable under `/mantide/` on GitHub Pages; the browser never asks for location; `?reset` starts again from the welcome screen.
- CI: typecheck, unit tests, checks against hard-coded UI text, leftover Italian, broken doc links and a README out of step with CI, the Android JavaScript bundle, and an end-to-end test of the web demo.
- Android: release APK built on GitHub and run on an emulator, including reading the 45 demo photos from the gallery.
- Documentation in English; the hackathon notes became [docs/hackathon.md](docs/hackathon.md).

## 0.1.0 · 24 October 2026 · Hacktoberfest @ H-FARM

The hackathon build: map of visited places at four scales from the gallery's GPS and dates, Gemma 4 interests from photo content, sample events, timeline, passport, browser version. Winner of Best Open-Source AI Project. The story of the day: [docs/hackathon.md](docs/hackathon.md).
