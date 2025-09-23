#!/usr/bin/env node

/**
 * Complete OAuth Flow Implementation
 *
 * Usage:
 * 1. Run: node oauth-flow.js
 * 2. Visit the URL it provides
 * 3. Login with Claude Max Plan
 * 4. Paste the code back
 * 5. It will attempt to make it work
 */

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs').promises;
const readline = require('readline');

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';

class OAuthFlow {
  constructor() {
    this.pkce = null;
  }

  // Generate PKCE challenge
  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    this.pkce = { verifier, challenge };
    return this.pkce;
  }

  // Step 1: Generate Authorization URL
  getAuthorizationURL() {
    this.generatePKCE();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'org:create_api_key user:profile user:inference',
      code_challenge: this.pkce.challenge,
      code_challenge_method: 'S256',
      state: this.pkce.verifier
    });

    return `https://claude.ai/oauth/authorize?${params}`;
  }

  // Step 2: Exchange code for tokens
  async exchangeCodeForTokens(fullCode) {
    const [code, state] = fullCode.split('#');

    const response = await axios.post(
      'https://console.anthropic.com/v1/oauth/token',
      {
        code: code,
        state: state || this.pkce.verifier,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: this.pkce.verifier
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Step 3: Try different methods to make tokens work
  async makeTokensWork(tokens) {
    const results = {};

    // Method 1: Direct API call with OAuth token
    console.log('\n🔧 Method 1: Direct API call with OAuth...');
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Say "Hello" only.' }],
          max_tokens: 10
        },
        {
          headers: {
            'authorization': `Bearer ${tokens.access_token}`,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
          }
        }
      );
      results.direct = { success: true, data: response.data };
      console.log('✅ SUCCESS - Direct API works!');
    } catch (error) {
      results.direct = { success: false, error: error.response?.data || error.message };
      console.log('❌ Failed:', error.response?.data?.error?.message || error.message);
    }

    // Method 2: Try to create an API key
    console.log('\n🔧 Method 2: Create API key from OAuth...');
    try {
      const response = await axios.post(
        'https://api.anthropic.com/api/oauth/claude_cli/create_api_key',
        {},
        {
          headers: {
            'authorization': `Bearer ${tokens.access_token}`,
            'content-type': 'application/json'
          }
        }
      );
      results.apiKey = { success: true, key: response.data.raw_key };
      console.log('✅ SUCCESS - Got API key:', response.data.raw_key.substring(0, 20) + '...');

      // Save the API key
      await fs.writeFile('./api-key.json', JSON.stringify({
        apiKey: response.data.raw_key,
        created: new Date().toISOString()
      }, null, 2));
      console.log('📁 API key saved to api-key.json');
    } catch (error) {
      results.apiKey = { success: false, error: error.response?.data || error.message };
      console.log('❌ Failed:', error.response?.data?.error?.message || error.message);
    }

    // Method 3: Test refresh token
    console.log('\n🔧 Method 3: Test token refresh...');
    try {
      const response = await axios.post(
        'https://console.anthropic.com/v1/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: CLIENT_ID
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      results.refresh = { success: true, newTokens: response.data };
      console.log('✅ SUCCESS - Token refresh works!');
    } catch (error) {
      results.refresh = { success: false, error: error.response?.data || error.message };
      console.log('❌ Failed:', error.response?.data?.error || error.message);
    }

    // Save all tokens and results
    await fs.writeFile('./oauth-tokens.json', JSON.stringify({
      tokens: {
        access: tokens.access_token,
        refresh: tokens.refresh_token,
        expires: Date.now() + (tokens.expires_in * 1000)
      },
      results: results,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log('\n📁 All tokens saved to oauth-tokens.json');

    return results;
  }

  // Test if we can use the tokens
  async testTokenUsability(tokens) {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 TESTING TOKEN USABILITY');
    console.log('='.repeat(50));

    const results = await this.makeTokensWork(tokens);

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTS SUMMARY:');
    console.log('='.repeat(50));

    if (results.direct?.success) {
      console.log('✅ Direct API calls: WORK');
    } else {
      console.log('❌ Direct API calls: BLOCKED (Claude Code only)');
    }

    if (results.apiKey?.success) {
      console.log('✅ API key creation: WORKS');
      console.log('   Your API key is in: api-key.json');
    } else {
      console.log('❌ API key creation: NOT AVAILABLE');
    }

    if (results.refresh?.success) {
      console.log('✅ Token refresh: WORKS');
    } else {
      console.log('❌ Token refresh: FAILED');
    }

    console.log('='.repeat(50) + '\n');

    return results;
  }
}

// Main interactive flow
async function main() {
  const flow = new OAuthFlow();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n🚀 CLAUDE OAUTH FLOW TESTER');
  console.log('='.repeat(50));
  console.log('This will test what actually works with OAuth tokens\n');

  // Generate URL
  const url = flow.getAuthorizationURL();

  console.log('📋 Step 1: Authorize');
  console.log('='.repeat(50));
  console.log('\nGo to this URL:\n');
  console.log(url);
  console.log('\n' + '='.repeat(50));
  console.log('After authorizing, you\'ll be redirected.');
  console.log('Copy the ENTIRE code from the URL (format: ABC123#XYZ789)\n');

  // Get code from user
  const code = await question('Paste the code here: ');

  try {
    // Exchange code
    console.log('\n📋 Step 2: Exchange Code');
    console.log('='.repeat(50));
    const tokens = await flow.exchangeCodeForTokens(code.trim());
    console.log('✅ Got OAuth tokens!');
    console.log('  Access token:', tokens.access_token.substring(0, 30) + '...');
    console.log('  Refresh token:', tokens.refresh_token ? tokens.refresh_token.substring(0, 30) + '...' : 'None');
    console.log('  Expires in:', tokens.expires_in, 'seconds');

    // Test what works
    await flow.testTokenUsability(tokens);

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  rl.close();
}

// Export for use as module
module.exports = OAuthFlow;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}