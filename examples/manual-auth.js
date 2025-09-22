#!/usr/bin/env node

/**
 * Manual authentication example
 * Shows how to handle the OAuth flow step-by-step
 */

const ClaudeSDK = require('../src/index');
const readline = require('readline');

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
  // Initialize SDK
  const sdk = new ClaudeSDK({
    storage: 'file', // Persist tokens
    debug: false
  });

  console.log('🔐 Claude OAuth SDK - Manual Authentication Example');
  console.log('=' .repeat(50));

  try {
    // Step 1: Generate authorization URL
    console.log('\n📝 Step 1: Generating authorization URL...');
    const authUrl = await sdk.startAuth();

    console.log('\n🌐 Step 2: Open this URL in your browser:');
    console.log(`\n   ${authUrl}\n`);

    console.log('📋 Step 3: Log in to your Claude account');
    console.log('   - Use your Claude Max Plan credentials');
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

    // If user pasted the full URL or code with state
    if (codeInput.includes('#')) {
      const parts = codeInput.split('#');
      code = parts[0];
      state = parts[1];
    } else if (codeInput.includes('&state=')) {
      // Extract from full URL
      const urlParams = new URLSearchParams(codeInput.includes('?') ? codeInput.split('?')[1] : codeInput);
      code = urlParams.get('code') || codeInput;
      state = urlParams.get('state');
    }

    // Step 6: Exchange code for tokens
    console.log('\n🔄 Step 6: Exchanging code for tokens...');
    const tokens = await sdk.exchangeCode(code, state);

    console.log('✅ Authentication successful!\n');
    console.log('📦 Tokens received:');
    console.log(`   - Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`   - Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'Not provided'}`);
    console.log(`   - Expires In: ${tokens.expires_in} seconds`);

    // Test the authentication with an API call
    const testApi = await getUserInput('\n🧪 Would you like to test the API? (y/n): ');

    if (testApi.toLowerCase() === 'y') {
      console.log('\n💭 Sending test request to Claude...');

      const response = await sdk.request({
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from the OAuth SDK!" and nothing else.'
          }
        ],
        max_tokens: 50
      });

      console.log('\n🤖 Claude says:');
      if (response.content && response.content[0]) {
        console.log(`   "${response.content[0].text}"`);
      }
    }

    console.log('\n✨ Setup complete! You can now use the SDK in your applications.');
    console.log('   Tokens are saved and will be used automatically for future requests.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Tip: The authorization code may have expired or been used already.');
      console.log('    Please restart the process and try again with a fresh code.');
    } else if (error.message.includes('Rate limited')) {
      console.log('\n💡 Tip: You\'ve reached your Max Plan limit (50-200 prompts per 5 hours).');
      console.log('    Please wait for the limit to reset.');
    }

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;