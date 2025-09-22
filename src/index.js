const OAuth = require('./auth/oauth');
const ApiClient = require('./api/client');
const TokenManager = require('./auth/token');
const { MemoryStorage, FileStorage } = require('./utils/storage');

class ClaudeSDK {
  constructor(options = {}) {
    // Initialize storage
    const storageType = options.storage || 'memory';
    if (storageType === 'memory') {
      this.storage = new MemoryStorage();
    } else if (storageType === 'file') {
      this.storage = new FileStorage(options.storagePath);
    } else if (typeof storageType === 'object') {
      this.storage = storageType; // Custom storage adapter
    }

    // Initialize components
    this.oauth = new OAuth(this.storage);
    this.tokenManager = new TokenManager(this.storage);
    this.apiClient = new ApiClient(this.tokenManager);

    // Options
    this.debug = options.debug || false;
  }

  /**
   * Complete authentication flow (opens browser and prompts for code)
   */
  async authenticate() {
    if (this.debug) console.log('Starting authentication flow...');

    // Start OAuth flow
    const authUrl = await this.oauth.getAuthorizationUrl();
    console.log('\n🔐 Opening browser for authentication...');
    console.log('URL:', authUrl);

    // Open browser
    await this.oauth.openBrowser(authUrl);

    // Prompt for code
    const code = await this.oauth.promptForCode();

    // Exchange for tokens
    const tokens = await this.oauth.exchangeCode(code);

    console.log('✅ Authentication successful!');
    return tokens;
  }

  /**
   * Start authentication (returns URL, doesn't open browser)
   */
  async startAuth() {
    return await this.oauth.getAuthorizationUrl();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code) {
    return await this.oauth.exchangeCode(code);
  }

  /**
   * Make a request to Claude API
   */
  async request(payload) {
    return await this.apiClient.request(payload);
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated() {
    return await this.tokenManager.hasValidToken();
  }

  /**
   * Get current usage stats
   */
  async getUsage() {
    // This would need to be implemented based on Claude's API
    // For now, return a placeholder
    const tokens = await this.tokenManager.getTokens();
    if (!tokens) {
      throw new Error('Not authenticated');
    }

    return {
      used: 'Unknown',
      limit: '50-200 prompts per 5 hours',
      resetAt: 'Unknown'
    };
  }

  /**
   * Manually refresh token
   */
  async refreshToken() {
    return await this.tokenManager.refresh();
  }

  /**
   * Clear stored tokens (logout)
   */
  async logout() {
    await this.storage.clear();
    console.log('✅ Logged out successfully');
  }
}

module.exports = ClaudeSDK;