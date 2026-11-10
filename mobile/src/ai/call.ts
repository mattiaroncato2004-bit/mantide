// One call to the Gemma server (OpenAI-compatible chat completions). It tells "Gemma is unreachable"
// (no answer at all: the app switches to the prepared demo answers and says so) from "Gemma answered
// badly" (only that photo is skipped). fetch is a parameter, so the test scripts run this in Node.
export class GemmaUnreachable extends Error {
  constructor(url: string, cause: unknown) {
    super(`Gemma unreachable at ${url}: ${String(cause)}`);
    this.name = 'GemmaUnreachable';
  }
}

export async function postToGemma(baseUrl: string, body: unknown, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // fetch rejects only when no answer came back. Browsers reject with a TypeError, React Native
    // on Android with a plain Error ("fetch failed: java.net.ConnectException"): don't rely on the type.
    throw new GemmaUnreachable(baseUrl, e);
  }
  if (!response.ok) throw new Error(`Gemma answered ${response.status}`);
  return response.json();
}
