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
  ['ctps_data_emissao', 'Data emissão CTPS'],
  ['cnh_data_emissao', 'Data emissão CNH'],
  ['cnh_data_vencimento', 'Data vencimento CNH'],
  ['conjuge_data_nascimento', 'Data de nascimento do cônjuge'],
  ['conjuge_data_casamento', 'Data de casamento']
];

module.exports = {
  DATE_FIELD_LABELS,
  REQUIRED_FIELDS
};
