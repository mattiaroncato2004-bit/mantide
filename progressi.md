# Progressi

Il contesto condiviso del progetto: stato attuale, architettura, decisioni con il loro perché, e un registro di ogni modifica. Chi modifica il repo (persona o agente) lo aggiorna nello stesso commit: le regole sono in [AGENTS.md](AGENTS.md).

Ultimo aggiornamento: 24 ottobre 2026, 17:10.

> **Decisione presa alle 16:45:** si resta su **Expo** (`mobile/`), demo sull'**emulatore** del computer da 16 GB, Gemma sul computer. La proposta Kotlin + Redmi (`docs/scelte-e-setup-kotlin.md`, solo in locale) non è stata adottata.
>
> **Scadenza interna: progetto finito entro le 18:30.** I dati sono inventati: galleria dimostrativa in `demo-data/` ed eventi in `mobile/src/events/` (in preparazione).

## Stato attuale

| Pezzo | Stato | Verificato come |
|---|---|---|
| Documentazione (README, piano, ricerca, setup Android) | fatto | – |
| Scheletro app Expo in `mobile/` | fatto | `npm install` ok |
| Configurazione Android (permessi galleria e GPS, HTTP in chiaro) | fatto | manifest risolto con `npx expo config --type introspect` |
| Prima compilazione Android | **non ancora fatta** | in attesa del computer con Android Studio |
| Home: mappa con 4 scale, tocco per segnare, GPS, contatore, schede | fatto | `npx tsc --noEmit`; mappa provata nel browser a 390×760 nelle 4 scale (`scripts/preview-map.ts`) |
| Assegnazione punto → paese, regione, provincia (`locate`) | fatto | `npx tsx scripts/test-locate.ts`: 11 casi, compresi Lido di Venezia, Burano, Nizza |
| Lettura galleria (data, GPS, luogo) e schermata Galleria | fatto | `npx tsc --noEmit`; da provare sull'emulatore |
| Gemma 4 E2B sul computer (`litert-lm serve`, `local-ai/`) | fatto | su Mac M3 8 GB: 6–8 s a foto da 384 px, primo avvio 1–2 min; JSON pulito |
| Analisi foto con Gemma nell'app, schermata Interessi | fatto | `npx tsc --noEmit`; da provare sull'emulatore |
| Catalogo eventi inventato (46) e consigli per scala, schermata Per te | fatto | `npx tsx scripts/test-recommend.ts` |
| Miniature delle foto sulla mappa, raggruppate, con anteprima al tocco | fatto | anteprima nel browser: gruppi con numero, separazione allo zoom, tocco → messaggio `photo` |
| Riserve per la demo: GPS e risposte di Gemma già pronte per le foto demo (`src/demo/demo.json`) | fatto | `npx tsc --noEmit`; risposte di Gemma in calcolo (`local-ai/precompute_demo.py`) |
| Copione della demo (`docs/demo.md`) | fatto | – |
| Galleria dimostrativa inventata (`demo-data/`, 45 foto) | fatto | EXIF riletti per tutte le 45 foto; Gemma su una foto per tema: 6 su 6 col tema giusto |
| Gemma 4 dentro il telefono o emulatore | opzionale, dopo | – |

## Il progetto in breve

App Android open source (Apache-2.0) per Hacktoberfest @ H-FARM, 24 ottobre 2026. Prototipo funzionante alle 19:00, consegna alle 19:15. Challenge: **02 Best Open-Source AI Project** (DigitalOcean) e **03 Best of Gemma 4** (Google).

La galleria del telefono è il database:

- **Il passato.** Data e GPS di ogni foto ricostruiscono dove sei stato, sulla mappa e su una cronologia.
- **I gusti.** Gemma 4 E2B legge il contenuto delle foto e ricava gli interessi.
- **I consigli.** L'app propone eventi adatti agli interessi, alla scala che stai guardando.

**Le 4 scale:** Globale = paesi, Nazionale = regioni, Regionale = province, Locale = esagoni H3 di circa 0,7 km².

**Un luogo diventa visitato in tre modi:** segnato a mano (come l'app Been), dalla posizione GPS attuale, o da una foto. Il design completo e il perché delle scelte sono in [docs/piano.md](docs/piano.md); il mercato in [docs/ricerca.md](docs/ricerca.md).

## Architettura

```
Telefono / emulatore Android (mobile/, Expo + React Native + TypeScript)
├── Mappa: MapLibre GL JS dentro una WebView, rilievo fisico + zone colorate (GeoJSON)
├── Galleria: expo-media-library → data, GPS, luogo di ogni foto
├── Posizione: expo-location (solo con app aperta)
├── Dati: expo-sqlite, tutto sul dispositivo
└── Analisi foto: client HTTP verso local-ai
        │  miniature delle foto, rete locale (dall'emulatore il computer è 10.0.2.2)
        ▼
Computer dell'utente (local-ai/, da fare)
└── Gemma 4 E2B (.litertlm, 2,58 GB) con LiteRT-LM → JSON di scena e interessi per foto
```

**Parti pianificate:**
- **Modulo Kotlin per Gemma sul telefono** (LiteRT-LM, `com.google.ai.edge.litertlm:litertlm-android`), per i telefoni da 8 GB di RAM in su. L'app sceglie la modalità leggendo la RAM al primo avvio.
- **Eventi:** un dataset JSON curato, cioè simulato, più gli eventi pubblici di h-farm.com.

## Decisioni e perché

- **Development build, non Expo Go.** Expo Go ha un manifest suo e non può caricare codice nativo, quindi niente galleria completa con GPS e niente LiteRT-LM.
- **`ACCESS_MEDIA_LOCATION` attivo** (`isAccessMediaLocationEnabled` in `app.json`). Senza, Android nasconde il GPS delle foto e lo storico non si costruisce.
- **`usesCleartextTraffic: true`.** Android blocca l'HTTP in chiaro, e local-ai parla HTTP in rete locale.
- **Gemma 4 E2B, non E4B.** Peso 2,58 GB e circa 0,7–1,7 GB di RAM di picco (dati Google su S26 Ultra). Etichettare foto è classificazione: basta il modello piccolo.
- **Gemma sul computer nella demo.** Nessun telefono del team ha 6 GB di RAM. È la stessa modalità prevista per i telefoni piccoli: nessun cloud di terzi.
- **Il modulo Gemma nativo arriva dopo la prima compilazione.** Non si può provare su un Mac senza SDK Android, e se non compilasse bloccherebbe la prima build.
- **Mappa in WebView con MapLibre GL JS.** Ha il globo, colora zone da GeoJSON, e la stessa pagina si prova anche nel browser.
- **Rilievo da Natural Earth II**, di pubblico dominio.
- **Il codice calcola profilo e classifica; Gemma scrive solo il perché.** Il risultato resta deterministico e spiegabile.
- **Sfondo della mappa: satellite Sentinel-2 cloudless 2016 di EOX (CC BY 4.0)**, al posto di Natural Earth II: è già servito come tile, ha l'aspetto verde e fisico che piaceva al team, e la licenza è aperta. Le versioni dal 2018 in poi sono non commerciali: non usarle.
- **Zone visitate quasi trasparenti con bordo arancione, non visitate sotto un velo chiaro.** Il colore pieno sopra il satellite diventava marrone; così si vede la terra vera dove sei stato.
- **Regioni e province solo per l'Italia.** Fuori dall'Italia le scale Nazionale e Regionale mostrano il paese; la scala Locale (esagoni H3) funziona ovunque.
- **`locate` controlla prima le province italiane**, più precise del confine nazionale; un punto in mare va alla zona più vicina entro circa 25 km, ma un punto dentro un altro paese non viene mai spostato in Italia.
- **Protocollo app ↔ mappa:** l'app chiama `window.mantide.setState(...)`; la pagina risponde con messaggi `ready`, `toggle` (zona toccata), `photo` (foto toccata) ed `error`. I confini entrano una volta sola in `window.__MANTIDE_GEO` prima del caricamento. Le miniature (160 px, base64) si mandano solo quando cambiano.
- **Galleria dimostrativa inventata:** un viaggiatore immaginario di Roncade appassionato di street art, cibo, montagna, musica e architettura. Foto vere con licenza aperta da Wikimedia Commons (CC0, pubblico dominio, CC BY, CC BY-SA), con GPS e date inventati scritti negli EXIF, e i metadati originali tolti. Rigenerabile con `demo-data/make_demo_photos.py build`.
- **Riserve per la demo, dichiarate a schermo.** `src/demo/demo.json` (generato da `scripts/build-demo.ts`) contiene, per ogni foto demo, GPS e data (gli stessi degli EXIF) e la risposta che Gemma ha dato prima (`local-ai/precompute_demo.py` → `demo-data/analyses.json`). L'app li usa solo se una foto demo arriva senza GPS o se Gemma non risponde, e in quel caso lo scrive.
- **Gemma con un'istruzione semplice, non con il JSON vincolato.** Il `response_format` di `litert-lm serve` ha dato JSON rotto e interessi sbagliati; l'istruzione semplice dà JSON pulito. L'app tiene il primo blocco `{...}` e solo gli interessi della lista (`parseAnswer` in `src/ai/gemma.ts`).
- **Foto a 384 px verso Gemma.** A 960 px Gemma usava circa 2.400 pezzi d'immagine; a 384 px risponde in 6–8 s invece di oltre un minuto.
- **Gemma guarda un campione:** al massimo 3 foto per luogo e giorno, 60 in tutto (`sample`).
- **Profilo e consigli calcolati dal codice** (`profileFromCounts`, `recommend`, `why` in `src/events/recommend.ts`): peso di un interesse = sua quota tra le foto etichettate; un evento senza interessi in comune non compare.

## Ambiente e persone

| Chi | Macchina | Ruolo |
|---|---|---|
| Mattia Roncato (con Claude Code) | Mac M3, 8 GB di RAM, **senza SDK Android né Java** | scrive il codice, verifica tipi, logica e mappa nel browser |
| Compagno con 16 GB di RAM | Android Studio in installazione, sistema operativo da confermare | compila, gira l'emulatore, proietta la demo |
| Giorgio Caligiuri (`giorgiocaligiuri`), `shlab-maker` | – | collaboratori del repo |

Il setup del computer che compila è in [docs/setup-android.md](docs/setup-android.md).

## Insidie note

- **Ricompilare.** Una modifica a `mobile/app.json`, a `mobile/package.json` o a codice nativo richiede `npx expo run:android`; il commit lo segnala con `[native: rebuild]` nel titolo. Per il resto basta `git pull`.
- **WhatsApp cancella il GPS** dalle foto: le foto di prova si copiano via cavo o da Google Foto.
- **Le foto personali stanno in `demo-photos/`** e i modelli in `models/`: entrambe le cartelle sono escluse da git.
- **Dall'emulatore il computer si chiama `10.0.2.2`**, non `localhost`.
- **`mobile/AGENTS.md`** viene dal template Expo e cita Expo Router, che il progetto non usa.
- **expo-media-library in SDK 58:** `getAssetsAsync`, `getAssetInfoAsync` e le altre funzioni vecchie, importate da `expo-media-library`, **danno errore a runtime**. Importatele da `expo-media-library/legacy`.
- **react-native-webview 14 con TypeScript 6:** il tipo di default rende le props `never`. Usate `WebView<object>` sia nel `useRef` sia nel JSX.
- **React Native 0.88 non ha più `StyleSheet.absoluteFillObject`.**
- **`mobile/scripts/` è escluso dal controllo dei tipi dell'app** (usa i tipi di Node). Gli script si lanciano con `npx tsx`.
- **La mappa ha bisogno di internet:** MapLibre, h3-js e le tile arrivano da CDN.
- **Gemma dall'emulatore è `http://10.0.2.2:9379`** (`GEMMA_URL` in `src/ai/gemma.ts`); su un telefono vero serve l'indirizzo del computer e `litert-lm serve --host 0.0.0.0`.
- **La prima richiesta a Gemma dura 1–2 minuti** (costruisce la cache); fatela prima della demo.
- **Murales e diritto d'autore:** la licenza della foto non copre l'opera dipinta. Per questo tutte le foto di street art vengono da Lisbona, Berlino e Barcellona (libertà di panorama), anche quelle collocate a Roma, Napoli, Parigi e Londra.
- **Il modello si registra con l'id `gemma4-e2b`:** `litert-lm import models/gemma-4-E2B-it.litertlm gemma4-e2b`.

## Domande aperte

- Nome definitivo dell'app (provvisorio: Mantide, pacchetto `com.mantide.app`).

## Prossimi passi

1. Prima compilazione sull'emulatore: provare permessi, lettura galleria, analisi, miniature.
2. Prova generale della demo e video di riserva.

## Registro

Dal più recente. Ogni voce: commit, cosa, perché, come è stato verificato.

### 17:10 · questo commit · Riserve per la demo e copione
- **Cosa:**
  - `local-ai/precompute_demo.py`: fa analizzare a Gemma tutte le foto demo.
  - `mobile/scripts/build-demo.ts` → `src/demo/demo.json`.
  - Le foto ora tengono il nome del file; la lettura della galleria usa il GPS di riserva per le foto demo senza GPS; l'analisi usa le risposte già pronte se Gemma non risponde, e lo dice a schermo.
  - `docs/demo.md`: preparazione, giro di 3 minuti, domande probabili, piano B.
- **Perché:** la demo dal vivo non deve dipendere dalla rete o dallo scanner dell'emulatore.
- **Verifica:** `npx tsc --noEmit` pulito. `demo.json` per ora ha le risposte di Gemma per 3 foto; il calcolo delle altre è in corso.
- **Da provare:** tutto sull'emulatore.

### 17:05 · 7ddc5f4 · Galleria dimostrativa inventata
- **Cosa:**
  - `demo-data/`: 45 foto da 1024 px (8,2 MB), 13 luoghi tra Italia ed estero, dal 2024-03 al 2026-10.
  - `photos.json` con luogo, tema, licenza e autore di ogni foto; `CREDITS.md`; lo script che rigenera tutto; il README con i comandi `adb` per caricarle nell'emulatore.
  - README principale: correzioni minori all'architettura.
- **Perché:** la galleria vera non è disponibile per la demo; serve una galleria credibile su cui Gemma possa riconoscere le passioni.
- **Verifica:**
  - EXIF (GPS, date, modello del telefono) riletti per tutte le foto.
  - Gemma su una foto per tema (storia, natura, cibo, architettura, street art, mare): il tema giusto compare sempre, in 6–9 s a foto.
- **Da provare:** che l'emulatore legga GPS e date dopo `adb push`.

### 16:55 · c40d876 · Gemma, interessi, eventi e foto sulla mappa
- **Cosa:**
  - `local-ai/`: istruzioni e `test_photo.py` per Gemma 4 E2B con `litert-lm serve`.
  - `src/ai/gemma.ts`: rimpicciolisce la foto a 384 px, la manda a Gemma, legge il JSON, salva i risultati, sceglie il campione.
  - `src/screens/InterestsScreen.tsx`: interessi con conteggio, barra, 3 foto di prova, eliminabili.
  - `src/events/` (46 eventi inventati, `recommend`, `why`) e `src/screens/ForYouScreen.tsx`.
  - `src/map/thumbs.ts` e la mappa: miniature raggruppate come in Foto di iPhone; il tocco su una foto apre un'anteprima a tutto schermo con luogo, data e cosa ha visto Gemma.
  - README: come avviare tutto e la tabella aggiornata di cosa è vero e cosa è inventato.
- **Perché:** completare il giro galleria → Gemma → interessi → eventi per la demo; le miniature su richiesta del team.
- **Verifica:**
  - `npx tsc --noEmit` pulito.
  - `npx tsx scripts/test-recommend.ts` passato.
  - Gemma su una foto di prova: `{"scene": "Moto contro muro di mattoni", "interests": ["sport", "architettura"]}` in 7,6 s.
  - Mappa con miniature provata nel browser.
- **Da provare:** tutto sull'emulatore. `parseAnswer` non ha un test automatico, perché `gemma.ts` importa moduli nativi.

### 16:45 · 58bc572 · Lettura della galleria
- **Cosa:**
  - `src/gallery/photos.ts`: permesso foto (con richiesta di "Consenti tutte" se l'accesso è parziale); lettura a pagine da 100 con `resolveWithFullInfo` per avere il GPS; ogni foto assegnata a paese, regione e provincia; salvataggio in kv-store; raggruppamento per provincia italiana o paese estero.
  - `src/screens/GalleryScreen.tsx`: pulsante "Leggi la galleria" con avanzamento, gruppi con 4 miniature. Un tocco porta la mappa sul luogo alla scala giusta.
  - Le foto lette segnano i luoghi con fonte `photo` e compaiono come punti sulla mappa (massimo 1500).
  - `src/ai/interests.ts`: i 12 interessi fissi, condivisi da Gemma ed eventi.
  - `src/theme.ts`: colori.
- **Verifica:** `npx tsc --noEmit` pulito; test di `locate` ancora verdi.
- **Da provare:** la lettura vera sull'emulatore (permessi, GPS dagli EXIF).

### 16:40 · questo commit · Home con mappa a 4 scale
- **Cosa:**
  - `mobile/App.tsx`: mappa a schermo intero, intestazione col contatore, selettore delle 4 scale, conferma del tocco, 4 schede (Galleria, Per te, Interessi segnate "In arrivo").
  - `src/map/mapHtml.ts`: la pagina MapLibre (satellite, globo, zone colorate, esagoni H3, punti).
  - `src/map/MapView.tsx`: la WebView che la ospita.
  - `src/geo/locate.ts`: punto → paese, regione, provincia.
  - `src/state/visited.ts`: luoghi visitati con le loro fonti, salvati in SQLite (kv-store).
  - Confini semplificati in `src/geo/` con fonti e licenze nel suo README; script di test e anteprima in `mobile/scripts/`.
- **Perché:** è la base tipo Been e la home del piano.
- **Verifica:**
  - `npx tsc --noEmit` pulito.
  - `npx tsx scripts/test-locate.ts`: 11 casi passati.
  - Anteprima nel browser a 390×760: globo con paesi visitati, Italia per regioni, Veneto per province, esagoni locali con i punti. Nessun errore in console.
- **Da provare:** tutta l'app su Android (non c'è ancora una build); il permesso GPS; il salvataggio dopo un riavvio.

### 16:15 · 863fe48 · Librerie native in più `[native: rebuild]`
- **Cosa:** react-native-safe-area-context, expo-image-manipulator, expo-file-system.
- **Perché:** aggiunte prima della prima compilazione, così resta l'unica lunga. Servono per i margini su Android edge-to-edge, per rimpicciolire le foto prima di Gemma, e per leggere i file.
- **Nota:** questo commit non aveva aggiornato `progressi.md`; la voce è stata aggiunta qui.

### 16:25 · questo commit · Contesto condiviso per persone e agenti
- **Cosa:** aggiunti `progressi.md`, `AGENTS.md` e `CLAUDE.md` alla radice.
- **Perché:** ogni agente usato da chiunque nel team deve partire dallo stesso contesto.
- **Verifica:** nessuna, solo documentazione.

### 15:42 · 5a0965a · Permessi Android e guida al setup `[native: rebuild]`
- **Cosa:** in `mobile/app.json`:
  - pacchetto `com.mantide.app`;
  - expo-media-library con `isAccessMediaLocationEnabled` e solo i permessi foto;
  - expo-location con il permesso d'uso;
  - expo-build-properties con `usesCleartextTraffic`.

  Aggiunti anche `docs/setup-android.md` e il `.gitignore` alla radice.
- **Perché:** fare in modo che la prima compilazione sia l'unica lunga.
- **Verifica:** `npx expo config --type introspect` mostra nel manifest `READ_MEDIA_IMAGES`, `ACCESS_MEDIA_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` e `usesCleartextTraffic=true`.

### 15:37 · b709956 · Scheletro app Expo
- **Cosa:** template Expo SDK 58 TypeScript "blank" in `mobile/` (React Native 0.88, React 19.3), con expo-media-library, expo-location, expo-sqlite, react-native-webview ed expo-dev-client. Rimosso il LICENSE MIT del template, perché il repo è Apache-2.0.
- **Verifica:** `npm install` completato.

### 15:35 · 5d87747 · Documentazione iniziale
- **Cosa:** `README.md` in inglese per giudici e utenti; `docs/piano.md` e `docs/ricerca.md` in italiano per il team.

### 14:51 · 2cae15a · Initial commit (Giorgio Caligiuri)
- **Cosa:** LICENSE Apache-2.0 e README vuoto.
