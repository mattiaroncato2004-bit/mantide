#!/usr/bin/env python3
"""
make_demo_photos.py - build the Mantide demo gallery.

Mantide reads the phone gallery: EXIF GPS + date colour the map of visited
places, and the on-device model looks at the pixels to infer interests.
For the demo we need a believable gallery of ONE invented person, so this
script:

  1. takes a hand-written travel PLAN (date, place, coordinates, theme,
     Wikimedia Commons file title) for the persona "Marco from Roncade (TV)";
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
    python3 -I make_demo_photos.py search "street art mural Lisbon"   # find candidates
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

# The PLAN uses the Italian theme names of the hackathon (they are also in the file names);
# photos.json carries the app's English interest ids.
THEME_IDS = {"street-art": "street-art", "cibo": "food", "mare": "sea", "montagna": "mountains", "arte": "art",
             "architettura": "architecture", "musica": "live-music", "natura": "nature", "sport": "sport",
             "vino": "wine", "storia": "history", "notte": "nightlife"}
THEMES = {"street-art", "cibo", "mare", "montagna", "arte", "architettura",
          "musica", "natura", "sport", "vino", "storia", "notte"}

# --------------------------------------------------------------------------
# The persona's travel plan.
# One row = one photo: (local datetime, place, ADM0_A3 country, lat, lon,
#                       theme, slug for the file name, Commons file title)
# Coordinates are realistic spots inside each place, a few photos per trip
# on the same 1-3 days, from 2024-03 to 2026-10.
# --------------------------------------------------------------------------

# UTC offsets: Italy/Germany/Spain/France (winter, summer), Lisbon summer, London summer.
CET, CEST, WEST, BST = "+01:00", "+02:00", "+01:00", "+01:00"

PLAN = [
    # --- Roncade (home), spring 2024: castle and the Sile river park --------
    ("2024-03-16T11:20:00" + CET, "Roncade", "ITA", 45.62831, 12.37792, "storia", "roncade",
     "File:Castello di Roncade 1.jpg"),
    ("2024-03-17T10:05:00" + CET, "Roncade", "ITA", 45.60512, 12.35208, "natura", "roncade",
     "File:Parco naturale regionale del Fiume Sile, Treviso 01.jpg"),

    # --- Venezia, April 2024: bacaro in Cannaregio, then Burano -------------
    ("2024-04-20T13:10:00" + CEST, "Venezia", "ITA", 45.44318, 12.33297, "cibo", "venezia",
     "File:Sarde in saor dans un restaurant vénitien (décembre 2022).JPG"),
    ("2024-04-21T11:30:00" + CEST, "Venezia", "ITA", 45.48530, 12.41672, "architettura", "venezia",
     "File:Burano Venice 17.jpg"),
    ("2024-04-21T13:15:00" + CEST, "Venezia", "ITA", 45.48571, 12.41803, "cibo", "venezia",
     "File:Spaghetti alle vongole.jpg"),

    # --- Lisbona, May 2024: murals, sardines, MAAT, Atlantic sunset ----------
    ("2024-05-24T17:40:00" + WEST, "Lisbona", "PRT", 38.70362, -9.17841, "street-art", "lisbona",
     "File:Lisboa mural Pelikany.jpg"),
    ("2024-05-25T11:00:00" + WEST, "Lisbona", "PRT", 38.71802, -9.15297, "street-art", "lisbona",
     "File:Mural - Travessa de Santa Quitéria, Lisboa.jpg"),
    ("2024-05-25T20:30:00" + WEST, "Lisbona", "PRT", 38.71103, -9.12904, "cibo", "lisbona",
     "File:Grilled Sardines in-the-Charcoal with salad 7.50€ (3784714323).jpg"),
    ("2024-05-26T10:45:00" + WEST, "Lisbona", "PRT", 38.69568, -9.19461, "architettura", "lisbona",
     "File:The MAAT (34943440096).jpg"),
    ("2024-05-26T20:40:00" + WEST, "Lisbona", "PRT", 38.67781, -9.33662, "mare", "lisbona",
     "File:2025-05-11 Sunset over the Adriatic Sea seen from Šušanj Beach, Bar 1.jpg"),

    # --- Dolomiti, July 2024: Tre Cime di Lavaredo loop -----------------------
    ("2024-07-13T09:40:00" + CEST, "Dolomiti", "ITA", 46.61862, 12.30204, "montagna", "dolomiti",
     "File:Trail and Tre Cime.jpg"),
    ("2024-07-13T11:15:00" + CEST, "Dolomiti", "ITA", 46.62297, 12.31503, "montagna", "dolomiti",
     "File:Forcella Lavaredo.jpg"),
    ("2024-07-14T10:20:00" + CEST, "Dolomiti", "ITA", 46.63048, 12.30711, "montagna", "dolomiti",
     "File:Wandern 001 2019 09 24.jpg"),

    # --- Venezia Lido, August 2024: a beach day ------------------------------
    ("2024-08-10T15:30:00" + CEST, "Venezia", "ITA", 45.40853, 12.37198, "mare", "venezia",
     "File:Spiaggia del Lido di Venezia.jpg"),

    # --- Berlino, September 2024: East Side Gallery, Kreuzberg, a gig -------
    ("2024-09-13T16:30:00" + CEST, "Berlino", "DEU", 52.50501, 13.44004, "street-art", "berlino",
     "File:Mural Himlen over Berlin Karina Bjerregaard Lotte Haubert East Side Gallery Berlin 02.jpg"),
    ("2024-09-13T16:50:00" + CEST, "Berlino", "DEU", 52.50342, 13.44251, "street-art", "berlino",
     "File:Stay Free Mural by Christoph Frank, East Side Gallery (Ank Kumar, Infosys Limited).jpg"),
    ("2024-09-14T12:10:00" + CEST, "Berlino", "DEU", 52.50049, 13.40903, "street-art", "berlino",
     "File:Mural Bergfriedstraße 20 Berlin-Kreuzberg.jpg"),
    ("2024-09-14T18:30:00" + CEST, "Berlino", "DEU", 52.51861, 13.37622, "architettura", "berlino",
     "File:Interior of the Reichstag dome 2015 2.jpg"),
    ("2024-09-14T22:15:00" + CEST, "Berlino", "DEU", 52.48402, 13.38697, "musica", "berlino",
     "File:Musicians performing on stage at a night concert featuring vibrant lights and energetic atmosphere.jpg"),

    # --- Milano, November 2024: Porta Nuova and a concert at Assago ---------
    ("2024-11-08T15:00:00" + CET, "Milano", "ITA", 45.48551, 9.19003, "architettura", "milano",
     "File:Milan skyline with Unicredit Tower and Bosco Verticale.jpg"),
    ("2024-11-08T21:40:00" + CET, "Milano", "ITA", 45.41293, 9.15224, "musica", "milano",
     "File:Beach-Please-2022-crowd-stage-lights-night-performance.jpg"),

    # --- Roma, February 2025: murals, carbonara in Trastevere, Vatican ------
    ("2025-02-21T15:30:00" + CET, "Roma", "ITA", 41.86398, 12.48902, "street-art", "roma",
     "File:Street art in Lisbon IMG 8015 (43099713260).jpg"),
    ("2025-02-21T20:45:00" + CET, "Roma", "ITA", 41.88931, 12.47003, "cibo", "roma",
     "File:Spaghetti Carbonara, Trastevere, Roma.jpg"),
    ("2025-02-22T10:30:00" + CET, "Roma", "ITA", 41.90652, 12.45361, "arte", "roma",
     "File:Spiral staircase in the Vatican Museums from bottom 02.jpg"),

    # --- Napoli, April 2025: Quartieri Spagnoli, pizza, seafood -------------
    ("2025-04-18T16:00:00" + CEST, "Napoli", "ITA", 40.84302, 14.24698, "street-art", "napoli",
     "File:Kreuzberg Luckauer Straße 14 Mural-001.jpg"),
    ("2025-04-18T20:30:00" + CEST, "Napoli", "ITA", 40.85098, 14.25851, "cibo", "napoli",
     "File:Eq it-na pizza-margherita sep2005 sml.jpg"),
    ("2025-04-19T13:30:00" + CEST, "Napoli", "ITA", 40.82851, 14.24752, "cibo", "napoli",
     "File:Calamari grillati.JPG"),

    # --- Barcellona, June 2025: Poblenou, Gaudí, paella, a festival ---------
    ("2025-06-05T17:00:00" + CEST, "Barcellona", "ESP", 41.40903, 2.18702, "street-art", "barcellona",
     "File:Street Art, Barcelona (14250274665).jpg"),
    ("2025-06-06T11:00:00" + CEST, "Barcellona", "ESP", 41.39162, 2.16494, "architettura", "barcellona",
     "File:Casa Batlló 01.jpg"),
    ("2025-06-06T14:00:00" + CEST, "Barcellona", "ESP", 41.37951, 2.18903, "cibo", "barcellona",
     "File:Paella de marisco 01.jpg"),
    ("2025-06-06T18:00:00" + CEST, "Barcellona", "ESP", 41.40302, 2.15604, "street-art", "barcellona",
     "File:Mural Sator Art 20240218.jpg"),
    ("2025-06-06T23:50:00" + CEST, "Barcellona", "ESP", 41.41104, 2.22101, "musica", "barcellona",
     "File:Dance Yrself Clean (2010-04-16 by Ian T. McFarland).jpg"),

    # --- Treviso, July 2025: tiramisù and a summer gig on the city walls ----
    ("2025-07-05T19:30:00" + CEST, "Treviso", "ITA", 45.66502, 12.24453, "cibo", "treviso",
     "File:Tiramisu dessert.jpg"),
    ("2025-07-05T22:00:00" + CEST, "Treviso", "ITA", 45.66493, 12.23902, "musica", "treviso",
     "File:Live band performance at an outdoor concert with lights and energetic crowd during nighttime.jpg"),

    # --- Dolomiti, August 2025: Lago di Sorapis and Croda da Lago -----------
    ("2025-08-09T10:15:00" + CEST, "Dolomiti", "ITA", 46.52497, 12.21502, "montagna", "dolomiti",
     "File:Monte Cristallo Lago di Sorapis hike.jpg"),
    ("2025-08-09T11:30:00" + CEST, "Dolomiti", "ITA", 46.51448, 12.22047, "montagna", "dolomiti",
     "File:Lago di Sorapis 2.jpg"),
    ("2025-08-10T12:00:00" + CEST, "Dolomiti", "ITA", 46.50003, 12.11502, "montagna", "dolomiti",
     "File:Croda da Lago, Cortina dolomites.jpg"),

    # --- Bologna, November 2025: tagliatelle and the porticoes at night -----
    ("2025-11-14T13:00:00" + CET, "Bologna", "ITA", 44.49381, 11.34302, "cibo", "bologna",
     "File:Tagliatelle ragù bolognese 01.jpg"),
    ("2025-11-14T21:30:00" + CET, "Bologna", "ITA", 44.49602, 11.34601, "notte", "bologna",
     "File:Bologna Portici di notte.jpg"),

    # --- Parigi, March 2026: Belleville walls and the Louvre ----------------
    ("2026-03-20T16:00:00" + CET, "Parigi", "FRA", 48.87102, 2.38503, "street-art", "parigi",
     "File:Street Art (2012) (33879759628).jpg"),
    ("2026-03-21T10:30:00" + CET, "Parigi", "FRA", 48.86061, 2.33762, "arte", "parigi",
     "File:LouvreMonaLisa.jpg"),

    # --- Londra, June 2026: Shoreditch and a Hyde Park concert ---------------
    ("2026-06-27T14:30:00" + BST, "Londra", "GBR", 51.52352, -0.07151, "street-art", "londra",
     "File:Mural Wassertorstaße 4 Berlin-Kreuzberg.jpg"),
    ("2026-06-27T21:30:00" + BST, "Londra", "GBR", 51.50731, -0.16572, "musica", "londra",
     "File:A large crowd enjoys a music concert illuminated by colorful lights and a stunning stage display.jpg"),

    # --- Back home, autumn 2026: prosecco at the castle, Treviso canals -----
    ("2026-09-19T18:30:00" + CEST, "Roncade", "ITA", 45.62852, 12.37903, "vino", "roncade",
     "File:VJB Vineyards & Cellars - June 2024 - Sarah Stierch 07.jpg"),
    ("2026-10-03T11:00:00" + CEST, "Treviso", "ITA", 45.66681, 12.24452, "architettura", "treviso",
     "File:Canale Buranelli a Treviso.jpg"),
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
            "place": place, "country": country, "theme": THEME_IDS[theme],
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
