const fs = require('fs');
const path = require('path');
const { createConfig } = require('../lib/config');
const { buildWorkbookBuffer, buildOutputFilename } = require('../lib/excel');
const { validatePayloadDetailed } = require('../lib/validation');
const { admissionPayload } = require('../e2e/fixtures/admissao-payload');

async function main() {
  const config = createConfig({
    ...process.env,
    EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE || 'simulate',
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'resend',
    EMAIL_TO: process.env.EMAIL_TO || 'teste@example.com',
    RESEND_API_KEY: process.env.RESEND_API_KEY || 'test-key',
    RESEND_FROM: process.env.RESEND_FROM || 'onboarding@resend.dev'
  });

  const validationResult = validatePayloadDetailed(admissionPayload, config);
  if (!validationResult.isValid) {
    throw new Error(`Payload da automação inválido: ${JSON.stringify(validationResult.fieldErrors, null, 2)}`);
  }

  const buffer = await buildWorkbookBuffer(admissionPayload, config);
  const fileName = buildOutputFilename(admissionPayload.nome);
  const outputDir = path.join(__dirname, '..', 'output', 'automation');
  const outputPath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`Planilha gerada em: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
