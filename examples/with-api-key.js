/**
 * Example: Using the SDK with a regular Anthropic API key
 * instead of OAuth tokens
 *
 * This works because OAuth tokens are restricted to Claude Code only
 */

const ClaudeSDK = require('../src/index');

// Custom token manager that uses API key instead of OAuth
class APIKeyTokenManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async getAccessToken() {
    return this.apiKey;
  }

  async isValid() {
    return !!this.apiKey;
  }

  async loadTokens() {
    return { access: this.apiKey };
  }

  async saveTokens() {
    // No-op for API keys
  }

  async clear() {
    // No-op for API keys
  }
}

async function main() {
  // Get API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Please set ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  console.log('Using API key:', apiKey.substring(0, 20) + '...');

  // Create SDK with custom token manager
  const sdk = new ClaudeSDK({
    storage: 'memory'
  });

  // Replace the token manager with API key manager
  sdk.tokenManager = new APIKeyTokenManager(apiKey);
  sdk.apiClient.tokenManager = sdk.tokenManager;

  try {
    // Send a message
    console.log('\nSending message to Claude...');
    const response = await sdk.sendMessage('Hello Claude! Can you count to 5?');

    if (response) {
      console.log('\n✅ SUCCESS! Claude responded:');
      console.log(response);
    } else {
      console.log('\n❌ Got empty response');
    }

  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main().catch(console.error);