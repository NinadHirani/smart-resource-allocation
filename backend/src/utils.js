function toArrayFilter(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

module.exports = {
  clampNumber,
  toArrayFilter,
};
