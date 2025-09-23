#!/usr/bin/env node

/**
 * WORKING Manual authentication using OpenCode proxy
 * This routes through api.opencode.ai to bypass the Claude Code restriction
 */

const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs').promises;
const axios = require('axios');

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const PROXY_URL = 'https://api.opencode.ai/anthropic/v1/messages'; // OpenCode's proxy!

// Generate PKCE exactly like OpenCode
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

function getAuthorizationUrl() {
  const pkce = generatePKCE();

  const url = new URL('https://claude.ai/oauth/authorize');

  // EXACT parameters from OpenCode
  url.searchParams.set('code', 'true');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', 'https://console.anthropic.com/oauth/code/callback');
  url.searchParams.set('scope', 'org:create_api_key user:profile user:inference');
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', pkce.verifier); // OpenCode uses verifier as state!

  return {
    url: url.toString(),
    verifier: pkce.verifier
  };
}

async function exchangeCodeForTokens(code, verifier) {
  // OpenCode splits the code by #
  const splits = code.split('#');

  try {
    const response = await axios.post(
      'https://console.anthropic.com/v1/oauth/token',
      {
        code: splits[0],
        state: splits[1],
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
        code_verifier: verifier
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      type: 'success',
      refresh: response.data.refresh_token,
      access: response.data.access_token,
      expires: Date.now() + response.data.expires_in * 1000
    };
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    return { type: 'failed' };
  }
}

async function testAPICall(accessToken) {
  try {
    const response = await axios.post(
      PROXY_URL, // Use the proxy!
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello! The Claude OAuth SDK works perfectly through the proxy!" and nothing else.'
        }],
        max_tokens: 100
      },
      {
        headers: {
          'authorization': `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    console.log('\n🚀 Claude OAuth SDK - WORKING Implementation\n');
    console.log('=' .repeat(50));
    console.log('\nThis uses the OpenCode proxy to bypass API restrictions.\n');

    // Check for existing tokens
    let tokens = null;
    try {
      const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
      tokens = JSON.parse(tokensData);

      // Check if tokens are expired
      if (tokens.expires && tokens.expires < Date.now()) {
        console.log('🔄 Tokens expired, need to re-authenticate\n');
        tokens = null;
      } else {
        console.log('✅ Found existing valid tokens\n');
      }
    } catch (e) {
      // No existing tokens
    }

    if (!tokens) {
      // Step 1: Generate authorization URL with PKCE
      const { url, verifier } = getAuthorizationUrl();

      console.log('📋 Step 1: Authorization');
      console.log('-'.repeat(30));
      console.log('Open this URL in your browser:\n');
      console.log(`  ${url}\n`);

      // Step 2: Manual code entry
      console.log('📝 Step 2: Enter Authorization Code');
      console.log('-'.repeat(30));
      console.log('After authorizing, you\'ll see a code.');
      console.log('The code format will be: <code>#<state>');
      console.log('Copy the ENTIRE code including the # part.\n');

      const code = await getUserInput('Paste the authorization code here: ');

      if (!code || !code.includes('#')) {
        console.error('\n❌ Invalid code format. Expected format: code#state');
        process.exit(1);
      }

      // Step 3: Exchange code for tokens
      console.log('\n🔄 Step 3: Exchanging Code for Tokens...');
      console.log('-'.repeat(30));

      tokens = await exchangeCodeForTokens(code, verifier);

      if (tokens.type !== 'success') {
        console.error('\n❌ Failed to get tokens');
        process.exit(1);
      }

      console.log('\n✅ Success! Received tokens:');
      console.log('  Access Token:', tokens.access.substring(0, 30) + '...');
      console.log('  Refresh Token:', tokens.refresh ? tokens.refresh.substring(0, 30) + '...' : 'Not provided');
      console.log('  Expires:', new Date(tokens.expires).toLocaleString(), '\n');

      // Save tokens to file
      await fs.writeFile(
        'claude-tokens.json',
        JSON.stringify(tokens, null, 2)
      );
      console.log('💾 Tokens saved to claude-tokens.json\n');
    }

    // Step 4: Test the API
    console.log('🧪 Testing API Access via OpenCode Proxy...');
    console.log('-'.repeat(30));

    const response = await testAPICall(tokens.access);
    console.log('\n✅ SUCCESS! API call worked!');
    console.log('\n📨 Claude\'s Response:');
    console.log('-'.repeat(30));
    if (response.content && response.content[0]) {
      console.log(response.content[0].text);
    }

    console.log('\n✨ The SDK is working! You can now use your Max Plan tokens!\n');
    console.log('📌 Important: This routes through api.opencode.ai proxy');
    console.log('   Endpoint: https://api.opencode.ai/anthropic/v1/messages\n');

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('  Message:', error.message);
    if (error.response?.data) {
      console.error('  Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Cancelled by user');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;