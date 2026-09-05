import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 180000, workers: 1, expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 1100, height: 760 }, headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure', trace: { mode: 'retain-on-failure', screenshots: false },
  },
  webServer: { command: 'node dist/server/server/index.js', url: 'http://127.0.0.1:3100/api/health', reuseExistingServer: false, env: { PORT: '3100', ASTRA_DB: ':memory:' }, timeout: 20000 },
});
