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

const DATE_FIELD_LABELS = [
  ['data_nascimento', 'Data de nascimento'],
  ['rg_data_emissao', 'Data de emissão do RG'],
  ['ctps_data_emissao', 'Data emissão CTPS'],
  ['cnh_data_emissao', 'Data emissão CNH'],
  ['cnh_data_vencimento', 'Data vencimento CNH'],
  ['conjuge_data_nascimento', 'Data de nascimento do cônjuge'],
  ['conjuge_data_casamento', 'Data de casamento']
];

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
  conjuge_nome_mae: 120,
  conjuge_nome_pai: 120,
  conjuge_grau_parentesco: 40,
  conjuge_local_nascimento: 80,
  dnv: 20
};

let maxDependentes = 5;
let formOptions = {
  grau_instrucao: [],
  raca: []
};

function setFeedback(message = '', type = '') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
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
    const options = formOptions[source] || [];
    fillSelectOptions(selectElement, options, (option) => option);
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
  payload.dependentes = serializeDependents();
  return payload;
}

function validateDate(value) {
  if (!value) return true;
  return /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(value.trim());
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function setValidationError(fieldErrors, key, message) {
  if (!fieldErrors[key]) {
    fieldErrors[key] = message;
  }
}

function validateRequiredFields(payload, fieldErrors) {
  const requiredFields = [
    ['nome', 'Nome'],
    ['sexo_funcionario', 'Sexo'],
    ['estado_civil', 'Estado civil'],
    ['data_nascimento', 'Data de nascimento'],
    ['cpf', 'CPF'],
    ['email', 'E-mail'],
    ['celular', 'Celular']
  ];

  requiredFields.forEach(([key, label]) => {
    if (!String(payload[key] || '').trim()) {
      setValidationError(fieldErrors, key, `${label} é obrigatório.`);
    }
  });
}

function validateMaxLengths(payload, fieldErrors) {
  Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
    if (!payload[key]) return;
    if (String(payload[key]).trim().length > maxLength) {
      setValidationError(fieldErrors, key, `Máximo de ${maxLength} caracteres.`);
    }
  });
}

function validateFormPayload(payload) {
  const fieldErrors = {};

  validateRequiredFields(payload, fieldErrors);

  if (payload.email && !validateEmail(payload.email)) {
    setValidationError(fieldErrors, 'email', 'Informe um e-mail válido.');
  }

  if (payload.grau_instrucao && !(formOptions.grau_instrucao || []).includes(payload.grau_instrucao)) {
    setValidationError(fieldErrors, 'grau_instrucao', 'Selecione um grau de instrução válido.');
  }

  if (payload.raca && !(formOptions.raca || []).some((option) => option.value === payload.raca)) {
    setValidationError(fieldErrors, 'raca', 'Selecione uma raça válida.');
  }

  if (payload.conjuge_grau_parentesco && !(formOptions.conjuge_grau_parentesco || []).some((option) => option.value === payload.conjuge_grau_parentesco)) {
    setValidationError(fieldErrors, 'conjuge_grau_parentesco', 'Selecione um grau de parentesco válido para o cônjuge.');
  }

  if (payload.conjuge_ir && !(formOptions.conjuge_ir || []).some((option) => option.value === payload.conjuge_ir)) {
    setValidationError(fieldErrors, 'conjuge_ir', 'Selecione uma opção válida de IR para o cônjuge.');
  }

  if (payload.cpf && !isValidCpf(payload.cpf)) {
    setValidationError(fieldErrors, 'cpf', 'Informe um CPF válido.');
  }

  if (payload.conjuge_cpf && !isValidCpf(payload.conjuge_cpf)) {
    setValidationError(fieldErrors, 'conjuge_cpf', 'Informe um CPF válido para o cônjuge.');
  }

  if (payload.cep && digitsOnly(payload.cep).length !== 8) {
    setValidationError(fieldErrors, 'cep', 'CEP deve ter 8 dígitos.');
  }

  if (payload.ddd_celular && digitsOnly(payload.ddd_celular).length !== 2) {
    setValidationError(fieldErrors, 'ddd_celular', 'DDD deve ter 2 dígitos.');
  }

  const phoneDigits = digitsOnly(payload.celular);
  if (payload.celular && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
    setValidationError(fieldErrors, 'celular', 'Informe um celular com DDD e 10 ou 11 dígitos.');
  }

  if (payload.pis_pasep && !isValidPisPasep(payload.pis_pasep)) {
    setValidationError(fieldErrors, 'pis_pasep', 'PIS/PASEP deve conter 11 números, sem pontos ou caracteres especiais.');
  }

  if (payload.cnh_numero && digitsOnly(payload.cnh_numero).length !== 11) {
    setValidationError(fieldErrors, 'cnh_numero', 'Número da CNH deve ter 11 dígitos.');
  }

  if (payload.titulo_eleitor && digitsOnly(payload.titulo_eleitor).length !== 12) {
    setValidationError(fieldErrors, 'titulo_eleitor', 'Título de eleitor deve ter 12 dígitos.');
  }

  if (payload.titulo_zona) {
    const zonaDigits = digitsOnly(payload.titulo_zona);
    if (zonaDigits.length < 1 || zonaDigits.length > 4) {
      setValidationError(fieldErrors, 'titulo_zona', 'Zona deve ter entre 1 e 4 dígitos.');
    }
  }

  if (payload.titulo_secao) {
    const secaoDigits = digitsOnly(payload.titulo_secao);
    if (secaoDigits.length < 1 || secaoDigits.length > 4) {
      setValidationError(fieldErrors, 'titulo_secao', 'Seção deve ter entre 1 e 4 dígitos.');
    }
  }

  DATE_FIELD_LABELS.forEach(([field, label]) => {
    if (!validateDate(payload[field])) {
      setValidationError(fieldErrors, field, `${label} deve estar no formato dd/mm/aaaa.`);
    }
  });

  [
    ['uf_naturalidade', 'UF da naturalidade'],
    ['ctps_uf', 'UF CTPS'],
    ['cnh_uf', 'UF CNH'],
    ['uf_endereco', 'UF']
  ].forEach(([field, label]) => {
    const value = String(payload[field] || '').trim();
    if (value && !/^[A-Za-z]{2}$/.test(value)) {
      setValidationError(fieldErrors, field, `${label} deve conter 2 letras.`);
    }
  });

  validateMaxLengths(payload, fieldErrors);

  payload.dependentes.forEach((dependente, index) => {
    const prefix = `dependentes.${index}`;
    const hasSomeValue = Object.values(dependente || {}).some((value) => {
      if (typeof value === 'boolean') return value;
      return String(value || '').trim() !== '';
    });

    if (!hasSomeValue) return;

    if (!String(dependente.nome || '').trim()) {
      setValidationError(fieldErrors, `${prefix}.nome`, 'Nome do dependente é obrigatório.');
    }

    if (!validateDate(dependente.data_nascimento)) {
      setValidationError(fieldErrors, `${prefix}.data_nascimento`, 'Data deve estar no formato dd/mm/aaaa.');
    }

    if (dependente.cpf && !isValidCpf(dependente.cpf)) {
      setValidationError(fieldErrors, `${prefix}.cpf`, 'CPF do dependente inválido.');
    }

    if (dependente.grau_parentesco && !(formOptions.dependente_grau_parentesco || []).some((option) => option.value === dependente.grau_parentesco)) {
      setValidationError(fieldErrors, `${prefix}.grau_parentesco`, 'Selecione um grau de parentesco válido.');
    }

    if (dependente.ir && !(formOptions.dependente_ir || []).some((option) => option.value === dependente.ir)) {
      setValidationError(fieldErrors, `${prefix}.ir`, 'Selecione uma opção válida para IR.');
    }

    if (dependente.dnv && digitsOnly(dependente.dnv).length !== 11) {
      setValidationError(fieldErrors, `${prefix}.dnv`, 'DNV deve ter 11 dígitos.');
    }

    Object.entries(MAX_LENGTHS).forEach(([key, maxLength]) => {
      if (!dependente[key]) return;
      if (String(dependente[key]).trim().length > maxLength) {
        setValidationError(fieldErrors, `${prefix}.${key}`, `Máximo de ${maxLength} caracteres.`);
      }
    });
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
    updateDependentsHint();
    fillSelectOptions(grauInstrucaoSelect, formOptions.grau_instrucao || [], (option) => ({ value: option, label: option }));
    fillSelectOptions(racaSelect, formOptions.raca || [], (option) => option);
    fillSelectOptions(conjugeGrauParentescoSelect, formOptions.conjuge_grau_parentesco || [], (option) => option);
    fillSelectOptions(conjugeIrSelect, formOptions.conjuge_ir || [], (option) => option);
    populateDynamicSelects();

    templateStatus.textContent = config.templateFound
      ? `Template OK | E-mail ${config.emailConfigured ? 'OK' : 'pendente'}`
      : `Ausente: ${config.templateFilename}`;
    templateStatus.style.color = config.templateFound && config.emailConfigured ? '#027a48' : '#b42318';
    emailTarget.textContent = config.emailTo || '-';
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
      data.message || 'Seus dados foram enviados com sucesso. O setor de Recursos Humanos realizará a conferência e entrará em contato caso necessário.',
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
