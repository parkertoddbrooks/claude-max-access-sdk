# Claude OAuth SDK

A lightweight Node.js SDK for authenticating with Claude Max Plan using OAuth 2.0 and making API requests to Anthropic's Claude models.

## 🚀 Features

- 🔐 OAuth 2.0 authentication with PKCE flow
- 📝 Manual code input (same as Claude Code CLI)
- 🔄 Automatic token refresh
- 💾 Flexible token storage (memory or file)
- 🎯 Simple API for Claude interactions
- ⚡ Minimal dependencies

## 📦 Installation

```bash
npm install claude-oauth-sdk
```

Or install directly from GitHub:

```bash
npm install git+https://github.com/yourusername/claude-oauth-sdk.git
```

## 🔧 Quick Start

```javascript
const ClaudeSDK = require('claude-oauth-sdk');

async function main() {
  // Initialize SDK
  const sdk = new ClaudeSDK({
    storage: 'file' // Persist tokens to disk
  });

  // Authenticate (opens browser, prompts for code)
  await sdk.authenticate();

  // Make an API request
  const response = await sdk.request({
    model: 'claude-3.5-sonnet',
    messages: [
      { role: 'user', content: 'Hello, Claude!' }
    ]
  });

  console.log(response.content[0].text);
}

main();
```

## 🔑 Authentication Flow

This SDK uses the same OAuth flow as Claude Code CLI:

1. **SDK generates OAuth URL** with PKCE parameters
2. **Opens browser** to Claude login page
3. **User logs in** with Claude Max Plan account
4. **Browser redirects** to callback URL with code
5. **User copies code** from URL (e.g., `?code=ABC123`)
6. **User pastes code** into terminal prompt
7. **SDK exchanges code** for access tokens

No local server needed!

## 📖 API Reference

### `new ClaudeSDK(options)`

Initialize the SDK.

**Options:**
- `storage` (string|object): Storage type - `'memory'`, `'file'`, or custom adapter
- `storagePath` (string): Custom path for file storage (default: `~/.claude-oauth/tokens.json`)
- `debug` (boolean): Enable debug logging

### `sdk.authenticate()`

Complete authentication flow - opens browser and prompts for code.

```javascript
const tokens = await sdk.authenticate();
```

### `sdk.startAuth()`

Get authorization URL without opening browser.

```javascript
const authUrl = await sdk.startAuth();
console.log('Open this URL:', authUrl);
```

### `sdk.exchangeCode(code)`

Exchange authorization code for tokens.

```javascript
const tokens = await sdk.exchangeCode('AUTH_CODE_FROM_URL');
```

### `sdk.request(payload)`

Make an API request to Claude.

```javascript
const response = await sdk.request({
  model: 'claude-3.5-sonnet',
  messages: [
    { role: 'user', content: 'Your message here' }
  ],
  max_tokens: 1024
});
```

### `sdk.isAuthenticated()`

Check if authenticated.

```javascript
if (await sdk.isAuthenticated()) {
  console.log('Ready to make requests!');
}
```

### `sdk.logout()`

Clear stored tokens.

```javascript
await sdk.logout();
```

## 💾 Storage Options

### Memory Storage (Default)
Tokens are stored in memory and lost when process ends.

```javascript
const sdk = new ClaudeSDK({
  storage: 'memory'
});
```

### File Storage
Tokens are persisted to disk.

```javascript
const sdk = new ClaudeSDK({
  storage: 'file',
  storagePath: '/custom/path/tokens.json' // Optional
});
```

### Custom Storage
Implement your own storage adapter.

```javascript
class MyStorage {
  async get(key) { /* ... */ }
  async set(key, value) { /* ... */ }
  async clear() { /* ... */ }
}

const sdk = new ClaudeSDK({
  storage: new MyStorage()
});
```

## 🏃 Examples

Run the included examples:

```bash
# Basic usage with persistent storage
npm run example:basic

# Step-by-step manual authentication
npm run example:manual
```

## ⚠️ Important Notes

### Rate Limits
Claude Max Plan includes 50-200 prompts per 5 hours. The SDK will throw an error when you hit the limit.

### Terms of Service
This SDK uses standard OAuth 2.0 protocols to authenticate with your Claude Max Plan subscription. Users should review Anthropic's Terms of Service and use at their own discretion.

### Not for Production
This SDK is intended for personal use and experimentation. For production applications, consider using Anthropic's official API with dedicated API keys.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file.

Based on authentication flow from [OpenCode](https://github.com/sst/opencode).

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## 🐛 Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/yourusername/claude-oauth-sdk/issues).

---

**Disclaimer:** This is an unofficial SDK and is not affiliated with or endorsed by Anthropic. Use at your own risk.