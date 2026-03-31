const { Resend } = require('resend');
const { normalizeText } = require('./normalizers');
const { sendSmtpEmail } = require('./email-smtp');

function buildInternalEmailHtml(payload, fileName) {
  const dependentes = Array.isArray(payload.dependentes) ? payload.dependentes : [];
  const dependentesHtml = dependentes.length
    ? `<ul>${dependentes
        .map(
          (dep) =>
            `<li>${normalizeText(dep.nome, { uppercase: false }) || 'Dependente sem nome'}${
              dep.plano_saude ? ' | Plano Saúde' : ''
            }${dep.plano_odonto ? ' | Plano Odonto' : ''}</li>`
        )
        .join('')}</ul>`
    : '<p>Nenhum dependente informado.</p>';

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a2433;">
      <h2>Novo formulário de admissão recebido</h2>
      <p>Os dados enviados pelo colaborador foram convertidos para a planilha oficial. O arquivo segue em anexo.</p>
      <p><strong>Arquivo:</strong> ${fileName}</p>
      <p><strong>Colaborador:</strong> ${normalizeText(payload.nome, { uppercase: false })}</p>
      <p><strong>CPF:</strong> ${payload.cpf || ''}</p>
      <p><strong>E-mail informado:</strong> ${payload.email || ''}</p>
      <p><strong>Celular:</strong> ${payload.celular || ''}</p>
      <h3>Dependentes</h3>
      ${dependentesHtml}
    </div>
  `;
}

function buildCollaboratorEmailHtml(payload) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a2433;">
      <h2>Recebemos seus dados</h2>
      <p>Olá, ${normalizeText(payload.nome, { uppercase: false })}.</p>
      <p>Seu formulário de admissão foi recebido com sucesso.</p>
      <p>Os dados foram encaminhados para análise e conferência.</p>
      <p>Se for necessário complementar alguma informação, você será contatado posteriormente.</p>
      <p style="margin-top: 20px; color: #667085;">Mensagem automática.</p>
    </div>
  `;
}

function isSmtpProvider(config) {
  return config.emailProvider === 'smtp';
}

async function sendLiveEmail({ to, replyTo, subject, html, attachments = [], config }) {
  if (isSmtpProvider(config)) {
    return sendSmtpEmail({
      to,
      replyTo,
      subject,
      html,
      attachments,
      config
    });
  }

  const resend = new Resend(config.resendApiKey);
  return resend.emails.send({
    from: config.resendFrom,
    to,
    replyTo,
    subject,
    html,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.isBuffer(attachment.content)
        ? attachment.content.toString('base64')
        : Buffer.from(attachment.content).toString('base64')
    }))
  });
}

async function sendInternalEmail({ payload, fileBuffer, filename, config }) {
  if (config.emailDeliveryMode === 'simulate') {
    return {
      id: 'simulated-internal-email',
      simulated: true,
      filename,
      to: config.emailTo
    };
  }

  return sendLiveEmail({
    to: config.emailTo,
    replyTo: payload.email || undefined,
    subject: `Formulário de admissão - ${normalizeText(payload.nome, { uppercase: false })}`,
    html: buildInternalEmailHtml(payload, filename),
    attachments: [
      {
        filename,
        content: Buffer.from(fileBuffer)
      }
    ],
    config
  });
}

async function sendCollaboratorConfirmation(payload, config) {
  if (!config.confirmationEnabled || !payload.email) return null;
  if (config.emailDeliveryMode === 'simulate') {
    return {
      id: 'simulated-collaborator-email',
      simulated: true,
      to: payload.email
    };
  }

  return sendLiveEmail({
    to: payload.email,
    subject: 'Recebemos seu formulário de admissão',
    html: buildCollaboratorEmailHtml(payload),
    config
  });
}

module.exports = {
  buildCollaboratorEmailHtml,
  buildInternalEmailHtml,
  sendCollaboratorConfirmation,
  sendInternalEmail
};
