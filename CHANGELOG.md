# Changelog

## Unreleased

- README: a GIF and new screenshots of the redesigned map, made by `mobile/scripts/readme-media.ts` from the web demo; "What it does" and the verified list describe the new screen.
- Android: the sample photos show (Wikimedia refuses Android's generic image loader; the app now names itself when it asks for them).
- The timeline and the passport in the new design: the timeline takes the sheet's place while it plays, the passport is a full-height sheet with grouped cards, your interests and the gallery choice at the bottom.
- CI keeps running the web tests when Ubuntu's package mirrors are unreachable.
- Try with sample photos: a third choice on the welcome loads 45 sample photos (from Wikimedia Commons) with Gemma's prepared answers, so the app can be tried on any Android phone without your own gallery or Gemma. Leaving the samples or stopping the gallery now also forgets the places those photos had marked.
- The README lists what the Android emulator run now checks: the sheet without the gallery, the place sheet after reading the gallery, and the back button.
- Android: the distance rings around you show (solid now: dashed lines don't appear on Android's emulator renderer), and "You are here" appears from the phone's last known position while a fresh GPS fix is on its way.
- The main screen is the map and one sheet, as in the iPhone Photos map. Zooming lights up countries, then regions, then provinces. The sheet shows your world far out, the photos in view at middle height, and the place you're looking at at full height, with "For you here" first. Two map buttons (style, back to me), a full-screen photo with what Gemma saw, and Android's back button going back one step at a time. The header, the scale switcher and the Local panel are gone; your interests and "Stop using the gallery" moved to the passport.
- Inter replaces the hackathon fonts; translucent materials; a three-height bottom sheet with iOS-like settling. Needs a rebuild (font packages).
- Android draws the map with native MapLibre instead of a web page inside the app; the WebView is gone. Needs a rebuild.
- The web map draws with MapLibre GL JS directly (no iframe), from the shared model and style; it keeps working when the basemap tiles don't load.
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
