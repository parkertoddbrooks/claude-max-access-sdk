#!/usr/bin/env node

/**
 * Console authorization mode - for creating API keys
 * Uses console.anthropic.com instead of claude.ai for OAuth
 */

const ClaudeSDK = require('../src/index');
const readline = require('readline');
const axios = require('axios');

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
  // Create a custom SDK instance
  const sdk = new ClaudeSDK({
    storage: 'file',
    debug: false
  });

  console.log('🔐 Claude OAuth SDK - Console Authorization (API Key Creation)');
  console.log('=' .repeat(60));
  console.log('\n⚠️  This mode uses console.anthropic.com for OAuth');
  console.log('   It should grant the org:create_api_key scope needed to create API keys.\n');

  try {
    // Override the auth URL to use console.anthropic.com
    sdk.oauth.authUrl = 'https://console.anthropic.com/oauth/authorize';

    // Step 1: Generate authorization URL
    console.log('📝 Step 1: Generating console authorization URL...');
    const authUrl = await sdk.startAuth();

    console.log('\n🌐 Step 2: Open this URL in your browser:');
    console.log(`\n   ${authUrl}\n`);

    console.log('📋 Step 3: Log in to your Anthropic Console account');
    console.log('   - This should be your account with API access');
    console.log('   - Authorize the application if prompted\n');

    console.log('🔄 Step 4: After login, you\'ll be redirected to:');
    console.log('   https://console.anthropic.com/oauth/code/callback?code=YOUR_CODE\n');
    console.log('   Note: The page might show an error - that\'s OK!');
    console.log('   Just copy the "code" parameter from the URL.\n');

    // Step 5: Get code from user
    let codeInput = await getUserInput('📝 Step 5: Paste the authorization code here: ');

    if (!codeInput) {
      throw new Error('No code provided');
    }

    // Extract code and state from input
    let code = codeInput;
    let state = null;

    if (codeInput.includes('#')) {
      const parts = codeInput.split('#');
      code = parts[0];
      state = parts[1];
    }

    // Step 6: Exchange code for tokens
    console.log('\n🔄 Step 6: Exchanging code for tokens...');
    const tokens = await sdk.exchangeCode(code, state);

    console.log('✅ Authentication successful!\n');
    console.log('📦 Tokens received:');
    console.log(`   - Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`   - Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'Not provided'}`);
    console.log(`   - Expires In: ${tokens.expires_in} seconds\n');

    // Try to create an API key
    const createKey = await getUserInput('🔑 Would you like to create an API key now? (y/n): ');

    if (createKey.toLowerCase() === 'y') {
      console.log('\n📡 Creating API key...');

      const response = await axios.post(
        'https://api.anthropic.com/api/oauth/claude_cli/create_api_key',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.access_token}`
          }
        }
      );

      console.log('\n✅ API Key created successfully!');
      console.log(`🔑 Your new API key: ${response.data.raw_key}`);
      console.log('\n💡 Save this key securely - it won\'t be shown again!');
      console.log('   You can use this key with the standard Anthropic API.\n');

      // Save the API key
      const saveKey = await getUserInput('Would you like to save this API key? (y/n): ');

      if (saveKey.toLowerCase() === 'y') {
        await sdk.storage.set('api_key', response.data.raw_key);
        console.log('✅ API key saved!\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.response) {
      console.error('\nAPI Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Tip: The authorization code may have expired or been used already.');
      console.log('    Please restart the process and try again with a fresh code.');
    } else if (error.message.includes('permission_error')) {
      console.log('\n💡 Tip: Even with console OAuth, the token might not have the required scope.');
      console.log('    This might be restricted to certain account types or partnerships.');
    }

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;