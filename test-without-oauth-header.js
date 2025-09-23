#!/usr/bin/env node

/**
 * Test WITHOUT the oauth-2025-04-20 header
 * Maybe that's what's triggering the restriction!
 */

const axios = require('axios');
const fs = require('fs').promises;

async function testWithoutOAuthHeader() {
  console.log('🧪 Testing without oauth-2025-04-20 header...\n');

  try {
    // Read the fresh tokens
    const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    console.log('📡 Making API call WITHOUT oauth-2025-04-20 header...\n');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello! The SDK works!" and nothing else.'
        }],
        max_tokens: 50
      },
      {
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          // REMOVED oauth-2025-04-20 from beta headers!
          'anthropic-beta': 'claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! IT WORKS WITHOUT oauth-2025-04-20!');
    console.log('Response:', response.data.content[0].text);

  } catch (error) {
    console.log('❌ Failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testWithoutOAuthHeader().catch(console.error);