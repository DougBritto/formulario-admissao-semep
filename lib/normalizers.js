function normalizeText(value, { uppercase = true } = {}) {
  if (value === undefined || value === null) return '';
  let text = String(value).trim();
  if (!text) return '';
  text = text.replace(/\s+/g, ' ');
  return uppercase ? text.toUpperCase() : text;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text;
}

function normalizeCpf(value) {
  return digitsOnly(value);
}

function normalizePhone(value) {
  return digitsOnly(value);
}

function normalizeDigits(value, maxLength) {
  const digits = digitsOnly(value);
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
}

function normalizePaddedDigits(value, exactLength) {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return digits.slice(0, exactLength).padStart(exactLength, '0');
}

module.exports = {
  digitsOnly,
  normalizeText,
  normalizeDate,
  normalizeCpf,
  normalizePhone,
  normalizeDigits,
  normalizePaddedDigits
};
