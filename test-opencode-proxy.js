#!/usr/bin/env node

/**
 * Test routing through OpenCode's proxy
 */

const fs = require('fs').promises;

async function testOpenCodeProxy() {
  console.log('🧪 Testing OpenCode proxy route...\n');

  try {
    // Read the fresh tokens
    const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    // Import AI SDK
    const { createAnthropic } = require('@ai-sdk/anthropic');
    const { generateText } = require('ai');

    console.log('🔧 Creating Anthropic provider with OpenCode proxy...\n');

    // Create Anthropic provider routing through OpenCode
    const anthropic = createAnthropic({
      baseURL: 'https://api.opencode.ai/v1', // OpenCode's proxy!
      apiKey: '', // Empty API key
      fetch: async (input, init) => {
        // Modify the URL to use OpenCode's proxy
        let url = input.toString();

        // Replace Anthropic's API with OpenCode's proxy
        url = url.replace('https://api.anthropic.com', 'https://api.opencode.ai');

        const headers = {
          ...init.headers,
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01'
        };

        // Remove x-api-key header
        delete headers['x-api-key'];

        console.log('🌐 Routing through OpenCode proxy:', url);
        console.log('📋 Headers:', JSON.stringify(headers, null, 2));

        return fetch(url, {
          ...init,
          headers
        });
      }
    });

    console.log('💭 Sending request via OpenCode proxy...\n');

    // Try to generate text
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: 'Say "Hello! The proxy routing works!" and nothing else.'
        }
      ],
      maxTokens: 50
    });

    console.log('✅ SUCCESS! OpenCode proxy works!');
    console.log('Response:', result.text);

  } catch (error) {
    console.log('❌ Failed:');
    if (error.response) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    } else {
      console.log('Error:', error.message);
      if (error.cause) {
        console.log('Details:', error.cause);
      }
    }
  }
}

// Also try a direct curl test
async function testDirectProxy() {
  console.log('\n🔍 Also testing direct proxy call...\n');

  const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
  const tokens = JSON.parse(tokensData);

  const axios = require('axios');

  try {
    const response = await axios.post(
      'https://api.opencode.ai/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello from direct proxy!" and nothing else.'
        }],
        max_tokens: 50
      },
      {
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    console.log('✅ Direct proxy call worked!');
    console.log('Response:', response.data.content[0].text);

  } catch (error) {
    console.log('❌ Direct proxy failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

async function main() {
  await testOpenCodeProxy();
  await testDirectProxy();
}

main().catch(console.error);