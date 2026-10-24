# Progressi

Il contesto condiviso del progetto: stato, decisioni con il loro perché, insidie note e registro delle modifiche. Cosa fa l'app e com'è fatta: [README.md](README.md). Design del prodotto: [docs/prodotto.md](docs/prodotto.md). Le regole per aggiornare questo file sono in [AGENTS.md](AGENTS.md).

Ultimo aggiornamento: 24 ottobre 2026, 17:15. Hackathon: prototipo alle 19:00, consegna alle 19:15, demo dalle 19:20. Scadenza interna del team: 18:30.

## Stato attuale

Tutto il codice è scritto; **nessuna parte è ancora stata provata su Android**, perché la prima compilazione aspetta il computer da 16 GB.

| Pezzo | Stato | Verificato come |
|---|---|---|
| Configurazione Android (permessi galleria e GPS, HTTP verso il computer) | fatto | manifest risolto con `npx expo config --type introspect` |
| Mappa: globo, 4 scale, tocco per segnare, GPS, contatore | fatto | anteprima nel browser a 390×760 nelle 4 scale |
| Miniature delle foto sulla mappa, raggruppate, con anteprima al tocco | fatto | anteprima nel browser: gruppi con numero, separazione allo zoom, tocco → messaggio `photo` |
| Punto → paese, regione, provincia (`locate`) | fatto | `npx tsx scripts/test-locate.ts`: 11 casi, compresi Lido di Venezia, Burano, Nizza |
| Lettura della galleria e schermata Galleria | fatto | solo `npx tsc --noEmit` |
| Gemma 4 E2B sul computer (`litert-lm serve`) | fatto | Mac M3 8 GB: 6–9 s a foto da 384 px, primo avvio 1–2 min |
| Analisi delle foto nell'app, schermata Interessi | fatto | solo `npx tsc --noEmit` |
| Eventi inventati (46), consigli per scala, schermata Per te | fatto | `npx tsx scripts/test-recommend.ts` |
| Galleria dimostrativa inventata (45 foto) | fatto | EXIF riletti per tutte le foto |
| Risposte di Gemma sulle 45 foto demo (riserva) | fatto | col prompt attuale il tema giusto è tra gli interessi in 43 foto su 45, ed è il primo in 41 |
| Copione della demo | fatto | – |
| Prima compilazione e prova sull'emulatore | **da fare** | – |
| Gemma direttamente sul telefono | non fatto | serve un telefono da 8 GB |

## Decisioni e perché

**Piattaforma e demo**
- **Expo in development build, non Expo Go.** Expo Go ha un manifest suo e non carica codice nativo: niente permesso per il GPS delle foto.
- **Expo e non Kotlin nativo** (decisione del team, 16:45). La home era già fatta, e dopo la prima compilazione le modifiche arrivano con un `git pull`. La proposta Kotlin + Redmi (`docs/scelte-e-setup-kotlin.md`, mai su GitHub) non è stata adottata.
- **Demo sull'emulatore del computer da 16 GB, con Gemma sul computer.** Nessun telefono del team ha 6 GB di RAM o più.
- **Tutte le librerie native aggiunte prima della prima compilazione**, così resta l'unica lunga.

**Galleria e luoghi**
- **`ACCESS_MEDIA_LOCATION` attivo** (`isAccessMediaLocationEnabled` in `app.json`): senza, Android toglie il GPS dalle foto. Verificato nel codice di expo-media-library: lo chiede a runtime e legge il file con `MediaStore.setRequireOriginal`.
- **`locate` controlla prima le province italiane**, più precise del confine nazionale. Un punto in mare va alla zona più vicina entro circa 25 km, ma un punto dentro un altro paese non finisce mai in Italia.
- **Regioni e province solo per l'Italia.** Altrove le scale Nazionale e Regionale mostrano il paese; la scala Locale (esagoni H3) funziona ovunque.

**Mappa**
- **MapLibre GL JS dentro una WebView:** ha il globo, colora zone da GeoJSON, e la stessa pagina si prova nel browser.
- **Sfondo Sentinel-2 cloudless 2016 di EOX (CC BY 4.0):** aspetto verde e fisico, licenza aperta. Le versioni dal 2018 in poi sono non commerciali: non usarle.
- **Zone visitate quasi trasparenti con bordo arancione, non visitate sotto un velo chiaro:** il colore pieno sopra il satellite diventava marrone.
- **Miniature come in Foto di iPhone:** gruppi con il numero, che si separano zoomando. Le miniature (160 px, base64) si mandano alla pagina solo quando cambiano.
- **Protocollo app ↔ mappa:** l'app chiama `window.mantide.setState(...)`; la pagina risponde con `ready`, `toggle` (zona toccata), `photo` (foto toccata) ed `error`. I confini entrano una volta sola in `window.__MANTIDE_GEO`.

**Gemma**
- **Gemma 4 E2B, non E4B:** etichettare una foto è classificazione, basta il modello piccolo (2,58 GB).
- **`litert-lm serve` invece di un server nostro:** è il server ufficiale, compatibile con l'API di OpenAI, e accetta immagini in base64.
- **Istruzione semplice, non JSON vincolato:** il `response_format` del server ha dato JSON rotto e interessi sbagliati. L'app tiene il primo blocco `{...}` e solo gli interessi della lista (`parseAnswer`).
- **Una definizione breve per ogni interesse nel prompt:** senza, Gemma metteva i murales sotto "arte" invece che "street-art". Il prompt dell'app e quello di `local-ai/test_photo.py` devono restare uguali.
- **Foto a 384 px:** a 960 px Gemma usava circa 2.400 pezzi d'immagine e ci metteva oltre un minuto.
- **Un campione, non tutta la galleria:** al massimo 3 foto per luogo e giorno, 60 in tutto.
- **Profilo e consigli calcolati dal codice** (`src/events/recommend.ts`): il peso di un interesse è la sua quota tra le foto etichettate; un evento senza interessi in comune non compare.

**Dati inventati e riserve**
- **Galleria demo:** un viaggiatore immaginario di Roncade, appassionato di street art, cibo, montagna, musica e architettura. Foto vere da Wikimedia Commons (CC0, pubblico dominio, CC BY, CC BY-SA) con GPS e date inventati negli EXIF.
- **46 eventi inventati** sulle 4 scale, 3 a H-FARM.
- **Riserve dichiarate a schermo:** `src/demo/demo.json` (generato da `scripts/build-demo.ts`) contiene per ogni foto demo GPS, data e la risposta di Gemma calcolata prima (`local-ai/precompute_demo.py`). L'app lo usa solo se una foto demo arriva senza GPS o se Gemma non risponde, e lo scrive.

## Insidie note

**Android e Expo**
- **Ricompilare:** una modifica a `mobile/app.json`, `mobile/package.json` o al codice nativo richiede `npx expo run:android`; il commit ha `[native: rebuild]` nel titolo.
- **expo-media-library in SDK 58:** le funzioni vecchie (`getAssetsAsync`, `getAssetInfoAsync`…) importate da `expo-media-library` danno errore a runtime: si importano da `expo-media-library/legacy`.
- **react-native-webview 14 con TypeScript 6:** il tipo di default rende le props `never`; usate `WebView<object>` nel `useRef` e nel JSX.
- **React Native 0.88 non ha più `StyleSheet.absoluteFillObject`.**
- **`mobile/scripts/` è escluso dal controllo dei tipi dell'app** (usa i tipi di Node); gli script si lanciano con `npx tsx`.

**Rete e Gemma**
- **Dall'emulatore il computer si chiama `10.0.2.2`**: Gemma è `http://10.0.2.2:9379` (`GEMMA_URL` in `src/ai/gemma.ts`). Su un telefono vero serve l'indirizzo del computer e `litert-lm serve --host 0.0.0.0`.
- **La prima richiesta a Gemma dura 1–2 minuti** (costruisce la cache): fatela prima della demo.
- **Il modello si registra con l'id `gemma4-e2b`:** `litert-lm import models/gemma-4-E2B-it.litertlm gemma4-e2b`.
- **La mappa ha bisogno di internet:** MapLibre, h3-js e le tile arrivano da CDN.

**Dati e repo**
- **WhatsApp cancella il GPS** dalle foto: le foto vere si copiano via cavo o da Google Foto.
- **Foto personali in `demo-photos/`, modelli in `models/`:** cartelle escluse da git.
- **Murales e diritto d'autore:** la licenza della foto non copre l'opera dipinta. Per questo tutte le foto di street art vengono da Lisbona, Berlino e Barcellona (libertà di panorama), anche quelle collocate altrove.
- **Push di file grandi:** git via HTTPS rifiuta invii oltre il limite predefinito. In questo repo è stato alzato con `git config http.postBuffer 157286400`.

## Ambiente e persone

| Chi | Macchina | Ruolo |
|---|---|---|
| Mattia Roncato (con Claude Code) | Mac M3, 8 GB di RAM, senza SDK Android | scrive il codice, verifica tipi, logica, mappa nel browser e Gemma |
| Compagno con 16 GB di RAM | Android Studio e Gemma in download | compila, gira l'emulatore e Gemma, proietta la demo |
| Giorgio Caligiuri (`giorgiocaligiuri`), `shlab-maker` | – | collaboratori del repo |

## Domande aperte

- Nome definitivo dell'app (provvisorio: Mantide, pacchetto `com.mantide.app`).

## Prossimi passi

1. Prima compilazione sull'emulatore: permessi, lettura galleria, analisi, miniature.
2. Prova generale della demo con [docs/demo.md](docs/demo.md) e video di riserva.

## Registro

Dal più recente. Ogni voce: orario, commit, cosa, perché, verifica, cosa resta da provare.

### 17:15 · questo commit · Risposte di Gemma sulle foto demo
- **Cosa:** `demo-data/analyses.json` (le 45 risposte di Gemma col prompt attuale) e `mobile/src/demo/demo.json` rigenerato.
- **Perché:** sono la riserva della demo se Gemma non risponde, e la prova di quanto Gemma riconosce le passioni.
- **Verifica:**
  - Il tema giusto è tra gli interessi in 43 foto su 45, ed è il primo in 41 (col prompt precedente: 42 su 45).
  - Interessi più frequenti: architettura 16, natura 12, street art 10, cibo 9.
  - "Arte" è sceso da 20 a 5.

### 17:10 · a47a56a · Riordino della documentazione, prompt migliorato
- **Cosa:**
  - Ogni informazione in un posto solo:
    - README (inglese) per cosa fa l'app, architettura, cosa è vero e cosa inventato, come si avvia, crediti;
    - `progressi.md` per stato, decisioni e registro;
    - `docs/prodotto.md` (era `docs/piano.md`) per il design, senza più orari e scelte superate;
    - `AGENTS.md` con la mappa del repo;
    - `mobile/AGENTS.md` riscritto per questo progetto (non cita più Expo Router);
    - `docs/setup-android.md` usa la galleria demo.
  - Prompt di Gemma con una definizione per ogni interesse, nell'app e in `local-ai/test_photo.py`.
- **Perché:** il team usa agenti diversi che devono partire dallo stesso contesto, senza copie che si contraddicono. Col vecchio prompt "arte" usciva 20 volte su 45 foto, e i murales finivano lì.
- **Verifica:** 2 dei 3 murales sbagliati ora escono come street art; le foto di cibo di controllo restano giuste.

### 16:56 · d883c78 · Riserva per Gemma in `App.tsx`
- **Cosa:** completa il commit precedente. Se Gemma non risponde, l'app usa le risposte già pronte sulle foto demo e lo dice a schermo.

### 16:55 · 91e2658 · Riserve per la demo e copione
- **Cosa:** `local-ai/precompute_demo.py` e `scripts/build-demo.ts` → `src/demo/demo.json`. Le foto tengono il nome del file, e il GPS di riserva serve per le foto demo senza GPS. Aggiunto `docs/demo.md`.
- **Perché:** la demo dal vivo non deve dipendere dalla rete o dallo scanner dell'emulatore.
- **Verifica:** `npx tsc --noEmit`.

### 16:53 · 7ddc5f4 · Galleria dimostrativa inventata
- **Cosa:** `demo-data/`: 45 foto (8,2 MB, 13 luoghi, 2024-03 → 2026-10), `photos.json`, `CREDITS.md`, lo script che le rigenera, README con i comandi `adb`.
- **Verifica:** EXIF riletti per tutte; Gemma su una foto per tema: 6 su 6 col tema giusto.

### 16:50 · c40d876 · Gemma, interessi, eventi e foto sulla mappa
- **Cosa:** `local-ai/` (istruzioni, `test_photo.py`); `src/ai/gemma.ts`; schermate Interessi e Per te; `src/events/` con 46 eventi, `recommend` e `why`; miniature raggruppate sulla mappa e anteprima della foto.
- **Verifica:** `npx tsc --noEmit`; `test-recommend.ts`; Gemma su una foto di prova in 7,6 s; mappa con miniature nel browser.
- **Da provare:** `parseAnswer` non ha un test automatico, perché `gemma.ts` importa moduli nativi.

### 16:42 · 58bc572 · Lettura della galleria
- **Cosa:** `src/gallery/photos.ts` (permesso, lettura a pagine con GPS, assegnazione ai luoghi, raggruppamento); schermata Galleria; i 12 interessi; i colori.
- **Verifica:** `npx tsc --noEmit`; test di `locate` verdi.

### 16:33 · 6db4757 · Home con mappa a 4 scale
- **Cosa:** `App.tsx`, `src/map/` (pagina MapLibre e WebView), `src/geo/` (`locate` e confini semplificati), `src/state/visited.ts`, script di test e anteprima.
- **Verifica:** `npx tsc --noEmit`; 11 casi di `locate`; anteprima nel browser nelle 4 scale senza errori.

### 16:24 · 863fe48 · Librerie native in più `[native: rebuild]`
- **Cosa:** react-native-safe-area-context, expo-image-manipulator, expo-file-system, prima della prima compilazione.
- **Nota:** questo commit non aveva aggiornato `progressi.md`.

### 16:22 · 3bfa22a · Contesto condiviso per persone e agenti
- **Cosa:** `progressi.md`, `AGENTS.md` e `CLAUDE.md` alla radice.

### 15:42 · 5a0965a · Permessi Android e guida al setup `[native: rebuild]`
- **Cosa:** in `mobile/app.json` il pacchetto `com.mantide.app`, expo-media-library con `isAccessMediaLocationEnabled`, expo-location ed expo-build-properties con `usesCleartextTraffic`. Aggiunti `docs/setup-android.md` e `.gitignore`.
- **Verifica:** il manifest risolto contiene `READ_MEDIA_IMAGES`, `ACCESS_MEDIA_LOCATION`, i permessi GPS e `usesCleartextTraffic=true`.

### 15:37 · b709956 · Scheletro app Expo
- **Cosa:** template Expo SDK 58 TypeScript in `mobile/` con le librerie per galleria, GPS, SQLite, WebView e development build. Tolto il LICENSE MIT del template.

### 15:35 · 5d87747 · Documentazione iniziale
- **Cosa:** README, `docs/piano.md` (oggi `docs/prodotto.md`) e `docs/ricerca.md`.

### 14:51 · 2cae15a · Initial commit (Giorgio Caligiuri)
- **Cosa:** LICENSE Apache-2.0 e README vuoto.
