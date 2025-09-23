#!/usr/bin/env node

/**
 * Claude SDK - Final Working Solution
 *
 * Two working methods:
 * 1. Use OpenCode as backend (for Max Plan users)
 * 2. Use regular API key (for all users)
 */

const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

class ClaudeSDK {
  constructor(options = {}) {
    this.method = options.method || 'auto'; // 'opencode', 'apikey', or 'auto'
    this.apiKey = options.apiKey;
    this.authenticated = false;
  }

  /**
   * Auto-detect the best method
   */
  async detectMethod() {
    // Check for API key first
    if (this.apiKey) {
      console.log('Using API key method');
      return 'apikey';
    }

    // Check for saved API key
    try {
      const data = JSON.parse(await fs.readFile('./claude-api-key.json', 'utf8'));
      if (data.apiKey) {
        this.apiKey = data.apiKey;
        console.log('Using saved API key');
        return 'apikey';
      }
    } catch (e) {}

    // Check if OpenCode is available and authenticated
    try {
      const { stdout } = await execPromise('opencode auth list 2>&1');
      if (stdout.includes('Anthropic')) {
        console.log('Using OpenCode backend');
        return 'opencode';
      }
    } catch (e) {}

    console.log('No authentication method available');
    return null;
  }

  /**
   * Send message via OpenCode (using safer spawn method)
   */
  async sendViaOpenCode(message) {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const child = spawn('opencode', ['run'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn opencode: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdout) {
          reject(new Error(`OpenCode exited with code ${code}: ${stderr}`));
          return;
        }

        const cleaned = stdout
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/\[0m/g, '')
          .split('\n')
          .filter(line => line.trim())
          .join('\n')
          .trim();

        resolve({
          content: [{ type: 'text', text: cleaned }],
          id: 'msg_' + Date.now(),
          model: 'claude-3-5-sonnet-20241022',
          role: 'assistant',
          method: 'opencode'
        });
      });

      // Write message to stdin
      child.stdin.write(message + '\n');
      child.stdin.end();
    });
  }

  /**
   * Send message via API key
   */
  async sendViaAPIKey(message, options = {}) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: options.model || 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: typeof message === 'string' ? message : JSON.stringify(message)
          }]
        }],
        max_tokens: options.maxTokens || 1000
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return {
      ...response.data,
      method: 'apikey'
    };
  }

  /**
   * Main send message method
   */
  async sendMessage(message, options = {}) {
    // Determine method if auto
    if (this.method === 'auto') {
      this.method = await this.detectMethod();
      if (!this.method) {
        throw new Error('No authentication method available. Please authenticate first.');
      }
    }

    // Send using appropriate method
    if (this.method === 'opencode') {
      return this.sendViaOpenCode(message);
    } else if (this.method === 'apikey') {
      return this.sendViaAPIKey(message, options);
    } else {
      throw new Error('Invalid method');
    }
  }

  /**
   * Authenticate - guides user through appropriate auth flow
   */
  async authenticate() {
    console.log('\n🔐 Claude SDK Authentication');
    console.log('=' .repeat(50));
    console.log('\nChoose authentication method:');
    console.log('1. OpenCode (Max Plan OAuth)');
    console.log('2. API Key (Standard)');
    console.log('3. Auto-detect\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));
    const choice = await question('Enter choice (1-3): ');

    if (choice === '1') {
      // OpenCode authentication
      console.log('\n📋 OpenCode Authentication');
      console.log('Run this command in another terminal:');
      console.log('\n  opencode auth login');
      console.log('\nSelect: Anthropic → Claude Pro/Max');
      console.log('\nPress Enter when done...');
      await question('');

      // Verify
      try {
        const { stdout } = await execPromise('opencode auth list 2>&1');
        if (stdout.includes('Anthropic')) {
          console.log('✅ OpenCode authentication successful!');
          this.method = 'opencode';
          readline.close();
          return true;
        }
      } catch (e) {}

      console.log('❌ OpenCode authentication failed');
      readline.close();
      return false;

    } else if (choice === '2') {
      // API key authentication
      console.log('\n📋 API Key Authentication');
      console.log('Get your API key from: https://console.anthropic.com');
      const apiKey = await question('\nEnter API key: ');

      this.apiKey = apiKey.trim();

      // Test the key
      try {
        await this.sendViaAPIKey('Say "Test successful" and nothing else.');

        // Security warning
        console.log('\n⚠️  SECURITY WARNING: API key will be saved in plaintext');
        console.log('   Location: ./claude-api-key.json');
        const saveChoice = await question('   Save API key for future sessions? (y/N): ');

        if (saveChoice.toLowerCase() === 'y') {
          // Save the key with restricted permissions
          const filename = './claude-api-key.json';
          await fs.writeFile(filename, JSON.stringify({
            apiKey: this.apiKey,
            created: new Date().toISOString()
          }, null, 2));
          // Set file permissions to 600 (read/write for owner only)
          await fs.chmod(filename, 0o600);
          console.log('✅ API key authenticated and saved with restricted permissions (600)!');
        } else {
          console.log('✅ API key authenticated (session only)!');
        }

        this.method = 'apikey';
        readline.close();
        return true;
      } catch (error) {
        console.log('❌ Invalid API key');
        readline.close();
        return false;
      }

    } else {
      // Auto-detect
      const method = await this.detectMethod();
      if (method) {
        console.log(`✅ Auto-detected: ${method}`);
        this.method = method;
        readline.close();
        return true;
      } else {
        console.log('❌ No authentication method found');
        readline.close();
        return false;
      }
    }
  }
}

// Demo function
async function demo() {
  const sdk = new ClaudeSDK();

  console.log('\n🚀 Claude SDK - Final Solution');
  console.log('=' .repeat(50));

  // Try to auto-detect first
  const method = await sdk.detectMethod();

  if (!method) {
    // Need to authenticate
    const success = await sdk.authenticate();
    if (!success) {
      console.log('Authentication failed. Exiting.');
      return;
    }
  }

  // Test the SDK
  console.log('\n📤 Testing SDK...\n');
  try {
    const response = await sdk.sendMessage('Say "Hello from Claude SDK!" and nothing else.');
    console.log('✅ Response:', response.content[0].text);
    console.log('   Method used:', response.method);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('SDK is ready to use!');
  console.log('=' .repeat(50) + '\n');
}

// Export for use as module
module.exports = ClaudeSDK;

// Run demo if called directly
if (require.main === module) {
  demo().catch(console.error);
}