const ClaudeSDK = require('./src/index');

async function main() {
  const sdk = new ClaudeSDK({
    storage: 'file',
    storagePath: './claude-tokens.json'
  });

  try {
    // Check if already authenticated
    if (await sdk.isAuthenticated()) {
      console.log('Already authenticated!');
    } else {
      // Do the full flow interactively
      console.log('Starting authentication...');

      // This will open browser, wait for input, and handle everything
      await sdk.authenticate();

      console.log('Authentication successful!');
    }

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
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Make sure we handle it correctly
if (require.main === module) {
  main().catch(console.error);
}