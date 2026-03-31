function normalizeText(value, { uppercase = true } = {}) {
  if (value === undefined || value === null) return '';
  let text = String(value).trim();
  if (!text) return '';
  text = text.replace(/\s+/g, ' ');
  return uppercase ? text.toUpperCase() : text;
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text;
}

function normalizeCpf(value) {
  return normalizeText(value, { uppercase: false });
}

function normalizePhone(value) {
  return normalizeText(value, { uppercase: false });
}

module.exports = {
  normalizeText,
  normalizeDate,
  normalizeCpf,
  normalizePhone
};
