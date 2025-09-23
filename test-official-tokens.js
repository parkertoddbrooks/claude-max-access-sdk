#!/usr/bin/env node

/**
 * Test using tokens from the official OpenCode binary
 */

const axios = require('axios');

async function testOfficialTokens() {
  console.log('🧪 Testing with official OpenCode binary tokens...\n');

  // These tokens are from the official OpenCode binary installation
  const accessToken = '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';

  try {
    console.log('📡 Making API call with official binary token...\n');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello from official OpenCode tokens!" and nothing else.'
        }],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! Official tokens work!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ Failed with official tokens:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testOfficialTokens().catch(console.error);