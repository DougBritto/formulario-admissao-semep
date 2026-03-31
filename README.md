# Cadastro para Admissão

Aplicação web em HTML, CSS e JavaScript com backend Node.js para:

- receber o preenchimento do colaborador;
- converter os dados para a planilha oficial da empresa;
- enviar a planilha por e-mail;
- enviar confirmação opcional ao colaborador.

## Template oficial

Esta versão usa como template padrão:

`FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx`

O arquivo deve ficar na pasta `templates/`, salvo quando `TEMPLATE_DIR` ou `TEMPLATE_FILENAME` forem alterados no `.env`.

## Como rodar

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` a partir do modelo:

```bash
copy .env.example .env
```

Depois execute:

```bash
npm start
```

Por fim, abra [http://localhost:3000](http://localhost:3000).

## Configuração por ambiente

Exemplo:

```env
PORT=3000
NODE_ENV=development
TEMPLATE_DIR=templates
TEMPLATE_FILENAME=FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx
TEMPLATE_SHEET_NAME=SCA
EMAIL_PROVIDER=resend
EMAIL_TO=teste@example.com
EMAIL_CONFIRMATION_ENABLED=true
EMAIL_DELIVERY_MODE=simulate
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM=onboarding@resend.dev
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=20
```

## SMTP corporativo

O sistema também pode enviar usando SMTP corporativo, como Microsoft 365, Exchange, Google Workspace ou gateway interno da empresa.

Exemplo:

```env
EMAIL_PROVIDER=smtp
EMAIL_TO=rh@suaempresa.com.br
EMAIL_CONFIRMATION_ENABLED=true
EMAIL_DELIVERY_MODE=live
SMTP_HOST=smtp.suaempresa.com.br
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@suaempresa.com.br
SMTP_PASS=SENHA_OU_TOKEN_SMTP
SMTP_FROM=RH <rh@suaempresa.com.br>
```

Ao usar SMTP:

- `EMAIL_PROVIDER` deve ser `smtp`
- `SMTP_HOST`, `SMTP_PORT` e `SMTP_FROM` devem estar preenchidos
- `SMTP_USER` e `SMTP_PASS` são usados quando o servidor exige autenticação
- `SMTP_SECURE=true` normalmente é usado em porta `465`
- `SMTP_SECURE=false` normalmente é usado em porta `587`

## Melhorias implementadas

- validação de payload alinhada entre frontend e backend com regras compartilhadas;
- validação de datas reais de calendário;
- healthcheck em `/health`;
- `requestId` por requisição;
- headers de segurança HTTP;
- rate limiting no `POST /api/generate`;
- configuração com fail-fast no startup;
- suporte a Resend e SMTP corporativo por variável de ambiente;
- auditoria estruturada com `requestId`;
- template final adotado como padrão do sistema.

## Estrutura principal

- `public/index.html` -> formulário do colaborador
- `public/styles.css` -> estilos
- `public/app.js` -> comportamento do frontend
- `app-server.js` -> criação da aplicação Express
- `lib/config.js` -> leitura e validação de configuração
- `lib/validation.js` -> validação do payload
- `lib/excel.js` -> geração e verificação da planilha
- `lib/email.js` -> roteamento de envio entre Resend e SMTP
- `lib/email-smtp.js` -> transporte SMTP corporativo
- `config/mapeamento-campos.json` -> mapeamento de células do template
- `config/form-options.json` -> opções oficiais do formulário
- `templates/` -> pasta do template Excel
- `test/validation.test.js` -> testes automatizados
