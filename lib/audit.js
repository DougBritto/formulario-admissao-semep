const fs = require('fs');
const path = require('path');
const { maskCpf, maskEmail, maskName, maskPhone, maskPisPasep, redactMeta } = require('./redaction');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function summarizePayload(payload = {}) {
  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];

  return {
    nome: maskName(payload.nome),
    email: maskEmail(payload.email),
    cpf: maskCpf(payload.cpf),
    celular: maskPhone(payload.celular),
    pis_pasep: maskPisPasep(payload.pis_pasep),
    dependentes: dependentes.length
  };
}

async function appendAuditEvent(auditFilePath, event) {
  ensureDirectory(auditFilePath);
  const line = `${JSON.stringify(event)}\n`;
  await fs.promises.appendFile(auditFilePath, line, 'utf8');
}

async function recordSubmissionEvent(auditFilePath, type, payload, meta = {}) {
  const event = {
    time: new Date().toISOString(),
    type,
    payload: summarizePayload(payload),
    meta: redactMeta(meta)
  };

  await appendAuditEvent(auditFilePath, event);
}

module.exports = {
  recordSubmissionEvent
};
