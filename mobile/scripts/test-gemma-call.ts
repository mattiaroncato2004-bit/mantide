// How a call to Gemma fails. A network failure must read as "Gemma is unreachable" on every
// platform: browsers reject fetch with a TypeError, React Native 0.88 on Android with a plain
// Error ("fetch failed: java.net.ConnectException …"). Run: npx tsx scripts/test-gemma-call.ts
import assert from 'node:assert/strict';
import { GemmaUnreachable, postToGemma } from '../src/ai/call';

const failing = (error: Error) => (async () => { throw error; }) as unknown as typeof fetch;
const answering = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

(async () => {
  // Android: plain Error from the native networking layer.
  await assert.rejects(
    postToGemma('http://10.0.2.2:9379', {}, failing(new Error('fetch failed: java.net.ConnectException: Failed to connect to /10.0.2.2:9379'))),
    GemmaUnreachable,
  );
  // Browser: TypeError, also when the request is blocked (mixed content, CORS).
  await assert.rejects(postToGemma('http://127.0.0.1:9379', {}, failing(new TypeError('Failed to fetch'))), GemmaUnreachable);

  // Gemma answered, but badly: that is not "unreachable", the photo is just skipped.
  await assert.rejects(postToGemma('http://x', {}, answering(500, {})), (e: Error) => !(e instanceof GemmaUnreachable) && /500/.test(e.message));

  // A good answer comes back as parsed JSON.
  assert.deepEqual(await postToGemma('http://x', {}, answering(200, { ok: 1 })), { ok: 1 });

  console.log('gemma call: ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
