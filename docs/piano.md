# Piano e scelte tecniche

Hacktoberfest @ H-FARM, 24 ottobre 2026. Consegna: prototipo funzionante alle 19:00, submission alle 19:15.

## L'idea in una frase

La galleria del telefono è il database: dalle foto ricostruiamo dove sei stato (data e GPS) e cosa ti appassiona (contenuto delle foto, letto da Gemma 4), e ti proponiamo cosa fare a quattro scale.

## Come abbiamo unito i due punti di vista del team

| Cosa | Da chi | Come entra nell'app |
|---|---|---|
| Base tipo Been: segnare a mano paesi, regioni, province, micro-aree | punto di vista 2 | Il cuore dell'app, funziona anche senza AI |
| 4 scale: Globale, Nazionale, Regionale, Locale | punto di vista 1 | Coincidono con i livelli di Been: paesi, regioni, province, micro-aree (esagoni H3) |
| GPS per sapere dove sei | punto di vista 2 | La posizione attuale segna la zona; il tracciamento in background è un extra |
| Foto collegate ai luoghi tramite metadati | entrambi | Data e GPS di ogni foto ricostruiscono il passato |
| Cartina fisica verde + zone colorate | punto di vista 1 | Rilievo a colori pieni dove sei stato, velo chiaro dove non sei stato |
| Gemma 4 capisce gli interessi dalle foto e propone eventi per scala | punto di vista 1 | Lo strato AI sopra la base Been |
| Tutto in locale | entrambi | Gemma 4 E2B gira sul telefono o sul tuo computer, mai su un cloud di terzi |

Un luogo risulta visitato in tre modi: segnato a mano, dal GPS adesso, da una foto del passato. Ogni luogo tiene la fonte.

## Schermate

1. **Mappa (home).** Globo fisico, selettore delle 4 scale, contatore ("14 paesi · 31 regioni · 9% del mondo"). Tocchi una zona per segnarla.
2. **Galleria.** Interfaccia pulita: foto raggruppate per luogo e data. Tocchi un gruppo e la mappa vola lì.
3. **Per te.** Eventi della scala attiva, con il perché ("hai 41 foto di street art") e tre foto come prova.
4. **Interessi.** "Le tue foto dicono che ami…": chip con peso e foto di prova, ognuna eliminabile.
5. **Scheda luogo** (dal basso): fonte (a mano, GPS, foto), foto scattate lì, eventi vicini.

## Pipeline AI

1. Lettura della galleria: data e GPS di ogni foto.
2. Campionamento: raggruppamento per giorno e luogo, al massimo 3 foto per gruppo.
3. Gemma 4 E2B: per ogni foto un JSON con scena e interessi presi da una lista fissa di circa 30 interessi.
4. Il codice (non il modello) calcola il profilo e ordina gli eventi; Gemma scrive solo la frase del perché.
5. L'analisi gira a blocchi, salva il progresso foto per foto e riparte da dove si era fermata.

## Scelte tecniche e perché

**Expo / React Native in development build, non Expo Go.** Expo Go è un'app generica già pronta: non può contenere codice nativo nostro (LiteRT-LM) e non ha il nostro manifest Android, quindi non può dichiarare i permessi che servono. Una development build è la nostra app, con i nostri permessi, e si sviluppa con lo stesso ricaricamento veloce.

**Accesso completo alla galleria su Android.**
- `READ_MEDIA_IMAGES` (Android 13+) per leggere tutte le foto.
- Su Android 14+ l'utente può dare accesso solo ad alcune foto: l'app lo rileva e chiede "Consenti tutte".
- `ACCESS_MEDIA_LOCATION` è indispensabile: senza, Android nasconde il GPS delle foto ("the system hides location information by default"). Va dichiarato nel manifest, richiesto a runtime, e il file va letto con `MediaStore.setRequireOriginal()`.
- La policy di Google Play concede `READ_MEDIA_IMAGES` solo alle app per cui la galleria è il cuore del prodotto, con una revisione. Per noi lo è; per l'hackathon installiamo l'APK direttamente.

**Gemma 4 E2B con LiteRT-LM.** È il runtime che Google usa nella sua app AI Edge Gallery per far girare Gemma 4 offline su Android, con immagini. Lo stesso file `.litertlm` gira anche su computer. Alternative scartate: llama.rn (supporto Gemma 4 non confermato), react-native-executorch (Gemma 4 confermato solo per il testo), MediaPipe LLM Inference (in manutenzione), Gemini Nano (non è Gemma e non è open).

**E2B e non E4B.** "Use the smallest model that passes" (Provenza, PwC) e "Could a smaller model do the same job?" (Borsan): etichettare una foto è classificazione.

**Mappa.** MapLibre GL JS in una WebView: globo, strati GeoJSON colorati, stessa mappa provabile nel browser. Rilievo da Natural Earth II, di pubblico dominio.

## RAM e peso

| Voce | Valore |
|---|---|
| Gemma 4 E2B su disco | 2,58 GB (E4B: 3,65 GB) |
| App + confini + eventi | circa 50–110 MB |
| Picco di memoria E2B, dati Google su S26 Ultra | GPU 676 MB, CPU 1.733 MB (solo memoria CPU, test solo testo) |
| Stima reale con immagini + app | circa 2–3 GB |

| RAM del telefono | Modalità |
|---|---|
| sotto 6 GB | Gemma gira sul tuo computer in rete locale; tutto il resto sul telefono |
| 6 GB | Gemma sul telefono a blocchi, con la mappa chiusa |
| 8 GB e più | Gemma sul telefono |

L'app legge la RAM al primo avvio e sceglie la modalità. Nessuno del team ha un telefono da 6 GB o più, quindi nella demo Gemma gira su un computer (vedi "Decisioni aperte").

## Orari

| Quando | Cosa | Priorità |
|---|---|---|
| fino alle 15:45 | Test rapidi: Gemma su 5 foto, lettura galleria con GPS, mappa con zone colorate | – |
| 15:45 → 17:30 | Base Been: mappa, segnare a mano, GPS, foto collegate ai luoghi, galleria | P0, deve funzionare |
| in parallelo | Gemma: foto → interessi | P1 |
| 17:30 → 18:15 | Eventi per scala | P2 |
| 18:15 → 19:00 | APK, README, architettura, prova demo, video di riserva | – |

## Rischi

- **Gemma lenta.** Analisi preparata prima della demo; dal vivo solo poche foto nuove.
- **Wi-Fi H-GUEST** potrebbe non far parlare telefono e computer: si usa l'hotspot del telefono.
- **Lettura del GPS delle foto** da verificare nel primo test: se expo-media-library non legge il file originale, lo leggiamo nel modulo Kotlin.

## Decisioni aperte

- Dove gira la demo: emulatore sul computer, oppure telefono vero + Gemma sul computer.
- Nome dell'app.
