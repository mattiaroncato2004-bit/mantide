# Mantide demo gallery

45 photos of one invented traveller from Roncade (TV), 2024-03 to 2026-10: street art, seafood/food, Dolomites hikes, concerts, architecture, plus beach, museum and wine. The photos are real Wikimedia Commons images (CC0 / PD / CC BY / CC BY-SA, see [CREDITS.md](CREDITS.md)). **The GPS and dates in their EXIF are invented** for the persona, and `photos.json` lists them. To rebuild: `python3 -I make_demo_photos.py build` (needs Pillow and piexif).

Push into the Android emulator, from the repo root:

```sh
adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/
adb shell content call --method scan_volume --uri content://media --arg external_primary   # or restart the emulator
```
