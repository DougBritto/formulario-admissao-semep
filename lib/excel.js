const XlsxPopulate = require('xlsx-populate');
const {
  normalizeText,
  normalizeDate,
  normalizeCpf,
  normalizePhone
} = require('./normalizers');

function setCellValue(sheet, address, value) {
  if (!address) return;
  sheet.cell(address).value(value ?? '');
}

function joinPlanoDependentes(dependentes, flag) {
  return dependentes
    .filter((dependente) => dependente && dependente[flag] && dependente.nome)
    .map((dependente) => normalizeText(dependente.nome))
    .join(' | ');
}

function buildOutputFilename(nome) {
  const base =
    normalizeText(nome || 'colaborador')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'COLABORADOR';
  const stamp = new Date().toISOString().slice(0, 10);
  return `SCA_${base}_${stamp}.xlsx`;
}

function transformPayload(payload) {
  const banco = payload.banco || '001';
  const cnhCategoria = payload.cnh_categoria || '';
  const cnhCategoriaOutros = payload.cnh_categoria_outros || cnhCategoria;

  return {
    ...payload,
    nome: normalizeText(payload.nome),
    sexo_funcionario: normalizeText(payload.sexo_funcionario),
    estado_civil: normalizeText(payload.estado_civil),
    naturalidade: normalizeText(payload.naturalidade),
    uf_naturalidade: normalizeText(payload.uf_naturalidade),
    nome_mae: normalizeText(payload.nome_mae),
    nome_pai: normalizeText(payload.nome_pai),
    data_nascimento: normalizeDate(payload.data_nascimento),
    grau_instrucao: normalizeText(payload.grau_instrucao),
    email: normalizeText(payload.email, { uppercase: false }),
    contato_emergencia: normalizeText(payload.contato_emergencia),
    raca: normalizeText(payload.raca),
    banco: normalizeText(banco),
    agencia: normalizeText(payload.agencia, { uppercase: false }),
    conta_pagto: normalizeText(payload.conta_pagto, { uppercase: false }),
    cpf: normalizeCpf(payload.cpf),
    pis_pasep: normalizeText(payload.pis_pasep, { uppercase: false }),
    rg_numero: normalizeText(payload.rg_numero, { uppercase: false }),
    rg_data_emissao: normalizeDate(payload.rg_data_emissao),
    ctps_numero: normalizeText(payload.ctps_numero, { uppercase: false }),
    ctps_serie: normalizeText(payload.ctps_serie, { uppercase: false }),
    ctps_uf: normalizeText(payload.ctps_uf),
    ctps_data_emissao: normalizeDate(payload.ctps_data_emissao),
    cnh_numero: normalizeText(payload.cnh_numero, { uppercase: false }),
    cnh_categoria: normalizeText(cnhCategoria),
    reservista: normalizeText(payload.reservista, { uppercase: false }),
    titulo_eleitor: normalizeText(payload.titulo_eleitor, { uppercase: false }),
    titulo_zona: normalizeText(payload.titulo_zona, { uppercase: false }),
    titulo_secao: normalizeText(payload.titulo_secao, { uppercase: false }),
    orgao_emissor_cnh: normalizeText(payload.orgao_emissor_cnh),
    cnh_data_emissao: normalizeDate(payload.cnh_data_emissao),
    cnh_data_vencimento: normalizeDate(payload.cnh_data_vencimento),
    cnh_categoria_outros: normalizeText(cnhCategoriaOutros),
    cnh_uf: normalizeText(payload.cnh_uf),
    orgao_emissor_rg: normalizeText(payload.orgao_emissor_rg),
    endereco: normalizeText(payload.endereco),
    numero: normalizeText(payload.numero, { uppercase: false }),
    complemento: normalizeText(payload.complemento),
    bairro: normalizeText(payload.bairro),
    uf_endereco: normalizeText(payload.uf_endereco),
    cidade: normalizeText(payload.cidade),
    cep: normalizeText(payload.cep, { uppercase: false }),
    ddd_celular: normalizeText(payload.ddd_celular, { uppercase: false }),
    celular: normalizePhone(payload.celular),
    conjuge_nome: normalizeText(payload.conjuge_nome),
    conjuge_data_nascimento: normalizeDate(payload.conjuge_data_nascimento),
    conjuge_sexo: normalizeText(payload.conjuge_sexo),
    conjuge_grau_parentesco: normalizeText(payload.conjuge_grau_parentesco),
    conjuge_ir: normalizeText(payload.conjuge_ir),
    conjuge_local_nascimento: normalizeText(payload.conjuge_local_nascimento),
    conjuge_cpf: normalizeCpf(payload.conjuge_cpf),
    conjuge_data_casamento: normalizeDate(payload.conjuge_data_casamento),
    conjuge_nome_mae: normalizeText(payload.conjuge_nome_mae),
    conjuge_nome_pai: normalizeText(payload.conjuge_nome_pai)
  };
}

async function assertTemplateReady(config) {
  const workbook = await XlsxPopulate.fromFileAsync(config.templatePath);
  const sheet = workbook.sheet(config.sheetName);

  if (!sheet) {
    throw new Error(`A aba ${config.sheetName} não foi encontrada no template ${config.templateFilename}.`);
  }

  return true;
}

async function buildWorkbookBuffer(payload, config) {
  const workbook = await XlsxPopulate.fromFileAsync(config.templatePath);
  const sheet = workbook.sheet(config.sheetName);
  const transformed = transformPayload(payload);
  const funcionarioMap = config.fieldMapping.funcionario;

  Object.entries(funcionarioMap).forEach(([key, address]) => {
    if (key === 'plano_saude_dependentes' || key === 'plano_odonto_dependentes') return;
    setCellValue(sheet, address, transformed[key] ?? '');
  });

  const dependentes = Array.isArray(payload.dependentes)
    ? payload.dependentes.slice(0, config.maxDependentes)
    : [];

  config.fieldMapping.dependentes.forEach((mapping, index) => {
    const dependente = dependentes[index] || {};
    setCellValue(sheet, mapping.nome, normalizeText(dependente.nome));
    setCellValue(sheet, mapping.data_nascimento, normalizeDate(dependente.data_nascimento));
    setCellValue(sheet, mapping.sexo, normalizeText(dependente.sexo));
    setCellValue(sheet, mapping.grau_parentesco, normalizeText(dependente.grau_parentesco));
    setCellValue(sheet, mapping.ir, normalizeText(dependente.ir));
    setCellValue(sheet, mapping.local_nascimento, normalizeText(dependente.local_nascimento));
    setCellValue(sheet, mapping.cpf, normalizeCpf(dependente.cpf));
    setCellValue(sheet, mapping.dnv, normalizeText(dependente.dnv, { uppercase: false }));
    setCellValue(sheet, mapping.nome_mae, normalizeText(dependente.nome_mae));
    setCellValue(sheet, mapping.nome_pai, normalizeText(dependente.nome_pai));
  });

  setCellValue(
    sheet,
    funcionarioMap.plano_saude_dependentes,
    joinPlanoDependentes(dependentes, 'plano_saude')
  );
  setCellValue(
    sheet,
    funcionarioMap.plano_odonto_dependentes,
    joinPlanoDependentes(dependentes, 'plano_odonto')
  );

  return workbook.outputAsync();
}

module.exports = {
  assertTemplateReady,
  buildOutputFilename,
  buildWorkbookBuffer,
  transformPayload
};
