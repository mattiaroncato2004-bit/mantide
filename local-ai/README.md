# Gemma 4 on your computer

The app sends each photo, shrunk to 384 px, to **Gemma 4 E2B** running on your own computer through the official LiteRT-LM server. No cloud: the computer is yours, on your local network.

- **Model:** `gemma-4-E2B-it.litertlm` (LiteRT-LM format, 2.58 GB, Apache 2.0): [direct download](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm) · [model page](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm)
- **Runtime:** [LiteRT-LM](https://developers.google.com/edge/litert-lm) CLI, `pip install litert-lm` (Python 3.10+)

## Run it

From the repo root:

```sh
python3 -m venv .venv
.venv/bin/pip install litert-lm            # Windows: .venv\Scripts\pip install litert-lm

# put the model in models/ (ignored by git), then register it under the id the app uses
.venv/bin/litert-lm import models/gemma-4-E2B-it.litertlm gemma4-e2b

.venv/bin/litert-lm serve --port 9379
```

Check it from another terminal:

```sh
python3 local-ai/test_photo.py path/to/photo.jpg
# 6.1s  {"scene": "Moto contro muro di mattoni", "interests": ["sport", "architettura"]}
```

The **first request takes 1–2 minutes** (LiteRT-LM builds its cache); then about 6 s per photo on a MacBook Air M3 CPU.

## How the app reaches it

- **Android emulator:** nothing to configure. The app calls `http://10.0.2.2:9379`, which inside the emulator is the computer it runs on.
- **Real phone on the same Wi-Fi:** start with `--host 0.0.0.0` and set `GEMMA_URL` in `mobile/src/ai/gemma.ts` to the computer's address.
