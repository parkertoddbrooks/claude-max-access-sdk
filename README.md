# Claude OAuth SDK

A Node.js SDK for authenticating with Claude using OAuth 2.0 and Max Plan subscriptions. This SDK provides multiple approaches to work with Claude's OAuth system.

## ⚠️ CRITICAL LIMITATION

**OAuth tokens from Claude Max Plan are restricted to whitelisted applications only.** Direct API calls with OAuth tokens will fail with:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "This credential is only authorized for use with Claude Code and cannot be used for other API requests."
  }
}
```

## ✅ Working Solutions

This SDK provides **two working approaches**:

### 1. OpenCode Backend (Recommended for Max Plan)
Uses the OpenCode CLI tool as a backend to make requests. Since OpenCode is whitelisted, this works with Max Plan OAuth tokens.

### 2. Regular API Keys
Use standard Anthropic API keys for direct API access (requires Console access).

## Installation

```bash
npm install claude-oauth-sdk
```

## Quick Start

### Using OpenCode Backend (Max Plan)

First, authenticate OpenCode:
```bash
opencode auth login
# Select: Anthropic → Claude Pro/Max
```

Then use the SDK:
```javascript
const ClaudeSDK = require('./claude-sdk-final');

async function main() {
  const sdk = new ClaudeSDK(); // Auto-detects OpenCode

  const response = await sdk.sendMessage('Hello, Claude!');
  console.log(response.content[0].text);
}

main();
```

### Using API Keys (Console)

```javascript
const ClaudeSDK = require('./claude-sdk-final');

async function main() {
  const sdk = new ClaudeSDK({
    method: 'apikey',
    apiKey: 'your-api-key-here'
  });

  const response = await sdk.sendMessage('Hello, Claude!');
  console.log(response.content[0].text);
}

main();
```

## Files Overview

### Main SDK Files

1. **`claude-sdk-final.js`** - Complete SDK with both OpenCode and API key support
   - Auto-detects available authentication methods
   - Seamless switching between backends
   - Production-ready implementation

2. **`use-opencode-backend.js`** - Dedicated OpenCode backend implementation
   - Uses OpenCode CLI to make requests
   - Works with Max Plan OAuth tokens
   - Requires OpenCode to be installed and authenticated

3. **`oauth-flow.js`** - OAuth flow tester and debugger
   - Complete OAuth PKCE implementation
   - Tests what works with OAuth tokens
   - Useful for understanding OAuth limitations

4. **`opencode-mimic.js`** - Experimental OAuth direct calls
   - Attempts to mimic OpenCode's request signature
   - Demonstrates OAuth token restrictions
   - Educational purpose only (doesn't bypass restrictions)

## API Reference

### `new ClaudeSDK(options)`

Initialize the SDK.

**Options:**
- `method` (string): `'opencode'`, `'apikey'`, or `'auto'` (default)
- `apiKey` (string): Your Anthropic API key (for apikey method)

### `sdk.sendMessage(message, options)`

Send a message to Claude.

```javascript
const response = await sdk.sendMessage('What is 2+2?', {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1000
});
```

### `sdk.authenticate()`

Interactive authentication flow.

```javascript
await sdk.authenticate(); // Guides through OpenCode or API key setup
```

### `sdk.isAuthenticated()`

Check authentication status.

```javascript
if (await sdk.isAuthenticated()) {
  console.log('Ready to make requests!');
}
```

## Testing the SDK

### Test Final SDK
```bash
node claude-sdk-final.js
```

### Test OAuth Flow
```bash
node oauth-flow.js
```
Follow prompts to understand OAuth limitations.

### Test OpenCode Backend
```bash
node use-opencode-backend.js
```

## How It Works

### OpenCode Backend Method
1. SDK sends your message to OpenCode CLI
2. OpenCode (being whitelisted) makes the API call
3. Response is returned through OpenCode
4. SDK parses and returns the response

### API Key Method
1. SDK makes direct API calls to Anthropic
2. Uses standard x-api-key authentication
3. No OAuth limitations apply

## Requirements

- **For OpenCode Backend**:
  - Claude Max Plan subscription
  - OpenCode CLI installed (`npm install -g opencode`)
  - Authenticated with OpenCode (`opencode auth login`)

- **For API Key Method**:
  - Anthropic Console account
  - Valid API key

## Important Notes

- **OAuth Tokens**: Only work with whitelisted applications (Claude Code, OpenCode)
- **OpenCode**: Acts as a bridge for Max Plan users
- **API Keys**: Provide direct access without OAuth restrictions
- **Rate Limits**: Subject to your plan's limits

## License

MIT