const axios = require('axios');

class ApiClient {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';

    // Beta headers from OpenCode
    this.betaHeaders = 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14';
  }

  /**
   * Make a request to Claude API
   */
  async request(payload) {
    // Get access token
    const accessToken = await this.tokenManager.getAccessToken();

    // Prepare request
    const requestData = {
      model: payload.model || 'claude-3.5-sonnet',
      messages: payload.messages,
      max_tokens: payload.max_tokens || 1024,
      ...payload // Allow other parameters
    };

    try {
      const response = await axios.post(this.baseUrl, requestData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'anthropic-beta': this.betaHeaders,
          'Content-Type': 'application/json',
          // Important: Do NOT include x-api-key header
        }
      });

      return response.data;
    } catch (error) {
      // Handle token expiration
      if (error.response && error.response.status === 401) {
        console.log('Token expired, refreshing...');

        // Try to refresh token
        try {
          await this.tokenManager.refresh();

          // Retry request with new token
          const newToken = await this.tokenManager.getAccessToken();
          const retryResponse = await axios.post(this.baseUrl, requestData, {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'anthropic-beta': this.betaHeaders,
              'Content-Type': 'application/json'
            }
          });

          return retryResponse.data;
        } catch (refreshError) {
          throw new Error('Authentication failed. Please run authenticate() again.');
        }
      }

      // Handle rate limits
      if (error.response && error.response.status === 429) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const retryAfter = error.response.headers['retry-after'];

        throw new Error(`Rate limited. Max Plan limit reached. Resets in ~5 hours. ${retryAfter ? `Retry after: ${retryAfter}s` : ''}`);
      }

      // Handle other errors
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.response.statusText;
        throw new Error(`API request failed: ${errorMessage}`);
      }

      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Stream a request (for future implementation)
   */
  async stream(payload) {
    // Streaming would require a different approach
    // For now, just use regular request
    console.warn('Streaming not yet implemented, using regular request');
    return await this.request(payload);
  }
}

module.exports = ApiClient;