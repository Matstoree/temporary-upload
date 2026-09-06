function parseSize(input) {
  if (!input) return 100 * 1024 * 1024;

  const match = String(input).trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i);
  if (!match) return 100 * 1024 * 1024;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  return Math.floor(value * multipliers[unit]);
}

module.exports = parseSize;
