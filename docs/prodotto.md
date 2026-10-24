# Il prodotto

Cosa fa l'app e perché è fatta così. Le scelte tecniche, con il loro perché, sono in [progressi.md](../progressi.md); il mercato in [ricerca.md](ricerca.md).

## L'idea in una frase

La galleria del telefono è il database: dalle foto ricostruiamo dove sei stato (data e GPS) e cosa ti appassiona (contenuto delle foto, letto da Gemma 4), e ti proponiamo cosa fare a quattro scale.

## Due punti di vista, un'app

Il team è partito da due idee: una mappa dei luoghi visitati alla Been, e consigli intelligenti basati sulle foto. Sono diventate un'app sola:

| Cosa | Da quale idea | Come entra nell'app |
|---|---|---|
| Segnare a mano paesi, regioni, province, micro-aree | mappa tipo Been | Il cuore dell'app, funziona anche senza AI |
| 4 scale: Globale, Nazionale, Regionale, Locale | consigli | Seguono dove sei: paesi; regioni del tuo paese; le sue province in Italia, la tua regione altrove; il territorio intorno a te |
| GPS per sapere dove sei | mappa tipo Been | La posizione attuale segna la zona in cui ti trovi |
| Foto collegate ai luoghi tramite i metadati | entrambe | Data e GPS di ogni foto ricostruiscono il passato |
| Cartina fisica + zone colorate | consigli | Satellite a colori pieni dove sei stato, velo chiaro dove non sei stato |
| Interessi dalle foto ed eventi | consigli | Alla scala Locale gli eventi vicini scelti dai tuoi interessi; alle altre scale, nella scheda di ogni luogo |
| Tutto in locale | entrambe | Gemma 4 gira su hardware tuo, mai su un cloud di terzi |

Un luogo risulta visitato in tre modi, e ogni luogo ricorda come: segnato a mano, dal GPS adesso, da una foto del passato.

## Le schermate

Una sola schermata, la mappa: niente schede da cercare.

1. **Benvenuto (primo avvio).** L'app chiede se può leggere la galleria: "Usa la mia galleria" oppure "Continua senza galleria". Senza galleria la mappa si riempie a mano e col GPS. Si cambia idea dal pulsante Galleria in alto.
2. **Mappa.** Globo satellitare, contatore ("6 paesi · 6 regioni · 8 province"), selettore delle 4 scale. Nazionale e Regionale seguono il paese in cui sei: in Cina vedi le regioni cinesi. Zoomando compaiono le miniature delle foto, raggruppate, come nella mappa di Foto su iPhone, e una linea tratteggiata unisce ogni viaggio in ordine di data. Lettura della galleria e lavoro di Gemma si vedono nell'intestazione.
3. **Scala Locale.** Niente zone disegnate: il territorio, le tue foto e gli eventi intorno a te come puntini arancioni. In basso "Per te qui": i tuoi interessi (si tolgono con un tocco) e le schede degli eventi, col perché ("Hai 14 foto di architettura e 11 di natura").
4. **Scheda luogo.** Toccando un paese, una regione o una provincia: come è stato visitato (a mano, GPS, foto), le foto scattate lì, gli eventi per te in quel luogo, e il pulsante per segnarlo.
5. **Linea del tempo.** Il pulsante "Linea del tempo" apre un cursore da trascinare col dito, con data e luogo: la mappa mostra solo le foto fino a quel giorno, e una linea arancione segue il viaggio da un posto all'altro, con la punta che si sposta e la mappa che la segue. ▶ riproduce tutto il viaggio.
6. **Passaporto.** Toccando il contatore: livello da viaggiatore (Turista, Viaggiatore, Esploratore, Giramondo, Leggenda) e quanti paesi mancano al prossimo; paesi visitati e percentuale delle terre emerse; continenti; regioni e province del paese in cui sei, con quante ne mancano; regioni per paese.
7. **Anteprima foto.** Toccando una miniatura: la foto, luogo, data e cosa ci ha visto Gemma.

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
- Province anche fuori dall'Italia.
