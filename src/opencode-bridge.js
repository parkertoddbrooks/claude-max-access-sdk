/**
 * Bridge to OpenCode - uses OpenCode's actual implementation
 * This is the pragmatic solution: if OpenCode works, use it!
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class OpenCodeBridge extends EventEmitter {
  constructor() {
    super();
    this.isReady = false;
  }

  /**
   * Send a message through OpenCode
   */
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const opencode = spawn('opencode', ['run'], {
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      opencode.stdout.on('data', (data) => {
        output += data.toString();
      });

      opencode.stderr.on('data', (data) => {
        error += data.toString();
      });

      opencode.on('close', (code) => {
        if (code === 0) {
          // Clean the output - remove any ANSI codes and extra whitespace
          const cleaned = output
            .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
            .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim whitespace
            .split('\n')
            .filter(line => !line.includes('[0m')) // Remove formatting lines
            .join('\n')
            .trim();

          resolve(cleaned);
        } else {
          reject(new Error(error || 'OpenCode failed'));
        }
      });

      // Send the message
      opencode.stdin.write(message + '\n');
      opencode.stdin.end();
    });
  }

  /**
   * Check if OpenCode is authenticated
   */
  async checkAuth() {
    const fs = require('fs').promises;
    try {
      const auth = await fs.readFile(
        `${process.env.HOME}/.local/share/opencode/auth.json`,
        'utf8'
      );
      const data = JSON.parse(auth);
      return !!data.anthropic;
    } catch (e) {
      return false;
    }
  }

  /**
   * Run OpenCode authentication
   */
  async authenticate() {
    console.log('Please run: opencode auth login');
    console.log('Select: Anthropic → Claude Pro/Max');
    console.log('Then restart this application');
    return false;
  }
}

// Wrapper class that looks like the SDK but uses OpenCode
class ClaudeSDKOpenCodeBackend {
  constructor() {
    this.bridge = new OpenCodeBridge();
  }

  async isAuthenticated() {
    return this.bridge.checkAuth();
  }

  async sendMessage(message, options = {}) {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated. Run: opencode auth login');
    }
    return this.bridge.sendMessage(message);
  }

  async authenticate() {
    return this.bridge.authenticate();
  }
}

module.exports = { OpenCodeBridge, ClaudeSDKOpenCodeBackend };