const crypto = require('crypto');

function generateShortId(length = 8) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

module.exports = generateShortId;
