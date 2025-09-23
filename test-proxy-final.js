#!/usr/bin/env node

/**
 * Test OpenCode proxy with exact configuration
 */

const axios = require('axios');
const fs = require('fs').promises;

async function testProxyWithHeaders() {
  console.log('🧪 Testing api.opencode.ai with various configurations...\n');

  try {
    const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    // Try different configurations
    const configs = [
      {
        name: 'Standard Anthropic endpoint via proxy',
        url: 'https://api.opencode.ai/anthropic/v1/messages',
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'content-type': 'application/json'
        }
      },
      {
        name: 'Proxy with X-Forwarded headers',
        url: 'https://api.opencode.ai/v1/messages',
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'content-type': 'application/json',
          'x-forwarded-host': 'api.anthropic.com',
          'x-forwarded-proto': 'https'
        }
      },
      {
        name: 'Proxy with Host header',
        url: 'https://api.opencode.ai/v1/messages',
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'content-type': 'application/json',
          'host': 'api.anthropic.com'
        }
      },
      {
        name: 'Direct to Anthropic (control test)',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'content-type': 'application/json'
        }
      }
    ];

    for (const config of configs) {
      console.log(`📡 Testing: ${config.name}`);
      console.log(`   URL: ${config.url}`);

      try {
        const response = await axios.post(
          config.url,
          {
            model: 'claude-3-5-sonnet-20241022',
            messages: [{
              role: 'user',
              content: 'Say "Hello!" and nothing else.'
            }],
            max_tokens: 50
          },
          {
            headers: config.headers,
            timeout: 10000,
            validateStatus: () => true // Accept any status
          }
        );

        if (response.status === 200) {
          console.log(`   ✅ SUCCESS! Status: ${response.status}`);
          if (response.data.content) {
            console.log(`   Response: ${response.data.content[0].text}`);
          }
          return;
        } else {
          console.log(`   ❌ Status: ${response.status}`);
          if (response.data) {
            console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
          }
        }

      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('   ❌ Connection refused');
        } else if (error.code === 'ETIMEDOUT') {
          console.log('   ❌ Timeout');
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

testProxyWithHeaders().catch(console.error);