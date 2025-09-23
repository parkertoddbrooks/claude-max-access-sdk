#!/usr/bin/env node

/**
 * Claude Chat CLI
 *
 * A simple interactive chat application for Claude
 * Commands:
 * - /auth - Authenticate with Claude (OpenCode or API key)
 * - /model - Select model (sonnet, opus, haiku)
 * - /clear - Clear chat history
 * - /help - Show commands
 * - /exit - Exit the chat
 */

const readline = require('readline');
const ClaudeSDK = require('./claude-sdk-final');
const fs = require('fs').promises;
const path = require('path');

class ClaudeChatCLI {
  constructor() {
    this.sdk = null;
    this.model = 'claude-3-5-sonnet-20241022'; // Default model
    this.messages = [];
    this.authenticated = false;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });
  }

  // Available models
  models = {
    'sonnet': 'claude-3-5-sonnet-20241022',
    'opus': 'claude-3-opus-20240229',
    'haiku': 'claude-3-haiku-20240307',
    'sonnet-3.5': 'claude-3-5-sonnet-20241022',
    'sonnet-3': 'claude-3-sonnet-20240229'
  };

  // Display welcome message
  displayWelcome() {
    console.clear();
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║          Claude Chat CLI v1.0             ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('\n📝 Commands:');
    console.log('  /auth   - Authenticate with Claude');
    console.log('  /model  - Select model');
    console.log('  /clear  - Clear chat history');
    console.log('  /help   - Show this help');
    console.log('  /exit   - Exit chat\n');
    console.log('💡 Type /auth to get started!\n');
  }

  // Handle authentication
  async handleAuth() {
    console.log('\n🔐 Authentication Options:');
    console.log('1. Use OpenCode (Max Plan)');
    console.log('2. Use API Key');
    console.log('3. Auto-detect');
    console.log('4. Clear connection\n');

    const choice = await this.question('Choose (1-4): ');

    if (choice === '1') {
      // Use OpenCode's OAuth flow directly
      console.log('\n📋 OpenCode OAuth Authentication (Max Plan)');
      console.log('=' .repeat(50));
      console.log('\nThis will authenticate through OpenCode\'s OAuth flow.');
      console.log('OpenCode is whitelisted and can use OAuth tokens.\n');

      // Generate PKCE for OpenCode-style auth
      const crypto = require('crypto');
      const verifier = crypto.randomBytes(64).toString('base64url');
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      // Build the OAuth URL (same as OpenCode uses)
      const params = new URLSearchParams({
        code: 'true',
        client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
        response_type: 'code',
        redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
        scope: 'org:create_api_key user:profile user:inference',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: verifier
      });

      const authUrl = `https://claude.ai/oauth/authorize?${params}`;

      console.log('🔗 Go to this URL:\n');
      console.log(authUrl);
      console.log('\n' + '=' .repeat(50));
      console.log('\nAfter authorizing, copy the ENTIRE code including the # part.');
      console.log('Format: ABC123#XYZ789\n');

      const code = await this.question('Paste the authorization code here: ');

      // Now we need to exchange this code through OpenCode
      // Since only OpenCode is whitelisted, we save the tokens for OpenCode to use
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      try {
        // Parse the code
        const [authCode, state] = code.trim().split('#');

        // Exchange the code for tokens
        const axios = require('axios');
        const tokenResponse = await axios.post(
          'https://console.anthropic.com/v1/oauth/token',
          {
            code: authCode,
            state: state || verifier,
            grant_type: 'authorization_code',
            client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
            redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
            code_verifier: verifier
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        console.log('\n✅ Got OAuth tokens!');
        console.log('Access token:', tokenResponse.data.access_token?.substring(0, 30) + '...');

        // Save these tokens in OpenCode's format
        const openCodeAuth = {
          anthropic: {
            type: 'oauth',
            access: tokenResponse.data.access_token,
            refresh: tokenResponse.data.refresh_token,
            expires: Date.now() + (tokenResponse.data.expires_in * 1000)
          }
        };

        // Create directory if it doesn't exist
        const openCodeDir = `${process.env.HOME}/.local/share/opencode`;
        await fs.mkdir(openCodeDir, { recursive: true });

        // Write to OpenCode's auth file
        const authPath = `${openCodeDir}/auth.json`;
        await fs.writeFile(authPath, JSON.stringify(openCodeAuth, null, 2));

        console.log('✅ Tokens saved to:', authPath);

        // Verify it was written
        const saved = JSON.parse(await fs.readFile(authPath, 'utf8'));
        console.log('Verified token:', saved.anthropic?.access?.substring(0, 30) + '...');

        // Now use OpenCode backend
        this.sdk = new ClaudeSDK({ method: 'opencode' });

        // Test the connection
        console.log('\n🧪 Testing connection...');
        await this.sdk.sendMessage('Say "Connected!" and nothing else.');

        this.authenticated = true;
        console.log('✅ Successfully authenticated via OpenCode OAuth!\n');

      } catch (error) {
        console.log('\n❌ Authentication failed:', error.response?.data || error.message);
        this.authenticated = false;
      }

    } else if (choice === '2') {
      // API key authentication
      console.log('\n📋 API Key Authentication');
      console.log('Get your API key from: https://console.anthropic.com\n');

      const apiKey = await this.question('Enter API key: ');

      if (!apiKey || apiKey.trim() === '') {
        console.log('❌ No API key provided\n');
        return;
      }

      this.sdk = new ClaudeSDK({
        method: 'apikey',
        apiKey: apiKey.trim()
      });

      // Test authentication
      try {
        console.log('Testing API key...');
        await this.sdk.sendMessage('Say "Connected!" and nothing else.');
        this.authenticated = true;
        console.log('✅ Successfully authenticated with API key!\n');

        // Optionally save the key
        const save = await this.question('Save API key for future use? (y/n): ');
        if (save.toLowerCase() === 'y') {
          await fs.writeFile('./claude-api-key.json', JSON.stringify({
            apiKey: apiKey.trim(),
            created: new Date().toISOString()
          }, null, 2));
          console.log('API key saved to claude-api-key.json\n');
        }
      } catch (error) {
        console.log('❌ Invalid API key\n');
        this.authenticated = false;
      }

    } else if (choice === '3') {
      // Auto-detect
      this.sdk = new ClaudeSDK();
      const method = await this.sdk.detectMethod();

      if (method) {
        console.log(`\n✅ Auto-detected: ${method}`);
        this.authenticated = true;
      } else {
        console.log('\n❌ No authentication method found. Use /auth to set up.\n');
        this.authenticated = false;
      }

    } else if (choice === '4') {
      // Clear connection
      this.sdk = null;
      this.authenticated = false;
      this.messages = [];
      console.log('\n✅ Connection cleared!');
      console.log('💡 Use /auth to connect again.\n');

    } else {
      console.log('\n❌ Invalid choice\n');
    }
  }

  // Handle model selection
  async handleModel() {
    if (!this.authenticated) {
      console.log('\n⚠️  Please authenticate first with /auth\n');
      return;
    }

    console.log('\n🤖 Available Models:');
    console.log('1. Sonnet 3.5 (Latest) - Best for most tasks');
    console.log('2. Sonnet 3.0 - Balanced performance');
    console.log('3. Opus - Most capable, slower');
    console.log('4. Haiku - Fastest, lightweight\n');

    const choice = await this.question('Choose model (1-4): ');

    const modelMap = {
      '1': { key: 'sonnet', name: 'Claude 3.5 Sonnet' },
      '2': { key: 'sonnet-3', name: 'Claude 3.0 Sonnet' },
      '3': { key: 'opus', name: 'Claude 3 Opus' },
      '4': { key: 'haiku', name: 'Claude 3 Haiku' }
    };

    if (modelMap[choice]) {
      this.model = this.models[modelMap[choice].key];
      console.log(`\n✅ Switched to ${modelMap[choice].name}\n`);

      // Clear history when switching models
      this.messages = [];
      console.log('💡 Chat history cleared for new model\n');
    } else {
      console.log('\n❌ Invalid choice\n');
    }
  }

  // Handle chat message
  async handleMessage(message) {
    if (!this.authenticated) {
      console.log('\n⚠️  Please authenticate first with /auth\n');
      return;
    }

    // Add user message to history
    this.messages.push({ role: 'user', content: message });

    // Show thinking indicator
    process.stdout.write('\n🤔 Claude is thinking');
    const thinkingInterval = setInterval(() => {
      process.stdout.write('.');
    }, 500);

    try {
      // Send message with conversation history
      const response = await this.sdk.sendMessage(message, {
        model: this.model,
        messages: this.messages.slice(0, -1), // Previous messages as context
        maxTokens: 2000
      });

      clearInterval(thinkingInterval);
      console.log('\r                                    \r'); // Clear thinking line

      // Extract response text
      const responseText = response.content[0].text;

      // Add assistant response to history
      this.messages.push({ role: 'assistant', content: responseText });

      // Display response with formatting
      console.log('\n📎 Claude:');
      console.log('─'.repeat(50));
      console.log(responseText);
      console.log('─'.repeat(50) + '\n');

    } catch (error) {
      clearInterval(thinkingInterval);
      console.log('\r                                    \r'); // Clear thinking line
      console.log('\n❌ Error:', error.message);
      console.log('💡 Try /auth to re-authenticate\n');

      // Remove the failed message from history
      this.messages.pop();
    }
  }

  // Clear chat history
  handleClear() {
    this.messages = [];
    console.clear();
    this.displayWelcome();
    console.log('✅ Chat history cleared!\n');
    if (this.authenticated) {
      console.log(`📍 Connected | Model: ${this.getModelName()}\n`);
    }
  }

  // Get current model name
  getModelName() {
    for (const [key, value] of Object.entries(this.models)) {
      if (value === this.model) {
        return key.charAt(0).toUpperCase() + key.slice(1);
      }
    }
    return 'Unknown';
  }

  // Show help
  showHelp() {
    console.log('\n📚 Available Commands:');
    console.log('  /auth   - Authenticate with Claude (OpenCode or API key)');
    console.log('  /model  - Select which Claude model to use');
    console.log('  /clear  - Clear the chat history');
    console.log('  /help   - Show this help message');
    console.log('  /exit   - Exit the chat application\n');
    console.log('💡 Just type normally to chat with Claude!\n');
  }

  // Question helper
  question(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, resolve);
    });
  }

  // Main chat loop
  async start() {
    this.displayWelcome();

    // Try auto-authentication
    console.log('🔍 Checking for existing authentication...');
    this.sdk = new ClaudeSDK();
    const method = await this.sdk.detectMethod();

    if (method) {
      this.authenticated = true;
      console.log(`✅ Auto-authenticated with ${method}\n`);
      console.log(`📍 Model: ${this.getModelName()}\n`);
    } else {
      console.log('💡 No authentication found. Use /auth to get started.\n');
    }

    // Start the prompt first
    this.rl.prompt();

    // Set up line handler
    this.rl.on('line', async (line) => {
      const input = line.trim();

      if (!input) {
        this.rl.prompt();
        return;
      }

      // Handle commands
      if (input.startsWith('/')) {
        const command = input.toLowerCase();

        switch (command) {
          case '/auth':
            await this.handleAuth();
            break;
          case '/model':
            await this.handleModel();
            break;
          case '/clear':
            this.handleClear();
            break;
          case '/help':
            this.showHelp();
            break;
          case '/exit':
          case '/quit':
            console.log('\n👋 Goodbye!\n');
            process.exit(0);
            break;
          default:
            console.log(`\n❓ Unknown command: ${input}`);
            console.log('💡 Type /help for available commands\n');
        }
      } else {
        // Regular chat message
        await this.handleMessage(input);
      }

      this.rl.prompt();
    });

    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      console.log('\n\n👋 Goodbye!\n');
      process.exit(0);
    });
  }
}

// Run the CLI
if (require.main === module) {
  const chat = new ClaudeChatCLI();
  chat.start().catch(console.error);
}

module.exports = ClaudeChatCLI;