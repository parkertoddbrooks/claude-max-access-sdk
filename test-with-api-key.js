const axios = require('axios');

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('Testing OpenCode with regular API key...\n');
  console.log('API Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT SET');

  try {
    const response = await axios.post('https://api.opencode.ai/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello from OpenCode with API key!" and nothing else.'
      }],
      max_tokens: 100
    }, {
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('\n❌ FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

main();