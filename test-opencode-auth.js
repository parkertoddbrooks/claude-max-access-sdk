#!/usr/bin/env node

/**
 * Test using OpenCode's actual npm package directly
 * This should work if their code truly allows OAuth access
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function main() {
  console.log('📦 Installing OpenCode\'s auth package...\n');

  try {
    // Install the exact package OpenCode uses
    await execPromise('npm install opencode-anthropic-auth@0.0.2');

    console.log('✅ Package installed\n');
    console.log('🔧 Testing OpenCode\'s OAuth directly...\n');

    // Import their package
    const { AnthropicAuthPlugin } = require('opencode-anthropic-auth');

    // Create a minimal client interface (what the plugin expects)
    const mockClient = {
      auth: {
        set: async (data) => {
          console.log('📝 Auth data received:', data);
          return true;
        }
      }
    };

    // Initialize the plugin
    const plugin = await AnthropicAuthPlugin({ client: mockClient });

    console.log('🔐 Plugin initialized\n');
    console.log('Available auth methods:');
    plugin.auth.methods.forEach((method, i) => {
      console.log(`  ${i + 1}. ${method.label}`);
    });

    // Use the first method (Claude Pro/Max)
    const maxMethod = plugin.auth.methods[0];
    console.log(`\n📋 Using: ${maxMethod.label}\n`);

    const authFlow = await maxMethod.authorize();

    console.log('🌐 Open this URL in your browser:');
    console.log(`\n   ${authFlow.url}\n`);
    console.log(authFlow.instructions);

    // Get code from user
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const code = await new Promise((resolve) => {
      readline.question('\n📝 Paste code here: ', (answer) => {
        readline.close();
        resolve(answer.trim());
      });
    });

    console.log('\n🔄 Exchanging code for tokens...');
    const credentials = await authFlow.callback(code);

    if (credentials.type === 'success') {
      console.log('\n✅ SUCCESS! Got credentials:');
      console.log('   Access Token:', credentials.access?.substring(0, 20) + '...');
      console.log('   Refresh Token:', credentials.refresh?.substring(0, 20) + '...');

      // Save credentials
      const fs = require('fs').promises;
      await fs.writeFile('opencode-tokens.json', JSON.stringify(credentials, null, 2));
      console.log('\n💾 Tokens saved to opencode-tokens.json');

      // Now test if we can make API calls with these tokens
      console.log('\n🧪 Testing API call with OpenCode tokens...\n');

      const axios = require('axios');
      try {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 50
          },
          {
            headers: {
              'Authorization': `Bearer ${credentials.access}`,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✅ API CALL WORKED!');
        console.log('Response:', response.data);
      } catch (apiError) {
        console.log('❌ API call failed:');
        if (apiError.response) {
          console.log('Status:', apiError.response.status);
          console.log('Error:', apiError.response.data);
        } else {
          console.log('Error:', apiError.message);
        }
      }
    } else {
      console.log('❌ Failed to get credentials');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);