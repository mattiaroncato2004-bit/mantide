# Ricerca: mercato e interfacce

Raccolta il 24 ottobre 2026. Prezzi da App Store e store listing: variano per paese.

## Competitor

| App | Granularità | Come traccia | Prezzo |
|---|---|---|---|
| [Visited](https://apps.apple.com/us/app/id846983349) | paesi, regioni, città, liste | a mano | Pro ~$12.99, città $7.99–9.99, regioni $3.99 |
| [been](https://apps.apple.com/us/app/id680148327) | paesi, regioni | a mano | Premium $19.99/anno |
| [NomadMania](https://apps.apple.com/us/app/id6502843543) | 1.381 regioni, classifiche | a mano | Premium in abbonamento |
| [Polarsteps](https://apps.apple.com/us/app/id947925763) | viaggi e percorsi | GPS automatico | Plus €8.99/mese o €29.99/anno |
| [Fog of World](https://apps.apple.com/us/app/id505367096) | nebbia a livello di strada | GPS automatico | $30 una tantum |
| [Skratch](https://apps.apple.com/us/app/id1457438876) | paesi, città, attrazioni | dalle foto | gratis + Premium + eSIM |
| [Pin Traveler](https://apps.apple.com/us/app/id1335839375) | pin, paesi, statistiche | scanner delle foto ("Your camera roll knows where you've been") | gratis + abbonamento |
| [Where was I?](https://apps.apple.com/us/app/id6758056060) | visite giornaliere | automatico, dati sul telefono | gratis + in-app |
| [Stampie](https://apps.apple.com/us/app/id6752670353) | timbri per paese | a mano | Pro $19.99 una tantum |
| [Travelog](https://apps.apple.com/us/app/id6760092556) | landmark, achievement | diario AI dalle foto, "travel DNA" da quiz | gratis + in-app |
| [Mindtrip](https://apps.apple.com/us/app/id6503107567) | consigli in base a dove sei | chip di interessi scelte a mano | gratis |
| [corner](https://apps.apple.com/us/app/id1668282277) | posti degli amici | import da Instagram e TikTok | gratis |
| [Beli](https://apps.apple.com/us/app/id1478375386) | ristoranti: Been / Want to try / Recs | a mano | gratis |

## Cosa manca sul mercato

- **Foto → mappa esiste già** (Pin Traveler, Skratch). Lo storico da EXIF da solo non basta.
- **Gli interessi li dichiari tu** (Mindtrip, chip a mano) o escono da un quiz (Travelog). Nessuno guarda cosa fotografi davvero.
- **Il pezzo nuovo:** dedurre gusti e luoghi dal contenuto della galleria, cosa accettabile solo se le foto restano su hardware tuo. Con Gemma 4 in locale si può.

## Pattern di interfaccia da riusare

| Pattern | Dove si vede | Per noi |
|---|---|---|
| Numero grande in percentuale | been, Visited | Contatore in home |
| Drill-down paese → regione → città | Skratch, NomadMania | Le 4 scale |
| Nebbia / tile esagonali | Fog of World, Stomped | Scala locale con esagoni H3 |
| Linea cronologica tra i punti | Polarsteps | Cronologia dalle foto |
| Calendario / heatmap dei giorni | Where was I?, Day One | Galleria per data |
| Been / Want to try | Beli, Visited | Storico e consigli come due stati dello stesso posto |
| Chip di interessi | Mindtrip | Interessi dedotti dalle foto, con il perché |
| Mappa + scheda dal basso | Google Maps, Tripadvisor | Scheda luogo |

## Altre fonti utili

- [UN System Data Commons](https://blog.google/innovation-and-ai/technology/ai/google-un-data-commons-platform/): statistiche per luogo, open source, interrogabili via MCP.
- [Google Maps Timeline cancellata a parte degli utenti (2025)](https://www.gsmarena.com/google_has_inadvertently_deleted_some_peoples_maps_timelines-news-67095.php): la storia degli spostamenti è fragile.
- [Gemma 4 su LiteRT-LM](https://developers.google.com/edge/litert-lm/models/gemma-4) e [LiteRT-LM su Android](https://developers.google.com/edge/litert-lm/android).
- [Android: accesso ai media e ACCESS_MEDIA_LOCATION](https://developer.android.com/training/data-storage/shared/media).
