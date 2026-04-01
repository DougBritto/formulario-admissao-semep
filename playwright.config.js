const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const shouldUseWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== 'true';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: shouldUseWebServer
    ? {
        command: 'node server.js',
        url: 'http://127.0.0.1:3000/health',
        timeout: 120_000,
        reuseExistingServer: true,
        env: {
          PORT: '3000',
          EMAIL_DELIVERY_MODE: 'simulate',
          EMAIL_PROVIDER: 'resend',
          EMAIL_TO: 'teste@example.com',
          RESEND_API_KEY: 'test-key',
          RESEND_FROM: 'onboarding@resend.dev',
          TEMPLATE_DIR: 'templates',
          TEMPLATE_FILENAME: 'FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx'
        }
      }
    : undefined
});
