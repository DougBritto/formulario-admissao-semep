const form = document.getElementById('admissionForm');
const feedback = document.getElementById('feedback');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');
const templateStatus = document.getElementById('templateStatus');
const addDependentBtn = document.getElementById('addDependentBtn');
const dependentsContainer = document.getElementById('dependentsContainer');
const dependentTemplate = document.getElementById('dependentTemplate');
const emailTarget = document.getElementById('emailTarget');
const dependentsHint = document.getElementById('dependentsHint');
const grauInstrucaoSelect = document.getElementById('grauInstrucaoSelect');
const racaSelect = document.getElementById('racaSelect');
const conjugeGrauParentescoSelect = document.getElementById('conjugeGrauParentescoSelect');
const conjugeIrSelect = document.getElementById('conjugeIrSelect');

let maxDependentes = 5;
let formOptions = {
  grau_instrucao: [],
  raca: []
};
let validationConfig = {
  requiredFields: [],
  dateFieldLabels: [],
  maxLengths: {},
  numericLengths: {},
  numericRanges: {},
  fieldMessages: {}
};

function setFeedback(message = '', type = '') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidUf(value) {
  return /^[A-Za-z]{2}$/.test(String(value || '').trim());
}

function normalizeIssuerWithUf(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

function isValidIssuerWithUf(value) {
  const normalized = normalizeIssuerWithUf(value);
  if (!normalized) return true;

  return /^[A-Z]{2,10}(?:[ .-][A-Z]{2,10})*\/[A-Z]{2}$/.test(normalized);
}

function isValidCalendarDate(value) {
  const text = String(value || '').trim();
  if (!text) return true;

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function requiresDnvByBirthDate(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const cutoff = new Date(2010, 1, 1);
  return date >= cutoff;
}

function applyMask(value, type) {
  const digits = digitsOnly(value);

  if (type === 'cpf') {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  if (type === 'cep') {
    return digits.slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  }

  if (type === 'ddd') {
    return digits.slice(0, 2);
  }

  if (type === 'phone') {
    return digits
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  if (type === 'cellphone') {
    return digits
      .slice(0, 9)
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  if (type === 'date') {
    return digits
      .slice(0, 8)
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2');
  }

  return value;
}

function applyNumericOnly(value, maxLength) {
  const digits = digitsOnly(value);
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
}

function padPisPasep(value) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.slice(0, 11).padStart(11, '0');
}

function padContaPagto(value) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.slice(0, 12).padStart(12, '0');
}

function fillSelectOptions(selectElement, options, formatter = (option) => option) {
  if (!selectElement) return;
  const currentValue = selectElement.value;
  selectElement.innerHTML = '<option value="">Selecione</option>';

  options.forEach((option) => {
    const normalized = formatter(option);
    const optionElement = document.createElement('option');
    optionElement.value = normalized.value;
    optionElement.textContent = normalized.label;
    selectElement.appendChild(optionElement);
  });

  selectElement.value = currentValue;
}

function populateDynamicSelects(root = document) {
  root.querySelectorAll('[data-options-source]').forEach((selectElement) => {
    const source = selectElement.dataset.optionsSource;
    fillSelectOptions(selectElement, formOptions[source] || [], (option) => option);
  });
}

function ensureErrorElement(field) {
  const label = field.closest('label');
  if (!label) return null;

  let errorElement = label.querySelector('.field-error');
  if (!errorElement) {
    errorElement = document.createElement('small');
    errorElement.className = 'field-error';
    label.appendChild(errorElement);
  }

  return errorElement;
}

function clearFieldError(field) {
  if (!field) return;
  field.classList.remove('field-invalid');

  const label = field.closest('label');
  if (!label) return;

  label.classList.remove('has-error');
  const errorElement = ensureErrorElement(field);
  if (errorElement) {
    errorElement.textContent = '';
  }
}

function setFieldError(field, message) {
  if (!field) return;

  field.classList.add('field-invalid');
  const label = field.closest('label');
  if (label) {
    label.classList.add('has-error');
  }

  const errorElement = ensureErrorElement(field);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearAllFieldErrors(root = document) {
  root.querySelectorAll('.field-invalid').forEach((field) => field.classList.remove('field-invalid'));
  root.querySelectorAll('.has-error').forEach((label) => label.classList.remove('has-error'));
  root.querySelectorAll('.field-error').forEach((element) => {
    element.textContent = '';
  });
}

function getFieldByKey(key) {
  if (!key || key === '_global' || key === 'dependentes') return null;

  if (key.startsWith('dependentes.')) {
    const [, indexText, fieldName] = key.split('.');
    const cards = dependentsContainer.querySelectorAll('.dependent-card');
    const card = cards[Number(indexText)];
    if (!card) return null;
    return card.querySelector(`[data-field="${fieldName}"]`);
  }

  return form.querySelector(`[name="${key}"]`);
}

function applyFieldErrors(fieldErrors = {}) {
  Object.entries(fieldErrors).forEach(([key, message]) => {
    const field = getFieldByKey(key);
    if (field) {
      setFieldError(field, message);
    }
  });
}

function attachFieldValidation(field) {
  const eventName = field.tagName === 'SELECT' || field.type === 'checkbox' ? 'change' : 'input';
  field.addEventListener(eventName, () => {
    clearFieldError(field);
    setFeedback('');
  });
}

function applyMasks(root = document) {
  root.querySelectorAll('[data-mask]').forEach((input) => {
    input.addEventListener('input', (event) => {
      event.target.value = applyMask(event.target.value, event.target.dataset.mask);
    });
  });

  root.querySelectorAll('[data-numeric-only]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const maxLength = Number(event.target.dataset.numericOnly) || undefined;
      event.target.value = applyNumericOnly(event.target.value, maxLength);
    });
  });

  root.querySelectorAll('input[name="pis_pasep"]').forEach((input) => {
    input.addEventListener('blur', (event) => {
      event.target.value = padPisPasep(event.target.value);
    });
  });

  root.querySelectorAll('input[name="conta_pagto"]').forEach((input) => {
    input.addEventListener('blur', (event) => {
      event.target.value = padContaPagto(event.target.value);
    });
  });

  root.querySelectorAll('input[name="orgao_emissor_rg"]').forEach((input) => {
    input.addEventListener('blur', (event) => {
      event.target.value = normalizeIssuerWithUf(event.target.value);
    });
  });
}

function initializeFieldHelpers(root = document) {
  root.querySelectorAll('input, select, textarea').forEach((field) => {
    ensureErrorElement(field);
    attachFieldValidation(field);
  });
}

function dependentCount() {
  return dependentsContainer.querySelectorAll('.dependent-card').length;
}

function updateDependentsHint() {
  dependentsHint.textContent = `Adicione até ${maxDependentes} dependentes, conforme a capacidade da planilha-base.`;
}

function refreshDependentIndexes() {
  dependentsContainer.querySelectorAll('.dependent-card').forEach((card, index) => {
    card.querySelector('.dependent-index').textContent = String(index + 1);
  });

  addDependentBtn.disabled = dependentCount() >= maxDependentes;
}

function addDependent(initialData = {}) {
  if (dependentCount() >= maxDependentes) return;

  const fragment = dependentTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.dependent-card');

  card.querySelectorAll('[data-field]').forEach((field) => {
    const key = field.dataset.field;
    if (field.type === 'checkbox') {
      field.checked = Boolean(initialData[key]);
    } else {
      field.value = initialData[key] || '';
    }
  });

  card.querySelector('.remove-dependent').addEventListener('click', () => {
    card.remove();
    refreshDependentIndexes();
  });

  dependentsContainer.appendChild(card);
  populateDynamicSelects(card);
  applyMasks(card);
  initializeFieldHelpers(card);
  refreshDependentIndexes();
}

function serializeDependents() {
  return Array.from(dependentsContainer.querySelectorAll('.dependent-card')).map((card) => {
    const result = {};
    card.querySelectorAll('[data-field]').forEach((field) => {
      const key = field.dataset.field;
      result[key] = field.type === 'checkbox' ? field.checked : field.value.trim();
    });
    return result;
  });
}

function serializeForm() {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.banco = '001';
  payload.cnh_categoria_outros = payload.cnh_categoria || '';
  payload.conjuge_plano_saude = form.querySelector('[name="conjuge_plano_saude"]')?.checked || false;
  payload.conjuge_plano_odonto = form.querySelector('[name="conjuge_plano_odonto"]')?.checked || false;
  payload.dependentes = serializeDependents();
  return payload;
}

function setValidationError(fieldErrors, key, message) {
  if (!fieldErrors[key]) {
    fieldErrors[key] = message;
  }
}

function validateRequiredFields(payload, fieldErrors) {
  validationConfig.requiredFields.forEach(({ key, label }) => {
    if (!String(payload[key] || '').trim()) {
      setValidationError(fieldErrors, key, `${label} é obrigatório.`);
    }
  });
}

function validateMaxLengths(payload, fieldErrors, prefix = '') {
  Object.entries(validationConfig.maxLengths).forEach(([key, maxLength]) => {
    if (!payload[key]) return;
    if (String(payload[key]).trim().length > maxLength) {
      setValidationError(fieldErrors, `${prefix}${key}`, `Máximo de ${maxLength} caracteres.`);
    }
  });
}

function validateFormPayload(payload) {
  const fieldErrors = {};
  const messages = validationConfig.fieldMessages;
  const duplicateCpfMap = new Map();

  function registerCpf(key, value) {
    const digits = digitsOnly(value);
    if (digits.length !== 11) return;

    if (duplicateCpfMap.has(digits)) {
      setValidationError(fieldErrors, key, messages.duplicateCpf);
      setValidationError(fieldErrors, duplicateCpfMap.get(digits), messages.duplicateCpf);
      return;
    }

    duplicateCpfMap.set(digits, key);
  }

  validateRequiredFields(payload, fieldErrors);

  if (payload.email && !isValidEmail(payload.email)) {
    setValidationError(fieldErrors, 'email', messages.invalidEmail);
  }

  if (
    payload.grau_instrucao &&
    !(formOptions.grau_instrucao || []).some((option) => option.value === payload.grau_instrucao)
  ) {
    setValidationError(fieldErrors, 'grau_instrucao', messages.invalidEducation);
  }

  if (payload.raca && !(formOptions.raca || []).some((option) => option.value === payload.raca)) {
    setValidationError(fieldErrors, 'raca', messages.invalidRace);
  }

  if (
    payload.conjuge_grau_parentesco &&
    !(formOptions.conjuge_grau_parentesco || []).some(
      (option) => option.value === payload.conjuge_grau_parentesco
    )
  ) {
    setValidationError(fieldErrors, 'conjuge_grau_parentesco', messages.invalidSpouseRelation);
  }

  if (payload.conjuge_ir && !(formOptions.conjuge_ir || []).some((option) => option.value === payload.conjuge_ir)) {
    setValidationError(fieldErrors, 'conjuge_ir', messages.invalidSpouseIr);
  }

  if ((payload.conjuge_plano_saude || payload.conjuge_plano_odonto) && !String(payload.conjuge_nome_mae || '').trim()) {
    setValidationError(fieldErrors, 'conjuge_nome_mae', messages.invalidSpouseMotherForPlan);
  }

  if (payload.cpf && !isValidCpf(payload.cpf)) {
    setValidationError(fieldErrors, 'cpf', messages.invalidCpf);
  }

  if (payload.conjuge_cpf && !isValidCpf(payload.conjuge_cpf)) {
    setValidationError(fieldErrors, 'conjuge_cpf', messages.invalidSpouseCpf);
  }

  registerCpf('cpf', payload.cpf);
  registerCpf('conjuge_cpf', payload.conjuge_cpf);

  if (payload.pis_pasep && !isValidPisPasep(payload.pis_pasep)) {
    setValidationError(fieldErrors, 'pis_pasep', messages.invalidPisPasep);
  }

  if (payload.orgao_emissor_rg && !isValidIssuerWithUf(payload.orgao_emissor_rg)) {
    setValidationError(fieldErrors, 'orgao_emissor_rg', messages.invalidRgIssuerWithUf);
  }

  Object.entries(validationConfig.numericLengths).forEach(([key, rule]) => {
    if (!payload[key]) return;
    if (digitsOnly(payload[key]).length !== rule.exactLength) {
      setValidationError(fieldErrors, key, `${rule.label} deve ter ${rule.exactLength} dígitos.`);
    }
  });

  Object.entries(validationConfig.numericRanges).forEach(([key, rule]) => {
    if (!payload[key]) return;
    const digits = digitsOnly(payload[key]);
    if (digits.length < rule.min || digits.length > rule.max) {
      setValidationError(fieldErrors, key, `${rule.label} deve ter entre ${rule.min} e ${rule.max} dígitos.`);
    }
  });

  validationConfig.dateFieldLabels.forEach(({ key, label }) => {
    if (!isValidCalendarDate(payload[key])) {
      setValidationError(fieldErrors, key, `${label} deve estar no formato dd/mm/aaaa e conter uma data válida.`);
    }
  });

  [
    ['uf_naturalidade', 'UF da naturalidade'],
    ['ctps_uf', 'UF CTPS'],
    ['cnh_uf', 'UF CNH'],
    ['uf_endereco', 'UF']
  ].forEach(([key, label]) => {
    if (payload[key] && !isValidUf(payload[key])) {
      setValidationError(fieldErrors, key, `${label} deve conter 2 letras.`);
    }
  });

  validateMaxLengths(payload, fieldErrors);

  payload.dependentes.forEach((dependente, index) => {
    const prefix = `dependentes.${index}.`;
    const hasSomeValue = Object.values(dependente || {}).some((value) => {
      if (typeof value === 'boolean') return value;
      return String(value || '').trim() !== '';
    });

    if (!hasSomeValue) return;

    if (!String(dependente.nome || '').trim()) {
      setValidationError(fieldErrors, `${prefix}nome`, messages.invalidDependentName);
    }

    if ((dependente.plano_saude || dependente.plano_odonto) && !String(dependente.nome_mae || '').trim()) {
      setValidationError(fieldErrors, `${prefix}nome_mae`, messages.invalidDependentMotherForPlan);
    }

    if (!isValidCalendarDate(dependente.data_nascimento)) {
      setValidationError(
        fieldErrors,
        `${prefix}data_nascimento`,
        'Data de nascimento do dependente deve estar no formato dd/mm/aaaa e conter uma data válida.'
      );
    }

    if (dependente.cpf && !isValidCpf(dependente.cpf)) {
      setValidationError(fieldErrors, `${prefix}cpf`, messages.invalidDependentCpf);
    }

    registerCpf(`${prefix}cpf`, dependente.cpf);

    if (requiresDnvByBirthDate(dependente.data_nascimento) && !digitsOnly(dependente.dnv)) {
      setValidationError(fieldErrors, `${prefix}dnv`, messages.invalidDependentDnvRequired);
    }

    if (
      dependente.grau_parentesco &&
      !(formOptions.dependente_grau_parentesco || []).some(
        (option) => option.value === dependente.grau_parentesco
      )
    ) {
      setValidationError(fieldErrors, `${prefix}grau_parentesco`, messages.invalidDependentRelation);
    }

    if (dependente.ir && !(formOptions.dependente_ir || []).some((option) => option.value === dependente.ir)) {
      setValidationError(fieldErrors, `${prefix}ir`, messages.invalidDependentIr);
    }

    if (dependente.dnv && digitsOnly(dependente.dnv).length !== validationConfig.numericLengths.dnv.exactLength) {
      setValidationError(
        fieldErrors,
        `${prefix}dnv`,
        `${validationConfig.numericLengths.dnv.label} deve ter ${validationConfig.numericLengths.dnv.exactLength} dígitos.`
      );
    }

    validateMaxLengths(dependente, fieldErrors, prefix);
  });

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

async function fetchConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    maxDependentes = Number(config.maxDependentes) || 5;
    formOptions = config.formOptions || formOptions;
    validationConfig = config.validationConfig || validationConfig;

    updateDependentsHint();
    fillSelectOptions(grauInstrucaoSelect, formOptions.grau_instrucao || [], (option) => option);
    fillSelectOptions(racaSelect, formOptions.raca || [], (option) => option);
    fillSelectOptions(conjugeGrauParentescoSelect, formOptions.conjuge_grau_parentesco || [], (option) => option);
    fillSelectOptions(conjugeIrSelect, formOptions.conjuge_ir || [], (option) => option);
    populateDynamicSelects();

    templateStatus.textContent = config.templateFound
      ? `Template OK | E-mail ${config.emailProvider}/${config.emailConfigured ? 'OK' : 'pendente'}`
      : `Ausente: ${config.templateFilename}`;
    templateStatus.style.color = config.templateFound && config.emailConfigured ? '#027a48' : '#b42318';
    emailTarget.textContent = config.emailDestinationLabel || (config.emailConfigured ? 'configurado' : '-');
    refreshDependentIndexes();
  } catch (error) {
    templateStatus.textContent = 'Não foi possível validar o template.';
    templateStatus.style.color = '#b42318';
    emailTarget.textContent = '-';
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  setFeedback('');
  clearAllFieldErrors(form);
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando formulário...';

  try {
    const payload = serializeForm();
    const validationResult = validateFormPayload(payload);
    if (!validationResult.isValid) {
      applyFieldErrors(validationResult.fieldErrors);
      throw new Error('Revise os campos destacados.');
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (data.fieldErrors) {
        applyFieldErrors(data.fieldErrors);
      }
      throw new Error(data.error || 'Não foi possível enviar os dados.');
    }

    setFeedback(
      data.message ||
        'Seus dados foram enviados com sucesso. O setor de Recursos Humanos realizará a conferência e entrará em contato caso necessário.',
      'success'
    );
  } catch (error) {
    setFeedback(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar formulário';
  }
}

clearBtn.addEventListener('click', () => {
  form.reset();
  dependentsContainer.innerHTML = '';
  clearAllFieldErrors(form);
  setFeedback('');
  refreshDependentIndexes();
});

addDependentBtn.addEventListener('click', () => addDependent());
form.addEventListener('submit', handleSubmit);

applyMasks();
initializeFieldHelpers();
updateDependentsHint();
fetchConfig();
refreshDependentIndexes();
