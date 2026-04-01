const fs = require('fs');
const path = require('path');
const { loadFormOptions } = require('./form-options');
const { maskEmailForDisplay } = require('./redaction');
const { buildClientValidationConfig } = require('./validation-config');

const ROOT_DIR = path.resolve(__dirname, '..');
const MAPPING_PATH = path.join(ROOT_DIR, 'config', 'mapeamento-campos.json');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_TEMPLATE_FILENAME = 'FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx';

function loadFieldMapping() {
  const raw = fs.readFileSync(MAPPING_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    funcionario: parsed.funcionario || {},
    dependentes: Array.isArray(parsed.dependentes) ? parsed.dependentes : []
  };
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasEmailConfiguration(config) {
  if (config.emailDeliveryMode === 'simulate') return true;
  if (!config.emailTo) return false;

  if (config.emailProvider === 'smtp') {
    return Boolean(config.smtpHost && config.smtpPort && config.smtpFrom);
  }

  return Boolean(config.resendApiKey && config.resendFrom);
}

function validateConfig(config) {
  const errors = [];

  if (!fs.existsSync(config.templatePath)) {
    errors.push(`Template não encontrado em ${config.templatePath}.`);
  }

  if (!config.emailTo) {
    errors.push('EMAIL_TO deve ser definido no arquivo .env.');
  }

  if (config.emailDeliveryMode !== 'simulate') {
    if (config.emailProvider === 'smtp') {
      if (!config.smtpHost || !config.smtpPort || !config.smtpFrom) {
        errors.push('Defina SMTP_HOST, SMTP_PORT e SMTP_FROM para usar EMAIL_PROVIDER=smtp.');
      }
    } else if (!config.resendApiKey || !config.resendFrom) {
      errors.push('Defina RESEND_API_KEY e RESEND_FROM para usar EMAIL_PROVIDER=resend.');
    }
  }

  return errors;
}

function createConfig(env = process.env) {
  const fieldMapping = loadFieldMapping();
  const formOptions = loadFormOptions();
  const templateFilename = env.TEMPLATE_FILENAME || DEFAULT_TEMPLATE_FILENAME;
  const templateDir = env.TEMPLATE_DIR ? path.resolve(ROOT_DIR, env.TEMPLATE_DIR) : TEMPLATE_DIR;
  const emailDeliveryMode = env.EMAIL_DELIVERY_MODE === 'simulate' ? 'simulate' : 'live';
  const emailProvider = env.EMAIL_PROVIDER === 'smtp' ? 'smtp' : 'resend';
  const emailTo = env.EMAIL_TO || (emailDeliveryMode === 'simulate' ? 'teste@example.com' : '');

  const config = {
    nodeEnv: env.NODE_ENV || 'development',
    port: toNumber(env.PORT, 3000),
    templateFilename,
    templateDir,
    templatePath: path.join(templateDir, templateFilename),
    emailTo,
    emailDestinationLabel: maskEmailForDisplay(emailTo),
    confirmationEnabled: toBoolean(env.EMAIL_CONFIRMATION_ENABLED, true),
    emailProvider,
    resendApiKey: env.RESEND_API_KEY || '',
    resendFrom: env.RESEND_FROM || 'onboarding@resend.dev',
    smtpHost: env.SMTP_HOST || '',
    smtpPort: toNumber(env.SMTP_PORT, 587),
    smtpSecure: toBoolean(env.SMTP_SECURE, false),
    smtpUser: env.SMTP_USER || '',
    smtpPass: env.SMTP_PASS || '',
    smtpFrom: env.SMTP_FROM || '',
    emailDeliveryMode,
    maxDependentes: fieldMapping.dependentes.length || 5,
    sheetName: env.TEMPLATE_SHEET_NAME || 'SCA',
    auditFilePath: path.join(ROOT_DIR, 'data', 'submission-audit.jsonl'),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    rateLimitWindowMs: toNumber(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMaxRequests: toNumber(env.RATE_LIMIT_MAX_REQUESTS, 20),
    fieldMapping,
    formOptions,
    validationConfig: buildClientValidationConfig()
  };

  config.emailConfigured = hasEmailConfiguration(config);
  config.configErrors = validateConfig(config);
  return config;
}

module.exports = {
  DEFAULT_TEMPLATE_FILENAME,
  MAPPING_PATH,
  ROOT_DIR,
  TEMPLATE_DIR,
  createConfig,
  hasEmailConfiguration,
  loadFieldMapping,
  validateConfig
};
