// The web demo as a visitor sees it on GitHub Pages: served under /mantide/, Gemma unreachable.
// Run: npm run export:web && npm run e2e   (BASE_URL=https://… runs it against the live site)
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, locale: 'en-US' });

test('the demo loads under /mantide/ and works without Gemma', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Nobody runs Gemma for a visitor: the app must fall back to the answers prepared for the demo photos.
  await page.route('**/v1/chat/completions', (route) => route.abort());

  await page.goto('./?reset');
  await expect(page.getByText('Use my gallery').first()).toBeVisible({ timeout: 15_000 });
  await page.getByText('Use my gallery').first().click();

  // The header's numbers and words are separate elements; its accessible name has the whole line.
  await expect(page.getByRole('button', { name: /^6 countries · 11 regions · 13 provinces/ })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('tab', { name: 'Local' }).click();
  await expect(page.getByText('For you here')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Remove .+ from your interests$/ }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Gemma isn't reachable from here/)).toBeVisible();

  expect(errors).toEqual([]);
});

test('the map draws visited areas and photo pins without basemap tiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Offline basemap: the satellite and standard tile servers never answer.
  await page.route(/tiles\.maps\.eox\.at|tiles\.openfreemap\.org/, (route) => route.abort());
  await page.route('**/v1/chat/completions', (route) => route.abort());

  await page.goto('./?reset');
  await page.getByText('Use my gallery').first().click({ timeout: 15_000 });
  await expect(page.locator('[data-testid="photo-pin"]').first()).toBeVisible({ timeout: 30_000 });
  // The map fills the screen: a zero-height container would still show the pins.
  expect(await page.evaluate(() => (window as unknown as { __mantideMap: { getCanvas(): HTMLCanvasElement } }).__mantideMap.getCanvas().clientHeight)).toBeGreaterThan(600);
  await expect
    .poll(() => page.evaluate(() => {
      const map = (window as unknown as { __mantideMap?: { querySourceFeatures(id: string): { properties: { visited?: boolean } }[] } }).__mantideMap;
      return !!map?.querySourceFeatures('areas').some((f) => f.properties.visited);
    }), { timeout: 30_000 })
    .toBe(true);
  expect(errors).toEqual([]);
});
