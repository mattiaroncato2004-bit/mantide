# Boundaries

| File | Content | Source | License |
|---|---|---|---|
| `countries.json` | 242 countries, `id` = Natural Earth `ADM0_A3`, `name` in Italian (English names in `country-names.json`) | [Natural Earth 1:50m admin 0](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `it-regions.json` | 20 Italian regions, `id` = ISTAT region code | [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy), from ISTAT | CC BY 4.0 |
| `it-provinces.json` | 110 Italian provinces, `id` = province abbreviation, `region` = ISTAT region code | same | CC BY 4.0 |
| `us-states.json` | The 50 US states and DC, `id` = `US-` + postal code (`US-CA`), `name` in English, `name_it` where the Italian name differs ("Carolina del Nord", from Natural Earth 1:10m admin 1). Puerto Rico and the other territories stay countries | [US Census Bureau cartographic boundary files](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html), 2024, 1:20m | Public domain |
| `us-counties.json` | 3,144 counties and equivalents of the 50 states and DC, `id` = `US-` + 5-digit GEOID (`US-06075`), `name` in English, `region` = the state's `id` | same, 2024, 1:5m | Public domain |
| `world-regions.json` | 4,417 first-level regions of every country but Italy and the USA, `id` = Natural Earth `adm1_code`, `name` in Italian when available, `country` = `ADM0_A3`, `group` = the real region for Spain, France, UK, Portugal | [Natural Earth 1:10m admin 1](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `world-groups.json` | The real regions of Spain (19), France (18), UK (16), Portugal (6), dissolved from `world-regions.json` by the Natural Earth `region` field | same | Public domain |
| `country-names.json` | Every country's name in English and Italian (`NAME_EN`, `NAME_IT`) | Natural Earth 1:50m admin 0 | Public domain |
| `region-names-en.json` | English names of the 1,582 regions abroad whose `name` differs ("Lisbona" → "Lisbon") | Natural Earth 1:10m admin 1 (`name_en`) | Public domain |

Simplified with [mapshaper](https://mapshaper.org) to keep the app light (3.1 MB in total; the two US files under 1.5 MB together):

```sh
npx mapshaper ne_50m_admin_0_countries.geojson -each 'id=ADM0_A3, name=NAME_IT, continent=CONTINENT' -filter-fields id,name,continent -simplify 12% keep-shapes -o precision=0.001 format=geojson countries.json
npx mapshaper limits_IT_regions.geojson -each 'id=reg_istat_code, name=reg_name' -filter-fields id,name -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-regions.json
npx mapshaper ne_10m_admin_1_states_provinces.geojson -filter 'adm0_a3 !== "ITA" && adm0_a3 !== "USA"' -each 'id=adm1_code, name=(name_it || name), country=adm0_a3' -filter-fields id,name,country -simplify 1.5% keep-shapes -o precision=0.01 format=geojson world-regions.json
# then drop the 18 features left without geometry
# names in English and Italian, from the same two Natural Earth files:
python3 path/to/mobile/scripts/build_place_names.py ne_50m_admin_0_countries.geojson ne_10m_admin_1_states_provinces.geojson
npx mapshaper limits_IT_provinces.geojson -each 'id=prov_acr, name=prov_name, region=reg_istat_code' -filter-fields id,name,region -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-provinces.json
# the USA, from https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip and cb_2024_us_county_5m.zip, unzipped
npx mapshaper cb_2024_us_state_20m.shp -filter '+STATEFP <= 56' -join ne_10m_admin_1_states_provinces.geojson keys=STUSPS,postal where="adm0_a3 == 'USA'" fields=name_it -each "id='US-'+STUSPS, name=NAME" -filter-fields id,name,name_it -each "if (name_it === name) delete this.properties.name_it" -simplify dp 15% keep-shapes -o precision=0.01 format=geojson us-states.json
npx mapshaper cb_2024_us_county_5m.shp -filter '+STATEFP <= 56' -simplify dp variable interval='ALAND < 5e8 ? 100 : Math.sqrt(ALAND) * 0.035' keep-shapes -each "id='US-'+GEOID, name=NAME, region='US-'+STUSPS" -filter-fields id,name,region -o precision=0.001 format=geojson us-counties.json
```

The counties keep coordinates to 0.001° (about 100 m), and no vertex moves more than its tolerance:
- 100 m for counties with less than 500 km² of land: New York's boroughs, St. Louis, Baltimore, most of Virginia's independent cities;
- 3.5% of the square root of the land area above that: about 1.5 km for a typical 2,000 km² county.

Compared with the unsimplified 1:5m file, at 4 random points inside every county:
- 0.6% of points land in another county and 0.08% in another state;
- in the 58 smallest counties (bounding box under about 500 km²), 0.4%, where the earlier 1:20m file at 0.01° put 26% in the wrong county (Harlem and Bushwick went to Queens).

A point that the simplified coast leaves in the sea snaps to the nearest county within 0.25°, as Venice does in Italy:
- the Bay off Pier 39 goes to San Francisco;
- the sea off Key West goes to Monroe County, even though Natural Earth's 1:50m USA has no Keys.

Along the Canadian border even 1:5m is too coarse for the rivers: Sarnia, Niagara Falls and Fort Erie (Ontario) count as the USA, as they did with the Natural Earth 1:50m border used before.
