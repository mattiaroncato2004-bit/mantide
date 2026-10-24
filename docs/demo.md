# Copione della demo

Demo night: dalle 19:20 al tavolo. Durata: circa 3 minuti, poi domande.

## Prima della demo (entro le 19:00, sul computer da 16 GB)

1. Gemma acceso: `litert-lm serve --port 9379` (vedi `local-ai/README.md`). Fate **una prima richiesta** con `python3 local-ai/test_photo.py <foto>`: la prima dura 1–2 minuti.
2. Emulatore acceso, app installata (`npx expo run:android`), server di sviluppo acceso.
3. Foto demo caricate: `adb push demo-data/photos/. /sdcard/Pictures/mantide-demo/` e poi lo scan (`demo-data/README.md`).
4. Posizione dell'emulatore su H-FARM, Roncade (pannello Location).
5. Nell'app, **una volta**: Galleria → Leggi la galleria; Interessi → Analizza le foto con Gemma. Così durante la demo tutto è già pronto e veloce.
   Per sapere in anticipo cosa comparirà: `cd mobile && npx tsx scripts/simulate-demo.ts`.
6. Video di riserva: registrate lo schermo mentre fate il giro sotto (Android Studio: Running Devices → registra).

## Il giro (3 minuti)

| Tempo | Cosa mostrate | Cosa dite |
|---|---|---|
| 0:00 | Mappa, scala **Globale**: globo satellitare, 6 paesi a colori, contatore "6 paesi · 6/20 regioni · 8/110 province" | "La galleria del telefono sa già dove siamo stati e cosa amiamo. Noi la trasformiamo in una mappa e in consigli." |
| 0:20 | Zoom su Lisbona: compaiono le **miniature**, raggruppate; tocco su un murale | "Ogni foto ha GPS e data: la mappa si costruisce da sola. Tocco una foto: Gemma ha visto un murale su un muro di strada, e ne ha dedotto street art." |
| 0:50 | Scale **Nazionale → Regionale → Locale**: regioni d'Italia, province del Veneto, esagoni intorno a H-FARM | "Quattro scale, dal mondo al quartiere. Una zona si segna anche a mano, come in Been, o col GPS dove sei adesso." |
| 1:20 | Scheda **Interessi**: Architettura 16, Natura 12, Street art 10, Cibo 9, Montagna 6, Musica 6… con le foto che lo dimostrano | "Nessun questionario: Gemma 4 E2B guarda le foto. Ogni interesse ha le sue prove, e lo puoi togliere." |
| 1:50 | Scheda **Per te** su Globale, poi scala Locale e di nuovo Per te | "Su Globale, in cima: murales e musica a Berlino. Su Locale: l'H-FARM Open Campus sull'architettura sostenibile, perché ho 16 foto di architettura e 12 di natura." |
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
- **L'app non parte:** il video di riserva, e l'anteprima della mappa nel browser (`npx tsx scripts/preview-map.ts /tmp/map.html`).
