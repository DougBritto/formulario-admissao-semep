require('dotenv').config();
const { createApp } = require('./app-server');
const { createConfig } = require('./lib/config');

const config = createConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Servidor iniciado em http://localhost:${config.port}`);
});
