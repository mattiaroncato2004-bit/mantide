# Agenti e persone che lavorano su questo repo

**Prima di modificare qualsiasi cosa, leggete [progressi.md](progressi.md):** stato attuale, architettura, decisioni, insidie e registro delle modifiche. Il design completo è in [docs/piano.md](docs/piano.md).

## Dopo ogni modifica al codice o ogni push

Aggiornate `progressi.md` **nello stesso commit**. Una modifica è finita quando:

1. il registro ha una nuova voce in cima con orario, commit, cosa, perché, come è stato verificato e cosa resta da provare;
2. la tabella "Stato attuale" e "Prossimi passi" corrispondono al codice;
3. ogni decisione nuova ha il suo perché in "Decisioni e perché", e ogni trappola scoperta sta in "Insidie note".

## Convenzioni

- Il commit che richiede di ricompilare l'app Android (modifiche a `mobile/app.json`, `mobile/package.json` o codice nativo) ha `[native: rebuild]` nel titolo.
- **Cartelle:**
  - `mobile/`: l'app;
  - `local-ai/`: Gemma sul computer;
  - `data/`: confini ed eventi;
  - `docs/`: documentazione.
- Le foto personali stanno in `demo-photos/` e i modelli in `models/`: entrambe le cartelle sono escluse da git.
- Per l'app valgono anche le indicazioni Expo in [mobile/AGENTS.md](mobile/AGENTS.md); fa eccezione Expo Router, che il progetto non usa.
