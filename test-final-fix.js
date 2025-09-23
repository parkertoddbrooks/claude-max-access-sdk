#!/usr/bin/env node

/**
 * Final test - using EXACT OpenCode pattern with our SDK
 */

const ClaudeOAuthSDK = require('./src/index');
const fs = require('fs').promises;

async function testWithStoredTokens() {
  console.log('🧪 Testing with previously stored tokens...\n');

  try {
    // Check if we have any stored tokens
    const tokensExist = await fs.access('opencode-tokens.json').then(() => true).catch(() => false);
    if (!tokensExist) {
      console.log('No stored tokens found. Run test-opencode-auth.js first.');
      return;
    }

    const tokensData = await fs.readFile('opencode-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    if (!tokens.access) {
      console.log('No access token found.');
      return;
    }

    console.log('📡 Testing API with stored tokens...\n');

    // Test with EXACT OpenCode headers
    const axios = require('axios');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello" and nothing else.'
        }],
        max_tokens: 50
      },
      {
        headers: {
          'authorization': `Bearer ${tokens.access}`, // lowercase like OpenCode!
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS!');
    console.log('Response:', response.data);

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:');
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));

      if (error.response.data?.error?.message?.includes('expired')) {
        console.log('\n📝 Token expired. Need to refresh or re-authenticate.');
      }
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function testFreshAuth() {
  console.log('🔐 Starting fresh authentication with EXACT OpenCode pattern...\n');

  // Initialize SDK with exact OpenCode settings
  const sdk = new ClaudeOAuthSDK({
    clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
    redirectUri: 'https://console.anthropic.com/oauth/code/callback',
    scope: 'org:create_api_key user:profile user:inference',
    betaHeaders: 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
  });

  // Get auth URL
  const authUrl = sdk.getAuthorizationUrl();
  console.log('🌐 Open this URL in your browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('📋 After authorizing, copy the ENTIRE code including the # part\n');

  // Get code from user
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise((resolve) => {
    readline.question('📝 Paste code here: ', (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });

  // Exchange for tokens
  console.log('\n🔄 Exchanging code for tokens...');

  try {
    const tokens = await sdk.exchangeCodeForTokens(code);
    console.log('\n✅ Got tokens!');

    // Save tokens
    await fs.writeFile('final-test-tokens.json', JSON.stringify(tokens, null, 2));
    console.log('💾 Tokens saved');

    // Test API
    console.log('\n📡 Testing API...');
    const response = await sdk.sendMessage('Say "Hello from final fix!" and nothing else.');
    console.log('✅ SUCCESS! Response:', response);

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function main() {
  // First try with stored tokens
  await testWithStoredTokens();

  // Ask if user wants to authenticate fresh
  console.log('\n❓ Do you want to test fresh authentication? (y/n)');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    readline.question('', (ans) => {
      readline.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (answer === 'y' || answer === 'yes') {
    await testFreshAuth();
  }
}

main().catch(console.error);