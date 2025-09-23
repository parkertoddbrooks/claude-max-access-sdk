# Claude OAuth SDK

A Node.js SDK that enables Claude Max Plan users to use their subscription in custom applications, despite OAuth token restrictions.

## ⚠️ Important Discovery

OAuth tokens from Claude Max Plan are **client-locked** and only work through whitelisted applications like OpenCode. This SDK works around that limitation by using OpenCode as a backend.

## Installation

```bash
npm install claude-oauth-sdk

# For Max Plan users, also install OpenCode:
npm install -g opencode
```

## Quick Start

### Option 1: Max Plan (OAuth via OpenCode)

```bash
# Authenticate OpenCode first
opencode auth login
# Select: Anthropic → Claude Pro/Max

# Use the SDK
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({ method: 'opencode' });

const response = await sdk.sendMessage('Hello, Claude!');
console.log(response.content[0].text);
```

### Option 2: API Key (Direct)

```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({
  apiKey: 'sk-ant-api03-...',
  method: 'apikey'
});

const response = await sdk.sendMessage('Hello, Claude!');
console.log(response.content[0].text);
```

## Interactive Chat

```bash
npm run chat
# or
node claude-chat.js
```

## How It Works

1. **OAuth Tokens are Client-Locked**: Direct API calls with OAuth tokens fail with "OAuth authentication is currently not supported"
2. **OpenCode is Whitelisted**: The same tokens work through OpenCode
3. **Our Solution**: Use OpenCode as a backend infrastructure

## Security Notes

⚠️ **API keys and tokens are stored in plaintext** by default. The SDK will prompt you before saving credentials. Consider:
- Using environment variables instead
- Restricting file permissions (the SDK sets 600 on saved files)
- Never committing credential files to version control

## API Reference

### Constructor Options

```javascript
new ClaudeSDK({
  method: 'auto' | 'opencode' | 'apikey',  // Default: 'auto'
  apiKey: 'sk-ant-api03-...',              // For API key method
  debug: false                              // Enable debug logging
})
```

### Methods

#### `sendMessage(message, options)`

Send a message to Claude.

```javascript
const response = await sdk.sendMessage('Your message', {
  model: 'claude-3-5-sonnet-20241022',  // Optional
  maxTokens: 1000                        // Optional
});
```

#### `authenticate()`

Interactive authentication flow.

```javascript
await sdk.authenticate();
```

## File Structure

- `claude-sdk-final.js` - Main SDK implementation
- `claude-chat.js` - Interactive chat application
- `example.js` - Basic usage example

## Technical Details

See our investigation documents:
- [SUMMARY.md](./SUMMARY.md) - Complete investigation overview
- [TRAFFIC_ANALYSIS_RESULTS.md](./TRAFFIC_ANALYSIS_RESULTS.md) - mitmproxy findings
- [FORENSICS.md](./FORENSICS.md) - Certificate analysis
- [commentary.md](./commentary.md) - OAuth restriction analysis

## Known Issues

- OAuth tokens only work through OpenCode backend
- Multi-line messages work correctly with the safer spawn implementation
- API key method requires valid Anthropic Console API key

## Contributing

PRs welcome! Areas for improvement:
- Additional authentication methods
- Better error handling
- Test coverage
- Documentation

## License

MIT

## Disclaimer

This SDK uses OpenCode as a backend for OAuth tokens, which is a workaround for Anthropic's client-locking. For production use, consider obtaining proper API keys from the Anthropic Console.