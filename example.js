#!/usr/bin/env node

/**
 * Working Example - How to use the Claude SDK
 *
 * This example shows how to use the SDK with either:
 * 1. OpenCode backend (for Max Plan)
 * 2. API keys (for Console access)
 */

const ClaudeSDK = require('./claude-sdk-final');

async function example1_opencode() {
  console.log('\n=== Example 1: Using OpenCode Backend (Max Plan) ===\n');

  // First make sure OpenCode is authenticated:
  // Run: opencode auth login
  // Select: Anthropic → Claude Pro/Max

  const sdk = new ClaudeSDK(); // Auto-detects OpenCode

  try {
    const response = await sdk.sendMessage('What is 2+2? Reply with just the number.');
    console.log('Claude says:', response.content[0].text);
    console.log('Method used:', response.method);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure OpenCode is authenticated:');
    console.log('Run: opencode auth login');
    console.log('Select: Anthropic → Claude Pro/Max');
  }
}

async function example2_apikey() {
  console.log('\n=== Example 2: Using API Key (Console) ===\n');

  // Get your API key from https://console.anthropic.com
  // Replace with your actual API key
  const apiKey = process.env.ANTHROPIC_API_KEY || 'your-api-key-here';

  if (apiKey === 'your-api-key-here') {
    console.log('Please set ANTHROPIC_API_KEY environment variable');
    console.log('Or edit this file and add your API key');
    return;
  }

  const sdk = new ClaudeSDK({
    method: 'apikey',
    apiKey: apiKey
  });

  try {
    const response = await sdk.sendMessage('What is 3+3? Reply with just the number.');
    console.log('Claude says:', response.content[0].text);
    console.log('Method used:', response.method);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function example3_interactive() {
  console.log('\n=== Example 3: Interactive Authentication ===\n');

  const sdk = new ClaudeSDK();

  // This will guide you through authentication
  const authenticated = await sdk.authenticate();

  if (authenticated) {
    const response = await sdk.sendMessage('Say "Hello from the SDK!"');
    console.log('Claude says:', response.content[0].text);
  }
}

async function main() {
  console.log('Claude SDK Examples');
  console.log('='.repeat(50));

  // Check if OpenCode is available
  const sdk = new ClaudeSDK();
  const method = await sdk.detectMethod();

  if (method === 'opencode') {
    console.log('✅ OpenCode detected - running OpenCode example');
    await example1_opencode();
  } else if (method === 'apikey') {
    console.log('✅ API key detected - running API key example');
    await example2_apikey();
  } else {
    console.log('⚠️  No authentication method detected');
    console.log('\nWould you like to set up authentication?');
    await example3_interactive();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { example1_opencode, example2_apikey, example3_interactive };