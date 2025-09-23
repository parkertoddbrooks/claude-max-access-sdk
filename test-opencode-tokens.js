// Test using the exact tokens that OpenCode just obtained
const axios = require('axios');

const tokens = {
  "type": "oauth",
  "refresh": "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",
  "access": "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",
  "expires": 1758631071855
};

async function test() {
  console.log('Testing OpenCode OAuth tokens directly...\n');

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello from SDK!" and nothing else.'
      }],
      max_tokens: 100
    }, {
      headers: {
        'authorization': `Bearer ${tokens.access}`,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
      }
    });

    console.log('✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

test();