#!/usr/bin/env python3
"""
make_demo_photos.py - build the Mantide demo gallery.

Mantide reads the phone gallery: EXIF GPS + date colour the map of visited
places, and the on-device model looks at the pixels to infer interests.
For the demo we need a believable gallery of ONE invented person, so this
script:

  1. takes a hand-written travel PLAN (date, place, coordinates, theme,
     Wikimedia Commons file title) for the persona, a traveler who lives in
     San Francisco's Mission District;
  2. asks the Commons API for each file's 1024px thumbnail URL and its
     licence/author metadata, and refuses anything that is not CC0 / Public
     Domain / CC BY / CC BY-SA or not a JPEG;
  3. downloads the thumbnails, re-encodes them (dropping ALL original
     metadata, including the photographer's real GPS) and writes fresh EXIF:
     GPS, DateTimeOriginal/Digitized/DateTime, Make/Model;
  4. reads the EXIF back from every file to verify it;
  5. writes photos.json (machine readable) and CREDITS.md (attribution).

The GPS positions and dates are INVENTED for the persona: they are not where
or when the photos were actually taken.

Usage (Pillow + piexif required):
    python3 -I make_demo_photos.py search "Mission District mural"    # find candidates
    python3 -I make_demo_photos.py build                              # (re)build dataset
"""

import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

import piexif
from PIL import Image

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
PHOTOS_DIR = HERE / "photos"
API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia asks every client to identify itself with a descriptive User-Agent.
USER_AGENT = "MantideHackathonDemo/0.1 (https://github.com/mattiaroncato2004-bit/mantide)"
THUMB_WIDTH = 1024
MAX_BYTES = 400 * 1024          # keep each JPEG under ~400 KB
CAMERA = ("Google", "Pixel 8")  # invented phone of the persona

# Licences that allow redistribution inside a public Apache-2.0 repo
# (with attribution where required). Anything else is rejected.
ALLOWED_LICENSE = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? \d\.\d)", re.I)

# The app's 12 interest ids (local-ai/test_photo.py INTERESTS): the PLAN's themes, also in the file names.
THEMES = {"street-art", "food", "sea", "mountains", "art", "architecture",
          "live-music", "nature", "sport", "wine", "history", "nightlife"}

# --------------------------------------------------------------------------
# The persona's travel plan.
# One row = one photo: (local datetime, place, ADM0_A3 country, lat, lon,
#                       theme, slug for the file name, Commons file title)
# Coordinates are realistic spots inside each place, a few photos per trip
# on the same 1-3 days, from 2024-03 to 2026-10.
# --------------------------------------------------------------------------

# UTC offsets of each trip's dates: US Pacific, Central and Eastern (winter, summer), Alberta summer,
# Hawaii, Mexico City (no daylight saving since 2022), Japan, Rome in winter, London in summer.
PST, PDT, CST, CDT, EDT = "-08:00", "-07:00", "-06:00", "-05:00", "-04:00"
MDT, HST, MEX, JST, CET, BST = "-06:00", "-10:00", "-06:00", "+09:00", "+01:00", "+01:00"

PLAN = [
    # --- Home, March 2024: a burrito on Mission Street, then Balmy Alley ------
    ("2024-03-09T13:10:00" + PST, "San Francisco", "USA", 37.75266, -122.41818, "food", "san-francisco",
     "File:Mission burrito and totopos at El Farolito.jpg"),
    ("2024-03-09T14:05:00" + PST, "San Francisco", "USA", 37.75226, -122.41228, "street-art", "san-francisco",
     "File:Balmy Alley.jpg"),

    # --- New York, April 2024: a slice, the bridge, Bushwick, the Met, jazz --
    ("2024-04-12T12:40:00" + EDT, "New York", "USA", 40.73303, -73.95473, "food", "new-york",
     "File:Paulie Gee's Slice Shop (35386).jpg"),
    ("2024-04-12T17:30:00" + EDT, "New York", "USA", 40.70608, -73.99683, "architecture", "new-york",
     "File:2024-06-15 09 53 30 View from the middle of the Brooklyn Bridge looking northwest along the "
     "pedestrian walkway in Manhattan, New York City, New York.jpg"),
    ("2024-04-13T11:15:00" + EDT, "New York", "USA", 40.70600, -73.93300, "street-art", "new-york",
     "File:Graffiti éponyme du quartier de Bushwick.jpg"),
    ("2024-04-13T15:00:00" + EDT, "New York", "USA", 40.77929, -73.96323, "art", "new-york",
     "File:Metropolitan Museum of Art Gallery 131 Temple of Dendur.jpg"),
    ("2024-04-13T21:45:00" + EDT, "New York", "USA", 40.76212, -73.98347, "live-music", "new-york",
     "File:Iridium Jazz Club, New York City, Home of Les Paul.jpg"),

    # --- Mexico City, May 2024: Roma's murals, tacos al pastor, Bellas Artes --
    ("2024-05-25T12:30:00" + MEX, "Mexico City", "MEX", 19.41927, -99.15837, "street-art", "mexico-city",
     "File:Mexico City (26223880537).jpg"),
    ("2024-05-25T14:20:00" + MEX, "Mexico City", "MEX", 19.41212, -99.16950, "food", "mexico-city",
     "File:Tacos al pastor prepa 1.jpg"),
    ("2024-05-26T11:00:00" + MEX, "Mexico City", "MEX", 19.40692, -99.16270, "street-art", "mexico-city",
     "File:Mexico City (41049187222).jpg"),
    ("2024-05-26T17:00:00" + MEX, "Mexico City", "MEX", 19.43521, -99.14125, "architecture", "mexico-city",
     "File:Interior del Palacio de Bellas Artes 05.jpg"),

    # --- Yosemite, July 2024: the Mist Trail, then the Half Dome cables -------
    ("2024-07-13T10:30:00" + PDT, "Yosemite", "USA", 37.72760, -119.54420, "mountains", "yosemite",
     "File:Vernal Falls and Mist Trail.jpg"),
    ("2024-07-14T12:15:00" + PDT, "Yosemite", "USA", 37.74600, -119.53320, "mountains", "yosemite",
     "File:The Climb Up - Half Dome - Yosemite National Park (7617874892).jpg"),

    # --- Big Sur, August 2024: a stop on Highway 1 ---------------------------
    ("2024-08-17T16:40:00" + PDT, "Big Sur", "USA", 36.46000, -121.92700, "sea", "big-sur",
     "File:Coastal bluff near Big Sur California.jpg"),

    # --- Los Angeles, September 2024: a Mid-City wall, Boyle Heights tacos ---
    ("2024-09-21T15:30:00" + PDT, "Los Angeles", "USA", 34.04770, -118.34400, "street-art", "los-angeles",
     "File:Los Angeles, CA, 33 1-3 - Mid City Arts, April 13, 2012 - panoramio.jpg"),
    ("2024-09-21T19:10:00" + PDT, "Los Angeles", "USA", 34.03950, -118.20320, "food", "los-angeles",
     "File:Pork shoulder tacos - 33983678678.jpg"),

    # --- Texas, October 2024: barbecue in Lockhart, Austin's walls and music --
    ("2024-10-05T13:30:00" + CDT, "Lockhart", "USA", 29.88534, -97.67037, "food", "lockhart",
     "File:Barbecue plate at Black's Barbecue.jpg"),
    ("2024-10-05T18:45:00" + CDT, "Austin", "USA", 30.26740, -97.74270, "street-art", "austin",
     "File:Wallpainting and Oldtimer in Austin, Texas.jpg"),
    ("2024-10-06T13:00:00" + CDT, "Austin", "USA", 30.26260, -97.72730, "live-music", "austin",
     "File:Live Music Hope Farmers Market Plaza Saltillo.jpg"),

    # --- Home, November 2024: a gig at the Fillmore -------------------------
    ("2024-11-15T21:40:00" + PST, "San Francisco", "USA", 37.78403, -122.43301, "live-music", "san-francisco",
     "File:BRMC @ The Fillmore, San Francisco, 4 22 13 (8690371427).jpg"),

    # --- New Orleans, March 2025: beignets, the Quarter, Frenchmen Street ----
    ("2025-03-01T10:00:00" + CST, "New Orleans", "USA", 29.95752, -90.06177, "food", "new-orleans",
     "File:Beignets and Café au Lait at Café du Monde, New Orleans.jpg"),
    ("2025-03-01T16:20:00" + CST, "New Orleans", "USA", 29.95860, -90.06480, "architecture", "new-orleans",
     "File:Balconies in the French Quarter with fine greenery.jpg"),
    ("2025-03-01T22:30:00" + CST, "New Orleans", "USA", 29.96360, -90.05770, "live-music", "new-orleans",
     "File:Mardi Gras in New Orleans - Carnival party at the Blue Nile on Frenchmen Street 2017 - 09.jpg"),

    # --- Tokyo, April 2025: ramen at Tokyo Station, Golden Gai at night ------
    ("2025-04-05T12:30:00" + JST, "Tokyo", "JPN", 35.68030, 139.76840, "food", "tokyo",
     "File:Shoyu Ramen @ Shichisai @ Tokyo Ramen Street (13165344585).jpg"),
    ("2025-04-05T22:10:00" + JST, "Tokyo", "JPN", 35.69400, 139.70480, "nightlife", "tokyo",
     "File:2024-10-20 Shinjuku Golden Gai at night.jpg"),

    # --- Chicago, May 2025: from the river -----------------------------------
    ("2025-05-17T11:00:00" + CDT, "Chicago", "USA", 41.88800, -87.62880, "architecture", "chicago",
     "File:Architecture boat tour, Chicago, 2026 - 135.jpg"),
    ("2025-05-17T19:40:00" + CDT, "Chicago", "USA", 41.88870, -87.62500, "architecture", "chicago",
     "File:Architecture boat tour, Chicago, 2026 - 232.jpg"),

    # --- Muir Woods, June 2025: redwoods across the bridge -------------------
    ("2025-06-14T11:20:00" + PDT, "Muir Woods", "USA", 37.89200, -122.57180, "nature", "muir-woods",
     "File:Muir Woods Path Through Trees June 2022.jpg"),

    # --- Yosemite, July 2025: Tuolumne Meadows and Olmsted Point -------------
    ("2025-07-19T09:50:00" + PDT, "Yosemite", "USA", 37.87300, -119.38300, "mountains", "yosemite",
     "File:Cathedral Peak from the start of the trail in Tuolumne Meadows.jpg"),
    ("2025-07-19T16:30:00" + PDT, "Yosemite", "USA", 37.81060, -119.48530, "mountains", "yosemite",
     "File:Half Dome's Other Side, Yosemite (11840288274).jpg"),

    # --- Banff, August 2025: Moraine Lake and the Plain of Six Glaciers ------
    ("2025-08-23T10:40:00" + MDT, "Banff", "CAN", 51.32230, -116.18300, "mountains", "banff",
     "File:Picture perfect Moraine Lake.jpg"),
    ("2025-08-24T11:30:00" + MDT, "Banff", "CAN", 51.40800, -116.24800, "mountains", "banff",
     "File:20130627 20 Plain of the Six Glaciers Trail (11371930943).jpg"),

    # --- Napa, September 2025: a glass among the vines -----------------------
    ("2025-09-27T16:00:00" + PDT, "Napa", "USA", 38.27310, -122.33480, "wine", "napa",
     "File:Truchard Vineyards - Nov 2018 - Stierch 03.jpg"),

    # --- Home, November 2025: Ferry Building, SFMOMA, a mural on Capp Street --
    ("2025-11-08T12:30:00" + PST, "San Francisco", "USA", 37.79550, -122.39370, "food", "san-francisco",
     "File:Spring Rolls at Imperial Tea -- Saturday at the Ferry Building Marketplace (6367086043).jpg"),
    ("2025-11-08T15:30:00" + PST, "San Francisco", "USA", 37.78570, -122.40110, "art", "san-francisco",
     "File:Graves Bronze Fayum 1981 Sculpture Annathepiano.jpg"),
    ("2025-11-09T11:00:00" + PST, "San Francisco", "USA", 37.75803, -122.41780, "street-art", "san-francisco",
     "File:Mission Mural - Political Art - 39364787244.jpg"),

    # --- Oahu, January 2026: Hanauma Bay and the Manoa Falls trail ----------
    ("2026-01-17T10:30:00" + HST, "Honolulu", "USA", 21.27320, -157.69400, "sea", "honolulu",
     "File:Hanauma Bay (8701274230).jpg"),
    ("2026-01-18T09:40:00" + HST, "Honolulu", "USA", 21.33280, -157.80050, "nature", "honolulu",
     "File:Manoa Falls Trail (8330330105).jpg"),

    # --- Rome, March 2026: cacio e pepe in Trastevere, the Colosseum --------
    ("2026-03-14T13:30:00" + CET, "Rome", "ITA", 41.88870, 12.46990, "food", "rome",
     "File:Cacio e pepe at trattoria in Rome.jpg"),
    ("2026-03-15T10:15:00" + CET, "Rome", "ITA", 41.89021, 12.49223, "history", "rome",
     "File:Arch Colosseum Rome Italy.jpg"),

    # --- London, June 2026: Shoreditch and a Hyde Park concert --------------
    ("2026-06-20T14:00:00" + BST, "London", "GBR", 51.52540, -0.07430, "street-art", "london",
     "File:Street art in Chance Street, Shoreditch - geograph.org.uk - 3810142.jpg"),
    ("2026-06-20T21:15:00" + BST, "London", "GBR", 51.50720, -0.16400, "live-music", "london",
     "File:Taylor Swift - The 1989 World Tour - Crowd at HYDE Park during Wildest Dream & Enchanted "
     "performance.jpg"),

    # --- Home, autumn 2026: the bridge in the fog, murals on 18th and 24th ---
    ("2026-09-12T11:00:00" + PDT, "San Francisco", "USA", 37.80740, -122.47490, "architecture", "san-francisco",
     "File:Golden Gate bridge 3.jpg"),
    ("2026-10-03T13:20:00" + PDT, "San Francisco", "USA", 37.76152, -122.42240, "street-art", "san-francisco",
     "File:Gui 2143.jpg"),
    ("2026-10-10T12:00:00" + PDT, "San Francisco", "USA", 37.75292, -122.41258, "street-art", "san-francisco",
     "File:Chata mural.jpg"),
]


# --------------------------------------------------------------------------
# Commons API helpers
# --------------------------------------------------------------------------

def http_get(url: str, retries: int = 4) -> bytes:
    """GET with the Wikimedia-required User-Agent and polite retry on 429/5xx."""
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def api(**params) -> dict:
    params.update(format="json", formatversion="2")
    return json.loads(http_get(API + "?" + urllib.parse.urlencode(params)))


def clean(text: str) -> str:
    """Strip the HTML that Commons puts in extmetadata values."""
    # Bare numbered links ("Flickr user: [2]") carry the author only in the
    # href, so keep the URL instead of the useless "[2]".
    text = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>\[\d+\]</a>', r"\1", text or "")
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def describe(page: dict) -> dict:
    """Flatten an API page (prop=imageinfo) into the fields we care about."""
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    get = lambda key: clean(meta.get(key, {}).get("value", ""))
    return {
        "title": page["title"],
        "mime": info.get("mime"),
        "width": info.get("width"),
        "height": info.get("height"),
        "source_url": info.get("descriptionurl"),
        # drop the utm_* tracking query string the API appends
        "thumb_url": (info.get("thumburl") or "").split("?")[0],
        "license": get("LicenseShortName"),
        "license_url": get("LicenseUrl"),
        "author": get("Artist") or get("Credit") or "unknown",
        "description": get("ImageDescription") or get("ObjectName"),
    }


def search(query: str, limit: int = 20) -> list:
    """Full-text search among JPEG files on Commons (namespace 6 = File:)."""
    data = api(action="query", generator="search", gsrnamespace=6,
               gsrsearch=f"{query} filemime:image/jpeg", gsrlimit=limit,
               prop="imageinfo", iiprop="url|extmetadata|mime|size",
               iiurlwidth=THUMB_WIDTH)
    pages = sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    return [describe(p) for p in pages if "imageinfo" in p]


def lookup(titles: list) -> dict:
    """Metadata for explicit File: titles, 50 per API call."""
    out = {}
    for i in range(0, len(titles), 50):
        data = api(action="query", titles="|".join(titles[i:i + 50]),
                   prop="imageinfo", iiprop="url|extmetadata|mime|size",
                   iiurlwidth=THUMB_WIDTH)
        q = data["query"]
        # The API normalises titles (e.g. underscores -> spaces); map them back.
        norm = {n["from"]: n["to"] for n in q.get("normalized", [])}
        by_title = {p["title"]: p for p in q["pages"]}
        for t in titles[i:i + 50]:
            page = by_title.get(norm.get(t, t))
            if page and "imageinfo" in page:
                out[t] = describe(page)
    return out


# --------------------------------------------------------------------------
# EXIF
# --------------------------------------------------------------------------

def to_dms(value: float):
    """Decimal degrees -> EXIF rational (deg, min, sec*100/100)."""
    value = abs(value)
    deg = int(value)
    minutes_f = (value - deg) * 60
    minutes = int(minutes_f)
    sec = round((minutes_f - minutes) * 60 * 10000)
    return ((deg, 1), (minutes, 1), (sec, 10000))


def from_dms(dms, ref) -> float:
    d, m, s = (n / den for n, den in dms)
    val = d + m / 60 + s / 3600
    return -val if ref in (b"S", b"W", "S", "W") else val


def build_exif(lat: float, lon: float, taken: datetime) -> bytes:
    stamp = taken.strftime("%Y:%m:%d %H:%M:%S").encode()
    zeroth = {
        piexif.ImageIFD.Make: CAMERA[0].encode(),
        piexif.ImageIFD.Model: CAMERA[1].encode(),
        piexif.ImageIFD.DateTime: stamp,
        piexif.ImageIFD.Software: b"mantide demo-data",
    }
    exif = {
        piexif.ExifIFD.DateTimeOriginal: stamp,
        piexif.ExifIFD.DateTimeDigitized: stamp,
        piexif.ExifIFD.OffsetTimeOriginal: taken.isoformat()[-6:].encode(),  # "+02:00"
    }
    gps = {
        piexif.GPSIFD.GPSVersionID: (2, 3, 0, 0),
        piexif.GPSIFD.GPSLatitudeRef: b"N" if lat >= 0 else b"S",
        piexif.GPSIFD.GPSLatitude: to_dms(lat),
        piexif.GPSIFD.GPSLongitudeRef: b"E" if lon >= 0 else b"W",
        piexif.GPSIFD.GPSLongitude: to_dms(lon),
    }
    return piexif.dump({"0th": zeroth, "Exif": exif, "GPS": gps})


def verify(path: Path, lat: float, lon: float, taken: datetime) -> None:
    """Read EXIF back from disk and check it matches what we meant to write."""
    ex = piexif.load(str(path))
    g = ex["GPS"]
    rlat = from_dms(g[piexif.GPSIFD.GPSLatitude], g[piexif.GPSIFD.GPSLatitudeRef])
    rlon = from_dms(g[piexif.GPSIFD.GPSLongitude], g[piexif.GPSIFD.GPSLongitudeRef])
    stamp = taken.strftime("%Y:%m:%d %H:%M:%S").encode()
    assert abs(rlat - lat) < 1e-5 and abs(rlon - lon) < 1e-5, (path, rlat, rlon)
    assert ex["Exif"][piexif.ExifIFD.DateTimeOriginal] == stamp, path
    assert ex["Exif"][piexif.ExifIFD.DateTimeDigitized] == stamp, path
    assert ex["0th"][piexif.ImageIFD.DateTime] == stamp, path
    assert ex["0th"][piexif.ImageIFD.Model] == CAMERA[1].encode(), path


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def encode_jpeg(raw: bytes, exif: bytes) -> bytes:
    """Decode the downloaded bytes (untrusted) and re-encode a clean JPEG.

    Re-encoding throws away every original metadata block (real GPS, XMP,
    comments) so only our invented EXIF remains.
    """
    img = Image.open(io.BytesIO(raw))
    if img.format != "JPEG":
        raise ValueError(f"not a JPEG: {img.format}")
    img = img.convert("RGB")
    if img.width > THUMB_WIDTH:
        img = img.resize((THUMB_WIDTH, round(img.height * THUMB_WIDTH / img.width)))
    for quality in (85, 80, 75, 70, 65, 60):
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=quality, optimize=True, exif=exif)
        if buf.tell() <= MAX_BYTES:
            break
    return buf.getvalue()


def build() -> None:
    PHOTOS_DIR.mkdir(exist_ok=True)
    meta = lookup([row[7] for row in PLAN])
    records, counters = [], {}

    for when, place, country, lat, lon, theme, slug, title in PLAN:
        assert theme in THEMES, theme
        m = meta.get(title)
        if not m:
            sys.exit(f"missing on Commons: {title}")
        if m["mime"] != "image/jpeg" or not ALLOWED_LICENSE.match(m["license"]):
            sys.exit(f"rejected ({m['mime']}, {m['license']}): {title}")

        taken = datetime.fromisoformat(when)
        key = (taken.date().isoformat(), slug, theme)
        counters[key] = counters.get(key, 0) + 1
        name = f"{taken.date().isoformat()}_{slug}_{theme}-{counters[key]:02d}.jpg"
        path = PHOTOS_DIR / name

        if not path.exists():
            raw = http_get(m["thumb_url"])
            path.write_bytes(encode_jpeg(raw, build_exif(lat, lon, taken)))
            time.sleep(1)  # be polite with upload.wikimedia.org
        else:
            # Re-run: keep pixels, just rewrite the EXIF (cheap, no download).
            piexif.insert(build_exif(lat, lon, taken), str(path))
        verify(path, lat, lon, taken)
        print(f"ok  {name}  {path.stat().st_size // 1024} KB  {m['license']}")

        records.append({
            "file": name, "lat": lat, "lon": lon, "takenAt": taken.isoformat(),
            "place": place, "country": country, "theme": theme,
            "source_url": m["source_url"], "thumb_url": m["thumb_url"],
            "license": m["license"], "author": m["author"],
            "_title": m["title"], "_description": m["description"],
            "_license_url": m["license_url"],
        })

    write_outputs(records)


def write_outputs(records: list) -> None:
    public = [{k: v for k, v in r.items() if not k.startswith("_")} for r in records]
    (HERE / "photos.json").write_text(json.dumps(public, indent=2, ensure_ascii=False) + "\n")

    lines = [
        "# Credits - Mantide demo gallery",
        "",
        "**The GPS coordinates and dates written in these files are INVENTED** for a",
        "fictional demo persona. They are not where or when the photos were taken.",
        "All images come from Wikimedia Commons (1024px thumbnails, re-encoded,",
        "original metadata removed); each keeps its original licence below.",
        "",
    ]
    for r in records:
        desc = (r["_description"] or r["_title"]).replace("|", "/")
        if len(desc) > 140:
            desc = desc[:137] + "..."
        lic = f"[{r['license']}]({r['_license_url']})" if r["_license_url"] else r["license"]
        lines.append(f"- `{r['file']}` - {r['_title']}: {desc} - by {r['author']} - "
                     f"{lic} - [source]({r['source_url']})")
    (HERE / "CREDITS.md").write_text("\n".join(lines) + "\n")
    print(f"\n{len(records)} photos -> photos.json, CREDITS.md")


# --------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) >= 3 and sys.argv[1] == "search":
        for r in search(" ".join(sys.argv[2:])):
            flag = "OK " if ALLOWED_LICENSE.match(r["license"]) else "-- "
            print(f"{flag}{r['width']}x{r['height']} [{r['license']}] {r['title']}"
                  f"  | {r['description'][:90]}")
    elif len(sys.argv) == 2 and sys.argv[1] == "build":
        build()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
