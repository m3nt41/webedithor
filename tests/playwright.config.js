// Pruebas en Firefox REAL sobre el HTML exportado. Ejecutar: npm run test:firefox
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  globalSetup: './setup.js',
  timeout: 30000,
  reporter: [['list']],
  workers: 1,
  // PW_BROWSER=chromium sirve solo para comprobar que los tests están bien escritos; lo que importa es firefox.
  use: { ...(process.env.PW_BROWSER === 'chromium' ? devices['Desktop Chrome'] : devices['Desktop Firefox']), viewport: { width: 900, height: 600 } },
  projects: [{ name: process.env.PW_BROWSER || 'firefox' }],
});
