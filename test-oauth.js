const ClaudeSDK = require('./src/index');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  const sdk = new ClaudeSDK({
    storage: 'file',
    storagePath: './claude-tokens.json'
  });

  try {
    // Start auth and save PKCE state
    console.log('Starting authentication...\n');
    const authUrl = sdk.startAuth();

    // Save PKCE state to file for this session
    fs.writeFileSync('./pkce-state.json', JSON.stringify({
      pkce: sdk.oauthClient.pkce,
      timestamp: Date.now()
    }));

    console.log('Opening browser to:', authUrl);
    console.log('\nIf the browser doesn\'t open, manually navigate to the URL above.\n');
    console.log('After authorizing, you\'ll be redirected to a URL like:');
    console.log('https://console.anthropic.com/oauth/code/callback?code=ABC123#XYZ789\n');
    console.log('Copy the ENTIRE URL or just the code part (ABC123#XYZ789)\n');

    const callback = await prompt('Paste the callback URL or code here: ');

    // Process the callback
    const callbackUrl = callback.includes('http')
      ? callback
      : `https://console.anthropic.com/oauth/code/callback?code=${callback}`;

    const tokens = await sdk.exchangeCode(callbackUrl);
    console.log('\n✅ Authentication successful!');
    console.log('Access token saved.');

    // Test an API call
    console.log('\n📞 Testing API call...');
    const response = await sdk.sendMessage('Hello! Can you count to 5?');
    console.log('✅ Claude responded:', response);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    rl.close();
    process.exit(1);
  }
}

main();