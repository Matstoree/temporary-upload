const EXPIRY_MAP = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  permanent: null
};

function isValidExpiry(expiry) {
  return Object.prototype.hasOwnProperty.call(EXPIRY_MAP, expiry);
}

function calculateExpiresAt(expiry) {
  const duration = EXPIRY_MAP[expiry];
  if (duration === null) return null;
  return Date.now() + duration;
}

module.exports = { EXPIRY_MAP, isValidExpiry, calculateExpiresAt };
