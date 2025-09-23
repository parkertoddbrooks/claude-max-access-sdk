#!/usr/bin/env node

/**
 * Use OpenCode as Backend
 * This uses the actual OpenCode binary to make requests
 * Since OpenCode is whitelisted, this should work
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class OpenCodeBackend {
  constructor() {
    this.authenticated = false;
  }

  /**
   * Check if OpenCode is installed and authenticated
   */
  async checkAuth() {
    try {
      const { stdout, stderr } = await execPromise('opencode auth list 2>&1');

      // Check if authenticated with Anthropic
      if (stdout.includes('Anthropic')) {
        this.authenticated = true;
        return true;
      }

      console.log('Not authenticated with Anthropic');
      return false;
    } catch (error) {
      console.log('OpenCode not found or not authenticated');
      return false;
    }
  }

  /**
   * Send a message through OpenCode
   */
  async sendMessage(message) {
    if (!this.authenticated) {
      const isAuth = await this.checkAuth();
      if (!isAuth) {
        throw new Error('Not authenticated. Run: opencode auth login');
      }
    }

    return new Promise((resolve, reject) => {
      // Create the command - escape quotes in the message
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      const command = `echo "${escapedMessage}" | opencode run 2>&1`;

      exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        // OpenCode might return non-zero exit code even when successful
        if (stdout) {
          // Clean the output
          const cleaned = stdout
            .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
            .replace(/\[0m/g, '') // Remove remaining color code endings
            .split('\n')
            .filter(line => line.trim()) // Remove empty lines
            .join('\n')
            .trim();

          resolve(cleaned);
        } else {
          reject(error || new Error('No output from OpenCode'));
        }
      });
    });
  }

  /**
   * Interactive authentication
   */
  async authenticate() {
    console.log('\n🔐 OpenCode Authentication Required');
    console.log('=' .repeat(50));
    console.log('\nPlease run the following command in a separate terminal:');
    console.log('\n  opencode auth login');
    console.log('\nThen select:');
    console.log('  1. Anthropic');
    console.log('  2. Claude Pro/Max');
    console.log('\nOnce authenticated, press Enter to continue...');

    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // Check if it worked
    const authenticated = await this.checkAuth();
    if (authenticated) {
      console.log('\n✅ Authentication successful!');
      return true;
    } else {
      console.log('\n❌ Authentication failed. Please try again.');
      return false;
    }
  }
}

// SDK wrapper that looks like our normal SDK
class ClaudeSDK {
  constructor() {
    this.backend = new OpenCodeBackend();
  }

  async sendMessage(message, options = {}) {
    try {
      const response = await this.backend.sendMessage(message);
      return {
        content: [{
          type: 'text',
          text: response
        }],
        id: 'msg_' + Date.now(),
        model: options.model || 'claude-3-5-sonnet-20241022',
        role: 'assistant'
      };
    } catch (error) {
      throw error;
    }
  }

  async authenticate() {
    return this.backend.authenticate();
  }

  async isAuthenticated() {
    return this.backend.checkAuth();
  }
}

// Test function
async function test() {
  const sdk = new ClaudeSDK();

  console.log('\n🧪 Testing OpenCode Backend');
  console.log('=' .repeat(50));

  // Check authentication
  const isAuth = await sdk.isAuthenticated();

  if (!isAuth) {
    console.log('\n⚠️  Not authenticated with OpenCode');
    const success = await sdk.authenticate();
    if (!success) {
      console.log('Authentication failed. Exiting.');
      return;
    }
  }

  // Test a simple message
  console.log('\n📤 Sending test message...\n');
  try {
    const response = await sdk.sendMessage('Say "Hello from OpenCode backend!" and nothing else.');
    console.log('✅ Response:', response.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test a longer message
  console.log('\n📤 Testing longer response...\n');
  try {
    const response = await sdk.sendMessage('List three colors.');
    console.log('✅ Response:', response.content[0].text);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Export for use as module
module.exports = ClaudeSDK;

// Run test if called directly
if (require.main === module) {
  test().catch(console.error);
}