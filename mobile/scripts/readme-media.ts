// The README's screenshots and GIF, made from the exported web demo in English at 390×844.
// Run: npm run export:web && npx tsx scripts/readme-media.ts   (writes ../docs/images/)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { PNG } from 'pngjs';

const OUT = join(__dirname, '..', '..', 'docs', 'images');
const URL = 'http://127.0.0.1:4173/mantide/';
const GIF_SCALE = 0.75; // 390×844 → 292×633: the GIF stays well under 4 MB
type MapHandle = { flyTo(o: { center: [number, number]; zoom: number; duration: number }): void; jumpTo(o: { center: [number, number]; zoom: number }): void };

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('the web demo server did not start');
}

// The sheet's handle dragged to a top edge, as a finger would.
async function dragSheet(page: Page, top: number, onStep?: () => Promise<void>) {
  const box = (await page.getByTestId('sheet-handle').boundingBox())!;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(x, box.y + 20, { steps: 2 });
  const from = box.y + 20;
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(x, from + ((top + 20 - from) * i) / 6, { steps: 3 });
    await onStep?.();
  }
  await page.waitForTimeout(150);
  await page.mouse.move(x, top + 21);
  await page.mouse.up();
  await page.waitForTimeout(900);
}

async function main() {
  const server = spawn('npx', ['tsx', join(__dirname, 'serve-web.ts')], { stdio: 'ignore' });
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' });
    await page.route('**/v1/chat/completions', (route) => route.abort());
    await page.goto(`${URL}?reset`);
    await page.getByText('Try with sample photos').click({ timeout: 15_000 });
    await page.locator('[data-testid="photo-pin"]').first().waitFor();
    await page.waitForTimeout(4000); // tiles and thumbnails

    const shot = async (name: string) => writeFileSync(join(OUT, name), await page.screenshot({ type: 'jpeg', quality: 82 }));

    // 1. Far out: your world.
    await shot('1-world.jpg');
    // 2. Italy, with the photos in view.
    await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.jumpTo({ center: [12.5, 42.4], zoom: 4.7 }));
    await page.waitForTimeout(3000);
    await dragSheet(page, 844 - 388);
    await page.waitForTimeout(2000);
    await shot('2-country.jpg');
    // 3. Veneto: the place sheet, "For you here" first.
    await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.jumpTo({ center: [12.3, 45.6], zoom: 7 }));
    await page.waitForTimeout(1500);
    await dragSheet(page, 844 - 760);
    await page.waitForTimeout(3000);
    await shot('3-place.jpg');
    // 4. The passport.
    await page.goto(URL);
    await page.locator('[data-testid="photo-pin"]').first().waitFor();
    await page.waitForTimeout(2500);
    await page.getByText('Your world').click();
    await page.waitForTimeout(1200);
    await shot('4-passport.jpg');

    // The GIF: from the world to Veneto, a pin's photos, the sheet raised.
    const small = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-US' });
    await small.route('**/v1/chat/completions', (route) => route.abort());
    await small.goto(`${URL}?reset`);
    await small.getByText('Try with sample photos').click({ timeout: 15_000 });
    await small.locator('[data-testid="photo-pin"]').first().waitFor();
    await small.waitForTimeout(3500);
    const frames: { png: Buffer; delay: number }[] = [];
    const frame = async (delay: number) => frames.push({ png: await small.screenshot(), delay });

    await frame(1400);
    await small.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.flyTo({ center: [12.3, 45.6], zoom: 7.2, duration: 3600 }));
    for (let i = 0; i < 12; i++) {
      await small.waitForTimeout(260);
      await frame(160);
    }
    await small.waitForTimeout(1500);
    await frame(1100);
    await small.locator('[data-testid="photo-pin"]:has(.mt-badge)').first().click();
    await small.waitForTimeout(1500);
    await frame(1600);
    await small.getByRole('button', { name: 'Close the photos' }).click();
    await small.waitForTimeout(600);
    await frame(500);
    await dragSheet(small, 844 - 760, async () => {
      await frame(110);
    });
    await small.waitForTimeout(2500);
    await frame(2600);
    while (frames.length < 30) frames.splice(frames.length - 1, 0, { ...frames[frames.length - 1], delay: 120 });

    const gif = GIFEncoder();
    for (const { png, delay } of frames.slice(0, 30)) {
      const image = PNG.sync.read(png);
      const w = Math.round(image.width * GIF_SCALE);
      const h = Math.round(image.height * GIF_SCALE);
      const rgba = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const from = (Math.floor(y / GIF_SCALE) * image.width + Math.floor(x / GIF_SCALE)) * 4;
          rgba.set(image.data.subarray(from, from + 4), (y * w + x) * 4);
        }
      }
      const palette = quantize(rgba, 256);
      gif.writeFrame(applyPalette(rgba, palette), w, h, { palette, delay });
    }
    gif.finish();
    writeFileSync(join(OUT, 'demo.gif'), gif.bytes());
    await browser.close();
    console.log(`readme media: 4 screenshots and a ${frames.length}-frame GIF in docs/images/`);
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
