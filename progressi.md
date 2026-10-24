# Progressi

Il contesto condiviso del progetto: stato attuale, architettura, decisioni con il loro perché, e un registro di ogni modifica. Chi modifica il repo (persona o agente) lo aggiorna nello stesso commit: le regole sono in [AGENTS.md](AGENTS.md).

Ultimo aggiornamento: 24 ottobre 2026, 16:40.

> **Decisione aperta: Expo o Kotlin nativo.** In locale è comparso `docs/scelte-e-setup-kotlin.md` (non ancora su GitHub): propone Kotlin + Jetpack Compose e un Redmi da 8 GB di RAM con Gemma sul telefono, al posto di Expo + emulatore. Finché il team non conferma, `mobile/` resta il progetto. La pagina della mappa (`mobile/src/map/mapHtml.ts`) e i confini (`mobile/src/geo/`) funzionano uguale in una WebView Android nativa.

## Stato attuale

| Pezzo | Stato | Verificato come |
|---|---|---|
| Documentazione (README, piano, ricerca, setup Android) | fatto | – |
| Scheletro app Expo in `mobile/` | fatto | `npm install` ok |
| Configurazione Android (permessi galleria e GPS, HTTP in chiaro) | fatto | manifest risolto con `npx expo config --type introspect` |
| Prima compilazione Android | **non ancora fatta** | in attesa del computer con Android Studio |
| Home: mappa con 4 scale, tocco per segnare, GPS, contatore, schede | fatto | `npx tsc --noEmit`; mappa provata nel browser a 390×760 nelle 4 scale (`scripts/preview-map.ts`) |
| Assegnazione punto → paese, regione, provincia (`locate`) | fatto | `npx tsx scripts/test-locate.ts`: 11 casi, compresi Lido di Venezia, Burano, Nizza |
| Lettura galleria (data, GPS, luogo) | da fare | – |
| Gemma 4 sul computer (`local-ai/`) | da fare | – |
| Interessi e consigli di eventi | da fare | – |
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
- **Protocollo app ↔ mappa:** l'app chiama `window.mantide.setState(...)`; la pagina risponde con messaggi `ready`, `toggle` (zona toccata) ed `error`. I confini entrano una volta sola in `window.__MANTIDE_GEO` prima del caricamento.

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

## Domande aperte

- **Expo o Kotlin nativo** (vedi il riquadro in cima).
- Demo su emulatore (computer da 16 GB) o sul Redmi da 8 GB.
- Nome definitivo dell'app (provvisorio: Mantide, pacchetto `com.mantide.app`).

## Prossimi passi

1. Lettura galleria: data e GPS di ogni foto, assegnazione a paese, regione, provincia ed esagono; schermata Galleria.
2. Gemma 4 E2B: sul telefono se si conferma il Redmi da 8 GB, altrimenti `local-ai/` sul computer. Prompt che restituisce JSON.
3. Schermate Interessi e Per te.

## Registro

Dal più recente. Ogni voce: commit, cosa, perché, come è stato verificato.

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
