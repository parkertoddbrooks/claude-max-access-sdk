const axios = require('axios');
const fs = require('fs').promises;

async function main() {
  const tokens = JSON.parse(await fs.readFile('claude-tokens.json', 'utf8'));

  console.log('Testing OpenCode with correct endpoint...\n');

  try {
    const response = await axios.post('https://api.opencode.ai/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello from OpenCode!" and nothing else.'
      }],
      max_tokens: 100
    }, {
      headers: {
        'authorization': `Bearer ${tokens.access}`,
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    console.log('✅ SUCCESS!');
    console.log('Response type:', typeof response.data);
    console.log('Response status:', response.status);
    console.log('Response headers content-type:', response.headers['content-type']);
    console.log('\nFull response data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

main();