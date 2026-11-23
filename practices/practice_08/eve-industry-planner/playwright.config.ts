import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './integration',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    channel:
      process.env.BROWSER_CHANNEL ||
      (process.platform === 'win32' ? 'msedge' : undefined),
  },
  webServer: {
    command: process.env.TEST_DEV ? 'npm run dev' : 'npm start',
    env: { PORT: '4187' },
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
  },
})
