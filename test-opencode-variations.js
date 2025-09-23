const axios = require('axios');
const fs = require('fs').promises;

async function testVariation(name, config) {
  console.log(`\n=== Testing: ${name} ===`);
  try {
    const tokens = JSON.parse(await fs.readFile('claude-tokens.json', 'utf8'));

    const response = await axios({
      method: 'post',
      url: 'https://api.opencode.ai/anthropic/v1/messages',
      ...config(tokens.access)
    });

    console.log('✅ SUCCESS!');
    console.log('Response type:', typeof response.data);
    console.log('Response:', JSON.stringify(response.data).substring(0, 200));
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

async function main() {
  // Test different header variations

  // 1. Exact copy of authenticate.js headers
  await testVariation('Authenticate.js exact headers', (token) => ({
    headers: {
      'authorization': `Bearer ${token}`,
      'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello" and nothing else.'
      }],
      max_tokens: 100
    }
  }));

  // 2. Try with x-api-key instead of authorization
  await testVariation('Using x-api-key header', (token) => ({
    headers: {
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello" and nothing else.'
      }],
      max_tokens: 100
    }
  }));

  // 3. Try without anthropic-beta
  await testVariation('Without anthropic-beta', (token) => ({
    headers: {
      'authorization': `Bearer ${token}`,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello" and nothing else.'
      }],
      max_tokens: 100
    }
  }));

  // 4. Try with User-Agent
  await testVariation('With User-Agent', (token) => ({
    headers: {
      'authorization': `Bearer ${token}`,
      'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'user-agent': 'Claude-OAuth-SDK/1.0'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello" and nothing else.'
      }],
      max_tokens: 100
    }
  }));

  // 5. Try different endpoint path
  console.log('\n=== Testing: Different path ===');
  try {
    const tokens = JSON.parse(await fs.readFile('claude-tokens.json', 'utf8'));
    const response = await axios.post('https://api.opencode.ai/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say "Hello" and nothing else.'
      }],
      max_tokens: 100
    }, {
      headers: {
        'authorization': `Bearer ${tokens.access}`,
        'content-type': 'application/json'
      }
    });
    console.log('✅ SUCCESS with /v1/messages path!');
  } catch (error) {
    console.log('❌ Failed with /v1/messages path');
  }
}

main().catch(console.error);