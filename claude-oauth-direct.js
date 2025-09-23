#!/usr/bin/env node

/**
 * Claude OAuth Direct Access - Testing the "Handshake"
 *
 * Based on reverse-engineering the anthropic-claude-max-proxy approach:
 * The key is not a cryptographic handshake but precise request forgery
 * mimicking whitelisted clients like Claude Code or OpenCode.
 */

const axios = require('axios');
const fs = require('fs').promises;
const https = require('https');

class ClaudeOAuthDirect {
  constructor() {
    // OAuth configuration (from anthropic-claude-max-proxy)
    this.oauth = {
      clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
      redirectUri: 'https://console.anthropic.com/oauth/code/callback',
      authBaseAuthorize: 'https://claude.ai',
      authBaseToken: 'https://console.anthropic.com',
      scopes: 'org:create_api_key user:profile user:inference'
    };

    // Critical headers for the "handshake"
    this.betaHeaders = [
      'oauth-2025-04-20',
      'claude-code-20250219',
      'interleaved-thinking-2025-05-14',
      'fine-grained-tool-streaming-2025-05-14'
    ];

    this.tokens = null;
  }

  /**
   * Generate PKCE challenge
   */
  generatePKCE() {
    const crypto = require('crypto');
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  /**
   * Start OAuth flow
   */
  async startOAuthFlow() {
    const { verifier, challenge } = this.generatePKCE();
    const state = require('crypto').randomBytes(16).toString('hex');

    // Store verifier and state for later use
    this.pendingAuth = { verifier, state };

    const authUrl = new URL(`${this.oauth.authBaseAuthorize}/oauth/authorize`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.oauth.clientId);
    authUrl.searchParams.append('redirect_uri', this.oauth.redirectUri);
    authUrl.searchParams.append('scope', this.oauth.scopes);
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('state', state);

    console.log('\n🔐 OAuth Authentication Flow');
    console.log('=' .repeat(60));
    console.log('\n1. Open this URL in your browser:');
    console.log(`\n   ${authUrl.toString()}`);
    console.log('\n2. Log in with your Claude Pro/Max account');
    console.log('3. You\'ll be redirected to a URL like:');
    console.log('   https://console.anthropic.com/oauth/code/callback?code=XXX&state=YYY');
    console.log('4. Copy the ENTIRE redirect URL\n');

    // Debug info
    console.log('Debug info (for troubleshooting):');
    console.log(`  Verifier: ${verifier}`);
    console.log(`  Challenge: ${challenge}`);
    console.log(`  State: ${state}\n`);

    // Get the callback URL from user
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));
    const callbackUrl = await question('Paste redirect URL here: ');
    readline.close();

    // Parse the code
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (!code) {
      throw new Error('No authorization code found in URL');
    }

    // Verify state matches
    if (returnedState !== state) {
      console.warn('⚠️  State mismatch - this might indicate a security issue or stale URL');
    }

    // Exchange code for tokens
    console.log('\n📡 Exchanging code for tokens...');

    try {
      const tokenResponse = await axios.post(
        `${this.oauth.authBaseToken}/v1/oauth/token`,
        {
          grant_type: 'authorization_code',
          client_id: this.oauth.clientId,
          code: code,
          redirect_uri: this.oauth.redirectUri,
          code_verifier: verifier
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Claude-Code/1.0.0'  // Try with UA
          }
        }
      );

      this.tokens = tokenResponse.data;

      // Save tokens
      await this.saveTokens();

      console.log('✅ OAuth tokens obtained successfully!');
      console.log(`   Access token: ${this.tokens.access_token.substring(0, 20)}...`);

      return this.tokens;
    } catch (error) {
      console.error('\n❌ Token exchange failed:');
      if (error.response?.data) {
        console.error('Error response:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('\nPossible issues:');
      console.error('1. The authorization code might have expired (they expire quickly)');
      console.error('2. The code might have already been used');
      console.error('3. There might be a PKCE verifier mismatch');
      console.error('\nTry running the auth command again with a fresh authorization.');
      throw error;
    }
  }

  /**
   * Load saved tokens
   */
  async loadTokens() {
    try {
      const data = await fs.readFile('./claude-oauth-tokens.json', 'utf8');
      this.tokens = JSON.parse(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save tokens
   */
  async saveTokens() {
    await fs.writeFile(
      './claude-oauth-tokens.json',
      JSON.stringify(this.tokens, null, 2)
    );
    try {
      await fs.chmod('./claude-oauth-tokens.json', 0o600);
    } catch (e) {
      // Windows doesn't support chmod
    }
  }

  /**
   * Send message with proper "handshake" headers
   */
  async sendMessage(message, options = {}) {
    if (!this.tokens) {
      const loaded = await this.loadTokens();
      if (!loaded) {
        throw new Error('No OAuth tokens found. Please authenticate first.');
      }
    }

    // Construct the request with exact headers
    const headers = {
      'Authorization': `Bearer ${this.tokens.access_token}`,
      'anthropic-beta': this.betaHeaders.join(','),
      'Content-Type': 'application/json',
      'User-Agent': options.userAgent || 'Claude-Code/1.0.0'
    };

    // Test with both URLs
    const urls = [
      'https://api.anthropic.com/v1/messages',
      'https://api.anthropic.com/v1/messages?beta=true'
    ];

    for (const url of urls) {
      console.log(`\n🔄 Testing: ${url}`);
      console.log('Headers:', JSON.stringify(headers, null, 2));

      try {
        const response = await axios.post(
          url,
          {
            model: options.model || 'claude-3-5-sonnet-20241022',
            messages: [{
              role: 'user',
              content: typeof message === 'string'
                ? message
                : [{type: 'text', text: message}]
            }],
            max_tokens: options.maxTokens || 1000
          },
          {
            headers,
            httpsAgent: new https.Agent({
              // Match TLS fingerprint if needed
              secureOptions: require('constants').SSL_OP_NO_TLSv1_3
            })
          }
        );

        console.log('✅ Success!');
        return response.data;
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.data?.error?.message || error.message}`);

        // If refresh token exists and we got 401, try refreshing
        if (error.response?.status === 401 && this.tokens.refresh_token) {
          console.log('🔄 Attempting token refresh...');
          await this.refreshToken();
          // Retry with new token
          headers['Authorization'] = `Bearer ${this.tokens.access_token}`;
        }
      }
    }

    throw new Error('All request attempts failed');
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken() {
    const response = await axios.post(
      `${this.oauth.authBaseToken}/v1/oauth/token`,
      {
        grant_type: 'refresh_token',
        client_id: this.oauth.clientId,
        refresh_token: this.tokens.refresh_token
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    this.tokens = response.data;
    await this.saveTokens();
    console.log('✅ Token refreshed successfully');
  }

  /**
   * Run as proxy server (mimics anthropic-claude-max-proxy)
   */
  async startProxyServer(port = 8081) {
    const express = require('express');
    const app = express();
    app.use(express.json());

    // Load tokens
    const loaded = await this.loadTokens();
    if (!loaded) {
      console.log('⚠️  No tokens found. Please run authenticate first.');
      return;
    }

    // Proxy endpoint
    app.post('/v1/messages', async (req, res) => {
      try {
        console.log('📥 Proxy request received');

        // Forward with proper headers
        const response = await this.sendMessage(
          req.body.messages[0].content,
          {
            model: req.body.model,
            maxTokens: req.body.max_tokens,
            userAgent: req.headers['user-agent'] || 'Claude-Code/1.0.0'
          }
        );

        res.json(response);
      } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({
          error: {
            message: error.message,
            type: 'proxy_error'
          }
        });
      }
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`\n🚀 Proxy server running at http://0.0.0.0:${port}`);
      console.log('📡 Configure your client to use:');
      console.log(`   Base URL: http://localhost:${port}`);
      console.log('   API Key: any-dummy-key');
      console.log('\nPress Ctrl+C to stop\n');
    });
  }
}

// CLI interface
async function main() {
  const client = new ClaudeOAuthDirect();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🔬 Claude OAuth Direct Access - Testing the Handshake');
  console.log('=' .repeat(60));

  switch (command) {
    case 'auth':
    case 'authenticate':
      await client.startOAuthFlow();
      break;

    case 'test':
      console.log('\n🧪 Testing direct OAuth access...');
      try {
        const response = await client.sendMessage('Say "Hello from direct OAuth!" and nothing else.');
        console.log('\n✅ Response:', response.content[0].text);
      } catch (error) {
        console.log('\n❌ Test failed:', error.message);
      }
      break;

    case 'proxy':
      const port = args[1] || 8081;
      await client.startProxyServer(port);
      break;

    case 'refresh':
      await client.refreshToken();
      break;

    default:
      console.log('\nUsage:');
      console.log('  node claude-oauth-direct.js auth     - Start OAuth flow');
      console.log('  node claude-oauth-direct.js test     - Test direct access');
      console.log('  node claude-oauth-direct.js proxy    - Start proxy server');
      console.log('  node claude-oauth-direct.js refresh  - Refresh token');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ClaudeOAuthDirect;