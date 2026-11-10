# Free event sources: research, 10 November 2026

Done for the Mantide 1.0 design. **[V]** = verified with a keyless query on that date, **[D]** = read in the provider's docs, **[I]** = inferred, not checked. Re-verify before building: event APIs change often.

No single free source covers Italy and Mantide's interest categories. The open-data sources with real volume are per city or region; the only free global API (Ticketmaster) is ticketed events only and needs a key.

## Sources

| Source | Free terms / key | Geo + date query | Fields | Coverage evidence | Licence | CORS |
|---|---|---|---|---|---|---|
| OpenEventDatabase (OEDB) | Keyless, volunteer-run, no SLA [V] | `near=lon,lat,meters` + `when=` / `start`,`stop` [V] | title, start/stop, lat/lon, address, description, url; category mostly `culture.other`; image on ~5% [V] | 25 km, next month: Paris 3344, Barcelona 1297, Lisbon 147, Berlin 19, London 1; Venice, Treviso, Milan, Rome, Bolzano 0 [V] | Code AGPL; data licence follows each record's source [I] | `*` [V] |
| Ticketmaster Discovery API | Free key, 5000 calls/day, 5 req/s [D]; key must be user-supplied in an open-source app | `geoPoint` + `radius` + `startDateTime` [D] | Rich: images, segment/genre, venue lat/lon, url [D] | US, CA, MX, AU, NZ, UK, IE, other European countries [D]; Italy likely thin (TicketOne dominates) [I] | Proprietary; no revenue from use; "reasonable" caching; remove content within 24 h on request [D] | `*` in doc samples [D] |
| Open Data Hub Südtirol | Keyless, 10 req/s anonymous [V] | lat/lon/radius + begin/end [V] | multilingual title, dates, GPS, address, url; no images when anonymous [V] | 951 events within 30 km of Bolzano, next 2 months [V] | CC0 per record [V] | yes [V] |
| Bologna agenda (OpenDataSoft) | Keyless | `where=` filters; `within_distance` [I] | title, description, 3 category levels, coordinates, url | 434 events in next 2 months [V] | CC BY 4.0 [V] | `*` [V] |
| Firenze (FeelFlorence GeoJSON) | Keyless, daily file | none (fetch file) | title, description, dates, point | 111 events, next 30 days [V] | CC BY 4.0 [V] | `*` on the datigis URL only [V] |
| Emilia-Romagna tourism | Keyless | none | dates, lat/lng, tags/theme, url | 105 curated events [V] | CC BY 4.0 [D] | `*` [V] |
| Ministry of Culture events (SPARQL) | Keyless | SPARQL | name, description, type, image; venue address | 145 running events nationwide [V] | not verified [I] | `*` [V] |
| Puglia DMS | Keyless | none (35 MB JSON) | type, image; few coordinates | 122 events in next 2 months [V] | CC BY 4.0 [V] | `*` [V] |
| Paris "Que faire" | Keyless | `within_distance` + date [V] | rich, cover image | 2624 within 5 km, upcoming [V] | ODbL, share-alike [V] | `*` [V] |
| Madrid agenda | Keyless | none (100-day file) | type, dates, price, link | 1272 events [V] | not checked [I] | `*` [V] |
| Berlin kulturdaten | Keyless | date filter; coordinates need a second call | dates, location reference | totalCount 6330 for a date query (filter not confirmed) [V] | not checked [I] | `*` [V] |
| DATAtourisme (France) | Free key by form, 1000 req/h per key [D] | `geo_distance` + filters [D] | full tourism model | France | Licence Ouverte; credit source and update date [D] | `*` [V] |
| Wikidata | Keyless | SPARQL | sparse | 0 upcoming within 50 km of Venice or Milan; Paris 3, London 4 [V] | CC0 | `*` [V] |
| Skiddle | Free key, non-commercial only [D] | lat/lon/radius [I] | good | UK | proprietary | `*` [V] |
| SeatGeek | client_id; 100/min [V] | lat/lon/range | good | US and Canada [I] | proprietary | `*` [V] |

**Not usable:** Eventbrite (search shut down 12 Dec 2019) [D]; Meetup (API needs Meetup Pro) [D]; Bandsintown (artists and their agents only) [D]; PredictHQ (trial only) [D]; OpenAgenda (search per agenda, mostly French) [D]; Resident Advisor (no public API found) [I]; OpenStreetMap (no events, but good for places) [I]. No live event feeds found for Veneto, Venice, Treviso, Milan, Rome on dati.gov.it [V].

## Caveats for an app with no backend

- A key shipped in the APK or web bundle is public: Ticketmaster's quota would be shared and the key could be revoked. User-supplied keys only.
- Credit every source in the app. ODbL (Paris) is share-alike if a cached database is redistributed. OEDB records inherit their original source's terms; some come from Ticketmaster and are not open.
- Categories are weak and descriptions are in IT/FR/ES/PT/DE: classify title and description per interest (Gemma, keyword fallback).
- Images often missing: placeholders.
- Long exhibitions: query by date overlap, not start date.
- Cache results, fail soft (OEDB has no SLA). Keyless sources rate-limit per device IP, which suits phones.

## Docs consulted

OEDB: api.openeventdatabase.org/event, wiki.openstreetmap.org/wiki/OpenEventDatabase · Ticketmaster: developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/ and /support/terms-of-use/ · predicthq.com/pricing · eventbrite.com/platform/api · meetup.com/api/guide/ · help.artists.bandsintown.com/en/articles/3372745 · skiddle.com/api/ · developer.seatgeek.com · api.datatourisme.fr/v1/docs · developers.openagenda.com/authentification/ · tourism.api.opendatahub.com/v1/Event · emiliaromagnaturismo.it/opendata/v1/events · opendata.comune.bologna.it (eventi-bologna-agenda-cultura) · datigis.comune.fi.it/resources/open-data/eventi-a-firenze/feelflorence_eventi.geojson · osservatorio.dms.puglia.it/opendata/puglia_eventi_attivita/ · dati.cultura.gov.it/sparql · opendata.paris.fr (que-faire-a-paris-) · datos.madrid.es (206974-0-agenda-eventos-culturales-100) · api-v2.kulturdaten.berlin/api/docs/ · query.wikidata.org/sparql · dati.gov.it CKAN API.
