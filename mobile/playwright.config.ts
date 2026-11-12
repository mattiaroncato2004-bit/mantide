// End-to-end test of the web demo. By default it serves dist-web/ at /mantide/, as GitHub Pages
// does; set BASE_URL to test a live deployment instead.
import { defineConfig } from '@playwright/test';

const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: { baseURL: live ?? 'http://127.0.0.1:4173/mantide/', browserName: 'chromium', locale: 'en-US' },
  webServer: live
    ? undefined
    : { command: 'npx tsx scripts/serve-web.ts', url: 'http://127.0.0.1:4173/mantide/', reuseExistingServer: false },
});
