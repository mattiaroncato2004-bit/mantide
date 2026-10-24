# Agenti e persone che lavorano su questo repo

**Prima di modificare qualsiasi cosa, leggete [progressi.md](progressi.md):** stato attuale, decisioni con il loro perché, insidie note e registro delle modifiche. Cosa fa l'app e come è fatta: [README.md](README.md).

## Dove sta cosa

| Percorso | Contenuto |
|---|---|
| `mobile/` | L'app Expo. Indicazioni specifiche in [mobile/AGENTS.md](mobile/AGENTS.md) |
| `local-ai/` | Gemma 4 sul computer: istruzioni, script di prova e di analisi in blocco |
| `demo-data/` | La galleria dimostrativa inventata e lo script che la genera |
| `docs/prodotto.md` | Il design del prodotto: idea, scale, schermate, perché tutto in locale |
| `docs/ricerca.md` | Concorrenti e interfacce di riferimento |
| `docs/setup-android.md` | Setup del computer che compila e fa girare l'emulatore |
| `docs/demo.md` | Copione della demo e piano B |
| `progressi.md` | Stato, decisioni, insidie, registro |

## Dopo ogni modifica al codice o ogni push

Aggiornate `progressi.md` **nello stesso commit**. Una modifica è finita quando:

1. il registro ha una nuova voce in cima con orario, commit, cosa, perché, come è stato verificato e cosa resta da provare;
2. la tabella "Stato attuale" e i "Prossimi passi" corrispondono al codice;
3. ogni decisione nuova ha il suo perché in "Decisioni e perché", e ogni trappola scoperta sta in "Insidie note".

Ogni informazione sta in un posto solo: se esiste già in un altro file, mettete un link invece di ripeterla.

## Convenzioni

- Il commit che richiede di ricompilare l'app Android (modifiche a `mobile/app.json`, `mobile/package.json` o codice nativo) ha `[native: rebuild]` nel titolo.
- Le foto personali stanno in `demo-photos/` e i modelli in `models/`: entrambe le cartelle sono escluse da git.
- Prima di un commit su `mobile/`: `npx tsc --noEmit`, e i test in `mobile/scripts/` che toccano il codice cambiato.
