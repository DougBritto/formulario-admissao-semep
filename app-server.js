const fs = require('fs');
const path = require('path');
const express = require('express');
const { createConfig } = require('./lib/config');
const { validatePayloadDetailed } = require('./lib/validation');
const { buildWorkbookBuffer, buildOutputFilename } = require('./lib/excel');
const { sendInternalEmail, sendCollaboratorConfirmation } = require('./lib/email');
const { createLogger } = require('./lib/logger');
const { recordSubmissionEvent } = require('./lib/audit');

function createApp(config = createConfig(), overrides = {}) {
  const app = express();
  const logger = overrides.logger || createLogger('http');
  const workbookBuilder = overrides.buildWorkbookBuffer || buildWorkbookBuffer;
  const outputFilenameBuilder = overrides.buildOutputFilename || buildOutputFilename;
  const internalEmailSender = overrides.sendInternalEmail || sendInternalEmail;
  const collaboratorConfirmationSender = overrides.sendCollaboratorConfirmation || sendCollaboratorConfirmation;

  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/config', (req, res) => {
    const templateFound = fs.existsSync(config.templatePath);
    const emailConfigured = Boolean(config.resendApiKey);

    logger.info('config_requested', {
      templateFound,
      emailConfigured
    });

    res.json({
      templateFilename: config.templateFilename,
      templateFound,
      maxDependentes: config.maxDependentes,
      emailTo: config.emailTo,
      emailConfigured,
      confirmationEnabled: config.confirmationEnabled,
      formOptions: config.formOptions
    });
  });

  app.post('/api/generate', async (req, res) => {
    try {
      logger.info('submission_received', {
        hasDependentes: Array.isArray(req.body?.dependentes) && req.body.dependentes.length > 0
      });
      await recordSubmissionEvent(config.auditFilePath, 'received', req.body || {}, {
        emailDeliveryMode: config.emailDeliveryMode
      });

      if (!fs.existsSync(config.templatePath)) {
        logger.warn('template_missing', {
          templatePath: config.templatePath
        });
        await recordSubmissionEvent(config.auditFilePath, 'rejected', req.body || {}, {
          reason: 'template_missing'
        });

        return res.status(400).json({
          error: `Template não encontrado. Coloque o arquivo ${config.templateFilename} na pasta templates do projeto.`
        });
      }

      const payload = req.body || {};
      const validationResult = validatePayloadDetailed(payload, config);
      if (!validationResult.isValid) {
        logger.warn('submission_rejected', {
          reason: validationResult.message,
          fieldErrors: validationResult.fieldErrors
        });
        await recordSubmissionEvent(config.auditFilePath, 'rejected', payload, {
          reason: validationResult.message
        });

        return res.status(400).json({
          error: validationResult.message,
          fieldErrors: validationResult.fieldErrors
        });
      }

      const fileBuffer = await workbookBuilder(payload, config);
      const filename = outputFilenameBuilder(payload.nome);

      logger.info('workbook_generated', {
        filename
      });

      await internalEmailSender({ payload, fileBuffer, filename, config });
      logger.info('internal_email_sent', {
        emailTo: config.emailTo,
        filename
      });

      await collaboratorConfirmationSender(payload, config);
      logger.info('confirmation_processed', {
        confirmationEnabled: config.confirmationEnabled,
        recipient: payload.email || null
      });
      await recordSubmissionEvent(config.auditFilePath, 'succeeded', payload, {
        filename,
        emailDeliveryMode: config.emailDeliveryMode,
        confirmationSent: config.confirmationEnabled && Boolean(payload.email)
      });

      return res.json({
        success: true,
        message: `Formulário enviado com sucesso. Para teste, os dados foram encaminhados para ${config.emailTo}.`,
        emailTo: config.emailTo,
        fileName: filename,
        confirmationSent: config.confirmationEnabled && Boolean(payload.email)
      });
    } catch (error) {
      logger.error('submission_failed', {
        message: error.message
      });
      await recordSubmissionEvent(config.auditFilePath, 'failed', req.body || {}, {
        message: error.message
      });

      return res.status(500).json({
        error: 'Não foi possível gerar a planilha e enviar os e-mails de teste. Verifique a configuração da Resend.'
      });
    }
  });

  return app;
}

module.exports = {
  createApp
};
