# Copione della demo

Demo night: dalle 19:20 al tavolo. Durata: circa 3 minuti, poi domande.

## Prima della demo (entro le 19:00, sul computer da 16 GB)

1. Gemma acceso: `litert-lm serve --port 9379` (vedi `local-ai/README.md`). Fate **una prima richiesta** con `python3 local-ai/test_photo.py <foto>`: la prima dura 1–2 minuti.
2. Emulatore acceso, app installata (`npx expo run:android`), server di sviluppo acceso.
3. Foto demo caricate: `adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/` e poi lo scan (`demo-data/README.md`).
4. Posizione dell'emulatore su H-FARM, Roncade (pannello Location).
5. Nell'app, **una volta**: "Usa la mia galleria" e lasciate finire Gemma (l'intestazione mostra l'avanzamento). Così durante la demo tutto è già pronto e veloce. Per collegare o scollegare la galleria: pulsante **Galleria**, in basso a destra.
   Per sapere in anticipo cosa comparirà: `cd mobile && npx tsx scripts/simulate-demo.ts`.
6. Video di riserva: registrate lo schermo mentre fate il giro sotto (Android Studio: Running Devices → registra).

## Il giro (3 minuti)

| Tempo | Cosa mostrate | Cosa dite |
|---|---|---|
| 0:00 | Mappa, scala **Globale**: globo satellitare, 6 paesi a colori, contatore "6 paesi · 6/20 regioni · 8/110 province" | "La galleria del telefono sa già dove siamo stati e cosa amiamo. Noi la trasformiamo in una mappa e in consigli." |
| 0:20 | Zoom su Lisbona: compaiono le **miniature**, raggruppate; tocco su un murale | "Ogni foto ha GPS e data: la mappa si costruisce da sola. Tocco una foto: Gemma ha visto un murale su un muro di strada, e ne ha dedotto street art." |
| 0:50 | Scale **Nazionale → Regionale**: regioni d'Italia, province del Veneto con la linea tratteggiata dei viaggi | "Le scale seguono dove sei: in Cina vedresti le regioni cinesi. La linea unisce le foto nell'ordine in cui le hai scattate." |
| 1:05 | Scala **Nazionale**, tocco sul **Veneto**: si apre la scheda (15 foto, primo evento "H-FARM Open Campus"); poi "Segna come visitato" su una regione vuota | "Ogni luogo sa come l'hai visitato: foto, GPS o a mano, come in Been. E ti dice cosa fare lì." |
| 1:20 | Scala **Locale**: puntini arancioni degli eventi intorno a H-FARM; in basso "Per te qui" con i tuoi interessi (architettura, natura, street art, cibo: circa 9–16 foto ciascuno, cambiano di poco tra un'analisi e l'altra) e le schede degli eventi | "Nessun questionario: Gemma 4 E2B ha guardato le foto. Qui vicino: l'H-FARM Open Campus sull'architettura sostenibile, perché ho più di dieci foto di architettura e di natura. Tolgo un interesse con un tocco." |
| 1:50 | Torna su **Globale** e tocca la **Germania**: nella scheda c'è "Berlin Wall Murals & Beats" | "Ogni luogo ha i suoi eventi: a Berlino murales e musica, perché fotografo street art." |
| 1:55 | **▶ Linea del tempo**: il viaggio si riproduce da solo dal 2024 a oggi, la linea arancione va da Roncade a Lisbona, Berlino, Barcellona… Poi trascina il cursore indietro | "Data e posizione di ogni foto ricostruiscono il tuo viaggio, in ordine. Trascino e torno indietro nel tempo." |
| 2:10 | Tocco sul contatore: **Passaporto** (livello Viaggiatore, 6 paesi, 1,3% delle terre emerse, "Ancora 4 paesi per diventare Esploratore", Italia 6/20 regioni e 8/110 province) | "Per chi ama viaggiare: ogni numero dice anche quanto manca." |
| 2:20 | Torna alla mappa | "Le foto non vanno in nessun cloud: Gemma gira su hardware tuo, oggi su questo computer, domani direttamente sul telefono." |

## Domande probabili

- **Perché Gemma sul computer e non sul telefono?** Nessuno del team ha un telefono con 8 GB di RAM; Gemma 4 E2B ne usa circa 2–3 con le immagini. È la modalità prevista per i telefoni più piccoli: stesso modello e stesso file `.litertlm`, che sui telefoni da 8 GB gira con LiteRT-LM.
- **Perché E2B e non un modello più grande?** Etichettare una foto è classificazione: basta il modello più piccolo. 6–8 secondi a foto su un portatile, e ne guardiamo al massimo 3 per luogo e giorno.
- **Cosa è inventato?** Le foto demo (vere, con licenza aperta, ma con GPS e date inventati) e i 46 eventi. Tutto il resto è reale: lettura della galleria, mappa, Gemma, profilo, consigli. Tabella completa nel README.
- **E se Gemma sbaglia?** Le risposte passano da un filtro (solo i 12 interessi ammessi); il profilo lo calcola il codice, non il modello; l'utente può togliere un interesse.
- **Cosa c'è di nuovo rispetto a Been, Polarsteps, Mindtrip?** Loro chiedono di segnare tutto a mano o di scegliere gli interessi da un menu. Noi li deduciamo dal contenuto delle foto, cosa accettabile solo perché le foto restano su hardware dell'utente.

## Piano B

- **Gemma non risponde:** l'app usa le risposte che Gemma aveva già dato sulle foto demo (`demo-data/analyses.json`) e lo scrive a schermo. Ditelo anche voi.
- **L'emulatore non legge il GPS delle foto demo:** l'app lo prende da `demo-data/photos.json`, gli stessi valori scritti negli EXIF.
- **L'app non parte sull'emulatore:** la stessa app nel browser, a dimensione telefono (`cd mobile && npx expo start --web --port 8081`, Gemma con `--cors-origin http://localhost:8081`: vedi README). Usa la galleria demo e Gemma vera. Poi il video di riserva.
