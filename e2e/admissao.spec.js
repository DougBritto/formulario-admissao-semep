const { test, expect } = require('@playwright/test');
const { admissionPayload } = require('./fixtures/admissao-payload');

async function fillInput(root, selector, value) {
  await root.locator(selector).fill(String(value ?? ''));
}

async function selectValue(root, selector, value) {
  await root.locator(selector).selectOption(String(value ?? ''));
}

async function waitForDynamicOptions(page) {
  await expect(page.locator('#grauInstrucaoSelect option')).toHaveCount(14);
  await expect(page.locator('#racaSelect option')).toHaveCount(7);
  await expect(page.locator('#conjugeGrauParentescoSelect option')).toHaveCount(3);
  await expect(page.locator('#conjugeIrSelect option')).toHaveCount(5);
}

function fieldErrorLocator(root, selector) {
  return root.locator(selector).locator('xpath=ancestor::label[1]').locator('.field-error');
}

async function fillBaseForm(page, payload) {
  await page.goto('/');
  await waitForDynamicOptions(page);

  await fillInput(page, 'input[name="nome"]', payload.nome);
  await selectValue(page, 'select[name="sexo_funcionario"]', payload.sexo_funcionario);
  await selectValue(page, 'select[name="estado_civil"]', payload.estado_civil);
  await fillInput(page, 'input[name="naturalidade"]', payload.naturalidade);
  await fillInput(page, 'input[name="uf_naturalidade"]', payload.uf_naturalidade);
  await fillInput(page, 'input[name="data_nascimento"]', '10021991');
  await fillInput(page, 'input[name="nome_mae"]', payload.nome_mae);
  await fillInput(page, 'input[name="nome_pai"]', payload.nome_pai);
  await selectValue(page, '#grauInstrucaoSelect', payload.grau_instrucao);
  await fillInput(page, 'input[name="email"]', payload.email);
  await fillInput(page, 'input[name="contato_emergencia"]', payload.contato_emergencia);
  await selectValue(page, '#racaSelect', payload.raca);

  await fillInput(page, 'input[name="agencia"]', payload.agencia);
  await fillInput(page, 'input[name="conta_pagto"]', payload.conta_pagto);

  await fillInput(page, 'input[name="cpf"]', payload.cpf);
  await fillInput(page, 'input[name="pis_pasep"]', payload.pis_pasep);
  await fillInput(page, 'input[name="rg_numero"]', payload.rg_numero);
  await fillInput(page, 'input[name="rg_data_emissao"]', '01012015');
  await fillInput(page, 'input[name="orgao_emissor_rg"]', payload.orgao_emissor_rg);
  await fillInput(page, 'input[name="ctps_numero"]', payload.ctps_numero);
  await fillInput(page, 'input[name="ctps_serie"]', payload.ctps_serie);
  await fillInput(page, 'input[name="ctps_uf"]', payload.ctps_uf);
  await fillInput(page, 'input[name="ctps_data_emissao"]', '02022015');
  await fillInput(page, 'input[name="cnh_numero"]', payload.cnh_numero);
  await fillInput(page, 'input[name="cnh_categoria"]', payload.cnh_categoria);
  await fillInput(page, 'input[name="orgao_emissor_cnh"]', payload.orgao_emissor_cnh);
  await fillInput(page, 'input[name="cnh_data_emissao"]', '03032020');
  await fillInput(page, 'input[name="cnh_data_vencimento"]', '03032030');
  await fillInput(page, 'input[name="cnh_uf"]', payload.cnh_uf);
  await fillInput(page, 'input[name="reservista"]', payload.reservista);
  await fillInput(page, 'input[name="titulo_eleitor"]', payload.titulo_eleitor);
  await fillInput(page, 'input[name="titulo_zona"]', payload.titulo_zona);
  await fillInput(page, 'input[name="titulo_secao"]', payload.titulo_secao);

  await fillInput(page, 'input[name="endereco"]', payload.endereco);
  await fillInput(page, 'input[name="numero"]', payload.numero);
  await fillInput(page, 'input[name="complemento"]', payload.complemento);
  await fillInput(page, 'input[name="bairro"]', payload.bairro);
  await fillInput(page, 'input[name="uf_endereco"]', payload.uf_endereco);
  await fillInput(page, 'input[name="cidade"]', payload.cidade);
  await fillInput(page, 'input[name="cep"]', payload.cep);
  await fillInput(page, 'input[name="ddd_celular"]', payload.ddd_celular);
  await fillInput(page, 'input[name="celular"]', payload.celular);
}

async function fillSpouse(page, payload) {
  await fillInput(page, 'input[name="conjuge_nome"]', payload.conjuge_nome);
  await fillInput(page, 'input[name="conjuge_data_nascimento"]', '05051992');
  await selectValue(page, 'select[name="conjuge_sexo"]', payload.conjuge_sexo);
  await selectValue(page, '#conjugeGrauParentescoSelect', payload.conjuge_grau_parentesco);
  await selectValue(page, '#conjugeIrSelect', payload.conjuge_ir);
  await fillInput(page, 'input[name="conjuge_local_nascimento"]', payload.conjuge_local_nascimento);
  await fillInput(page, 'input[name="conjuge_cpf"]', payload.conjuge_cpf);
  await fillInput(page, 'input[name="conjuge_data_casamento"]', '15062020');
  await fillInput(page, 'input[name="conjuge_nome_mae"]', payload.conjuge_nome_mae || '');
  await fillInput(page, 'input[name="conjuge_nome_pai"]', payload.conjuge_nome_pai || '');
  await page.locator('input[name="conjuge_plano_saude"]').setChecked(Boolean(payload.conjuge_plano_saude));
  await page.locator('input[name="conjuge_plano_odonto"]').setChecked(Boolean(payload.conjuge_plano_odonto));
}

async function addDependent(page, dependente) {
  await page.getByRole('button', { name: 'Adicionar dependente' }).click();

  const dependentCard = page.locator('.dependent-card').last();
  await fillInput(dependentCard, '[data-field="nome"]', dependente.nome);
  await fillInput(dependentCard, '[data-field="data_nascimento"]', '16032020');
  await dependentCard.locator('[data-field="sexo"]').selectOption(dependente.sexo);
  await dependentCard.locator('[data-field="grau_parentesco"]').selectOption(dependente.grau_parentesco);
  await dependentCard.locator('[data-field="ir"]').selectOption(dependente.ir);
  await fillInput(dependentCard, '[data-field="local_nascimento"]', dependente.local_nascimento);
  await fillInput(dependentCard, '[data-field="cpf"]', dependente.cpf);
  await fillInput(dependentCard, '[data-field="dnv"]', dependente.dnv);
  await fillInput(dependentCard, '[data-field="nome_mae"]', dependente.nome_mae || '');
  await fillInput(dependentCard, '[data-field="nome_pai"]', dependente.nome_pai || '');

  if (dependente.plano_saude) {
    await dependentCard.locator('[data-field="plano_saude"]').check();
  }

  if (dependente.plano_odonto) {
    await dependentCard.locator('[data-field="plano_odonto"]').check();
  }

  return dependentCard;
}

test('envia o formulário completo com cônjuge e dependente', async ({ page }) => {
  const payload = {
    ...admissionPayload,
    conjuge_cpf: '11144477735'
  };

  await fillBaseForm(page, payload);
  await fillSpouse(page, payload);
  await addDependent(page, payload.dependentes[0]);

  await page.locator('input[name="declaracao_veracidade"]').check();
  await page.locator('#submitBtn').click();

  await expect(page.locator('#submitBtn')).toHaveText(/Enviar/, { timeout: 30_000 });
  await expect(page.locator('#feedback')).toHaveClass(/success/, { timeout: 30_000 });
  await expect(page.locator('#feedback')).toContainText(/sucesso/i, { timeout: 30_000 });
});

test('bloqueia cônjuge em plano sem nome da mãe', async ({ page }) => {
  const payload = {
    ...admissionPayload,
    conjuge_cpf: '11144477735',
    conjuge_nome_mae: '',
    conjuge_plano_saude: true,
    conjuge_plano_odonto: false
  };

  await fillBaseForm(page, payload);
  await fillSpouse(page, payload);
  await page.locator('input[name="declaracao_veracidade"]').check();
  await page.locator('#submitBtn').click();

  await expect(fieldErrorLocator(page, 'input[name="conjuge_nome_mae"]')).toContainText(
    'Nome da mãe do cônjuge é obrigatório para inclusão em plano de saúde ou odontológico.'
  );
  await expect(page.locator('#feedback')).toContainText('Revise os campos destacados.');
});

test('bloqueia dependente em plano sem nome da mãe', async ({ page }) => {
  const payload = {
    ...admissionPayload,
    conjuge_cpf: '11144477735'
  };
  const dependente = {
    ...payload.dependentes[0],
    nome_mae: '',
    plano_saude: true,
    plano_odonto: false
  };

  await fillBaseForm(page, payload);
  await addDependent(page, dependente);
  await page.locator('input[name="declaracao_veracidade"]').check();
  await page.locator('#submitBtn').click();

  const dependentCard = page.locator('.dependent-card').first();
  await expect(fieldErrorLocator(dependentCard, '[data-field="nome_mae"]')).toContainText(
    'Nome da mãe do dependente é obrigatório para inclusão em plano de saúde ou odontológico.'
  );
  await expect(page.locator('#feedback')).toContainText('Revise os campos destacados.');
});

test('bloqueia CPF duplicado entre titular, cônjuge e dependente', async ({ page }) => {
  const payload = {
    ...admissionPayload,
    conjuge_cpf: admissionPayload.cpf
  };
  const dependente = {
    ...payload.dependentes[0],
    cpf: admissionPayload.cpf
  };

  await fillBaseForm(page, payload);
  await fillSpouse(page, payload);
  await addDependent(page, dependente);
  await page.locator('input[name="declaracao_veracidade"]').check();
  await page.locator('#submitBtn').click();

  await expect(fieldErrorLocator(page, 'input[name="cpf"]')).toContainText(
    'CPF já informado em outro cadastro do formulário.'
  );
  await expect(fieldErrorLocator(page, 'input[name="conjuge_cpf"]')).toContainText(
    'CPF já informado em outro cadastro do formulário.'
  );
  const dependentCard = page.locator('.dependent-card').first();
  await expect(fieldErrorLocator(dependentCard, '[data-field="cpf"]')).toContainText(
    'CPF já informado em outro cadastro do formulário.'
  );
});
