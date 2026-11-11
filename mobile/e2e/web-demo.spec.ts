// The web demo as a visitor sees it on GitHub Pages: served under /mantide/, Gemma unreachable.
// Run: npm run export:web && npm run e2e   (BASE_URL=https://… runs it against the live site)
import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, locale: 'en-US' });

type MapHandle = {
  getCanvas(): HTMLCanvasElement;
  jumpTo(options: { center: [number, number]; zoom: number }): void;
  querySourceFeatures(id: string): { properties: { visited?: boolean } }[];
};

// Fails the test on any uncaught error in the page.
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

// Nobody runs Gemma for a visitor: the app must fall back to the answers prepared for the demo photos.
async function startWithGallery(page: Page) {
  await page.route('**/v1/chat/completions', (route) => route.abort());
  await page.goto('./?reset');
  await page.getByText('Use my gallery').first().click({ timeout: 15_000 });
  await expect(page.locator('[data-testid="photo-pin"]').first()).toBeVisible({ timeout: 30_000 });
}

// Drags the sheet by its handle to one of its heights (the window is 844 px high).
async function sheetTo(page: Page, detent: 'mid' | 'high') {
  const box = (await page.getByTestId('sheet-handle').boundingBox())!;
  const x = box.x + box.width / 2;
  const top = 844 - (detent === 'mid' ? 388 : 760);
  await page.mouse.move(x, box.y + 30);
  await page.mouse.down();
  // A mouse move goes to whatever is under the pointer: the sheet takes the drag while the pointer is
  // still on it, as a hand does, then follows it over the map.
  await page.mouse.move(x, box.y + 20, { steps: 2 });
  await page.mouse.move(x, top + 20, { steps: 15 });
  // Then rest a moment, so the release isn't read as a flick that carries the sheet further.
  await page.waitForTimeout(150);
  await page.mouse.move(x, top + 21);
  await page.mouse.up();
  await expect(page.getByTestId(`sheet-${detent}`)).toBeVisible();
}

test('far out, the sheet shows your world', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await expect(page.getByText('Your world')).toBeVisible();
  await expect(page.getByText(/^6 countries · /)).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('tapping a numbered pin shows its photos oldest first', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  const pin = page.locator('[data-testid="photo-pin"]:has(.mt-badge)').first();
  const count = Number(await pin.locator('.mt-badge').textContent());
  await pin.click();
  await expect(page.getByTestId('group-photo')).toHaveCount(count);

  // A photo opens full screen.
  await page.getByTestId('group-photo').first().click();
  await expect(page.getByTestId('photo-viewer')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the place sheet leads with suggestions', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.jumpTo({ center: [-122.3, 37.6], zoom: 7 }));
  await expect(page.getByRole('heading', { name: 'California' })).toBeVisible();
  await sheetTo(page, 'high');

  const sheet = page.getByTestId('sheet-high');
  await expect(sheet.getByTestId('suggestion').first()).toBeVisible({ timeout: 30_000 });
  expect(await sheet.getByRole('heading').allTextContents()).toEqual(['California', 'For you here', 'Photos']);
  const first = sheet.getByTestId('suggestion').first();
  // react-native-web adds the <img> once the photo has loaded.
  await expect(first.locator('img')).toHaveCount(1, { timeout: 15_000 });
  await expect(first.getByText(/^You have \d+ photos? of/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('distances in miles in the US', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.jumpTo({ center: [-122.3, 37.6], zoom: 7 }));
  await expect(page.getByRole('heading', { name: 'California' })).toBeVisible();
  await sheetTo(page, 'high');
  const first = page.getByTestId('sheet-high').getByTestId('suggestion').first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  await expect(first.getByText(/ · \d+ mi$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('without the gallery the app still works', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./?reset');
  await page.getByText('Continue without gallery').click({ timeout: 15_000 });
  await expect(page.getByText('Your world')).toBeVisible();
  await sheetTo(page, 'mid');
  await expect(page.getByText('Connect your gallery')).toBeVisible();
  expect(errors).toEqual([]);
});

test('dragging the sheet by its title moves it without opening the passport', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await sheetTo(page, 'mid'); // grabbed on "Your world"
  await page.waitForTimeout(500);
  await expect(page.getByTestId('passport')).toHaveCount(0);
  // A plain tap still opens it.
  await page.getByText('Your world').click();
  await expect(page.getByTestId('passport')).toBeVisible();
  expect(errors).toEqual([]);
});

test('at middle height the photos in view scroll down to "See all"', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await sheetTo(page, 'mid');
  const sheet = page.getByTestId('sheet-mid');
  await expect(sheet.getByTestId('area-photo').first()).toBeVisible();
  // Far out all 45 photos are in view: more than the grid shows, so "See all" ends it.
  const seeAll = sheet.getByRole('button', { name: 'See all' });
  const firstPhoto = (await sheet.getByTestId('area-photo').first().boundingBox())!;
  await page.mouse.move(firstPhoto.x + 10, firstPhoto.y + 10);
  await page.mouse.wheel(0, 3000);
  await expect.poll(async () => (await seeAll.boundingBox())?.y ?? Infinity).toBeLessThan(844 - 20);
  await seeAll.click();
  await expect(page.getByTestId('group-photo')).toHaveCount(45);
  expect(errors).toEqual([]);
});

test('without Gemma, suggestions come from its earlier answers and say so', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await page.getByRole('button', { name: 'Back to me' }).click();
  await sheetTo(page, 'high');
  const sheet = page.getByTestId('sheet-high');
  await expect(sheet.getByRole('heading', { name: 'For you here' })).toBeVisible();
  await expect(sheet.getByTestId('suggestion').first()).toBeVisible({ timeout: 30_000 });
  await expect(sheet.getByText(/Gemma isn't reachable from here/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('sample photos need no gallery and no Gemma', async ({ page }) => {
  const errors = watchErrors(page);
  let gemmaCalls = 0;
  await page.route('**/v1/chat/completions', (route) => {
    gemmaCalls++;
    return route.abort();
  });
  await page.goto('./?reset');
  await page.getByText('Try with sample photos').click({ timeout: 15_000 });
  await expect(page.getByText(/^6 countries · /)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Back to me' }).click();
  await sheetTo(page, 'high');
  const sheet = page.getByTestId('sheet-high');
  await expect(sheet.getByTestId('suggestion').first()).toBeVisible({ timeout: 30_000 });
  // Gemma's answers on the sample photos were prepared: nothing is unreachable, nothing is asked.
  await expect(sheet.getByText(/Gemma isn't reachable/)).toHaveCount(0);
  expect(gemmaCalls).toBe(0);
  expect(errors).toEqual([]);
});

test('the timeline replays the journey', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await page.getByRole('button', { name: '▶ Timeline' }).click();
  // It replaces the sheet while it plays, one photo every half second.
  await expect(page.getByTestId('timeline')).toBeVisible();
  await expect(page.getByTestId(/^sheet-/).first()).toHaveCount(0);
  await expect(page.getByText('photo 45 of 45')).toBeVisible({ timeout: 60_000 });
  const points = await page.evaluate(async () => {
    const map = (window as unknown as { __mantideMap: { getSource(id: string): { getData(): Promise<GeoJSON.FeatureCollection> } } }).__mantideMap;
    const data = await map.getSource('journey').getData();
    return data.features.map((f) => (f.geometry as GeoJSON.LineString).coordinates.length);
  });
  expect(points).toEqual([45]);
  // Closing it brings the sheet back as it was.
  await page.getByRole('button', { name: 'Close the timeline' }).click();
  await expect(page.getByTestId('sheet-low')).toBeVisible();
  expect(errors).toEqual([]);
});

test('after the timeline, every numbered pin opens its own photos', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  // The timeline rebuilds the photo groups at every step; closing it rebuilds them once more.
  await page.getByRole('button', { name: '▶ Timeline' }).click();
  await expect(page.getByText(/^photo (1[0-9]|[2-9][0-9]) of 45$/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close the timeline' }).click();
  // Back to the whole world, seen from the western US: every group on this side of the globe sits
  // above the sheet, where a finger can reach it. Groups on the far side (MapLibre marks them
  // covered) lie under the ones in front.
  await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.jumpTo({ center: [-115, 35], zoom: 1.4 }));
  await page.waitForTimeout(1500);
  const pins = page.locator('[data-testid="photo-pin"]:not(.maplibregl-marker-covered):has(.mt-badge)');
  const n = await pins.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const badge = Number(await pins.nth(i).locator('.mt-badge').textContent());
    await pins.nth(i).click();
    await expect(page.getByTestId('group-photo')).toHaveCount(badge);
    await page.getByRole('button', { name: 'Close the photos' }).click();
  }
  expect(errors).toEqual([]);
});

test('the passport opens from your world', async ({ page }) => {
  const errors = watchErrors(page);
  await startWithGallery(page);
  await page.getByText('Your world').click();
  const passport = page.getByTestId('passport');
  await expect(passport.getByText('Traveler')).toBeVisible();
  await expect(passport.getByText('4 more countries to become Explorer')).toBeVisible();
  await expect(passport.getByRole('button', { name: 'Stop using the gallery' })).toBeAttached();
  expect(errors).toEqual([]);
});

test('the map draws visited areas and photo pins without basemap tiles', async ({ page }) => {
  const errors = watchErrors(page);
  // Offline basemap: the satellite and standard tile servers never answer.
  await page.route(/tiles\.maps\.eox\.at|tiles\.openfreemap\.org/, (route) => route.abort());
  await startWithGallery(page);
  // The map fills the screen: a zero-height container would still show the pins.
  expect(await page.evaluate(() => (window as unknown as { __mantideMap: MapHandle }).__mantideMap.getCanvas().clientHeight)).toBeGreaterThan(600);
  await expect
    .poll(() => page.evaluate(() => {
      const map = (window as unknown as { __mantideMap?: MapHandle }).__mantideMap;
      return !!map?.querySourceFeatures('areas').some((f) => f.properties.visited);
    }), { timeout: 30_000 })
    .toBe(true);
  expect(errors).toEqual([]);
});
