#!/usr/bin/env node

/**
 * Attempt to create an API key using OAuth token
 * Based on OpenCode's "Create an API Key" mode
 */

const axios = require('axios');
const ClaudeSDK = require('../src/index');

async function main() {
  const sdk = new ClaudeSDK({
    storage: 'file',
    debug: false
  });

  console.log('🔑 Attempting to create API key from OAuth token...\n');

  try {
    // Check if authenticated
    const isAuthenticated = await sdk.isAuthenticated();

    if (!isAuthenticated) {
      console.log('❌ Not authenticated. Please run manual-auth.js first.\n');
      process.exit(1);
    }

    // Get the access token
    const tokens = await sdk.tokenManager.getTokens();

    if (!tokens || !tokens.access_token) {
      console.log('❌ No valid access token found.\n');
      process.exit(1);
    }

    console.log('📡 Calling API key creation endpoint...\n');

    // Try to create an API key using the OAuth token
    // This is what OpenCode does in "console" mode
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

    console.log('✅ API Key created successfully!\n');
    console.log('🔑 Your new API key:', response.data.raw_key);
    console.log('\n💡 You can now use this API key directly with the Anthropic API');
    console.log('   instead of OAuth tokens.\n');

    // Save the API key
    const saveKey = await getUserInput('Would you like to save this API key? (y/n): ');

    if (saveKey.toLowerCase() === 'y') {
      await sdk.storage.set('api_key', response.data.raw_key);
      console.log('✅ API key saved!\n');
    }

  } catch (error) {
    console.error('❌ Failed to create API key:\n');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);

      if (error.response.status === 401) {
        console.log('\n💡 The OAuth token might have expired. Try running manual-auth.js again.');
      } else if (error.response.status === 403) {
        console.log('\n💡 This endpoint might be restricted. The OAuth token may not have permission');
        console.log('   to create API keys, or this feature might be limited to certain accounts.');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function getUserInput(prompt) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(prompt, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;