# Deploy Corporativo

## Objetivo

Orientar a implantação do formulário em ambiente da empresa, com hospedagem própria e envio por e-mail corporativo.

## Arquitetura esperada

- aplicação Node.js rodando em servidor interno ou VM corporativa;
- template Excel mantido localmente em `templates/`;
- envio por SMTP corporativo;
- um único formulário com roteamento por operação;
- destinatário padrão definido em [`config/operacoes.json`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/config/operacoes.json).

## Arquivos principais

- [`server.js`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/server.js)
- [`app-server.js`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/app-server.js)
- [`lib/config.js`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/lib/config.js)
- [`lib/email.js`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/lib/email.js)
- [`lib/email-smtp.js`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/lib/email-smtp.js)
- [`config/operacoes.json`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/config/operacoes.json)
- [`.env.production.example`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/.env.production.example)

## Variáveis de ambiente

Use como base:
- [`.env.production.example`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/.env.production.example)

Pontos principais:
- `EMAIL_PROVIDER=smtp`
- `EMAIL_DELIVERY_MODE=live`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`
- `ALLOWED_ORIGINS` com a URL corporativa publicada
- `AUDIT_RETENTION_DAYS` para retenção local da auditoria

## Operações

O sistema suporta links dedicados por operação:

- `/op/anglo`
- `/op/crc`
- `/op/amg`
- `/op/arcelor`
- `/op/cda`
- `/op/vale-vargemgrande`
- `/op/samarco`

Cada operação usa o e-mail definido em [`config/operacoes.json`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/config/operacoes.json).

Exemplo:

```json
{
  "crc": {
    "label": "CRC",
    "emailTo": "rh.crc@empresa.com.br"
  },
  "samarco": {
    "label": "Samarco",
    "emailTo": "rh.samarco@empresa.com.br"
  }
}
```

## Checklist para TI

1. Instalar Node.js no servidor.
2. Copiar o projeto para o ambiente corporativo.
3. Executar `npm install`.
4. Criar `.env` com base em [`.env.production.example`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/.env.production.example).
5. Preencher [`config/operacoes.json`](/C:/Users/dolgl/Downloads/admissoes_form_resend_testflow_corporativo/config/operacoes.json) com os e-mails reais das operações.
6. Colocar o template Excel em `templates/`.
7. Configurar SMTP corporativo.
8. Publicar a aplicação atrás de HTTPS.
9. Definir processo de execução contínua do Node.js.
10. Validar `/health` e um envio de homologação.

## Validação pós-implantação

1. Acessar a URL principal.
2. Acessar uma URL por operação, por exemplo `/op/crc`.
3. Conferir se a operação ativa aparece na interface.
4. Conferir se o destino exibido está mascarado corretamente.
5. Enviar uma submissão de teste.
6. Validar se o e-mail foi para o destinatário padrão da operação.
7. Conferir se a planilha gerada usa o template oficial.

## Observações

- Se a empresa quiser, o Render pode continuar sendo usado só para homologação.
- Para produção, a recomendação é SMTP corporativo e hospedagem controlada pela TI.
- O sistema já possui `requestId`, auditoria local e mascaramento básico de dados sensíveis.
