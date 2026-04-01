const fs = require('fs');
const path = require('path');
const express = require('express');
const { createConfig, resolveOperation } = require('./lib/config');
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

function getRequestedOperation(req) {
  return req.params?.operacao || req.query?.operacao || '';
}

function resolveRequestConfig(req, config) {
  return resolveOperation(config, getRequestedOperation(req));
}

function sendUnknownOperation(res, req, resolvedOperation) {
  return res.status(404).json({
    requestId: req.requestId,
    error: `Operação não configurada: ${resolvedOperation.requestedKey}.`
  });
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

  app.get('/op/:operacao', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (req, res) => {
    const runtimeConfig = resolveRequestConfig(req, config);
    if (!runtimeConfig.isKnown) {
      return sendUnknownOperation(res, req, runtimeConfig);
    }

    const templateFound = fs.existsSync(runtimeConfig.templatePath);

    return res.json({
      status: templateFound && runtimeConfig.emailConfigured ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      requestId: req.requestId,
      templateFound,
      emailConfigured: runtimeConfig.emailConfigured,
      emailProvider: runtimeConfig.emailProvider,
      operationKey: runtimeConfig.operationKey,
      operationLabel: runtimeConfig.operationLabel
    });
  });

  app.get('/api/config', (req, res) => {
    const runtimeConfig = resolveRequestConfig(req, config);
    if (!runtimeConfig.isKnown) {
      return sendUnknownOperation(res, req, runtimeConfig);
    }

    const templateFound = fs.existsSync(runtimeConfig.templatePath);

    logger.info(
      'config_requested',
      requestMeta(req, {
        operationKey: runtimeConfig.operationKey,
        templateFound,
        emailConfigured: runtimeConfig.emailConfigured
      })
    );

    res.json({
      requestId: req.requestId,
      templateFilename: runtimeConfig.templateFilename,
      templateFound,
      maxDependentes: runtimeConfig.maxDependentes,
      emailConfigured: runtimeConfig.emailConfigured,
      emailDestinationLabel: runtimeConfig.emailDestinationLabel,
      emailProvider: runtimeConfig.emailProvider,
      confirmationEnabled: runtimeConfig.confirmationEnabled,
      formOptions: runtimeConfig.formOptions,
      validationConfig: runtimeConfig.validationConfig,
      operationKey: runtimeConfig.operationKey,
      operationLabel: runtimeConfig.operationLabel
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
      const runtimeConfig = resolveRequestConfig(req, config);
      if (!runtimeConfig.isKnown) {
        return sendUnknownOperation(res, req, runtimeConfig);
      }

      try {
        logger.info(
          'submission_received',
          requestMeta(req, {
            operationKey: runtimeConfig.operationKey,
            hasDependentes: Array.isArray(req.body?.dependentes) && req.body.dependentes.length > 0
          })
        );
        await recordSubmissionEvent(
          runtimeConfig.auditFilePath,
          'received',
          req.body || {},
          {
            requestId: req.requestId,
            operationKey: runtimeConfig.operationKey,
            emailDeliveryMode: runtimeConfig.emailDeliveryMode
          },
          {
            retentionDays: runtimeConfig.auditRetentionDays
          }
        );

        if (!fs.existsSync(runtimeConfig.templatePath)) {
          logger.warn(
            'template_missing',
            requestMeta(req, {
              operationKey: runtimeConfig.operationKey,
              templateFilename: runtimeConfig.templateFilename
            })
          );
          await recordSubmissionEvent(
            runtimeConfig.auditFilePath,
            'rejected',
            req.body || {},
            {
              requestId: req.requestId,
              operationKey: runtimeConfig.operationKey,
              reason: 'template_missing'
            },
            {
              retentionDays: runtimeConfig.auditRetentionDays
            }
          );

          return res.status(400).json({
            requestId: req.requestId,
            error: `Template não encontrado. Coloque o arquivo ${runtimeConfig.templateFilename} em ${runtimeConfig.templateDir}.`
          });
        }

        const payload = req.body || {};
        const validationResult = validatePayloadDetailed(payload, runtimeConfig);
        if (!validationResult.isValid) {
          logger.warn(
            'submission_rejected',
            requestMeta(req, {
              operationKey: runtimeConfig.operationKey,
              reason: validationResult.message,
              fieldErrors: validationResult.fieldErrors
            })
          );
          await recordSubmissionEvent(
            runtimeConfig.auditFilePath,
            'rejected',
            payload,
            {
              requestId: req.requestId,
              operationKey: runtimeConfig.operationKey,
              reason: validationResult.message
            },
            {
              retentionDays: runtimeConfig.auditRetentionDays
            }
          );

          return res.status(400).json({
            requestId: req.requestId,
            error: validationResult.message,
            fieldErrors: validationResult.fieldErrors
          });
        }

        const fileBuffer = await workbookBuilder(payload, runtimeConfig);
        const filename = outputFilenameBuilder(payload.nome);

        logger.info('workbook_generated', requestMeta(req, { operationKey: runtimeConfig.operationKey }));

        await internalEmailSender({ payload, fileBuffer, filename, config: runtimeConfig });
        logger.info(
          'internal_email_sent',
          requestMeta(req, {
            operationKey: runtimeConfig.operationKey,
            emailTo: runtimeConfig.emailDestinationLabel
          })
        );

        await collaboratorConfirmationSender(payload, runtimeConfig);
        logger.info(
          'confirmation_processed',
          requestMeta(req, {
            operationKey: runtimeConfig.operationKey,
            confirmationEnabled: runtimeConfig.confirmationEnabled,
            recipient: maskEmailForDisplay(payload.email || '')
          })
        );
        await recordSubmissionEvent(
          runtimeConfig.auditFilePath,
          'succeeded',
          payload,
          {
            requestId: req.requestId,
            operationKey: runtimeConfig.operationKey,
            emailDeliveryMode: runtimeConfig.emailDeliveryMode,
            confirmationSent: runtimeConfig.confirmationEnabled && Boolean(payload.email)
          },
          {
            retentionDays: runtimeConfig.auditRetentionDays
          }
        );

        return res.json({
          requestId: req.requestId,
          success: true,
          message: 'Formulário enviado com sucesso. Os dados foram encaminhados para tratamento interno.',
          emailDestinationLabel: runtimeConfig.emailDestinationLabel,
          confirmationSent: runtimeConfig.confirmationEnabled && Boolean(payload.email),
          operationKey: runtimeConfig.operationKey,
          operationLabel: runtimeConfig.operationLabel
        });
      } catch (error) {
        logger.error(
          'submission_failed',
          requestMeta(req, {
            operationKey: runtimeConfig.operationKey,
            message: error.message
          })
        );
        await recordSubmissionEvent(
          runtimeConfig.auditFilePath,
          'failed',
          req.body || {},
          {
            requestId: req.requestId,
            operationKey: runtimeConfig.operationKey,
            message: error.message
          },
          {
            retentionDays: runtimeConfig.auditRetentionDays
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
