function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function maskCpf(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  return `***.${digits.slice(-3)}-${digits.slice(-2)}`;
}

function maskPhone(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  const suffix = digits.slice(-4);
  return `(**) *****-${suffix}`;
}

function maskPisPasep(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  return `${'*'.repeat(Math.max(0, digits.length - 3))}${digits.slice(-3)}`;
}

function maskEmail(value) {
  const email = String(value || '').trim();
  if (!email.includes('@')) return null;

  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'*'.repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}

function maskName(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return null;

  return parts
    .map((part) => `${part[0]}${'*'.repeat(Math.max(0, part.length - 1))}`)
    .join(' ');
}

function maskEmailForDisplay(value) {
  return maskEmail(value) || 'configurado';
}

function redactMetaValue(key, value) {
  if (value === null || value === undefined) return value;

  const normalizedKey = String(key || '').toLowerCase();

  if (Array.isArray(value)) {
    return value.map((item) => redactMetaValue(normalizedKey, item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactMetaValue(entryKey, entryValue)
      ])
    );
  }

  if (normalizedKey.includes('email')) return maskEmail(value);
  if (normalizedKey.includes('cpf')) return maskCpf(value);
  if (normalizedKey.includes('celular') || normalizedKey.includes('telefone') || normalizedKey.includes('phone')) {
    return maskPhone(value);
  }
  if (normalizedKey.includes('pis')) return maskPisPasep(value);
  if (normalizedKey === 'nome' || normalizedKey.includes('name')) return maskName(value);

  return value;
}

function redactMeta(meta = {}) {
  return redactMetaValue('meta', meta);
}

module.exports = {
  maskCpf,
  maskEmail,
  maskEmailForDisplay,
  maskName,
  maskPhone,
  maskPisPasep,
  redactMeta
};
