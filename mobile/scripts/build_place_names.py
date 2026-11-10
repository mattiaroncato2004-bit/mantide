"""Writes src/geo/country-names.json and src/geo/region-names-en.json from Natural Earth.

Usage, from mobile/: python3 scripts/build_place_names.py <ne_50m_admin_0_countries.geojson> <ne_10m_admin_1_states_provinces.geojson>
The geometry files stay as they are; only the names are added.
"""
import json
import pathlib
import sys

GEO = pathlib.Path(__file__).resolve().parent.parent / "src" / "geo"


def main(admin0: str, admin1: str) -> None:
    countries = json.loads((GEO / "countries.json").read_text())["features"]
    ne0 = {f["properties"]["ADM0_A3"]: f["properties"] for f in json.loads(pathlib.Path(admin0).read_text())["features"]}
    names = {}
    for f in countries:
        p = ne0[f["properties"]["id"]]
        names[f["properties"]["id"]] = {"en": p.get("NAME_EN") or p["NAME"], "it": f["properties"]["name"]}
    (GEO / "country-names.json").write_text(json.dumps(names, ensure_ascii=False, separators=(",", ":")))

    regions = json.loads((GEO / "world-regions.json").read_text())["features"]
    ne1 = {f["properties"]["adm1_code"]: f["properties"] for f in json.loads(pathlib.Path(admin1).read_text())["features"]}
    english = {}
    for f in regions:
        p = ne1.get(f["properties"]["id"])
        name = p and (p.get("name_en") or p.get("name"))
        if name and name != f["properties"]["name"]:
            english[f["properties"]["id"]] = name
    (GEO / "region-names-en.json").write_text(json.dumps(english, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(names)} countries, {len(english)} regions with a different English name")


if __name__ == "__main__":
    main(*sys.argv[1:3])
