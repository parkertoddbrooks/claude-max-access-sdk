/**
 * OAuth Interceptor - Modifies fetch to work with OAuth tokens
 * Based on how OpenCode's anthropic-auth plugin works
 */

class OAuthInterceptor {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.originalFetch = global.fetch || require('node-fetch');
  }

  /**
   * Creates an intercepted fetch function that adds OAuth headers
   */
  createInterceptedFetch() {
    return async (url, init = {}) => {
      // Only intercept Anthropic API calls
      if (!url.includes('api.anthropic.com')) {
        return this.originalFetch(url, init);
      }

      // Get current tokens
      const tokens = await this.tokenManager.loadTokens();

      if (!tokens || tokens.type !== 'success') {
        throw new Error('No valid OAuth tokens found');
      }

      // Check if token needs refresh
      if (tokens.expires && tokens.expires < Date.now()) {
        await this.refreshToken(tokens.refresh);
        const newTokens = await this.tokenManager.loadTokens();
        tokens.access = newTokens.access;
      }

      // Modify headers for OAuth
      const headers = {
        ...init.headers,
        'authorization': `Bearer ${tokens.access}`,
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      };

      // Remove x-api-key if present
      delete headers['x-api-key'];

      // Make the request
      return this.originalFetch(url, {
        ...init,
        headers
      });
    };
  }

  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken) {
    const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

    const response = await this.originalFetch('https://console.anthropic.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();

    await this.tokenManager.saveTokens({
      type: 'success',
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expires_in: data.expires_in
    });
  }

  /**
   * Install the interceptor globally
   */
  install() {
    global.fetch = this.createInterceptedFetch();

    // Also intercept axios if it's being used
    try {
      const axios = require('axios');
      axios.defaults.adapter = async (config) => {
        const url = config.url;
        const response = await global.fetch(url, {
          method: config.method,
          headers: config.headers,
          body: config.data
        });

        const data = await response.json().catch(() => response.text());

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config,
          request: {}
        };
      };
    } catch (e) {
      // Axios not installed, skip
    }
  }
}

module.exports = OAuthInterceptor;