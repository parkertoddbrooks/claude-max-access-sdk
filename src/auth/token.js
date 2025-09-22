const axios = require('axios');

class TokenManager {
  constructor(storage) {
    this.storage = storage;
    this.tokenUrl = 'https://console.anthropic.com/v1/oauth/token';
    this.clientId = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
  }

  /**
   * Get current tokens
   */
  async getTokens() {
    return await this.storage.get('tokens');
  }

  /**
   * Get access token (refresh if needed)
   */
  async getAccessToken() {
    const tokens = await this.getTokens();

    if (!tokens) {
      throw new Error('Not authenticated. Please run authenticate() first.');
    }

    // Check if token is expired (tokens typically last 1 hour)
    const tokenAge = Date.now() - (await this.storage.get('token_received_at') || 0);
    const oneHour = 60 * 60 * 1000;

    if (tokenAge > oneHour && tokens.refresh_token) {
      // Token is likely expired, refresh it
      return await this.refresh();
    }

    return tokens.access_token;
  }

  /**
   * Check if we have valid tokens
   */
  async hasValidToken() {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refresh() {
    const tokens = await this.getTokens();

    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available. Please authenticate again.');
    }

    try {
      const response = await axios.post(this.tokenUrl, {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: tokens.refresh_token
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const newTokens = response.data;

      // Update stored tokens
      await this.storage.set('tokens', {
        ...tokens,
        access_token: newTokens.access_token,
        // Keep refresh token if not provided in response
        refresh_token: newTokens.refresh_token || tokens.refresh_token
      });
      await this.storage.set('token_received_at', Date.now());

      return newTokens.access_token;
    } catch (error) {
      if (error.response) {
        throw new Error(`Token refresh failed: ${error.response.data.error || error.response.statusText}`);
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
}

module.exports = TokenManager;