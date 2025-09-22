const crypto = require('crypto');
const readline = require('readline');
const open = require('open');
const axios = require('axios');

class OAuth {
  constructor(storage) {
    this.storage = storage;

    // OAuth configuration (from OpenCode)
    this.clientId = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
    this.authUrl = 'https://claude.ai/oauth/authorize';
    this.tokenUrl = 'https://console.anthropic.com/v1/oauth/token';
    this.redirectUri = 'https://console.anthropic.com/oauth/code/callback';

    // PKCE state
    this.codeVerifier = null;
    this.codeChallenge = null;
  }

  /**
   * Generate PKCE challenge and verifier
   */
  generatePKCE() {
    // Generate code verifier (43-128 characters)
    this.codeVerifier = crypto
      .randomBytes(32)
      .toString('base64url');

    // Generate code challenge from verifier
    const hash = crypto
      .createHash('sha256')
      .update(this.codeVerifier)
      .digest('base64url');

    this.codeChallenge = hash;

    return {
      verifier: this.codeVerifier,
      challenge: this.codeChallenge
    };
  }

  /**
   * Build authorization URL
   */
  async getAuthorizationUrl() {
    // Generate PKCE
    this.generatePKCE();

    // Build URL with parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'org:create_api_key user:profile user:inference', // Required scopes from OpenCode
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
      // Optional: Add state for security
      state: crypto.randomBytes(16).toString('hex')
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Open browser with authorization URL
   */
  async openBrowser(url) {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open browser automatically');
      console.log('Please open this URL manually:', url);
    }
  }

  /**
   * Prompt user for authorization code
   */
  async promptForCode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n📋 After logging in, you\'ll be redirected to a URL like:');
    console.log('   https://console.anthropic.com/oauth/code/callback?code=AUTH_CODE_HERE\n');
    console.log('   Copy the code parameter from the URL.\n');

    return new Promise((resolve) => {
      rl.question('📝 Enter the authorization code: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code) {
    if (!this.codeVerifier) {
      throw new Error('No code verifier found. Please start authentication flow first.');
    }

    try {
      // Token exchange request (using form-urlencoded as per OAuth spec)
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: this.codeVerifier
      });

      const response = await axios.post(this.tokenUrl, tokenData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = response.data;

      // Store tokens
      await this.storage.set('tokens', tokens);
      await this.storage.set('token_received_at', Date.now());

      // Clear PKCE state
      this.codeVerifier = null;
      this.codeChallenge = null;

      return tokens;
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessage = typeof errorData === 'object'
          ? JSON.stringify(errorData, null, 2)
          : errorData.error || error.response.statusText;
        throw new Error(`Token exchange failed (${error.response.status}): ${errorMessage}`);
      }
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
}

module.exports = OAuth;