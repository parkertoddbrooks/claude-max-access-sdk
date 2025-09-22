#!/usr/bin/env node

/**
 * Basic example of using the Claude OAuth SDK
 * This demonstrates the complete flow: auth -> API call
 */

const ClaudeSDK = require('../src/index');

async function main() {
  // Initialize SDK with file storage (persists tokens)
  const sdk = new ClaudeSDK({
    storage: 'file', // Use 'memory' for non-persistent storage
    debug: true
  });

  try {
    // Check if already authenticated
    const isAuthenticated = await sdk.isAuthenticated();

    if (!isAuthenticated) {
      console.log('📋 Starting authentication flow...\n');

      // This will:
      // 1. Open browser to Claude login
      // 2. Prompt for the authorization code
      // 3. Exchange code for tokens
      await sdk.authenticate();
    } else {
      console.log('✅ Already authenticated!\n');
    }

    // Make a simple API call
    console.log('💭 Sending request to Claude...\n');

    const response = await sdk.request({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Hello Claude! Please respond with a brief greeting and confirm you\'re working through the OAuth SDK.'
        }
      ],
      max_tokens: 150
    });

    console.log('🤖 Claude\'s response:');
    console.log('-'.repeat(50));

    if (response.content && response.content[0]) {
      console.log(response.content[0].text);
    } else {
      console.log(JSON.stringify(response, null, 2));
    }

    console.log('-'.repeat(50));

    // Show usage info
    console.log('\n📊 Usage Information:');
    const usage = await sdk.getUsage();
    console.log(usage);

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('Rate limited')) {
      console.log('\n💡 Tip: Claude Max Plan has a limit of 50-200 prompts per 5 hours.');
      console.log('    Wait for the limit to reset or use the official API with an API key.');
    }

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;