const { normalizeText } = require('./normalizers');
const { DATE_FIELD_LABELS, REQUIRED_FIELDS } = require('./constants');

const DATE_PATTERN = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF_PATTERN = /^[A-Za-z]{2}$/;

const MAX_LENGTHS = {
  nome: 120,
  naturalidade: 80,
  nome_mae: 120,
  nome_pai: 120,
  grau_instrucao: 80,
  contato_emergencia: 120,
  raca: 40,
  banco: 60,
  agencia: 20,
  conta_pagto: 30,
  rg_numero: 20,
  orgao_emissor_rg: 30,
  ctps_numero: 20,
  ctps_serie: 10,
  cnh_numero: 20,
  cnh_categoria: 5,
  cnh_categoria_outros: 50,
  orgao_emissor_cnh: 30,
  reservista: 30,
  titulo_eleitor: 20,
  titulo_zona: 10,
  titulo_secao: 10,
  endereco: 120,
  numero: 10,
  complemento: 60,
  bairro: 60,
  cidade: 80,
  conjuge_nome: 120,
  conjuge_grau_parentesco: 40,
  conjuge_local_nascimento: 80,
  dnv: 20
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function isRepeatedDigits(value) {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(value) {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

function isValidPisPasep(value) {
  const raw = String(value || '').trim();
  const digits = digitsOnly(raw);
  return raw === digits && digits.length === 11;
}

function setFieldError(fieldErrors, key, message) {
  if (!fieldErrors[key]) {
    fieldErrors[key] = message;
  }
}

function validateRequired(payload, fieldErrors) {
  REQUIRED_FIELDS.forEach(([key, label]) => {
    if (!payload[key] || !String(payload[key]).trim()) {
      setFieldError(fieldErrors, key, `${label} é obrigatório.`);
    }
  });
}

function validateDate(value, label, key, fieldErrors) {
  if (!value) return;
  if (!DATE_PATTERN.test(String(value).trim())) {
    setFieldError(fieldErrors, key, `${label} deve estar no formato dd/mm/aaaa.`);
  }
}

function validateUf(value, label, key, fieldErrors) {
  if (!value) return;
  if (!UF_PATTERN.test(String(value).trim())) {
    setFieldError(fieldErrors, key, `${label} deve conter 2 letras.`);
  }
}

function validateMaxLength(payload, fieldErrors) {
  Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
    if (!payload[key]) return;
    if (String(payload[key]).trim().length > maxLength) {
      setFieldError(fieldErrors, key, `Máximo de ${maxLength} caracteres.`);
    }
  });
}

function validateNumericLength(value, key, fieldErrors, label, exactLength) {
  if (!value) return;
  const digits = digitsOnly(value);
  if (digits.length !== exactLength) {
    setFieldError(fieldErrors, key, `${label} deve ter ${exactLength} dígitos.`);
  }
}

function validateNumericRange(value, key, fieldErrors, label, min, max) {
  if (!value) return;
  const digits = digitsOnly(value);
  if (digits.length < min || digits.length > max) {
    setFieldError(fieldErrors, key, `${label} deve ter entre ${min} e ${max} dígitos.`);
  }
}

function buildSummaryMessage(fieldErrors) {
  if (fieldErrors._global) return fieldErrors._global;

  const firstKey = Object.keys(fieldErrors)[0];
  return firstKey ? fieldErrors[firstKey] : null;
}

function validatePayloadDetailed(payload, config) {
  const fieldErrors = {};
  const allowedEducation = new Set(config.formOptions?.grau_instrucao || []);
  const allowedRace = new Set((config.formOptions?.raca || []).map((option) => option.value));
  const allowedDependenteGrauParentesco = new Set((config.formOptions?.dependente_grau_parentesco || []).map((option) => option.value));
  const allowedDependenteIr = new Set((config.formOptions?.dependente_ir || []).map((option) => option.value));
  const allowedConjugeGrauParentesco = new Set((config.formOptions?.conjuge_grau_parentesco || []).map((option) => option.value));
  const allowedConjugeIr = new Set((config.formOptions?.conjuge_ir || []).map((option) => option.value));

  validateRequired(payload, fieldErrors);

  if (Array.isArray(payload.dependentes) && payload.dependentes.length > config.maxDependentes) {
    setFieldError(fieldErrors, 'dependentes', `A planilha base comporta no máximo ${config.maxDependentes} dependentes.`);
  }

  if (!config.resendApiKey && config.emailDeliveryMode !== 'simulate') {
    setFieldError(fieldErrors, '_global', 'Configuração de envio incompleta. Defina RESEND_API_KEY no arquivo .env.');
  }

  if (payload.email && !EMAIL_PATTERN.test(String(payload.email).trim())) {
    setFieldError(fieldErrors, 'email', 'E-mail inválido.');
  }

  if (payload.grau_instrucao && !allowedEducation.has(payload.grau_instrucao)) {
    setFieldError(fieldErrors, 'grau_instrucao', 'Selecione um grau de instrução válido.');
  }

  if (payload.raca && !allowedRace.has(String(payload.raca))) {
    setFieldError(fieldErrors, 'raca', 'Selecione uma raça válida.');
  }

  if (payload.cpf && !isValidCpf(payload.cpf)) {
    setFieldError(fieldErrors, 'cpf', 'CPF inválido.');
  }

  validateNumericLength(payload.cep, 'cep', fieldErrors, 'CEP', 8);
  validateNumericLength(payload.ddd_celular, 'ddd_celular', fieldErrors, 'DDD', 2);
  validateNumericRange(payload.celular, 'celular', fieldErrors, 'Celular', 10, 11);
  validateNumericLength(payload.cnh_numero, 'cnh_numero', fieldErrors, 'Número da CNH', 11);
  validateNumericLength(payload.titulo_eleitor, 'titulo_eleitor', fieldErrors, 'Título de eleitor', 12);
  validateNumericRange(payload.titulo_zona, 'titulo_zona', fieldErrors, 'Zona', 1, 4);
  validateNumericRange(payload.titulo_secao, 'titulo_secao', fieldErrors, 'Seção', 1, 4);

  DATE_FIELD_LABELS.forEach(([field, label]) => {
    validateDate(payload[field], label, field, fieldErrors);
  });

  validateUf(payload.uf_naturalidade, 'UF da naturalidade', 'uf_naturalidade', fieldErrors);
  validateUf(payload.ctps_uf, 'UF CTPS', 'ctps_uf', fieldErrors);
  validateUf(payload.cnh_uf, 'UF CNH', 'cnh_uf', fieldErrors);
  validateUf(payload.uf_endereco, 'UF', 'uf_endereco', fieldErrors);
  validateMaxLength(payload, fieldErrors);

  if (payload.conjuge_cpf && !isValidCpf(payload.conjuge_cpf)) {
    setFieldError(fieldErrors, 'conjuge_cpf', 'CPF do cônjuge inválido.');
  }

  if (payload.pis_pasep && !isValidPisPasep(payload.pis_pasep)) {
    setFieldError(
      fieldErrors,
      'pis_pasep',
      'PIS/PASEP deve conter 11 números, sem pontos ou caracteres especiais.'
    );
  }

  if (payload.conjuge_grau_parentesco && !allowedConjugeGrauParentesco.has(String(payload.conjuge_grau_parentesco))) {
    setFieldError(fieldErrors, 'conjuge_grau_parentesco', 'Selecione um grau de parentesco válido para o cônjuge.');
  }

  if (payload.conjuge_ir && !allowedConjugeIr.has(String(payload.conjuge_ir))) {
    setFieldError(fieldErrors, 'conjuge_ir', 'Selecione uma opção válida de IR para o cônjuge.');
  }

  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];
  dependentes.forEach((dependente, index) => {
    const nome = normalizeText(dependente.nome, { uppercase: false });
    const prefix = `dependentes.${index}`;
    const hasSomeValue = Object.values(dependente || {}).some((value) => {
      if (typeof value === 'boolean') return value;
      return String(value || '').trim() !== '';
    });

    if (!hasSomeValue) return;

    if (!nome) {
      setFieldError(fieldErrors, `${prefix}.nome`, 'Nome do dependente é obrigatório.');
    }

    validateDate(
      dependente.data_nascimento,
      `Data de nascimento do dependente ${nome || index + 1}`,
      `${prefix}.data_nascimento`,
      fieldErrors
    );

    if (dependente.cpf && !isValidCpf(dependente.cpf)) {
      setFieldError(fieldErrors, `${prefix}.cpf`, `CPF do dependente ${nome || index + 1} inválido.`);
    }

    if (dependente.grau_parentesco && !allowedDependenteGrauParentesco.has(String(dependente.grau_parentesco))) {
      setFieldError(fieldErrors, `${prefix}.grau_parentesco`, 'Selecione um grau de parentesco válido.');
    }

    if (dependente.ir && !allowedDependenteIr.has(String(dependente.ir))) {
      setFieldError(fieldErrors, `${prefix}.ir`, 'Selecione uma opção válida para IR.');
    }

    validateNumericLength(dependente.dnv, `${prefix}.dnv`, fieldErrors, 'DNV', 11);

    Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
      if (!dependente[key]) return;
      if (String(dependente[key]).trim().length > maxLength) {
        setFieldError(fieldErrors, `${prefix}.${key}`, `Máximo de ${maxLength} caracteres.`);
      }
    });
  });

  const isValid = Object.keys(fieldErrors).length === 0;

  return {
    isValid,
    fieldErrors,
    message: isValid ? null : buildSummaryMessage(fieldErrors)
  };
}

function validatePayload(payload, config) {
  return validatePayloadDetailed(payload, config).message;
}

module.exports = {
  REQUIRED_FIELDS,
  digitsOnly,
  isValidCpf,
  isValidPisPasep,
  validatePayload,
  validatePayloadDetailed
};
