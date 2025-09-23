/**
 * Test the SDK with OAuth interceptor
 * This mimics how OpenCode intercepts fetch calls
 */

const ClaudeSDK = require('./src/index');
const fs = require('fs').promises;

async function main() {
  console.log('Testing Claude OAuth SDK with interceptor...\n');

  // Copy the OAuth tokens from OpenCode
  const opencodeAuth = JSON.parse(
    await fs.readFile('/Users/parker/.local/share/opencode/auth.json', 'utf8')
  );

  if (!opencodeAuth.anthropic) {
    console.error('No Anthropic auth found in OpenCode. Please run: opencode auth login');
    return;
  }

  // Save tokens in our format
  await fs.writeFile('./claude-tokens.json', JSON.stringify({
    type: 'success',
    access: opencodeAuth.anthropic.access,
    refresh: opencodeAuth.anthropic.refresh,
    expires: opencodeAuth.anthropic.expires
  }, null, 2));

  // Initialize SDK with interceptor
  const sdk = new ClaudeSDK({
    storage: 'file',
    storagePath: './claude-tokens.json',
    debug: true,
    useInterceptor: true  // Enable the OAuth interceptor
  });

  try {
    // Check if authenticated
    if (await sdk.isAuthenticated()) {
      console.log('✅ Authenticated with OAuth tokens\n');
    } else {
      console.log('❌ Not authenticated');
      return;
    }

    // Try sending a message
    console.log('Sending test message...\n');
    const response = await sdk.sendMessage('Say "Hello from OAuth SDK with interceptor!" and nothing else.');

    if (response) {
      console.log('✅ SUCCESS! Claude responded:');
      console.log(response);
    } else {
      console.log('❌ Got empty response');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main().catch(console.error);