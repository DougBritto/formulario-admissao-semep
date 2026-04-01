const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createConfig } = require('../lib/config');
const {
  isValidCalendarDate,
  isValidCpf,
  isValidPisPasep,
  validatePayload,
  validatePayloadDetailed
} = require('../lib/validation');
const { buildOutputFilename, buildWorkbookBuffer, transformPayload } = require('../lib/excel');
const { createApp } = require('../app-server');

function makeConfig(overrides = {}) {
  return {
    ...createConfig({
      PORT: '3000',
      TEMPLATE_FILENAME: 'FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx',
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
    celular: '91234-5678',
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

test('rejects duplicate cpf between holder, spouse and dependents', () => {
  const payload = makePayload();
  payload.conjuge_cpf = '529.982.247-25';
  payload.dependentes = [
    {
      nome: 'Dependente Teste',
      cpf: '529.982.247-25'
    }
  ];

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(result.fieldErrors.cpf, 'CPF já informado em outro cadastro do formulário.');
  assert.equal(result.fieldErrors.conjuge_cpf, 'CPF já informado em outro cadastro do formulário.');
  assert.equal(result.fieldErrors['dependentes.0.cpf'], 'CPF já informado em outro cadastro do formulário.');
});

test('rejects too many dependents', () => {
  const payload = makePayload();
  payload.dependentes = new Array(6).fill({ nome: 'Filho' });
  assert.equal(validatePayload(payload, makeConfig()), 'A planilha base comporta no máximo 5 dependentes.');
});

test('builds sanitized output filename', () => {
  assert.match(buildOutputFilename('José da Silva'), /^SCA_JOSE_DA_SILVA_\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('keeps workbook select values as official template codes', () => {
  const transformed = transformPayload({
    sexo_funcionario: 'MASCULINO',
    estado_civil: 'CASADO(A)',
    grau_instrucao: '55',
    raca: '8',
    conjuge_sexo: 'FEMININO',
    conjuge_grau_parentesco: '02',
    conjuge_ir: '3',
    dependentes: [{ sexo: 'MASCULINO' }]
  });

  assert.equal(transformed.sexo_funcionario, 'M');
  assert.equal(transformed.estado_civil, 'C');
  assert.equal(transformed.grau_instrucao, '55');
  assert.equal(transformed.raca, '8');
  assert.equal(transformed.conjuge_sexo, 'F');
  assert.equal(transformed.conjuge_grau_parentesco, '02');
  assert.equal(transformed.conjuge_ir, '3');
});

test('writes full education label to workbook while keeping code in payload', async () => {
  const config = makeConfig();
  const payload = makePayload();
  payload.grau_instrucao = '55';

  const workbookBuffer = await buildWorkbookBuffer(payload, config);
  const XlsxPopulate = require('xlsx-populate');
  const workbook = await XlsxPopulate.fromDataAsync(workbookBuffer);
  const sheet = workbook.sheet(config.sheetName);

  assert.equal(transformPayload(payload).grau_instrucao, '55');
  assert.equal(sheet.cell(config.fieldMapping.funcionario.grau_instrucao).value(), '55 SUPERIOR COMPLETO');
});

test('validates cpf check digits', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCpf('529.982.247-24'), false);
});

test('validates pis/pasep format', () => {
  assert.equal(isValidPisPasep('00000005621'), true);
  assert.equal(isValidPisPasep('120.44561.50-3'), false);
  assert.equal(isValidPisPasep('1234567890'), false);
});

test('validates actual calendar dates', () => {
  assert.equal(isValidCalendarDate('29/02/2024'), true);
  assert.equal(isValidCalendarDate('29/02/2025'), false);
  assert.equal(isValidCalendarDate('31/04/2026'), false);
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
  assert.equal(
    result.fieldErrors.pis_pasep,
    'PIS/PASEP deve conter 11 números, sem pontos ou caracteres especiais.'
  );
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

test('requires spouse mother name when spouse is included in plans', () => {
  const payload = makePayload();
  payload.conjuge_nome = 'Maria da Silva';
  payload.conjuge_plano_saude = true;
  payload.conjuge_nome_mae = '';

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(
    result.fieldErrors.conjuge_nome_mae,
    'Nome da mãe do cônjuge é obrigatório para inclusão em plano de saúde ou odontológico.'
  );
});

test('requires dependent mother name when dependent is included in plans', () => {
  const payload = makePayload();
  payload.dependentes = [
    {
      nome: 'Dependente Teste',
      plano_saude: true,
      nome_mae: ''
    }
  ];

  const result = validatePayloadDetailed(payload, makeConfig());

  assert.equal(result.isValid, false);
  assert.equal(
    result.fieldErrors['dependentes.0.nome_mae'],
    'Nome da mãe do dependente é obrigatório para inclusão em plano de saúde ou odontológico.'
  );
});

test('GET /health returns runtime status', async () => {
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
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.ok(data.requestId);
    assert.ok(['ok', 'degraded'].includes(data.status));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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
    assert.equal(data.maxDependentes, 5);
    assert.equal(data.emailConfigured, true);
    assert.equal(data.emailDestinationLabel, 'te***@example.com');
    assert.equal(data.emailProvider, 'resend');
    assert.ok(data.validationConfig);
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
    buildOutputFilename: () => 'SCA_MARIA_DA_SILVA_2026-03-31.xlsx',
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
    assert.equal(data.fileName, 'SCA_MARIA_DA_SILVA_2026-03-31.xlsx');
    assert.equal(data.emailDestinationLabel, 'te***@example.com');
    assert.equal(sent.internal, true);
    assert.equal(sent.confirmation, true);

    const auditLog = fs
      .readFileSync(auditFilePath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.equal(auditLog.length, 2);
    assert.equal(auditLog[0].type, 'received');
    assert.equal(auditLog[1].type, 'succeeded');
    assert.ok(auditLog[0].meta.requestId);
    assert.equal(auditLog[0].payload.email, 'ma***@example.com');
    assert.equal(auditLog[0].payload.cpf, '***.725-25');
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

    const auditLog = fs
      .readFileSync(auditFilePath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.equal(auditLog.length, 2);
    assert.equal(auditLog[0].type, 'received');
    assert.equal(auditLog[1].type, 'rejected');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
