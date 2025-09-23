// Test calling the OpenCode proxy exactly like OpenCode CLI would
const axios = require('axios');
const fs = require('fs').promises;

async function test() {
  // Get the OAuth tokens
  const tokens = JSON.parse(await fs.readFile('claude-tokens.json', 'utf8'));

  console.log('Testing OAuth tokens with OpenCode proxy...\n');
  console.log('Token:', tokens.access.substring(0, 30) + '...');

  // OpenCode might be using a session or different auth mechanism
  // Let's try various approaches

  // 1. Try as if OpenCode has registered our OAuth token
  try {
    console.log('\n1. Testing with OpenCode session ID as Bearer token:');
    const response = await axios.post('https://api.opencode.ai/v1/chat/completions', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say hello'
      }],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success:', response.data);
  } catch (err) {
    console.log('❌ Failed:', err.response?.status, err.response?.data || err.message);
  }

  // 2. Try OpenAI-compatible endpoint
  try {
    console.log('\n2. Testing OpenAI-compatible format:');
    const response = await axios.post('https://api.opencode.ai/v1/chat/completions', {
      model: 'claude-3-5-sonnet',
      messages: [{
        role: 'user',
        content: 'Say hello'
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${tokens.access}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success:', response.data);
  } catch (err) {
    console.log('❌ Failed:', err.response?.status, err.response?.data || err.message);
  }

  // 3. Try with x-api-key header
  try {
    console.log('\n3. Testing with x-api-key:');
    const response = await axios.post('https://api.opencode.ai/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: 'Say hello'
      }],
      max_tokens: 10
    }, {
      headers: {
        'x-api-key': tokens.access,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success:', response.data);
  } catch (err) {
    console.log('❌ Failed:', err.response?.status, err.response?.data || err.message);
  }
}

test();