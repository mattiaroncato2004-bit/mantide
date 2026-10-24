# Il prodotto

Cosa fa l'app e perché è fatta così. Le scelte tecniche, con il loro perché, sono in [progressi.md](../progressi.md); il mercato in [ricerca.md](ricerca.md).

## L'idea in una frase

La galleria del telefono è il database: dalle foto ricostruiamo dove sei stato (data e GPS) e cosa ti appassiona (contenuto delle foto, letto da Gemma 4), e ti proponiamo cosa fare a quattro scale.

## Due punti di vista, un'app

Il team è partito da due idee: una mappa dei luoghi visitati alla Been, e consigli intelligenti basati sulle foto. Sono diventate un'app sola:

| Cosa | Da quale idea | Come entra nell'app |
|---|---|---|
| Segnare a mano paesi, regioni, province, micro-aree | mappa tipo Been | Il cuore dell'app, funziona anche senza AI |
| 4 scale: Globale, Nazionale, Regionale, Locale | consigli | Coincidono con i livelli della mappa: paesi, regioni, province, esagoni H3 di circa 0,7 km² |
| GPS per sapere dove sei | mappa tipo Been | La posizione attuale segna la zona in cui ti trovi |
| Foto collegate ai luoghi tramite i metadati | entrambe | Data e GPS di ogni foto ricostruiscono il passato |
| Cartina fisica + zone colorate | consigli | Satellite a colori pieni dove sei stato, velo chiaro dove non sei stato |
| Interessi dalle foto ed eventi per scala | consigli | Lo strato AI sopra la mappa |
| Tutto in locale | entrambe | Gemma 4 gira su hardware tuo, mai su un cloud di terzi |

Un luogo risulta visitato in tre modi, e ogni luogo ricorda come: segnato a mano, dal GPS adesso, da una foto del passato.

## Le schermate

1. **Mappa (home).** Globo satellitare, selettore delle 4 scale, contatore ("14 paesi · 3/20 regioni · 5/110 province"). Tocchi una zona per segnarla. Zoomando compaiono le miniature delle foto, raggruppate col numero, come la mappa di Foto su iPhone; un tocco apre la foto con luogo, data e cosa ci ha visto Gemma.
2. **Galleria.** Le foto raggruppate per luogo. Tocchi un gruppo e la mappa vola lì.
3. **Interessi.** "Le tue foto dicono che ami…": ogni interesse con il numero di foto, una barra e tre foto di prova. Ognuno si può togliere.
4. **Per te.** Gli eventi della scala che stai guardando sulla mappa, con il perché ("Hai 11 foto di street art").

Non fatta per mancanza di tempo: la scheda luogo dal basso (fonte del segno, foto scattate lì, eventi vicini).

## Come lavora l'AI

1. L'app legge data e GPS di ogni foto e la assegna a paese, regione e provincia.
2. Sceglie un campione: al massimo 3 foto per luogo e giorno, perché foto dello stesso posto e giorno dicono quasi sempre la stessa cosa.
3. Gemma 4 E2B guarda ogni foto del campione, rimpicciolita a 384 px, e risponde con una scena e da 1 a 3 interessi presi da una lista fissa di 12.
4. Il codice, non il modello, calcola il profilo (peso di un interesse = sua quota tra le foto) e ordina gli eventi; la frase del perché nasce dai conteggi.

## Perché tutto in locale, e dove

Leggere tutta la galleria di una persona è accettabile solo se le foto restano su hardware suo. Gemma 4 è open-weight: si può far girare sul telefono o sul computer di casa.

| Voce | Valore |
|---|---|
| Gemma 4 E2B su disco | 2,58 GB (E4B: 3,65 GB) |
| Picco di memoria E2B, dati Google su Galaxy S26 Ultra (solo testo) | GPU 676 MB, CPU 1.733 MB |
| Stima con immagini, app compresa | circa 2–3 GB |

| RAM del telefono | Dove gira Gemma |
|---|---|
| sotto 8 GB | sul computer dell'utente, in rete locale (la modalità della demo) |
| 8 GB e più | sul telefono, con LiteRT-LM (non costruito oggi) |

## Dopo l'hackathon

- Gemma direttamente sul telefono per chi ha 8 GB di RAM, con un modulo Kotlin su LiteRT-LM e la scelta automatica in base alla RAM.
- Tracciamento GPS in background (permesso dedicato e revisione del Play Store).
- Eventi veri da fonti pubbliche, al posto del catalogo inventato.
- Regioni e province anche fuori dall'Italia.
- La scheda luogo.
