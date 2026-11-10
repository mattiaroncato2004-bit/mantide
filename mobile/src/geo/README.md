# Boundaries

| File | Content | Source | License |
|---|---|---|---|
| `countries.json` | 242 countries, `id` = Natural Earth `ADM0_A3`, `name` in Italian (English names in `country-names.json`) | [Natural Earth 1:50m admin 0](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `it-regions.json` | 20 Italian regions, `id` = ISTAT region code | [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy), from ISTAT | CC BY 4.0 |
| `it-provinces.json` | 110 Italian provinces, `id` = province abbreviation, `region` = ISTAT region code | same | CC BY 4.0 |
| `world-regions.json` | 4,468 first-level regions of every other country, `id` = Natural Earth `adm1_code`, `name` in Italian when available, `country` = `ADM0_A3`, `group` = the real region for Spain, France, UK, Portugal | [Natural Earth 1:10m admin 1](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `world-groups.json` | The real regions of Spain (19), France (18), UK (16), Portugal (6), dissolved from `world-regions.json` by the Natural Earth `region` field | same | Public domain |
| `country-names.json` | Every country's name in English and Italian (`NAME_EN`, `NAME_IT`) | Natural Earth 1:50m admin 0 | Public domain |
| `region-names-en.json` | English names of the 1,588 regions abroad whose `name` differs ("Lisbona" → "Lisbon") | Natural Earth 1:10m admin 1 (`name_en`) | Public domain |

Simplified with [mapshaper](https://mapshaper.org) to keep the app light (1.7 MB in total):

```sh
npx mapshaper ne_50m_admin_0_countries.geojson -each 'id=ADM0_A3, name=NAME_IT, continent=CONTINENT' -filter-fields id,name,continent -simplify 12% keep-shapes -o precision=0.001 format=geojson countries.json
npx mapshaper limits_IT_regions.geojson -each 'id=reg_istat_code, name=reg_name' -filter-fields id,name -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-regions.json
npx mapshaper ne_10m_admin_1_states_provinces.geojson -filter 'adm0_a3 !== "ITA"' -each 'id=adm1_code, name=(name_it || name), country=adm0_a3' -filter-fields id,name,country -simplify 1.5% keep-shapes -o precision=0.01 format=geojson world-regions.json
# then drop the 18 features left without geometry
# names in English and Italian, from the same two Natural Earth files:
python3 path/to/mobile/scripts/build_place_names.py ne_50m_admin_0_countries.geojson ne_10m_admin_1_states_provinces.geojson
npx mapshaper limits_IT_provinces.geojson -each 'id=prov_acr, name=prov_name, region=reg_istat_code' -filter-fields id,name,region -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-provinces.json
```
