const fs = require('fs');
const path = require('path');
const express = require('express');
const { createConfig } = require('./lib/config');
const { validatePayloadDetailed } = require('./lib/validation');
const { buildWorkbookBuffer, buildOutputFilename } = require('./lib/excel');
const { sendInternalEmail, sendCollaboratorConfirmation } = require('./lib/email');
const { createLogger } = require('./lib/logger');
const { recordSubmissionEvent } = require('./lib/audit');
const { maskEmailForDisplay } = require('./lib/redaction');
const {
  createCorsMiddleware,
  createNoStoreMiddleware,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createSecurityHeadersMiddleware
} = require('./lib/http-security');

function requestMeta(req, extra = {}) {
  return {
    requestId: req.requestId,
    ...extra
  };
}

function createApp(config = createConfig(), overrides = {}) {
  const app = express();
  const logger = overrides.logger || createLogger('http');
  const workbookBuilder = overrides.buildWorkbookBuffer || buildWorkbookBuffer;
  const outputFilenameBuilder = overrides.buildOutputFilename || buildOutputFilename;
  const internalEmailSender = overrides.sendInternalEmail || sendInternalEmail;
  const collaboratorConfirmationSender = overrides.sendCollaboratorConfirmation || sendCollaboratorConfirmation;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(createRequestIdMiddleware());
  app.use(createSecurityHeadersMiddleware());
  app.use(createCorsMiddleware(config.allowedOrigins));
  app.use(createNoStoreMiddleware());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (req, res) => {
    const templateFound = fs.existsSync(config.templatePath);

    return res.json({
      status: templateFound && config.emailConfigured ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      requestId: req.requestId,
      templateFound,
      emailConfigured: config.emailConfigured,
      emailProvider: config.emailProvider
    });
  });

  app.get('/api/config', (req, res) => {
    const templateFound = fs.existsSync(config.templatePath);

    logger.info(
      'config_requested',
      requestMeta(req, {
        templateFound,
        emailConfigured: config.emailConfigured
      })
    );

    res.json({
      requestId: req.requestId,
      templateFilename: config.templateFilename,
      templateFound,
      maxDependentes: config.maxDependentes,
      emailConfigured: config.emailConfigured,
      emailDestinationLabel: config.emailDestinationLabel,
      emailProvider: config.emailProvider,
      confirmationEnabled: config.confirmationEnabled,
      formOptions: config.formOptions,
      validationConfig: config.validationConfig
    });
  });

  app.post(
    '/api/generate',
    createRateLimitMiddleware({
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests,
      keyPrefix: 'generate'
    }),
    async (req, res) => {
      try {
        logger.info(
          'submission_received',
          requestMeta(req, {
            hasDependentes: Array.isArray(req.body?.dependentes) && req.body.dependentes.length > 0
          })
        );
        await recordSubmissionEvent(
          config.auditFilePath,
          'received',
          req.body || {},
          {
            requestId: req.requestId,
            emailDeliveryMode: config.emailDeliveryMode
          },
          {
            retentionDays: config.auditRetentionDays
          }
        );

        if (!fs.existsSync(config.templatePath)) {
          logger.warn(
            'template_missing',
            requestMeta(req, {
              templateFilename: config.templateFilename
            })
          );
          await recordSubmissionEvent(
            config.auditFilePath,
            'rejected',
            req.body || {},
            {
              requestId: req.requestId,
              reason: 'template_missing'
            },
            {
              retentionDays: config.auditRetentionDays
            }
          );

          return res.status(400).json({
            requestId: req.requestId,
            error: `Template não encontrado. Coloque o arquivo ${config.templateFilename} em ${config.templateDir}.`
          });
        }

        const payload = req.body || {};
        const validationResult = validatePayloadDetailed(payload, config);
        if (!validationResult.isValid) {
          logger.warn(
            'submission_rejected',
            requestMeta(req, {
              reason: validationResult.message,
              fieldErrors: validationResult.fieldErrors
            })
          );
          await recordSubmissionEvent(
            config.auditFilePath,
            'rejected',
            payload,
            {
              requestId: req.requestId,
              reason: validationResult.message
            },
            {
              retentionDays: config.auditRetentionDays
            }
          );

          return res.status(400).json({
            requestId: req.requestId,
            error: validationResult.message,
            fieldErrors: validationResult.fieldErrors
          });
        }

        const fileBuffer = await workbookBuilder(payload, config);
        const filename = outputFilenameBuilder(payload.nome);

        logger.info('workbook_generated', requestMeta(req));

        await internalEmailSender({ payload, fileBuffer, filename, config });
        logger.info(
          'internal_email_sent',
          requestMeta(req, {
            emailTo: config.emailDestinationLabel
          })
        );

        await collaboratorConfirmationSender(payload, config);
        logger.info(
          'confirmation_processed',
          requestMeta(req, {
            confirmationEnabled: config.confirmationEnabled,
            recipient: maskEmailForDisplay(payload.email || '')
          })
        );
        await recordSubmissionEvent(
          config.auditFilePath,
          'succeeded',
          payload,
          {
            requestId: req.requestId,
            emailDeliveryMode: config.emailDeliveryMode,
            confirmationSent: config.confirmationEnabled && Boolean(payload.email)
          },
          {
            retentionDays: config.auditRetentionDays
          }
        );

        return res.json({
          requestId: req.requestId,
          success: true,
          message: 'Formulário enviado com sucesso. Os dados foram encaminhados para tratamento interno.',
          emailDestinationLabel: config.emailDestinationLabel,
          confirmationSent: config.confirmationEnabled && Boolean(payload.email)
        });
      } catch (error) {
        logger.error(
          'submission_failed',
          requestMeta(req, {
            message: error.message
          })
        );
        await recordSubmissionEvent(
          config.auditFilePath,
          'failed',
          req.body || {},
          {
            requestId: req.requestId,
            message: error.message
          },
          {
            retentionDays: config.auditRetentionDays
          }
        );

        return res.status(500).json({
          requestId: req.requestId,
          error: 'Não foi possível gerar a planilha e enviar os e-mails. Verifique a configuração de envio.'
        });
      }
    }
  );

  return app;
}

module.exports = {
  createApp
};
