function getNodemailer() {
  try {
    return require('nodemailer');
  } catch (error) {
    error.message =
      'O provider SMTP foi habilitado, mas a dependência "nodemailer" não está instalada. Execute "npm install" antes de usar SMTP.';
    throw error;
  }
}

function createSmtpTransport(config) {
  const nodemailer = getNodemailer();

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? {
          user: config.smtpUser,
          pass: config.smtpPass
        }
      : undefined
  });
}

async function sendSmtpEmail({ to, replyTo, subject, html, attachments = [], config }) {
  const transporter = createSmtpTransport(config);

  return transporter.sendMail({
    from: config.smtpFrom || config.resendFrom,
    to,
    replyTo,
    subject,
    html,
    attachments
  });
}

module.exports = {
  createSmtpTransport,
  sendSmtpEmail
};
