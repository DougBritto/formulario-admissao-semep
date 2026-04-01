function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function isRepeatedDigits(value) {
  return /^(\d)\1+$/.test(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidUf(value) {
  return /^[A-Za-z]{2}$/.test(String(value || '').trim());
}

function normalizeIssuerWithUf(value) {
  const text = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');

  return text;
}

function isValidIssuerWithUf(value) {
  const normalized = normalizeIssuerWithUf(value);
  if (!normalized) return true;

  return /^[A-Z]{2,10}(?:[ .-][A-Z]{2,10})*\/[A-Z]{2}$/.test(normalized);
}

function isValidCalendarDate(value) {
  const text = String(value || '').trim();
  if (!text) return true;

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidCpf(value) {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

function isValidPisPasep(value) {
  const raw = String(value || '').trim();
  const digits = digitsOnly(raw);
  return raw === digits && digits.length === 11;
}

function parseBrazilianDate(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function requiresDnvByBirthDate(value) {
  const date = parseBrazilianDate(value);
  if (!date) return false;

  const cutoff = new Date(2010, 1, 1);
  return date >= cutoff;
}

module.exports = {
  digitsOnly,
  isValidIssuerWithUf,
  isRepeatedDigits,
  normalizeIssuerWithUf,
  parseBrazilianDate,
  requiresDnvByBirthDate,
  isValidCalendarDate,
  isValidCpf,
  isValidEmail,
  isValidPisPasep,
  isValidUf
};
