#!/usr/bin/env node

/**
 * Test EXACT OpenCode implementation
 * This replicates exactly what OpenCode's package does
 */

const crypto = require('crypto');
const fs = require('fs').promises;

// Generate PKCE like OpenCode does
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

async function authorize(mode = 'max') {
  const pkce = generatePKCE();

  const url = new URL(
    `https://${mode === 'console' ? 'console.anthropic.com' : 'claude.ai'}/oauth/authorize`
  );

  // EXACT same parameters as OpenCode
  url.searchParams.set('code', 'true');
  url.searchParams.set('client_id', '9d1c250a-e61b-44d9-88ed-5944d1962f5e');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', 'https://console.anthropic.com/oauth/code/callback');
  url.searchParams.set('scope', 'org:create_api_key user:profile user:inference');
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', pkce.verifier); // OpenCode uses verifier as state!

  return {
    url: url.toString(),
    verifier: pkce.verifier
  };
}

async function exchange(code, verifier) {
  const splits = code.split('#');

  const response = await fetch('https://console.anthropic.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: splits[0],
      state: splits[1],
      grant_type: 'authorization_code',
      client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
      redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('Token exchange failed:', error);
    return { type: 'failed' };
  }

  const json = await response.json();
  return {
    type: 'success',
    refresh: json.refresh_token,
    access: json.access_token,
    expires: Date.now() + json.expires_in * 1000
  };
}

async function makeAPICall(accessToken) {
  console.log('\n📡 Making API call with OAuth token...\n');

  const axios = require('axios');

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello from exact OpenCode implementation!" and nothing else.'
        }],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! API call worked!');
    console.log('Response:', response.data.content[0].text);

  } catch (error) {
    console.log('❌ API call failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

async function main() {
  console.log('🔐 EXACT OpenCode OAuth Implementation Test\n');

  // Step 1: Generate auth URL
  const { url, verifier } = await authorize('max');

  console.log('🌐 Open this URL in your browser:');
  console.log(`\n   ${url}\n`);
  console.log('📋 After authorizing, you\'ll see a code like: abcd1234#efgh5678');
  console.log('   Copy the ENTIRE code including the # part\n');

  // Step 2: Get code from user
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise((resolve) => {
    readline.question('📝 Paste code here: ', (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });

  // Step 3: Exchange for tokens
  console.log('\n🔄 Exchanging code for tokens...');
  const credentials = await exchange(code, verifier);

  if (credentials.type === 'success') {
    console.log('\n✅ Got OAuth tokens!');
    console.log('   Access Token:', credentials.access?.substring(0, 20) + '...');
    console.log('   Refresh Token:', credentials.refresh?.substring(0, 20) + '...');

    // Save tokens
    await fs.writeFile('exact-opencode-tokens.json', JSON.stringify(credentials, null, 2));
    console.log('\n💾 Tokens saved to exact-opencode-tokens.json');

    // Test API call
    await makeAPICall(credentials.access);

  } else {
    console.log('❌ Failed to get tokens');
  }
}

main().catch(console.error);