const axios = require('axios');

const API_URL = 'https://api.opencode.ai/anthropic/v1/messages';

class APIClient {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Make a request to Claude API
   * @param {Object} payload - API request payload
   * @returns {Promise<Object>} API response
   */
  async request(payload) {
    const accessToken = await this.tokenManager.getAccessToken();

    console.log('Making request to:', API_URL);
    console.log('Access token:', accessToken ? accessToken.substring(0, 30) + '...' : 'NO TOKEN');
    console.log('With payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(API_URL, payload, {
        headers: {
          'authorization': `Bearer ${accessToken}`,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
        }
      });

      console.log('API Response status:', response.status);
      console.log('API Response data:', response.data);

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token might be expired, try to refresh
        const newToken = await this.tokenManager.getAccessToken();

        // Retry with new token
        const response = await axios.post(API_URL, payload, {
          headers: {
            'authorization': `Bearer ${newToken}`,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
          }
        });

        return response.data;
      }

      throw error;
    }
  }

  /**
   * Send a message to Claude
   * @param {string} message - Message text
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Claude's response
   */
  async sendMessage(message, options = {}) {
    const payload = {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: options.maxTokens || 1000,
      ...options
    };

    const response = await this.request(payload);

    // Debug logging
    if (!response) {
      console.log('No response received from API');
      return '';
    }
    if (!response.content) {
      console.log('Response has no content:', response);
      return '';
    }
    if (!response.content[0]) {
      console.log('Response content is empty:', response.content);
      return '';
    }

    return response.content[0].text || '';
  }

  /**
   * Continue a conversation with Claude
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Full API response
   */
  async chat(messages, options = {}) {
    const payload = {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: options.maxTokens || 1000,
      ...options
    };

    return this.request(payload);
  }
}

module.exports = APIClient;