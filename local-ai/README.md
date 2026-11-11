# Gemma 4 on your computer

The app sends each photo, shrunk to 384 px, to **Gemma 4 E2B** running on your own computer through the official LiteRT-LM server. No cloud: the computer is yours, on your local network.

- **Model:** `gemma-4-E2B-it.litertlm` (LiteRT-LM format, 2.58 GB, Apache 2.0): [direct download](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm) · [model page](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm). Do not use the `-gpu` or `-web` variants.
- **Runtime:** [LiteRT-LM](https://developers.google.com/edge/litert-lm) CLI, `pip install litert-lm` (Python 3.10+)

## Run it

From the repo root, with the model file in `models/` (ignored by git). The model is registered under the id `gemma4-e2b`, which the app uses.

**macOS / Linux**

```sh
python3 -m venv .venv
.venv/bin/pip install litert-lm
.venv/bin/litert-lm import models/gemma-4-E2B-it.litertlm gemma4-e2b
.venv/bin/litert-lm serve --port 9379
```

**Windows**

```sh
python -m venv .venv
.venv\Scripts\pip install litert-lm
.venv\Scripts\litert-lm import models\gemma-4-E2B-it.litertlm gemma4-e2b
.venv\Scripts\litert-lm serve --port 9379
```

Keep `serve` running. Check it from another terminal, at the repo root (`python` instead of `python3` on Windows):

```sh
python3 local-ai/test_photo.py demo-data/photos/2024-04-12_new-york_food-01.jpg
# {"scene": "Pizza on a tray", "interests": ["food"]}
```

The **first request takes 1–2 minutes** (LiteRT-LM builds its cache); then about 6–9 s per 384 px photo on a MacBook Air M3 CPU. Full-size photos are slower: the app always shrinks them first.

## How the app reaches it

- **Browser version of the app** (`npx expo start --web`): add `--cors-origin http://localhost:8081` to `serve`, so the browser may call it.
- **Android emulator:** nothing to configure. The app calls `http://10.0.2.2:9379`, which inside the emulator is the computer it runs on.
- **Real phone on the same Wi-Fi:** start with `--host 0.0.0.0` and set `GEMMA_URL` in `mobile/src/ai/gemma.ts` to the computer's address.

## Scripts

- `test_photo.py`: one photo → Gemma's answer, with the same prompt as the app.
- `precompute_demo.py`: runs Gemma on every demo photo and writes `demo-data/analyses.json`, the app's fallback when Gemma can't be reached during a demo. Then run `cd mobile && npx tsx scripts/build-demo.ts`.
