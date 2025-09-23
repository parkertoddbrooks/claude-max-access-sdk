#!/usr/bin/env node

/**
 * Test using AI SDK with OAuth tokens
 * This is how OpenCode actually makes requests
 */

const fs = require('fs').promises;

async function main() {
  console.log('🧪 Testing AI SDK with OAuth tokens...\n');

  try {
    // Read the OAuth tokens we got earlier
    const tokensData = await fs.readFile('opencode-tokens.json', 'utf8');
    const tokens = JSON.parse(tokensData);

    if (!tokens.access) {
      console.log('❌ No access token found. Run test-opencode-auth.js first.');
      return;
    }

    console.log('📦 Installing AI SDK...');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    await execPromise('npm install @ai-sdk/anthropic ai');

    console.log('✅ AI SDK installed\n');

    // Import AI SDK
    const { createAnthropic } = require('@ai-sdk/anthropic');
    const { generateText } = require('ai');

    console.log('🔧 Creating Anthropic provider with OAuth...\n');

    // Create Anthropic provider with custom fetch (like OpenCode does)
    const anthropic = createAnthropic({
      apiKey: '', // Empty API key
      headers: {
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
      },
      fetch: async (input, init) => {
        // Custom fetch that adds OAuth token
        const headers = {
          ...init.headers,
          'Authorization': `Bearer ${tokens.access}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
        };

        // Remove x-api-key header if present
        delete headers['x-api-key'];

        console.log('🌐 Making request to:', input);
        console.log('📋 Headers:', JSON.stringify(headers, null, 2));

        return fetch(input, {
          ...init,
          headers
        });
      }
    });

    console.log('💭 Sending request via AI SDK...\n');

    // Try to generate text using AI SDK
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from the AI SDK with OAuth!" and nothing else.'
        }
      ],
      maxTokens: 50
    });

    console.log('✅ SUCCESS! AI SDK worked with OAuth tokens!\n');
    console.log('Response:', result.text);

  } catch (error) {
    console.log('❌ Failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
      if (error.cause) {
        console.log('Cause:', error.cause);
      }
    }
  }
}

main().catch(console.error);