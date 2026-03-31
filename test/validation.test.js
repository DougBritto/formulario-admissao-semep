const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createConfig } = require('../lib/config');
const { isValidCpf, isValidPisPasep, validatePayload, validatePayloadDetailed } = require('../lib/validation');
const { buildOutputFilename } = require('../lib/excel');
const { createApp } = require('../app-server');

function makeConfig(overrides = {}) {
  return {
    ...createConfig({
      PORT: '3000',
      TEMPLATE_FILENAME: 'FOR 33 RH - Solicitação de Cadastro e Admissão Rev 05.xlsx',
      RESEND_API_KEY: 'test-key',
      RESEND_FROM: 'onboarding@resend.dev',
      EMAIL_TO: 'teste@example.com',
      EMAIL_CONFIRMATION_ENABLED: 'true',
      EMAIL_DELIVERY_MODE: 'simulate'
    }),
    ...overrides
  };
}

function makePayload() {
  return {
    nome: 'Maria da Silva',
    sexo_funcionario: 'FEMININO',
    estado_civil: 'SOLTEIRO(A)',
    data_nascimento: '10/10/1990',
    cpf: '529.982.247-25',
    email: 'maria@example.com',
    celular: '(11) 91234-5678',
    dependentes: []
  };
}

function makeAuditFilePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admissoes-audit-'));
  return path.join(dir, 'submission-audit.jsonl');
}

test('accepts a valid payload', () => {
  const error = validatePayload(makePayload(), makeConfig());
  assert.equal(error, null);
});

test('rejects invalid cpf', () => {
  const payload = makePayload();
  payload.cpf = '123';
  assert.equal(validatePayload(payload, makeConfig()), 'CPF inválido.');
});

test('rejects too many dependents', () => {
  const payload = makePayload();
  payload.dependentes = new Array(6).fill({ nome: 'Filho' });
  assert.equal(validatePayload(payload, makeConfig()), 'A planilha base comporta no máximo 5 dependentes.');
});

test('builds sanitized output filename', () => {
  assert.match(buildOutputFilename('José da Silva'), /^SCA_JOSE_DA_SILVA_\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('validates cpf check digits', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCpf('529.982.247-24'), false);
});

test('validates pis/pasep check digit', () => {
  assert.equal(isValidPisPasep('00000005621'), true);
  assert.equal(isValidPisPasep('120.44561.50-3'), false);
  assert.equal(isValidPisPasep('1234567890'), false);
});

test('returns field errors map for invalid payload', () => {
  const payload = makePayload();
  payload.cpf = '123';
  payload.cep = '123';
  payload.pis_pasep = '120.44561.50-3';

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors.cpf, 'CPF inválido.');
  assert.equal(result.fieldErrors.cep, 'CEP deve ter 8 dígitos.');
  assert.equal(result.fieldErrors.pis_pasep, 'PIS/PASEP deve conter 11 números, sem pontos ou caracteres especiais.');
});

test('rejects invalid select options from workbook-backed lists', () => {
  const payload = makePayload();
  payload.grau_instrucao = 'QUALQUER COISA';
  payload.raca = '99';

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors.grau_instrucao, 'Selecione um grau de instrução válido.');
  assert.equal(result.fieldErrors.raca, 'Selecione uma raça válida.');
});

test('rejects invalid dependent select options from workbook-backed lists', () => {
  const payload = makePayload();
  payload.dependentes = [
    {
      nome: 'Dependente Teste',
      grau_parentesco: '99',
      ir: '99'
    }
  ];

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors['dependentes.0.grau_parentesco'], 'Selecione um grau de parentesco válido.');
  assert.equal(result.fieldErrors['dependentes.0.ir'], 'Selecione uma opção válida para IR.');
});

test('rejects invalid spouse select options from workbook-backed lists', () => {
  const payload = makePayload();
  payload.conjuge_grau_parentesco = '99';
  payload.conjuge_ir = '99';

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors.conjuge_grau_parentesco, 'Selecione um grau de parentesco válido para o cônjuge.');
  assert.equal(result.fieldErrors.conjuge_ir, 'Selecione uma opção válida de IR para o cônjuge.');
});

test('GET /api/config returns runtime configuration', async () => {
  const config = makeConfig({
    auditFilePath: makeAuditFilePath()
  });
  const app = createApp(config, {
    logger: { info() {}, warn() {}, error() {} }
  });
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/config`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.emailTo, 'teste@example.com');
    assert.equal(data.maxDependentes, 5);
    assert.equal(data.emailConfigured, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/generate returns success with injected services and writes audit log', async () => {
  const auditFilePath = makeAuditFilePath();
  const config = makeConfig({
    auditFilePath
  });
  const sent = {
    internal: false,
    confirmation: false
  };

  const app = createApp(config, {
    logger: { info() {}, warn() {}, error() {} },
    buildWorkbookBuffer: async () => Buffer.from('arquivo'),
    buildOutputFilename: () => 'SCA_MARIA_DA_SILVA_2026-03-30.xlsx',
    sendInternalEmail: async () => {
      sent.internal = true;
    },
    sendCollaboratorConfirmation: async () => {
      sent.confirmation = true;
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload())
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.fileName, 'SCA_MARIA_DA_SILVA_2026-03-30.xlsx');
    assert.equal(sent.internal, true);
    assert.equal(sent.confirmation, true);

    const auditLog = fs.readFileSync(auditFilePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(auditLog.length, 2);
    assert.equal(auditLog[0].type, 'received');
    assert.equal(auditLog[1].type, 'succeeded');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/generate returns validation error and records rejection', async () => {
  const auditFilePath = makeAuditFilePath();
  const config = makeConfig({
    auditFilePath
  });
  const app = createApp(config, {
    logger: { info() {}, warn() {}, error() {} }
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const invalidPayload = makePayload();
    invalidPayload.cpf = '123';

    const response = await fetch(`http://127.0.0.1:${port}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, 'CPF inválido.');
    assert.equal(data.fieldErrors.cpf, 'CPF inválido.');

    const auditLog = fs.readFileSync(auditFilePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(auditLog.length, 2);
    assert.equal(auditLog[0].type, 'received');
    assert.equal(auditLog[1].type, 'rejected');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
