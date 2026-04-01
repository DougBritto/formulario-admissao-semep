require('dotenv').config();
const { createApp } = require('./app-server');
const { createConfig } = require('./lib/config');
const { assertTemplateReady } = require('./lib/excel');

async function bootstrap() {
  const config = createConfig();

  if (config.configErrors.length > 0) {
    config.configErrors.forEach((error) => {
      console.error(`[config] ${error}`);
    });
    process.exit(1);
  }

  await assertTemplateReady(config);

  const app = createApp(config);
  app.listen(config.port, () => {
    console.log(`Servidor iniciado em http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error(`[startup] ${error.message}`);
  process.exit(1);
});
