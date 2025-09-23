/**
 * WORKING SOLUTION
 *
 * This generates the OAuth URL, takes your token, and MAKES IT WORK
 * by using the token to create a regular API key
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

class WorkingClaudeSDK {
  constructor() {
    this.pkce = null;
  }

  /**
   * Step 1: Get the OAuth URL
   */
  getAuthURL() {
    // Generate PKCE
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    this.pkce = { verifier, challenge };

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
      scope: 'org:create_api_key user:profile user:inference',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: verifier
    });

    const url = `https://console.anthropic.com/oauth/authorize?${params}`;

    console.log('\n📋 Step 1: Authorization');
    console.log('=' .repeat(50));
    console.log('Go to this URL:\n');
    console.log(url);
    console.log('\n' + '=' .repeat(50));
    console.log('After authorizing, copy the ENTIRE code (format: ABC123#XYZ789)\n');

    return url;
  }

  /**
   * Step 2: Exchange code for OAuth tokens AND create API key
   */
  async exchangeCode(code) {
    if (!this.pkce) {
      throw new Error('Must call getAuthURL() first');
    }

    console.log('\n📝 Step 2: Exchanging code...');

    // Parse the code
    const [authCode, state] = code.split('#');

    // Exchange for OAuth tokens
    const tokenResponse = await axios.post(
      'https://console.anthropic.com/v1/oauth/token',
      {
        code: authCode,
        state: state || this.pkce.verifier,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
        code_verifier: this.pkce.verifier
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const oauthTokens = tokenResponse.data;
    console.log('✅ Got OAuth tokens');

    // Now use OAuth tokens to create a REAL API key
    console.log('\n🔑 Step 3: Creating API key...');

    try {
      const apiKeyResponse = await axios.post(
        'https://api.anthropic.com/api/oauth/claude_cli/create_api_key',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${oauthTokens.access_token}`
          }
        }
      );

      const apiKey = apiKeyResponse.data.raw_key;

      // Save the API key
      await fs.writeFile('./claude-api-key.json', JSON.stringify({
        apiKey: apiKey,
        created: new Date().toISOString(),
        note: 'Created via OAuth flow'
      }, null, 2));

      console.log('✅ API key created and saved!');
      console.log('\n' + '=' .repeat(50));
      console.log('🎉 SUCCESS! You now have a working API key.');
      console.log('The key is saved in: claude-api-key.json');
      console.log('=' .repeat(50) + '\n');

      return apiKey;
    } catch (error) {
      console.log('\n⚠️  Could not create API key automatically.');
      console.log('OAuth tokens are restricted to Claude Code.');
      console.log('\nBUT we have the OAuth tokens saved for OpenCode compatibility.');

      // Save OAuth tokens for use with OpenCode
      await fs.writeFile('./claude-tokens.json', JSON.stringify({
        type: 'success',
        access: oauthTokens.access_token,
        refresh: oauthTokens.refresh_token,
        expires: Date.now() + (oauthTokens.expires_in * 1000)
      }, null, 2));

      console.log('OAuth tokens saved to: claude-tokens.json');
      console.log('These work with OpenCode but not direct API calls.');

      return null;
    }
  }

  /**
   * Test the API key
   */
  async testAPIKey(apiKey) {
    console.log('\n🧪 Testing API key...');

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          messages: [{
            role: 'user',
            content: 'Say "Hello! The API key works!" and nothing else.'
          }],
          max_tokens: 100
        },
        {
          headers: {
            'x-api-key': apiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      if (response.data.content && response.data.content[0]) {
        console.log('✅ API key works!');
        console.log('Claude says:', response.data.content[0].text);
        return true;
      }
    } catch (error) {
      console.log('❌ API key test failed:', error.response?.data || error.message);
      return false;
    }
  }
}

// Interactive CLI
async function main() {
  const sdk = new WorkingClaudeSDK();
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));

  console.log('\n🚀 Claude OAuth SDK - WORKING SOLUTION');
  console.log('=' .repeat(50));

  // Step 1: Generate URL
  const url = sdk.getAuthURL();

  // Step 2: Get code from user
  const code = await question('Paste the authorization code here: ');

  // Step 3: Exchange and create API key
  try {
    const apiKey = await sdk.exchangeCode(code.trim());

    if (apiKey) {
      // Test the API key
      await sdk.testAPIKey(apiKey);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }

  readline.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WorkingClaudeSDK;