#!/usr/bin/env node

/**
 * Test OpenCode's local proxy
 */

const axios = require('axios');
const fs = require('fs').promises;

async function testLocalProxy() {
  console.log('🧪 Testing OpenCode local proxy on localhost:62345...\n');

  try {
    const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    // Try different endpoints
    const endpoints = [
      'http://localhost:62345/v1/messages',
      'http://localhost:62345/api/v1/messages',
      'http://localhost:62345/messages',
      'http://127.0.0.1:62345/v1/messages'
    ];

    for (const endpoint of endpoints) {
      console.log(`📡 Trying: ${endpoint}`);

      try {
        const response = await axios.post(
          endpoint,
          {
            model: 'claude-3-5-sonnet-20241022',
            messages: [{
              role: 'user',
              content: 'Say "Hello from local proxy!" and nothing else.'
            }],
            max_tokens: 50
          },
          {
            headers: {
              'authorization': `Bearer ${tokens.access}`,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
              'content-type': 'application/json'
            },
            timeout: 5000
          }
        );

        console.log('✅ SUCCESS! Local proxy works at:', endpoint);
        console.log('Response:', response.data);
        return;

      } catch (error) {
        if (error.response) {
          console.log(`  ❌ ${error.response.status}: ${error.response.statusText}`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log('  ❌ Connection refused');
        } else {
          console.log('  ❌ Error:', error.message);
        }
      }
    }

    console.log('\n❌ No working endpoint found');

  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

testLocalProxy().catch(console.error);