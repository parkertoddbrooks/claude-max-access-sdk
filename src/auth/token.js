const OAuthClient = require('./oauth');

class TokenManager {
  constructor(storage) {
    this.storage = storage;
    this.oauthClient = new OAuthClient();
    this.tokens = null;
  }

  /**
   * Load tokens from storage
   * @returns {Promise<Object|null>} Stored tokens or null
   */
  async loadTokens() {
    try {
      this.tokens = await this.storage.get('tokens');
      return this.tokens;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save tokens to storage
   * @param {Object} tokens - Token object
   * @returns {Promise<void>}
   */
  async saveTokens(tokens) {
    this.tokens = {
      type: 'success',
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expires: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
    };
    await this.storage.set('tokens', this.tokens);
  }

  /**
   * Check if tokens are valid
   * @returns {Promise<boolean>}
   */
  async isValid() {
    const tokens = await this.loadTokens();
    if (!tokens || !tokens.access) {
      return false;
    }

    // Check expiration if available
    if (tokens.expires && Date.now() >= tokens.expires) {
      return false;
    }

    return true;
  }

  /**
   * Get current access token, refreshing if needed
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    const tokens = await this.loadTokens();

    if (!tokens) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    // Check if token needs refresh
    if (tokens.expires && Date.now() >= tokens.expires - 60000) { // Refresh 1 min before expiry
      try {
        const newTokens = await this.oauthClient.refreshToken(tokens.refresh);
        await this.saveTokens(newTokens);
        return this.tokens.access;
      } catch (error) {
        throw new Error('Failed to refresh token. Please re-authenticate.');
      }
    }

    return tokens.access;
  }

  /**
   * Clear stored tokens
   * @returns {Promise<void>}
   */
  async clear() {
    this.tokens = null;
    await this.storage.clear();
  }
}

module.exports = TokenManager;