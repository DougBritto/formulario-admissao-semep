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

async function pruneAuditFile(auditFilePath, retentionDays) {
  if (!retentionDays || retentionDays <= 0) return;
  if (!fs.existsSync(auditFilePath)) return;

  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const content = await fs.promises.readFile(auditFilePath, 'utf8');
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);

  const retained = lines.filter((line) => {
    try {
      const parsed = JSON.parse(line);
      const time = Date.parse(parsed.time);
      return Number.isFinite(time) && time >= cutoffTime;
    } catch {
      return false;
    }
  });

  const nextContent = retained.length ? `${retained.join('\n')}\n` : '';
  await fs.promises.writeFile(auditFilePath, nextContent, 'utf8');
}

async function recordSubmissionEvent(auditFilePath, type, payload, meta = {}, options = {}) {
  await pruneAuditFile(auditFilePath, options.retentionDays);

  const event = {
    time: new Date().toISOString(),
    type,
    payload: summarizePayload(payload),
    meta: redactMeta(meta)
  };

  await appendAuditEvent(auditFilePath, event);
}

module.exports = {
  pruneAuditFile,
  recordSubmissionEvent
};
