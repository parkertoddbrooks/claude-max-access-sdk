# Claude OAuth SDK

A Node.js SDK for authenticating with Claude using OAuth 2.0 and accessing Claude via Max Plan subscriptions.

## Installation

```bash
npm install claude-oauth-sdk
```

## Quick Start

```javascript
const ClaudeSDK = require('claude-oauth-sdk');

async function main() {
  // Initialize SDK
  const sdk = new ClaudeSDK({
    storage: 'file' // Persist tokens to disk
  });

  // Authenticate (opens browser, prompts for code)
  await sdk.authenticate();

  // Send a message
  const response = await sdk.sendMessage('Hello, Claude!');
  console.log(response);
}

main();
```

## Authentication Flow

1. SDK generates OAuth URL with PKCE parameters
2. Opens browser to Claude login page
3. User logs in with Claude Max Plan account
4. Browser redirects to callback URL with code
5. User copies code from URL
6. User pastes code into terminal prompt
7. SDK exchanges code for access tokens

## API Reference

### `new ClaudeSDK(options)`

Initialize the SDK.

**Options:**
- `storage` (string|object): Storage type - `'memory'`, `'file'`, or custom adapter
- `storagePath` (string): Custom path for file storage
- `debug` (boolean): Enable debug logging

### `sdk.authenticate()`

Complete authentication flow - opens browser and prompts for code.

```javascript
const tokens = await sdk.authenticate();
```

### `sdk.sendMessage(message, options)`

Send a simple message to Claude.

```javascript
const response = await sdk.sendMessage('Hello Claude!', {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1000
});
```

### `sdk.chat(messages, options)`

Have a conversation with Claude.

```javascript
const response = await sdk.chat([
  { role: 'user', content: 'What is 2+2?' },
  { role: 'assistant', content: '4' },
  { role: 'user', content: 'What is 2+3?' }
]);
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

## Storage Options

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
  storagePath: './tokens.json' // Optional
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

## Examples

See the `examples/` directory for more examples:
- `basic.js` - Simple authentication and message sending
- `authenticate.js` - Manual authentication flow

## Important Notes

- **Max Plan Required**: You need a Claude Max Plan subscription
- **Rate Limits**: Subject to your Max Plan limits (50-200 prompts per 5 hours)
- **Proxy Dependency**: Routes through OpenCode's proxy server

## License

MIT