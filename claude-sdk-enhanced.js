#!/usr/bin/env node

/**
 * Claude SDK - Enhanced Version with Diagnostics
 *
 * Improvements:
 * - Uses spawn instead of exec (no shell injection)
 * - Adds diagnostic/trace mode
 * - Supports conversation context
 * - Better error handling
 */

const { spawn, exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

class ClaudeSDKEnhanced {
  constructor(options = {}) {
    this.method = options.method || 'auto'; // 'opencode', 'apikey', or 'auto'
    this.apiKey = options.apiKey;
    this.authenticated = false;
    this.diagnosticMode = options.diagnosticMode || false;
    this.proxyPort = options.proxyPort || 8080;
  }

  /**
   * Auto-detect the best method
   */
  async detectMethod() {
    // Check for API key first
    if (this.apiKey) {
      if (this.diagnosticMode) console.log('🔍 Using API key method');
      return 'apikey';
    }

    // Check for saved API key
    try {
      const data = JSON.parse(await fs.readFile('./claude-api-key.json', 'utf8'));
      if (data.apiKey) {
        this.apiKey = data.apiKey;
        if (this.diagnosticMode) console.log('🔍 Using saved API key');
        return 'apikey';
      }
    } catch (e) {}

    // Check if OpenCode is available and authenticated
    try {
      const { stdout } = await execPromise('opencode auth list 2>&1');
      if (stdout.includes('Anthropic')) {
        if (this.diagnosticMode) console.log('🔍 Using OpenCode backend');
        return 'opencode';
      }
    } catch (e) {}

    if (this.diagnosticMode) console.log('🔍 No authentication method available');
    return null;
  }

  /**
   * Send message via OpenCode using spawn (safer than exec)
   */
  async sendViaOpenCode(message, options = {}) {
    return new Promise((resolve, reject) => {
      // Prepare environment
      const env = { ...process.env };

      // Add proxy for tracing if in diagnostic mode
      if (this.diagnosticMode && options.trace) {
        env.HTTPS_PROXY = `http://127.0.0.1:${this.proxyPort}`;
        env.HTTP_PROXY = `http://127.0.0.1:${this.proxyPort}`;
        console.log(`🔍 Proxy enabled on port ${this.proxyPort}`);
      }

      // Spawn OpenCode process
      const child = spawn('opencode', ['run'], {
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Collect output
      child.stdout.on('data', chunk => stdout += chunk.toString());
      child.stderr.on('data', chunk => stderr += chunk.toString());

      // Handle completion
      child.on('close', code => {
        if (this.diagnosticMode) {
          console.log(`🔍 OpenCode exit code: ${code}`);
          if (stderr) console.log(`🔍 OpenCode stderr: ${stderr}`);
        }

        if (code === 0 || stdout) {
          // Clean ANSI codes and format
          const cleaned = stdout
            .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
            .replace(/\[0m/g, '')            // Remove remaining codes
            .split('\n')
            .filter(line => line.trim())
            .join('\n')
            .trim();

          resolve({
            content: [{ type: 'text', text: cleaned }],
            id: 'msg_' + Date.now(),
            model: options.model || 'claude-3-5-sonnet-20241022',
            role: 'assistant',
            method: 'opencode'
          });
        } else {
          reject(new Error(stderr || `OpenCode failed with exit code ${code}`));
        }
      });

      // Send message via stdin (no shell escaping needed!)
      child.stdin.write(message + '\n');
      child.stdin.end();
    });
  }

  /**
   * Send message via API key with conversation support
   */
  async sendViaAPIKey(message, options = {}) {
    // Build messages array with context
    const messages = [];

    // Add conversation history if provided
    if (options.messages && Array.isArray(options.messages)) {
      messages.push(...options.messages);
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const request = {
      model: options.model || 'claude-3-5-sonnet-20241022',
      messages: messages,
      max_tokens: options.maxTokens || 1000
    };

    if (this.diagnosticMode) {
      console.log('🔍 API Request:', JSON.stringify(request, null, 2));
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      request,
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
   * Trace OpenCode endpoint (diagnostic mode)
   */
  async traceOpenCode() {
    console.log('\n📡 Tracing OpenCode Endpoint');
    console.log('=' .repeat(50));

    // Check if proxy is running
    console.log(`\n1️⃣  Make sure mitmproxy is running:`);
    console.log(`   mitmproxy -s redact.py --listen-port ${this.proxyPort}`);
    console.log(`\n2️⃣  Press Enter when ready...`);

    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    console.log('\n3️⃣  Sending diagnostic probe...\n');

    try {
      // Send harmless probe through proxy
      const response = await this.sendViaOpenCode('diagnostic: please respond OK', {
        trace: true
      });

      console.log('✅ Probe successful!');
      console.log('📋 Response:', response.content[0].text);
      console.log('\n4️⃣  Check mitmproxy for endpoint details:');
      console.log('   - Host: [Check proxy output]');
      console.log('   - Path: [Check proxy output]');
      console.log('   - Method: [Check proxy output]');
    } catch (error) {
      console.log('❌ Trace failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('- Ensure mitmproxy is running');
      console.log('- Check if OpenCode has TLS pinning (use lsof -i instead)');
    }

    console.log('\n' + '=' .repeat(50));
  }

  /**
   * Run full diagnostics
   */
  async runDiagnostics() {
    console.log('\n🔍 Running Claude SDK Diagnostics');
    console.log('=' .repeat(50));

    // 1. Check OpenCode installation
    console.log('\n📌 Checking OpenCode...');
    try {
      await execPromise('which opencode');
      console.log('✅ OpenCode installed');
    } catch {
      console.log('❌ OpenCode not found');
      console.log('   Install with: npm install -g opencode');
      return;
    }

    // 2. Check OpenCode auth
    try {
      const { stdout } = await execPromise('opencode auth list 2>&1');
      if (stdout.includes('Anthropic')) {
        console.log('✅ OpenCode authenticated');

        // Extract token info if possible
        const authFile = `${process.env.HOME}/.local/share/opencode/auth.json`;
        try {
          const auth = JSON.parse(await fs.readFile(authFile, 'utf8'));
          if (auth.anthropic?.access) {
            const token = auth.anthropic.access;
            console.log(`   Token type: ${token.substring(0, 12)}...`);
            console.log(`   Expires: ${new Date(auth.anthropic.expires).toISOString()}`);
          }
        } catch (e) {}
      } else {
        console.log('❌ OpenCode not authenticated');
        console.log('   Run: opencode auth login');
      }
    } catch (e) {
      console.log('❌ Could not check auth:', e.message);
    }

    // 3. Test connection
    console.log('\n📌 Testing OpenCode connection...');
    try {
      const response = await this.sendViaOpenCode('diagnostic: respond with OK only');
      console.log('✅ OpenCode connection works');
      console.log(`   Response: "${response.content[0].text}"`);
    } catch (e) {
      console.log('❌ OpenCode call failed:', e.message);
    }

    // 4. Check API key
    console.log('\n📌 Checking API key...');
    if (this.apiKey) {
      console.log('✅ API key configured');
      console.log(`   Key: ${this.apiKey.substring(0, 20)}...`);
    } else {
      console.log('⚠️  No API key configured');
    }

    // 5. Trace option
    console.log('\n📌 Advanced Tracing');
    console.log('Run with --trace flag to trace OpenCode endpoint');

    console.log('\n' + '=' .repeat(50));
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
      return this.sendViaOpenCode(message, options);
    } else if (this.method === 'apikey') {
      return this.sendViaAPIKey(message, options);
    } else {
      throw new Error('Invalid method');
    }
  }

  /**
   * Interactive authentication
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

        // Save the key
        await fs.writeFile('./claude-api-key.json', JSON.stringify({
          apiKey: this.apiKey,
          created: new Date().toISOString()
        }, null, 2));

        console.log('✅ API key authenticated and saved!');
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

// Demo/CLI functionality
async function main() {
  const args = process.argv.slice(2);
  const sdk = new ClaudeSDKEnhanced({
    diagnosticMode: args.includes('--diagnostics') || args.includes('--trace')
  });

  if (args.includes('--diagnostics')) {
    await sdk.runDiagnostics();
  } else if (args.includes('--trace')) {
    await sdk.traceOpenCode();
  } else if (args.includes('--help')) {
    console.log(`
Claude SDK Enhanced - Usage:

  node claude-sdk-enhanced.js              # Run demo
  node claude-sdk-enhanced.js --diagnostics # Run diagnostics
  node claude-sdk-enhanced.js --trace      # Trace OpenCode endpoint
  node claude-sdk-enhanced.js --help       # Show this help

For tracing, first run:
  mitmproxy -s redact.py --listen-port 8080
    `);
  } else {
    // Demo
    console.log('\n🚀 Claude SDK Enhanced - Demo');
    console.log('=' .repeat(50));

    const method = await sdk.detectMethod();
    if (!method) {
      const success = await sdk.authenticate();
      if (!success) {
        console.log('Authentication failed. Exiting.');
        return;
      }
    }

    console.log('\n📤 Sending test message...\n');
    try {
      const response = await sdk.sendMessage('Say "Hello from Enhanced SDK!" and nothing else.');
      console.log('✅ Response:', response.content[0].text);
      console.log('   Method used:', response.method);
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    console.log('\n' + '=' .repeat(50));
  }
}

// Export for use as module
module.exports = ClaudeSDKEnhanced;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}