# Cadastro para Admissão - fluxo de teste

Aplicação web em HTML, CSS e JavaScript com backend Node.js para:

- receber o preenchimento do colaborador;
- converter os dados para a planilha-base oficial sem perder a estrutura;
- enviar a planilha por e-mail para um endereço de teste;
- enviar uma confirmação simples ao colaborador.

## Cenário atual

Esta versão está preparada apenas para testes.

- destino interno de teste: `douglasbritto416@gmail.com`
- confirmação ao colaborador: habilitada por padrão

Quando o colaborador envia o formulário:
1. o sistema preenche a planilha oficial;
2. envia a planilha para o e-mail de teste configurado;
3. envia uma mensagem de confirmação para o e-mail informado no formulário.

## Como rodar

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` a partir do modelo:

```bash
copy .env.example .env
```

Edite o arquivo `.env` e informe sua chave da Resend.

Exemplo:

```env
PORT=3000
TEMPLATE_DIR=templates
TEMPLATE_FILENAME=FOR 33 RH - Solicitação de Cadastro e Admissão Rev 05.xlsx
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM=onboarding@resend.dev
EMAIL_TO=douglasbritto416@gmail.com
EMAIL_CONFIRMATION_ENABLED=true
EMAIL_DELIVERY_MODE=live
```

Coloque a planilha base real na pasta [`templates`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/templates) com o nome definido em `TEMPLATE_FILENAME`.

Depois execute:

```bash
npm start
```

Por fim, abra [http://localhost:3000](http://localhost:3000).

## Repositório Git

A planilha base real não precisa ficar versionada.

- o projeto ignora automaticamente arquivos `.xlsx` dentro de [`templates`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/templates)
- mantenha apenas a pasta `templates/` no repositório
- cada ambiente deve copiar sua própria planilha localmente para essa pasta

Se a planilha não existir, a aplicação continuará subindo, mas o status do template aparecerá como ausente e a geração da planilha falhará até que o arquivo seja colocado na pasta correta.

## Configuração da Resend

No painel da Resend, gere uma API Key e cole no `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

Para demonstração, o remetente padrão `onboarding@resend.dev` costuma funcionar bem.

## Fluxo de teste

- o colaborador abre o link do formulário;
- preenche os dados;
- marca a declaração;
- clica em **Enviar formulário**;
- o sistema gera a planilha oficial;
- envia a planilha para o e-mail de teste;
- envia uma confirmação para o colaborador.

## Estrutura principal

- `public/index.html` -> formulário voltado ao colaborador
- `public/styles.css` -> estilos
- `public/app.js` -> comportamento do frontend
- `app-server.js` -> criação da aplicação Express
- `lib/config.js` -> leitura de ambiente e caminho do template
- `lib/validation.js` -> validação do payload
- `lib/excel.js` -> geração da planilha
- `lib/email.js` -> envio de e-mails
- `config/mapeamento-campos.json` -> mapeamento de campos
- `templates/` -> pasta local do template Excel, ignorada no Git

## Atualizações recentes

- correção de textos e mensagens em UTF-8
- unificação do mapeamento da planilha via JSON
- modularização do backend
- inclusão de testes básicos para validação
- auditoria mínima das submissões em `data/submission-audit.jsonl`
- modo de simulação de e-mail via `EMAIL_DELIVERY_MODE=simulate`
