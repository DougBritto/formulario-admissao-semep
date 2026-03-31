const fs = require('fs');
const path = require('path');
const { loadFormOptions } = require('./form-options');

const ROOT_DIR = path.resolve(__dirname, '..');
const MAPPING_PATH = path.join(ROOT_DIR, 'config', 'mapeamento-campos.json');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_TEMPLATE_FILENAME = 'FOR 33 RH - Solicitação de Cadastro e Admissão Rev 05.xlsx';

function loadFieldMapping() {
  const raw = fs.readFileSync(MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    funcionario: parsed.funcionario || {},
    dependentes: Array.isArray(parsed.dependentes) ? parsed.dependentes : []
  };
}

function createConfig(env = process.env) {
  const fieldMapping = loadFieldMapping();
  const formOptions = loadFormOptions();
  const templateFilename = env.TEMPLATE_FILENAME || DEFAULT_TEMPLATE_FILENAME;
  const templateDir = env.TEMPLATE_DIR ? path.resolve(ROOT_DIR, env.TEMPLATE_DIR) : TEMPLATE_DIR;
  const emailDeliveryMode = env.EMAIL_DELIVERY_MODE === 'simulate' ? 'simulate' : 'live';

  return {
    port: Number(env.PORT) || 3000,
    templateFilename,
    templatePath: path.join(templateDir, templateFilename),
    emailTo: env.EMAIL_TO || 'douglasbritto416@gmail.com',
    confirmationEnabled: String(env.EMAIL_CONFIRMATION_ENABLED || 'true').toLowerCase() === 'true',
    resendApiKey: env.RESEND_API_KEY || '',
    resendFrom: env.RESEND_FROM || 'onboarding@resend.dev',
    emailDeliveryMode,
    maxDependentes: fieldMapping.dependentes.length || 5,
    sheetName: 'SCA',
    auditFilePath: path.join(ROOT_DIR, 'data', 'submission-audit.jsonl'),
    fieldMapping,
    formOptions
  };
}

module.exports = {
  ROOT_DIR,
  MAPPING_PATH,
  TEMPLATE_DIR,
  DEFAULT_TEMPLATE_FILENAME,
  createConfig,
  loadFieldMapping
};
