#!/usr/bin/env node

/**
 * Test with EMPTY API key and custom fetch
 * This is EXACTLY how OpenCode does it!
 */

const fs = require('fs').promises;

async function testWithEmptyApiKey() {
  console.log('🧪 Testing with EMPTY API key like OpenCode...\n');

  try {
    // Read the fresh tokens
    const tokensData = await fs.readFile('claude-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    // Import AI SDK
    const { createAnthropic } = require('@ai-sdk/anthropic');
    const { generateText } = require('ai');

    console.log('🔧 Creating Anthropic provider with EMPTY API key and custom fetch...\n');

    // Create Anthropic provider EXACTLY like OpenCode
    const anthropic = createAnthropic({
      apiKey: '', // EMPTY API KEY!
      fetch: async (input, init) => {
        // Custom fetch that adds OAuth token
        const headers = {
          ...init.headers,
          'authorization': `Bearer ${tokens.access}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
        };

        // Remove x-api-key header if present
        delete headers['x-api-key'];

        console.log('🌐 Intercepted request to:', input);
        console.log('📋 Modified headers:', JSON.stringify(headers, null, 2));

        return fetch(input, {
          ...init,
          headers
        });
      }
    });

    console.log('💭 Sending request via AI SDK with empty API key...\n');

    // Try to generate text using AI SDK
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: 'Say "Hello! The SDK works with empty API key!" and nothing else.'
        }
      ],
      maxTokens: 50
    });

    console.log('✅ SUCCESS! Empty API key method works!');
    console.log('Response:', result.text);

  } catch (error) {
    console.log('❌ Failed:');
    if (error.response) {
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    } else {
      console.log('Error:', error.message);
      if (error.cause) {
        console.log('Cause:', JSON.stringify(error.cause, null, 2));
      }
    }
  }
}

testWithEmptyApiKey().catch(console.error);