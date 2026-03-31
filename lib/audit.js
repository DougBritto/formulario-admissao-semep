const fs = require('fs');
const path = require('path');

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function maskCpf(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  return `***${digits.slice(-4)}`;
}

function maskEmail(value) {
  const email = String(value || '').trim();
  if (!email.includes('@')) return null;
  const [user, domain] = email.split('@');
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function summarizePayload(payload = {}) {
  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];

  return {
    nome: payload.nome || null,
    email: maskEmail(payload.email),
    cpf: maskCpf(payload.cpf),
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
    meta
  };

  await appendAuditEvent(auditFilePath, event);
}

module.exports = {
  recordSubmissionEvent
};
