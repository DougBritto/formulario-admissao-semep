const { normalizeText } = require('./normalizers');
const {
  DATE_FIELD_LABELS,
  FIELD_MESSAGES,
  MAX_LENGTHS,
  NUMERIC_LENGTHS,
  NUMERIC_RANGES,
  REQUIRED_FIELDS
} = require('./validation-config');
const {
  digitsOnly,
  isValidCalendarDate,
  isValidCpf,
  isValidEmail,
  isValidIssuerWithUf,
  isValidPisPasep,
  isValidUf,
  requiresDnvByBirthDate
} = require('./validation-utils');

function setFieldError(fieldErrors, key, message) {
  if (!fieldErrors[key]) {
    fieldErrors[key] = message;
  }
}

function validateRequired(payload, fieldErrors) {
  REQUIRED_FIELDS.forEach(([key, label]) => {
    if (!payload[key] || !String(payload[key]).trim()) {
      setFieldError(fieldErrors, key, FIELD_MESSAGES.required(label));
    }
  });
}

function validateDate(value, label, key, fieldErrors) {
  if (!value) return;
  if (!isValidCalendarDate(value)) {
    setFieldError(fieldErrors, key, FIELD_MESSAGES.invalidDate(label));
  }
}

function validateUf(value, label, key, fieldErrors) {
  if (!value) return;
  if (!isValidUf(value)) {
    setFieldError(fieldErrors, key, FIELD_MESSAGES.invalidUf(label));
  }
}

function validateMaxLength(payload, fieldErrors, prefix = '') {
  Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
    if (!payload[key]) return;
    if (String(payload[key]).trim().length > maxLength) {
      setFieldError(fieldErrors, `${prefix}${key}`, FIELD_MESSAGES.maxLength(maxLength));
    }
  });
}

function validateNumericLength(value, key, fieldErrors, { label, exactLength }) {
  if (!value) return;
  const digits = digitsOnly(value);
  if (digits.length !== exactLength) {
    setFieldError(fieldErrors, key, FIELD_MESSAGES.numericLength(label, exactLength));
  }
}

function validateNumericRange(value, key, fieldErrors, { label, min, max }) {
  if (!value) return;
  const digits = digitsOnly(value);
  if (digits.length < min || digits.length > max) {
    setFieldError(fieldErrors, key, FIELD_MESSAGES.numericRange(label, min, max));
  }
}

function buildSummaryMessage(fieldErrors) {
  if (fieldErrors._global) return fieldErrors._global;
  const firstKey = Object.keys(fieldErrors)[0];
  return firstKey ? fieldErrors[firstKey] : null;
}

function validateDuplicateCpfs(payload, fieldErrors) {
  const seen = new Map();

  function registerCpf(key, value) {
    const digits = digitsOnly(value);
    if (digits.length !== 11) return;

    if (seen.has(digits)) {
      setFieldError(fieldErrors, key, FIELD_MESSAGES.duplicateCpf);
      setFieldError(fieldErrors, seen.get(digits), FIELD_MESSAGES.duplicateCpf);
      return;
    }

    seen.set(digits, key);
  }

  registerCpf('cpf', payload.cpf);
  registerCpf('conjuge_cpf', payload.conjuge_cpf);

  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];
  dependentes.forEach((dependente, index) => {
    registerCpf(`dependentes.${index}.cpf`, dependente?.cpf);
  });
}

function validatePayloadDetailed(payload, config) {
  const fieldErrors = {};
  const allowedEducation = new Set((config.formOptions?.grau_instrucao || []).map((option) => option.value));
  const allowedRace = new Set((config.formOptions?.raca || []).map((option) => option.value));
  const allowedDependenteGrauParentesco = new Set(
    (config.formOptions?.dependente_grau_parentesco || []).map((option) => option.value)
  );
  const allowedDependenteIr = new Set(
    (config.formOptions?.dependente_ir || []).map((option) => option.value)
  );
  const allowedConjugeGrauParentesco = new Set(
    (config.formOptions?.conjuge_grau_parentesco || []).map((option) => option.value)
  );
  const allowedConjugeIr = new Set((config.formOptions?.conjuge_ir || []).map((option) => option.value));

  validateRequired(payload, fieldErrors);

  if (Array.isArray(payload.dependentes) && payload.dependentes.length > config.maxDependentes) {
    setFieldError(fieldErrors, 'dependentes', FIELD_MESSAGES.tooManyDependents(config.maxDependentes));
  }

  if (!config.emailConfigured && config.emailDeliveryMode !== 'simulate') {
    setFieldError(
      fieldErrors,
      '_global',
      config.emailProvider === 'smtp' ? FIELD_MESSAGES.missingSmtp : FIELD_MESSAGES.missingResend
    );
  }

  if (payload.email && !isValidEmail(payload.email)) {
    setFieldError(fieldErrors, 'email', FIELD_MESSAGES.invalidEmail);
  }

  if (payload.grau_instrucao && !allowedEducation.has(payload.grau_instrucao)) {
    setFieldError(fieldErrors, 'grau_instrucao', FIELD_MESSAGES.invalidEducation);
  }

  if (payload.raca && !allowedRace.has(String(payload.raca))) {
    setFieldError(fieldErrors, 'raca', FIELD_MESSAGES.invalidRace);
  }

  if (payload.cpf && !isValidCpf(payload.cpf)) {
    setFieldError(fieldErrors, 'cpf', FIELD_MESSAGES.invalidCpf);
  }

  if (payload.conjuge_cpf && !isValidCpf(payload.conjuge_cpf)) {
    setFieldError(fieldErrors, 'conjuge_cpf', FIELD_MESSAGES.invalidSpouseCpf);
  }

  if (payload.pis_pasep && !isValidPisPasep(payload.pis_pasep)) {
    setFieldError(fieldErrors, 'pis_pasep', FIELD_MESSAGES.invalidPisPasep);
  }

  if (payload.orgao_emissor_rg && !isValidIssuerWithUf(payload.orgao_emissor_rg)) {
    setFieldError(fieldErrors, 'orgao_emissor_rg', FIELD_MESSAGES.invalidRgIssuerWithUf);
  }

  validateDuplicateCpfs(payload, fieldErrors);

  Object.entries(NUMERIC_LENGTHS).forEach(([key, rule]) => {
    validateNumericLength(payload[key], key, fieldErrors, rule);
  });

  Object.entries(NUMERIC_RANGES).forEach(([key, rule]) => {
    validateNumericRange(payload[key], key, fieldErrors, rule);
  });

  DATE_FIELD_LABELS.forEach(([field, label]) => {
    validateDate(payload[field], label, field, fieldErrors);
  });

  validateUf(payload.uf_naturalidade, 'UF da naturalidade', 'uf_naturalidade', fieldErrors);
  validateUf(payload.ctps_uf, 'UF CTPS', 'ctps_uf', fieldErrors);
  validateUf(payload.cnh_uf, 'UF CNH', 'cnh_uf', fieldErrors);
  validateUf(payload.uf_endereco, 'UF', 'uf_endereco', fieldErrors);

  validateMaxLength(payload, fieldErrors);

  if (payload.conjuge_grau_parentesco && !allowedConjugeGrauParentesco.has(String(payload.conjuge_grau_parentesco))) {
    setFieldError(fieldErrors, 'conjuge_grau_parentesco', FIELD_MESSAGES.invalidSpouseRelation);
  }

  if (payload.conjuge_ir && !allowedConjugeIr.has(String(payload.conjuge_ir))) {
    setFieldError(fieldErrors, 'conjuge_ir', FIELD_MESSAGES.invalidSpouseIr);
  }

  if ((payload.conjuge_plano_saude || payload.conjuge_plano_odonto) && !String(payload.conjuge_nome_mae || '').trim()) {
    setFieldError(fieldErrors, 'conjuge_nome_mae', FIELD_MESSAGES.invalidSpouseMotherForPlan);
  }

  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];
  dependentes.forEach((dependente, index) => {
    const nome = normalizeText(dependente.nome, { uppercase: false });
    const prefix = `dependentes.${index}.`;
    const hasSomeValue = Object.values(dependente || {}).some((value) => {
      if (typeof value === 'boolean') return value;
      return String(value || '').trim() !== '';
    });

    if (!hasSomeValue) return;

    if (!nome) {
      setFieldError(fieldErrors, `${prefix}nome`, FIELD_MESSAGES.invalidDependentName);
    }

    if ((dependente.plano_saude || dependente.plano_odonto) && !String(dependente.nome_mae || '').trim()) {
      setFieldError(fieldErrors, `${prefix}nome_mae`, FIELD_MESSAGES.invalidDependentMotherForPlan);
    }

    validateDate(
      dependente.data_nascimento,
      `Data de nascimento do dependente ${nome || index + 1}`,
      `${prefix}data_nascimento`,
      fieldErrors
    );

    if (dependente.cpf && !isValidCpf(dependente.cpf)) {
      setFieldError(fieldErrors, `${prefix}cpf`, FIELD_MESSAGES.invalidDependentCpf);
    }

    if (requiresDnvByBirthDate(dependente.data_nascimento) && !digitsOnly(dependente.dnv)) {
      setFieldError(fieldErrors, `${prefix}dnv`, FIELD_MESSAGES.invalidDependentDnvRequired);
    }

    if (dependente.grau_parentesco && !allowedDependenteGrauParentesco.has(String(dependente.grau_parentesco))) {
      setFieldError(fieldErrors, `${prefix}grau_parentesco`, FIELD_MESSAGES.invalidDependentRelation);
    }

    if (dependente.ir && !allowedDependenteIr.has(String(dependente.ir))) {
      setFieldError(fieldErrors, `${prefix}ir`, FIELD_MESSAGES.invalidDependentIr);
    }

    validateNumericLength(dependente.dnv, `${prefix}dnv`, fieldErrors, NUMERIC_LENGTHS.dnv);
    validateMaxLength(dependente, fieldErrors, prefix);
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
  DATE_FIELD_LABELS,
  FIELD_MESSAGES,
  MAX_LENGTHS,
  NUMERIC_LENGTHS,
  NUMERIC_RANGES,
  REQUIRED_FIELDS,
  digitsOnly,
  isValidCalendarDate,
  isValidCpf,
  isValidEmail,
  isValidPisPasep,
  isValidUf,
  validatePayload,
  validatePayloadDetailed
};
