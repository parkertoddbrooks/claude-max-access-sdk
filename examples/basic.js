const ClaudeSDK = require('../src/index');

async function main() {
  // Initialize SDK with file storage
  const sdk = new ClaudeSDK({
    storage: 'file',
    storagePath: './claude-tokens.json'
  });

  try {
    // Check if already authenticated
    if (await sdk.isAuthenticated()) {
      console.log('Already authenticated!');
    } else {
      // Authenticate
      console.log('Starting authentication...');
      await sdk.authenticate();
      console.log('Authentication successful!');
    }

    // Send a message
    console.log('\nSending message to Claude...');
    const response = await sdk.sendMessage('Hello Claude! Can you count to 5?');
    console.log('\nClaude:', response);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();