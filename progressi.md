# Progressi

Il contesto condiviso del progetto: stato, decisioni con il loro perché, insidie note e registro delle modifiche. Cosa fa l'app e com'è fatta: [README.md](README.md). Design del prodotto: [docs/prodotto.md](docs/prodotto.md). Le regole per aggiornare questo file sono in [AGENTS.md](AGENTS.md).

Ultimo aggiornamento: 24 ottobre 2026, 18:55. Hackathon: prototipo alle 19:00, consegna alle 19:15, demo dalle 19:20. Scadenza interna del team: 18:30.

## Stato attuale

**La stessa app gira nel browser** (`npx expo start --web`) ed è stata provata lì da capo a fondo: mappa con paesi, regioni e miniature, galleria demo, Gemma vera che analizza dal browser. Tutto il codice è scritto; **nessuna parte è ancora stata provata su Android**, perché la prima compilazione aspetta il computer da 16 GB. Quello che si può verificare senza Android passa: il pacchetto JavaScript per Android si costruisce (`npx expo export --platform android`, 699 moduli), `npx expo-doctor` supera 20 controlli su 20, e `scripts/simulate-demo.ts` fa girare tutta la logica della demo sui dati demo.

| Pezzo | Stato | Verificato come |
|---|---|---|
| Configurazione Android (permessi galleria e GPS, HTTP verso il computer) | fatto | manifest risolto con `npx expo config --type introspect` |
| Una sola schermata: mappa con benvenuto al primo avvio, galleria e Gemma automatici, intestazione con l'avanzamento | fatto | browser a 390×844: benvenuto, lettura galleria, scala Locale con eventi |
| Scala Locale: niente esagoni, eventi per te come puntini e pannello "Per te qui" con interessi | fatto | browser: "Per te qui · Treviso", primo evento H-FARM Open Campus, zoom 9 su te e gli eventi |
| Linea del tempo: cursore da trascinare, ▶ per riprodurre, mappa fino alla data scelta, linea arancione e punta animata del viaggio | fatto | browser: riproduzione da "foto 1" a "foto 45 di 45", linee tra Italia, Lisbona, Berlino, Barcellona, Parigi, Londra |
| Ridisegno con taste-skill v2 e ui-ux-pro-max: Bricolage Grotesque + IBM Plex Mono, pannelli d'inchiostro con filetti, un solo accento arancione | fatto | browser: tutte le schermate a 390×844 |
| Passaporto: livello, paesi e % delle terre emerse, continenti, regioni e province del paese in cui sei, regioni per paese | fatto | `npx tsx scripts/test-passport.ts`: demo → 6/234 paesi, 1,3% terre emerse, Viaggiatore (mancano 4 a Esploratore), Italia 6/20 regioni e 8/110 province |
| Regioni di tutti i paesi (Natural Earth admin-1) alle scale Nazionale e Regionale | fatto | `test-locate.ts`: Pechino → regione cinese, Lisbona → regione portoghese; `check-visited.ts`: in tutti i 6 paesi con foto ogni regione e provincia visitata è tra le zone disegnate; browser: Île-de-France, Berlino, Lisbona, Cataluña, Greater London accese a Nazionale |
| Mappa: globo, 4 scale, tocco per segnare, GPS, contatore | fatto | anteprima nel browser a 390×760 nelle 4 scale |
| Scheda luogo: tocco su una zona → come è stata visitata, foto, eventi lì, pulsante per segnarla | fatto | `npx tsc --noEmit`; `scripts/simulate-demo.ts` (Veneto: 15 foto, primo evento H-FARM Open Campus) |
| Linee dei viaggi: le foto unite in ordine cronologico | fatto | anteprima nel browser: linea tratteggiata tra le foto di Venezia |
| Miniature delle foto sulla mappa, raggruppate, con anteprima al tocco | fatto | anteprima nel browser: gruppi con numero, separazione allo zoom, tocco → messaggio `photo` |
| Punto → paese, regione, provincia (`locate`) | fatto | `npx tsx scripts/test-locate.ts`: 11 casi, compresi Lido di Venezia, Burano, Nizza |
| Lettura della galleria e schermata Galleria | fatto | solo `npx tsc --noEmit` |
| Gemma 4 E2B sul computer (`litert-lm serve`) | fatto | Mac M3 8 GB: 6–9 s a foto da 384 px, primo avvio 1–2 min |
| Analisi delle foto nell'app (ora automatica, senza schermata Interessi) | fatto | `npx tsx scripts/test-parse.ts` (lettura delle risposte, 6 casi); il resto solo `npx tsc --noEmit` |
| Eventi inventati (46) e consigli (ora nella scala Locale e nella scheda luogo, senza schermata Per te) | fatto | `npx tsx scripts/test-recommend.ts` |
| Galleria dimostrativa inventata (45 foto) | fatto | EXIF riletti per tutte le foto |
| Risposte di Gemma sulle 45 foto demo (riserva) | fatto | col prompt attuale il tema giusto è tra gli interessi in 43 foto su 45, ed è il primo in 41 |
| Copione della demo | fatto | schermate attese prese da `scripts/simulate-demo.ts`: 6 paesi · 6/20 regioni · 8/110 province; interessi in testa architettura 16, natura 12, street art 10; Per te Globale → Berlino, Locale → H-FARM Open Campus |
| Versione browser della stessa app (demo con schermate e tasti) | fatto | provata in Playwright a 390×844, tutte le schermate: Galleria 45 foto in 13 luoghi; mappa "6 paesi · 6/20 regioni · 8/110 province" con miniature; Interessi con Gemma dal vivo su 44 foto, zero errori (architettura 14, natura 11, street art 9, cibo 9); Per te Globale → Berlino; scheda Veneto (15 foto, H-FARM Open Campus); anteprima della foto |
| Prima compilazione e prova sull'emulatore | **non fatta per la demo** | il wifi instabile dell'evento non ha permesso di scaricare Gemma 4 sul computer dell'emulatore: la demo usa la versione browser con Gemma sul Mac (lo dice anche il pitch) |
| Gemma direttamente sul telefono | non fatto | serve un telefono da 8 GB |

## Decisioni e perché

**Piattaforma e demo**
- **Expo in development build, non Expo Go.** Expo Go ha un manifest suo e non carica codice nativo: niente permesso per il GPS delle foto.
- **Expo e non Kotlin nativo** (decisione del team, 16:45). La home era già fatta, e dopo la prima compilazione le modifiche arrivano con un `git pull`. La proposta Kotlin + Redmi (`docs/scelte-e-setup-kotlin.md`, mai su GitHub) non è stata adottata.
- **Demo sull'emulatore del computer da 16 GB, con Gemma sul computer.** Nessun telefono del team ha 6 GB di RAM o più.
- **Tutte le librerie native aggiunte prima della prima compilazione**, così resta l'unica lunga. L'ultima è expo-device (17:20).
- **L'app dice dove gira Gemma in base alla RAM** (`whereGemmaRuns` in `src/ai/gemma.ts`, mostrato in Interessi): sotto 8 GB sul computer dell'utente, da 8 GB in su potrebbe girare sul telefono. È la risposta a "Who does it leave out?".

**Galleria e luoghi**
- **`ACCESS_MEDIA_LOCATION` attivo** (`isAccessMediaLocationEnabled` in `app.json`): senza, Android toglie il GPS dalle foto. Verificato nel codice di expo-media-library: lo chiede a runtime e legge il file con `MediaStore.setRequireOriginal`.
- **`locate` controlla prima le province italiane**, più precise del confine nazionale. Un punto in mare va alla zona più vicina entro circa 25 km, ma un punto dentro un altro paese non finisce mai in Italia.
- **Le scale seguono dove sei** (richiesta del team, 17:45). Italia: regioni e province ISTAT. Altrove: le regioni di primo livello di Natural Earth (`world-regions.json`, 4.468 regioni, 1,3 MB); la scala Regionale mostra la tua regione. In Cina, la Nazionale mostra le regioni cinesi.
- **Una sola schermata, niente schede** (richiesta del team, 17:40). Galleria, Interessi e Per te sono stati tolti:
  - al primo avvio il benvenuto chiede la galleria, con l'opzione per escluderla; il titolo riassume il prodotto (dove sei stato, cosa ami, cosa fare vicino a te), poi Gemma 4 e privacy in un riquadro, una riga ciascuno (feedback del team, 19:00–19:06);
  - lettura e analisi partono da sole e si vedono nell'intestazione;
  - gli interessi e gli eventi vivono nella scala Locale (pannello "Per te qui") e nella scheda di ogni luogo.
- **Niente esagoni alla scala Locale:** erano utili al codice ma brutti da vedere (feedback del team). Tolti anche h3-js e il livello `hex`.

**Mappa**
- **MapLibre GL JS dentro una WebView:** ha il globo, colora zone da GeoJSON, e la stessa pagina si prova nel browser.
- **Sfondo Sentinel-2 cloudless 2016 di EOX (CC BY 4.0):** aspetto verde e fisico, licenza aperta. Le versioni dal 2018 in poi sono non commerciali: non usarle.
- **Zone visitate quasi trasparenti con bordo arancione, non visitate sotto un velo chiaro:** il colore pieno sopra il satellite diventava marrone.
- **Eventi alla scala Locale come puntini arancioni** (`events` nella pagina della mappa): il tocco manda `{type: 'event', id}` e la scheda di quell'evento passa in testa al pannello. L'inquadratura comprende te e gli eventi, sopra il pannello.
- **Toccare una scheda evento la mostra sulla mappa** (feedback del team, 18:35): l'app manda `selectedEvent` alla pagina, che ingrandisce quel puntino e ci si centra a zoom 12 nella parte di mappa libera tra intestazione e pannello. Anche il tocco sul puntino passa per `selectedEvent`, quindi i due gesti fanno la stessa cosa.
- **Linee dei viaggi** (`tripLines` in `src/map/mapHtml.ts`): le foto ordinate per data; più di 4 giorni senza foto chiudono un viaggio e ne aprono un altro. È l'idea "unire i luoghi in ordine cronologico" dei metadati.
- **Miniature come in Foto di iPhone:** gruppi con il numero, che si separano zoomando. Le miniature (160 px, base64) si mandano alla pagina solo quando cambiano.
- **Miniatura con numero → tutte le sue foto** (feedback del team, 18:52): il tocco manda `{type: 'photos', ids}` (le foglie del gruppo, `getClusterLeaves`) e si apre `PhotoGroup`, griglia dalla più vecchia; ogni foto si apre a schermo intero. Prima il tocco zoomava sul gruppo.
- **Galleria all'estrema destra, separata dagli strumenti della mappa** (feedback del team, 18:53): apre "La tua galleria" con tutte le foto. Se la galleria non è collegata mostra il consenso ("Usa la mia galleria"); se lo è, il link per smettere. Il benvenuto non si riapre più da lì.
- **Scala Locale: "Sei qui" e cerchi di distanza** (feedback del team, 18:50): un pallino blu con alone, sopra foto ed eventi, nel punto da cui l'app misura le distanze (il centro della scala; senza GPS è H-FARM). Fino a 3 cerchi tratteggiati a distanze tonde (1, 2, 5, 10, 20, 50, 100 km) fino all'evento più lontano, con l'etichetta a nord-est. Blu perché è il colore della posizione in ogni app di mappe, e l'arancione è già di visitati ed eventi.
- **Miniature a puntina** (18:30): la miniatura sta sopra il punto, con una punta bianca che lo indica. Centrata sul punto copriva le regioni piccole visitate (Greater London, Berlino), che sembravano spente.
- **Regioni vere di Spagna, Francia, Regno Unito e Portogallo** (feedback del team, 18:16): Natural Earth admin-1 per questi paesi sono province, dipartimenti e contee. `world-groups.json` le raggruppa per il campo `region` (Spagna 19: 17 comunità autonome + Ceuta e Melilla; Francia 18; Regno Unito 16; Portogallo 6); ogni unità in `world-regions.json` ha `group`. Come per l'Italia: Nazionale = regioni, Regionale = province o dipartimenti della regione. Toccando un paese, Regionale va sulla regione dove hai più foto. Dati salvati portati a `visited:v2` e `photos:v2`, con rilettura automatica della galleria.
- **Regioni visitate ben visibili:** tinta arancione al 35% e bordo da 2,6 px. Prima erano quasi trasparenti e una regione piccola non si notava.
- **Intestazione su una riga** (feedback del team, 18:20): paesi, regioni, province e livello su tutta la larghezza, fondo pieno; il pulsante Galleria è passato in basso accanto a "Linea del tempo" e "Torna qui". L'app misura l'altezza dell'intestazione e la manda alla mappa (`chromeTop`), che ci mette sotto il pulsante dei crediti.
- **Toccare un luogo scende di una scala** (feedback del team, 19:08): un paese a Globale porta a Nazionale, una regione a Nazionale (il Lazio) porta a Regionale con le sue province; la scheda del luogo resta aperta. Le province restano a Regionale: Locale non ha zone.
- **Le scale seguono il luogo che tocchi** (feedback del team, 18:05): toccando la Francia a Globale, Nazionale mostra le regioni francesi; il pulsante "◎ Torna dove sei" riporta alla posizione GPS (o a H-FARM senza GPS). Il centro di un luogo è il centro del suo pezzo più grande (`centerOf` in `locate.ts`), e Nazionale inquadra solo le regioni entro 20° da lì: altrimenti la Guyana francese fa allontanare la mappa su tutto il mondo. Restano fuori anche le isole a più di 3° da ogni altra regione (Canarie, Azzorre), salvo quella più vicina a te; l'inquadratura lascia spazio all'intestazione (`chromeTop`) e ai pulsanti in basso.
- **Linea del tempo** (richiesta del team, 17:51): cursore costruito su PanResponder (niente libreria nativa, funziona anche nel browser). La pagina della mappa riceve `timeline: {until}`, mostra solo le foto fino a lì, disegna la linea `journey` e anima la punta (`.tl-head`, marker HTML sopra le miniature) dal posto precedente al nuovo in 0,4 s, con la mappa che la segue. Riproduzione: una foto ogni 0,5 s (circa 20 s per 45 foto). Sulla linea niente data in testata: un trattino per foto, un trattino lungo con "mese 'aa" a ogni inizio viaggio (più di 4 giorni dalla foto precedente), arancioni quando superati. Mentre è aperta, pannello Locale e scheda luogo restano chiusi.
- **Ridisegno "strumento da rilievo"** (richiesta del team, 17:46, con le skill taste-skill v2 `design-taste-frontend` e `ui-ux-pro-max`): token in `src/theme.ts` (colori `C`, font `F`, raggi `R` 6/10/18, spaziature `S` su griglia di 4); Bricolage Grotesque per titoli e luoghi, IBM Plex Mono per numeri, date e distanze; la scala attiva è bianco carta, l'arancione resta per "visitato" e le azioni principali.
- **Passaporto per gli amanti del viaggio** (richiesta del team, 17:48): si apre toccando il contatore. Ogni numero ha accanto quanto manca. Livelli per numero di paesi: Turista 0, Viaggiatore 3, Esploratore 10, Giramondo 25, Leggenda 50. I paesi contati sono 234 (Natural Earth senza le 8 isole in "mare aperto"); la superficie è stimata da `locate.ts` su proiezione equirettangolare (Italia ≈ 300.000 km², verificato nel test).
- **Contatore senza totali** ("6 paesi · 6 regioni · 8 province"): con le regioni del mondo "x/20" non ha più senso, e la riga stava su due righe.
- **Toccare una zona apre la scheda del luogo, non segna subito:** prima vedi come è stata visitata, le foto e gli eventi lì, poi decidi se segnarla. Gli eventi di un luogo usano `recommendIn`, che condivide il punteggio con `recommend`.
- **Protocollo app ↔ mappa:** l'app chiama `window.mantide.setState(...)`; la pagina risponde con `ready`, `toggle` (zona toccata), `photo` (foto toccata), `event` (evento toccato) ed `error`.
- **Confini scritti dentro la pagina** (`withGeo` in `src/map/mapHtml.ts`), non iniettati con `injectedJavaScriptBeforeContentLoaded`: su Android quella funzione dipende dalla versione della WebView di sistema, e se parte in ritardo la mappa resta senza zone.

**Gemma**
- **Gemma 4 E2B, non E4B:** etichettare una foto è classificazione, basta il modello piccolo (2,58 GB).
- **`litert-lm serve` invece di un server nostro:** è il server ufficiale, compatibile con l'API di OpenAI, e accetta immagini in base64.
- **Istruzione semplice, non JSON vincolato:** il `response_format` del server ha dato JSON rotto e interessi sbagliati. L'app tiene il primo blocco `{...}` e solo gli interessi della lista (`parseAnswer`).
- **Una definizione breve per ogni interesse nel prompt:** senza, Gemma metteva i murales sotto "arte" invece che "street-art". Il prompt dell'app e quello di `local-ai/test_photo.py` devono restare uguali.
- **Foto a 384 px:** a 960 px Gemma usava circa 2.400 pezzi d'immagine e ci metteva oltre un minuto.
- **Un campione, non tutta la galleria:** al massimo 3 foto per luogo e giorno, 60 in tutto.
- **Profilo e consigli calcolati dal codice** (`src/events/recommend.ts`): il peso di un interesse è la sua quota tra le foto etichettate; un evento senza interessi in comune non compare.

**Versione browser**
- **La stessa app nel browser, non un mockup:** i pezzi che dipendono dal telefono hanno un gemello `.web.ts(x)` accanto (archivio, galleria, rimpicciolimento foto, miniature, mappa); Metro sceglie da solo. Sul web la galleria è quella demo, con le foto caricate da Wikimedia (che permette la lettura cross-origin), e Gemma si chiama su `127.0.0.1:9379`.
- **La mappa nel browser è un iframe con indirizzo `blob:`**, non `srcDoc`: una pagina srcdoc ha origine "null" e MapLibre non finisce mai di caricare le sorgenti GeoJSON.

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
- **Versione browser:** Gemma va avviato con `--cors-origin http://localhost:8081`, altrimenti il browser blocca le chiamate. Nel browser Gemma è più lenta (circa 11 s a foto su Mac M3 8 GB, che fa girare anche il server dell'app).
- **I conteggi degli interessi cambiano di poco tra un'analisi e l'altra** (es. architettura 16 nelle risposte preparate, 14 dal vivo nel browser): il copione dà numeri indicativi.
- **`CI=1 npx expo start` non ricarica i file modificati:** per lavorare sulla versione web avviatelo senza `CI=1`.
- **Dall'emulatore il computer si chiama `10.0.2.2`**: Gemma è `http://10.0.2.2:9379` (`GEMMA_URL` in `src/ai/gemma.ts`). Su un telefono vero serve l'indirizzo del computer e `litert-lm serve --host 0.0.0.0`.
- **La prima richiesta a Gemma dura 1–2 minuti** (costruisce la cache): fatela prima della demo.
- **Il modello si registra con l'id `gemma4-e2b`:** `litert-lm import models/gemma-4-E2B-it.litertlm gemma4-e2b`.
- **La mappa ha bisogno di internet:** MapLibre, h3-js e le tile arrivano da CDN.

**Dati e repo**
- **I font (expo-font) hanno aggiunto un plugin in `app.json`:** chi aveva già compilato deve rifare `npx expo run:android`.
- **Dopo un `git pull` che cambia `mobile/package.json` serve `npm install`** in `mobile/` (anche quando non serve ricompilare: le librerie web sono solo JavaScript).
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

### 19:18 · questo commit · README aggiornato per la giuria
- **Cosa:** in cima, in evidenza, perché la demo è nel browser (il wifi non ha permesso di scaricare Gemma 4 sul computer dell'emulatore); nuove sezioni "Why open source" e "The day, in short" (cronologia e difficoltà); "Why" con prezzi dei concorrenti e l'idea della galleria come l'algoritmo di Instagram; funzioni nuove (Sei qui, cerchi di distanza, gruppi di foto, Galleria con consenso, tocco → scala sotto); riga "Android app on a device: not run"; link al pitch.
- **Perché:** richiesta del team: i punti salienti e le difficoltà devono essere visibili e aggiornati.
- **Verifica:** orari presi dal registro qui sotto, prezzi da `docs/ricerca.md`.

### 19:10 · 06bbbeb · Tocco su un luogo → scala sotto
- **Cosa:** in `App.tsx`, `onToggle` passa a Nazionale per un paese e a Regionale per una regione. Aggiornati `docs/demo.md` e `docs/pitch.md`.
- **Perché:** il team si aspettava che toccando il Lazio a Nazionale si aprissero le sue province.
- **Verifica:** `npx tsc --noEmit`; nel browser: Nazionale → tocco sul Lazio → Frosinone, Latina, Roma, Rieti, Viterbo con la scheda del Lazio; Globale → tocco sulla Francia → 13 regioni francesi.
- **Da provare:** su Android.

### 19:09 · 4240263 · Pitch: perché la demo è nel browser
- **Cosa:** in `docs/pitch.md`, prima della demo, la nota sull'emulatore: con il wifi instabile non è stato possibile scaricare Gemma 4 sul computer dell'emulatore, quindi la demo è la stessa app nel browser con Gemma sul Mac. Aggiornata la riga dell'emulatore in "Stato attuale".
- **Perché:** richiesta del team, per essere trasparenti con la giuria.
- **Verifica:** rilettura del pitch.

### 19:08 · 7205c7f · Pitch di 5 minuti
- **Cosa:** `docs/pitch.md`: apertura, problema (app a pagamento, interessi da menu), intuizione (la galleria come l'algoritmo di Instagram, ma per te), demo, perché open source (foto e spostamenti sono i dati più privati), chiusura. In `docs/demo.md` corretto dove sta il pulsante Galleria.
- **Perché:** richiesta del team per la demo night.
- **Verifica:** prezzi dei concorrenti presi da `docs/ricerca.md`.
- **Da fare:** il repo su GitHub è privato; per la sfida open source va reso pubblico (lo può fare il proprietario, `giorgiocaligiuri`).

### 19:07 · 5381add · Benvenuto: il titolo riassume il prodotto
- **Cosa:** titolo "Dove sei stato, cosa ami, cosa fare vicino a te." (mappa, interessi, eventi), una riga "Mantide lo scopre dalle foto che hai già.", riquadro Gemma 4 / Privacy a una riga ciascuno. Tolti la scritta sopra il titolo e il paragrafo.
- **Perché:** il team trovava ancora troppo testo e un titolo che non riassumeva il progetto.
- **Verifica:** `npx tsc --noEmit`; nel browser a 390×844 con dati cancellati.

### 19:03 · add25f8 · Benvenuto: una frase sull'idea e un riquadro Gemma 4 / Privacy
- **Cosa:** il testo sta al centro tra marchio e pulsanti (prima in fondo, con un vuoto in alto); sopra il titolo "Dal mondo al tuo quartiere"; una frase spiega l'idea (data e posizione delle foto → posti colorati → eventi vicini su misura); Gemma 4 e Privacy in un riquadro a due righe.
- **Perché:** il team trovava la versione delle 19:01 vuota in alto e troppo scarna: serve una frase che dica cos'è il progetto.
- **Verifica:** `npx tsc --noEmit`; nel browser a 390×844 con dati cancellati, tutto in una schermata senza scorrere.

### 19:01 · 7feef95 · Benvenuto in due idee; annullato il pannello Locale alleggerito
- **Cosa:** il benvenuto dice solo "Le tue foto diventano la tua mappa." e due righe: Gemma 4 analizza le tue foto e scopre cosa ami; privacy, le foto restano tue e mai nel cloud. Nel commit precedente (0bb62ac) è stato annullato 11214b9, il pannello Locale alleggerito.
- **Perché:** il team intendeva il troppo testo del benvenuto, non il pannello Locale.
- **Verifica:** `npx tsc --noEmit`; nel browser a 390×844 con dati cancellati: titolo, due righe GEMMA 4 e PRIVACY, "Usa la mia galleria", "Continua senza galleria".
- **Da provare:** su Android.

### 18:55 · 4bbb99a · "Sei qui" e cerchi di distanza, foto di un gruppo, Galleria a destra con consenso
- **Cosa:** a scala Locale pallino blu "Sei qui" e cerchi a 5, 10 e 20 km; tocco su una miniatura con numero → griglia con tutte le sue foto (`src/screens/PhotoGroup.tsx`); Galleria in fondo a destra, apre tutte le foto o il consenso.
- **Perché:** il team non vedeva dov'era a scala Locale né quanto erano lontani gli eventi; voleva vedere le foto dietro il numero; Galleria attaccata a Linea del tempo confondeva.
- **Verifica:** `npx tsc --noEmit`, `check-visited`, `npx expo export --platform android`. Nel browser a 390×844: Locale con "Sei qui" e cerchi 5/10/20 km; tocco sulla miniatura "3" → 3 foto di Treviso; Galleria → 45 foto; "Smetti di usare la galleria" → riquadro del consenso con "Usa la mia galleria".
- **Da provare:** su Android.

### 18:38 · f160fc5 · Scheda evento → evento sulla mappa
- **Cosa:** le schede del pannello "Per te qui" si possono toccare: la scheda passa prima, il suo puntino si ingrandisce e la mappa ci si centra. Nuovo campo `selectedEvent` in `MapState`.
- **Perché:** il team toccava una scheda per vedere dov'era l'evento e non succedeva niente.
- **Verifica:** `npx tsc --noEmit`, `test-recommend`, `npx expo export --platform android`. Nel browser a 390×844: tocco sulla terza scheda (Trekking sul Montello) → scheda in testa, puntino grande a metà della mappa libera, zoom 12.
- **Da provare:** su Android.

### 18:30 · 28e58c3 · Regioni visitate visibili in tutti i paesi con foto
- **Cosa:**
  - Miniature a puntina sopra il punto, non centrate su di esso.
  - Inquadratura Nazionale e Regionale sotto l'intestazione e sopra i pulsanti; senza le isole lontane.
  - `scripts/check-visited.ts`: per ogni paese con foto demo controlla che ogni regione e provincia visitata sia tra le zone disegnate a Nazionale e Regionale.
- **Perché:** il team ha visto il Regno Unito senza regioni accese: Greater London era accesa ma nascosta sotto la miniatura. La Spagna appariva piccola perché l'inquadratura comprendeva le Canarie.
- **Verifica:**
  - `npx tsc --noEmit`, `test-locate`, `test-parse`, `test-recommend`, `test-passport`, `check-visited` ("Tutto ok" per ITA, PRT, DEU, ESP, FRA, GBR); `npx expo export --platform android`.
  - Nel browser a 390×844, scala Nazionale: Île-de-France, Berlino, Lisbona, Cataluña e Greater London accese; Spagna a tutta larghezza senza Canarie; Cina come prima. Regno Unito Regionale: Hackney e Westminster accese.
- **Da provare:** tutto su Android.

### 18:19 · questo commit · Regioni vere di ES/FR/GB/PT, regioni che si accendono, intestazione compatta
- **Cosa:**
  - `world-groups.json` e campo `group`; `locate`, `regionCount`, `placeOfProvince` e la mappa usano le regioni vere.
  - Regionale va dove hai più foto; tinta più forte per le regioni visitate.
  - Intestazione a una riga con il livello; Galleria in basso.
  - `chromeTop` per il pulsante dei crediti; chiavi dei dati salvate passate a v2.
- **Perché:** la Spagna a scala Nazionale mostrava 52 province come regioni; le regioni visitate in Francia non si vedevano; nell'intestazione c'era spazio vuoto e trasparenze.
- **Verifica:**
  - Test: `test-locate` (Lisbona → regione "Lisbon", provincia di Lisbona), `test-passport` (Spagna 1/19, Francia 1/18, Portogallo 1/6, Regno Unito 1/16), `test-recommend`, `test-parse`.
  - `npx expo export --platform android`.
  - Nel browser: Spagna Nazionale con 17 comunità e la Cataluña accesa, Regionale con le 4 province catalane, intestazione e pulsanti in una riga a 390 px.

### 18:11 · questo commit · Scale che seguono il luogo toccato, linea del tempo più veloce e con trattini
- **Cosa:**
  - Toccare un luogo sposta il fuoco delle scale, con "◎ Torna dove sei".
  - `centerOf` e `regionOfProvince` in `locate.ts`; Nazionale inquadra solo le regioni vicine.
  - Linea del tempo a 0,5 s per foto e animazione da 0,4 s; data tolta dalla testata, trattini ed etichette dei viaggi sulla linea.
  - Pulsante dei crediti della mappa spostato sotto l'intestazione.
- **Perché:** feedback del team dopo la prova: la Nazionale tornava sempre in Italia, il viaggio era lento, la data sopra la linea non aiutava a trascinare.
- **Verifica:**
  - Nel browser: Francia → Nazionale con zoom 4 sulla Francia metropolitana e i suoi dipartimenti; riproduzione arrivata alla foto 18 in 9 s, con "mar '24 … giu '26" sotto la linea.
  - `npx tsc --noEmit`, `test-locate`, `npx expo export --platform android`.

### 17:56 · questo commit · Una sola schermata, ridisegno, regioni del mondo, Passaporto, linea del tempo `[native: rebuild]`
- **Cosa:**
  - **Una sola schermata:**
    - tolte le schede e le schermate Galleria, Interessi e Per te;
    - aggiunti `Welcome.tsx` (galleria sì/no) e `LocalPanel.tsx` ("Per te qui");
    - lettura della galleria e Gemma partono da sole, e l'avanzamento sta nell'intestazione.
  - **Scala Locale senza esagoni** (via h3-js e livello `hex`), con gli eventi come puntini.
  - **Regioni di tutto il mondo:** `world-regions.json` e `locate()` con le regioni estere; Nazionale e Regionale seguono il paese in cui sei.
  - **Passaporto:** `src/stats/passport.ts` (con `COUNTRY_INFO`, `regionCount`, `countryOfRegion` in `locate.ts`) e `PassportSheet.tsx`.
  - **Linea del tempo:** `TimelineBar.tsx`, e `timeline`/`journey`/`tl-head` nella pagina della mappa.
  - **Ridisegno di un aiutante** con le skill di design: `theme.ts`, le schermate, gli stili di `App.tsx`, i font Bricolage Grotesque e IBM Plex Mono (expo-font, plugin aggiunto in `app.json`).
  - Documentazione aggiornata.
- **Perché:** richieste del team dalle 17:40 alle 17:51: niente quadratini, interessi dentro la scala Locale, niente sezione galleria, Nazionale in base a dove sei, UI meno "AI slop", statistiche da viaggiatore, linea del tempo.
- **Verifica:**
  - `npx tsc --noEmit`; `test-locate` (Pechino → regione cinese, Lisbona → portoghese); `test-parse`; `test-recommend`; `test-passport` (6/234 paesi, 1,3% terre emerse, Viaggiatore).
  - `simulate-demo`; `npx expo export --platform android` (750 moduli); `npx expo-doctor` 20/20.
  - Nel browser:
    - benvenuto, scala Locale "Per te qui · Treviso" con zoom 9;
    - Passaporto;
    - linea del tempo da foto 1 a 45 con le linee del viaggio;
    - scala Nazionale con le regioni della Cina.
- **Da provare:** tutto sull'emulatore, dopo `npm install` e `npx expo run:android`.

### 17:31 · questo commit · La stessa app nel browser
- **Cosa:**
  - react-dom, react-native-web, @expo/metro-runtime.
  - Gemelli web: `src/storage.web.ts`, `src/gallery/source.web.ts` (la lettura della galleria ora sta in `source.ts`), `src/ai/image.web.ts` (il rimpicciolimento ora sta in `image.ts`), `src/map/thumbs.web.ts`, `src/map/MapView.web.tsx`.
  - `demo.json` ha anche l'indirizzo web di ogni foto demo.
  - Nella pagina della mappa `window.mantideMap` per il debug.
  - README, `local-ai/README.md`, `mobile/AGENTS.md` e `docs/demo.md` spiegano la versione browser.
- **Perché:** avere subito una demo con schermate e tasti veri senza aspettare l'emulatore, e un piano B per la presentazione.
- **Verifica:**
  - Nel browser a 390×844, da capo a fondo: home col globo; Galleria con 45 foto in 13 luoghi; mappa con "6 paesi · 6/20 regioni · 8/110 province", regioni visitate e miniature raggruppate; Interessi con Gemma che analizza dal browser.
  - `npx tsc --noEmit`, tutti i test, `npx expo export --platform android` (706 moduli) ed `npx expo-doctor` (20/20) passati.
- **Da provare:** la versione Android sull'emulatore, dopo `npm install`.

### 17:20 · 240d4e2 · Scheda del luogo
- **Cosa:** `src/screens/PlaceSheet.tsx`. Toccando una zona si apre dal basso con: tipo e nome del luogo; come è stato visitato (a mano, GPS, quante foto); le foto scattate lì (un tocco le apre); fino a 2 eventi per te in quel luogo; il pulsante "Segna come visitato" / "Togli il segno a mano". In `recommend.ts` il punteggio è condiviso tra `recommend` e il nuovo `recommendIn`.
- **Perché:** era l'unica schermata del design ancora mancante, e segnare una zona al primo tocco era troppo facile da sbagliare.
- **Verifica:** `npx tsc --noEmit`; `test-recommend.ts` passato; `npx expo export --platform android`; simulazione: Veneto 15 foto con primo evento "H-FARM Open Campus", provincia di Venezia 4 foto con primo evento "Biennale Arte".
- **Da provare:** sull'emulatore. Per gli esagoni la scheda non mostra foto né eventi.
- **Dopo il commit:** `docs/demo.md` aggiornato con la scheda del luogo e le linee dei viaggi (commit successivo).

### 17:18 · 9aa24e2 · Linee dei viaggi sulla mappa
- **Cosa:** sorgente e livello `trips` nella pagina della mappa: una linea tratteggiata bianca per ogni viaggio, sotto le miniature.
- **Perché:** ricostruire il passato in ordine cronologico, come chiedeva il team fin dall'idea iniziale.
- **Verifica:** `npx tsc --noEmit`; nel browser la linea unisce le foto di Venezia nell'ordine giusto, senza errori in console.

### 17:17 · d8494c3 · Dove gira Gemma, in base alla RAM `[native: rebuild]`
- **Cosa:** expo-device; `whereGemmaRuns()` legge la RAM del dispositivo e la scheda Interessi spiega dove gira Gemma.
- **Perché:** rendere visibile la scelta "sotto 8 GB Gemma gira sul tuo computer, mai nel cloud".
- **Verifica:** `npx tsc --noEmit`, `npx expo export --platform android`, `npx expo-doctor`.
- **Da provare:** il valore della RAM sull'emulatore.

### 17:16 · 4711665 · Guida completa per il computer della demo
- **Cosa:** `docs/setup-android.md` copre tutti i passi in ordine, compresi Python, Git, la RAM dell'emulatore a 4 GB, la verifica finale coi numeri attesi e cosa fare in caso di errore. `local-ai/README.md` ha i comandi per Windows e la prova su una foto demo.
- **Nota:** questo commit non aveva aggiornato `progressi.md`.

### 17:10 · 1536ead · Confini scritti dentro la pagina della mappa
- **Cosa:** `withGeo()` in `src/map/mapHtml.ts` scrive i confini nella pagina; `MapView` e `scripts/preview-map.ts` la usano; tolto `injectedJavaScriptBeforeContentLoaded`.
- **Perché:** togliere un comportamento che cambia tra le versioni della WebView di Android.
- **Verifica:** `npx tsc --noEmit`; `npx expo export --platform android`; nel browser la pagina ha 242 paesi, 20 regioni e 110 province, e disegna zone e miniature senza errori.

### 17:09 · cd359f9 · Controlli senza Android e simulazione della demo
- **Cosa:**
  - `parseAnswer` spostato in `src/ai/parse.ts`, senza moduli nativi, con il test `scripts/test-parse.ts`.
  - `scripts/simulate-demo.ts`: luoghi, interessi e consigli alle 4 scale calcolati sui dati demo.
  - `docs/demo.md` aggiornato con quello che comparirà davvero; README con tutti i controlli che girano senza Android.
- **Perché:** trovare gli errori prima della prima compilazione, e avere un copione esatto.
- **Verifica:**
  - `npx tsc --noEmit`, `test-parse` (6 casi), `npx expo export --platform android` (699 moduli) ed `npx expo-doctor` (20/20) passati.
  - La simulazione dà 6 paesi, 6 regioni e 8 province; interessi in testa architettura, natura e street art; Per te Globale → "Berlin Wall Murals & Beats", Locale → "H-FARM Open Campus: architettura sostenibile".
- **Da provare:** tutto sull'emulatore.

### 17:05 · 2cb5b11 · Risposte di Gemma sulle foto demo
- **Cosa:** `demo-data/analyses.json` (le 45 risposte di Gemma col prompt attuale) e `mobile/src/demo/demo.json` rigenerato.
- **Perché:** sono la riserva della demo se Gemma non risponde, e la prova di quanto Gemma riconosce le passioni.
- **Verifica:**
  - Il tema giusto è tra gli interessi in 43 foto su 45, ed è il primo in 41 (col prompt precedente: 42 su 45).
  - Interessi più frequenti: architettura 16, natura 12, street art 10, cibo 9.
  - "Arte" è sceso da 20 a 5.

### 17:04 · a47a56a · Riordino della documentazione, prompt migliorato
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
