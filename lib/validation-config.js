const REQUIRED_FIELDS = [
  ['nome', 'Nome'],
  ['sexo_funcionario', 'Sexo'],
  ['estado_civil', 'Estado civil'],
  ['data_nascimento', 'Data de nascimento'],
  ['cpf', 'CPF'],
  ['email', 'E-mail'],
  ['celular', 'Celular']
];

const DATE_FIELD_LABELS = [
  ['data_nascimento', 'Data de nascimento'],
  ['rg_data_emissao', 'Data de emissão do RG'],
  ['ctps_data_emissao', 'Data de emissão da CTPS'],
  ['cnh_data_emissao', 'Data de emissão da CNH'],
  ['cnh_data_vencimento', 'Data de vencimento da CNH'],
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

const NUMERIC_LENGTHS = {
  cep: { label: 'CEP', exactLength: 8 },
  ddd_celular: { label: 'DDD', exactLength: 2 },
  celular: { label: 'Celular', exactLength: 9 },
  conta_pagto: { label: 'Conta para pagamento', exactLength: 12 },
  cnh_numero: { label: 'Número da CNH', exactLength: 11 },
  titulo_eleitor: { label: 'Título de eleitor', exactLength: 12 },
  dnv: { label: 'DNV', exactLength: 11 }
};

const NUMERIC_RANGES = {
  titulo_zona: { label: 'Zona', min: 1, max: 4 },
  titulo_secao: { label: 'Seção', min: 1, max: 4 }
};

const FIELD_MESSAGES = {
  invalidEmail: 'Informe um e-mail válido.',
  invalidCpf: 'CPF inválido.',
  invalidSpouseCpf: 'CPF do cônjuge inválido.',
  duplicateCpf: 'CPF já informado em outro cadastro do formulário.',
  invalidPisPasep: 'PIS/PASEP deve conter 11 números, sem pontos ou caracteres especiais.',
  invalidEducation: 'Selecione um grau de instrução válido.',
  invalidRace: 'Selecione uma raça válida.',
  invalidSpouseRelation: 'Selecione um grau de parentesco válido para o cônjuge.',
  invalidSpouseIr: 'Selecione uma opção válida de IR para o cônjuge.',
  invalidSpouseMotherForPlan: 'Nome da mãe do cônjuge é obrigatório para inclusão em plano de saúde ou odontológico.',
  invalidDependentRelation: 'Selecione um grau de parentesco válido.',
  invalidDependentIr: 'Selecione uma opção válida para IR.',
  invalidDependentName: 'Nome do dependente é obrigatório.',
  invalidDependentMotherForPlan: 'Nome da mãe do dependente é obrigatório para inclusão em plano de saúde ou odontológico.',
  invalidDependentCpf: 'CPF do dependente inválido.',
  invalidDate: (label) => `${label} deve estar no formato dd/mm/aaaa e conter uma data válida.`,
  required: (label) => `${label} é obrigatório.`,
  maxLength: (maxLength) => `Máximo de ${maxLength} caracteres.`,
  numericLength: (label, exactLength) => `${label} deve ter ${exactLength} dígitos.`,
  numericRange: (label, min, max) => `${label} deve ter entre ${min} e ${max} dígitos.`,
  invalidUf: (label) => `${label} deve conter 2 letras.`,
  tooManyDependents: (maxDependentes) => `A planilha base comporta no máximo ${maxDependentes} dependentes.`,
  missingResend: 'Configuração de envio incompleta. Defina RESEND_API_KEY e RESEND_FROM no arquivo .env.',
  missingSmtp: 'Configuração de envio incompleta. Defina SMTP_HOST, SMTP_PORT e SMTP_FROM no arquivo .env.'
};

function buildClientValidationConfig() {
  return {
    requiredFields: REQUIRED_FIELDS.map(([key, label]) => ({ key, label })),
    dateFieldLabels: DATE_FIELD_LABELS.map(([key, label]) => ({ key, label })),
    maxLengths: MAX_LENGTHS,
    numericLengths: NUMERIC_LENGTHS,
    numericRanges: NUMERIC_RANGES,
    fieldMessages: {
      invalidEmail: FIELD_MESSAGES.invalidEmail,
      invalidCpf: FIELD_MESSAGES.invalidCpf,
      invalidSpouseCpf: FIELD_MESSAGES.invalidSpouseCpf,
      duplicateCpf: FIELD_MESSAGES.duplicateCpf,
      invalidPisPasep: FIELD_MESSAGES.invalidPisPasep,
      invalidEducation: FIELD_MESSAGES.invalidEducation,
      invalidRace: FIELD_MESSAGES.invalidRace,
      invalidSpouseRelation: FIELD_MESSAGES.invalidSpouseRelation,
      invalidSpouseIr: FIELD_MESSAGES.invalidSpouseIr,
      invalidSpouseMotherForPlan: FIELD_MESSAGES.invalidSpouseMotherForPlan,
      invalidDependentRelation: FIELD_MESSAGES.invalidDependentRelation,
      invalidDependentIr: FIELD_MESSAGES.invalidDependentIr,
      invalidDependentName: FIELD_MESSAGES.invalidDependentName,
      invalidDependentMotherForPlan: FIELD_MESSAGES.invalidDependentMotherForPlan,
      invalidDependentCpf: FIELD_MESSAGES.invalidDependentCpf
    }
  };
}

module.exports = {
  DATE_FIELD_LABELS,
  FIELD_MESSAGES,
  MAX_LENGTHS,
  NUMERIC_LENGTHS,
  NUMERIC_RANGES,
  REQUIRED_FIELDS,
  buildClientValidationConfig
};
