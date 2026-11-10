"""Sends one photo to the local Gemma server and prints what it sees.

Usage: python3 local-ai/test_photo.py path/to/photo.jpg
Same prompt as the app (mobile/src/ai/gemma.ts). Shrink big photos first: the app sends 384 px.
"""
import base64
import json
import sys
import time
import urllib.request

INTERESTS = ["street-art", "food", "sea", "mountains", "art", "architecture",
             "live-music", "nature", "sport", "wine", "history", "nightlife"]

# A plain instruction gives clean JSON with Gemma 4 E2B. The server's constrained JSON mode
# (response_format) produced broken JSON and worse labels in our test, so we don't use it.
# One short hint per id: without them Gemma filed most murals under "art" instead of "street-art".
HINTS = ("street-art (murals, graffiti), food (dishes, restaurants), sea (sea, beaches), "
         "mountains (mountains, hiking), art (museums, paintings, sculptures), architecture (buildings, bridges), "
         "live-music (concerts, live music), nature (parks, animals, plants), sport, wine (wine, bars), "
         "history (castles, ancient monuments), nightlife (nightlife, clubs)")

PROMPT = (
    "Look at this photo. Which interests of the person who took it does it reveal? "
    f"Choose 1 to 3 ids, most evident first, ONLY from this list: {HINTS}. "
    "Reply with one line of JSON and nothing else, exactly like: "
    '{"scene": "<what you see, in English, max 8 words>", "interests": ["id", "id"]}'
)


def analyze(path: str, url: str = "http://127.0.0.1:9379", model: str = "gemma4-e2b") -> str:
    image = base64.b64encode(open(path, "rb").read()).decode()
    body = {
        "model": model,
        "temperature": 0,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image}"}},
                {"type": "text", "text": PROMPT},
            ],
        }],
    }
    request = urllib.request.Request(f"{url}/v1/chat/completions", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)["choices"][0]["message"]["content"]


if __name__ == "__main__":
    start = time.time()
    answer = analyze(sys.argv[1])
    print(f"{time.time() - start:.1f}s  {answer}")
