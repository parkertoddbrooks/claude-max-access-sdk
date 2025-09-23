const crypto = require('crypto');

/**
 * Generate PKCE code verifier and challenge
 * @returns {Object} { verifier, challenge, method }
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return {
    verifier,
    challenge,
    method: 'S256'
  };
}

module.exports = {
  generatePKCE
};