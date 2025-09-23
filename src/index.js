const readline = require('readline');
const { exec } = require('child_process');
const OAuthClient = require('./auth/oauth');
const TokenManager = require('./auth/token');
const APIClient = require('./api/client');
const { createStorage } = require('./utils/storage');

class ClaudeSDK {
  constructor(options = {}) {
    this.storage = createStorage(options.storage || 'memory', {
      path: options.storagePath
    });
    this.debug = options.debug || false;

    this.oauthClient = new OAuthClient();
    this.tokenManager = new TokenManager(this.storage);
    this.apiClient = new APIClient(this.tokenManager);
  }

  /**
   * Start OAuth flow and return authorization URL
   * @returns {string} Authorization URL
   */
  startAuth() {
    const url = this.oauthClient.startAuth();

    if (this.debug) {
      console.log('Authorization URL:', url);
    }

    return url;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} callbackUrlOrCode - Full callback URL or just the code
   * @returns {Promise<Object>} Token response
   */
  async exchangeCode(callbackUrlOrCode) {
    let callbackUrl = callbackUrlOrCode;

    // If it's just a code, construct the callback URL
    if (!callbackUrlOrCode.startsWith('http')) {
      callbackUrl = `https://console.anthropic.com/oauth/code/callback#${callbackUrlOrCode}`;
    }

    const tokens = await this.oauthClient.exchangeCode(callbackUrl);
    await this.tokenManager.saveTokens(tokens);

    return tokens;
  }

  /**
   * Complete authentication flow with browser opening and code prompt
   * @returns {Promise<Object>} Token response
   */
  async authenticate() {
    const authUrl = this.startAuth();

    // Try to open browser
    console.log('\nOpening browser to:', authUrl);
    console.log('\nIf the browser doesn\'t open, manually navigate to the URL above.');

    // Open browser (cross-platform)
    const command = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' :
                    'xdg-open';

    exec(`${command} "${authUrl}"`, (error) => {
      if (error && this.debug) {
        console.error('Failed to open browser:', error);
      }
    });

    // Prompt for code
    const code = await this.promptForCode();

    // Exchange code for tokens
    return this.exchangeCode(code);
  }

  /**
   * Prompt user for authorization code
   * @returns {Promise<string>} Authorization code
   */
  promptForCode() {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log('\nAfter authorizing, you\'ll be redirected to a URL like:');
      console.log('https://console.anthropic.com/oauth/code/callback?code=ABC123#XYZ789');
      console.log('\nCopy the ENTIRE URL or just the code part (ABC123#XYZ789)');

      rl.question('\nPaste the callback URL or code here: ', (input) => {
        rl.close();
        resolve(input.trim());
      });
    });
  }

  /**
   * Check if authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    return this.tokenManager.isValid();
  }

  /**
   * Make an API request
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async request(payload) {
    return this.apiClient.request(payload);
  }

  /**
   * Send a simple message to Claude
   * @param {string} message - Message text
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Claude's response
   */
  async sendMessage(message, options = {}) {
    return this.apiClient.sendMessage(message, options);
  }

  /**
   * Chat with Claude (conversation)
   * @param {Array} messages - Message history
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response
   */
  async chat(messages, options = {}) {
    return this.apiClient.chat(messages, options);
  }

  /**
   * Get current tokens
   * @returns {Promise<Object>} Current tokens
   */
  async getTokens() {
    return this.tokenManager.loadTokens();
  }

  /**
   * Clear tokens (logout)
   * @returns {Promise<void>}
   */
  async logout() {
    await this.tokenManager.clear();
  }
}

module.exports = ClaudeSDK;