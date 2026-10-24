# Boundaries

| File | Content | Source | License |
|---|---|---|---|
| `countries.json` | 242 countries, `id` = Natural Earth `ADM0_A3`, `name` in Italian | [Natural Earth 1:50m admin 0](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `it-regions.json` | 20 Italian regions, `id` = ISTAT region code | [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy), from ISTAT | CC BY 4.0 |
| `it-provinces.json` | 110 Italian provinces, `id` = province abbreviation, `region` = ISTAT region code | same | CC BY 4.0 |

Simplified with [mapshaper](https://mapshaper.org) to keep the app light (430 KB in total):

```sh
npx mapshaper ne_50m_admin_0_countries.geojson -each 'id=ADM0_A3, name=NAME_IT, continent=CONTINENT' -filter-fields id,name,continent -simplify 12% keep-shapes -o precision=0.001 format=geojson countries.json
npx mapshaper limits_IT_regions.geojson -each 'id=reg_istat_code, name=reg_name' -filter-fields id,name -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-regions.json
npx mapshaper limits_IT_provinces.geojson -each 'id=prov_acr, name=prov_name, region=reg_istat_code' -filter-fields id,name,region -simplify 4% keep-shapes -o precision=0.0005 format=geojson it-provinces.json
```
