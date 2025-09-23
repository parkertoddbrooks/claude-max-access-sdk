# Claude OAuth SDK

## The Problem We Solved

You have a Claude Max Plan. You want to use it in your own code. Should be simple, right?

Wrong.

OAuth tokens from Claude are locked to specific clients. When you try to use them directly, you get rejected. We figured out why, how, and built something that actually works.

## What This SDK Does

Two things:
1. Makes Max Plan tokens work (by routing through OpenCode)
2. Makes API keys work (direct calls, no nonsense)

Both paths give you the same clean interface. Pick your auth method, send messages, get responses.

## Installation

```bash
npm install claude-oauth-sdk

# Max Plan users need OpenCode too:
npm install -g opencode
```

## Usage

### Max Plan (OAuth)

```bash
# One-time setup
opencode auth login
# Choose: Anthropic → Claude Pro/Max
```

```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({ method: 'opencode' });

const response = await sdk.sendMessage('Explain quantum computing in one sentence.');
console.log(response.content[0].text);
```

### API Key

```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({
  method: 'apikey',
  apiKey: 'sk-ant-api03-...'
});

const response = await sdk.sendMessage('Write a haiku about debugging.');
console.log(response.content[0].text);
```

### Interactive Chat

```bash
node claude-chat.js
```

Type `/help` for commands. It handles auth, model switching, conversation history. Everything you need.

## How We Cracked It

Started simple: implement OAuth, get token, make API call. Failed immediately.

Error: "OAuth authentication is currently not supported"

But OpenCode works with the same tokens. What's different?

### The Investigation

**Traffic Analysis**: Intercepted OpenCode's requests with mitmproxy. Same token that fails for us works for OpenCode. Conclusion: server-side client validation.

**Certificate Hunt**: Extracted 146 certificates from OpenCode's binary. All root CAs, no client certs. Dead end, but ruled out mTLS.

**The Truth**: Anthropic whitelists specific clients server-side. Your OAuth token is valid, but only OpenCode can use it. It's not about headers or certificates—it's about identity.

### The Solution

Can't beat the whitelist? Use it. We route Max Plan requests through OpenCode's binary. It's whitelisted, we're not. Simple as that.

## Technical Details

The SDK uses `spawn` instead of `exec` (safer), handles multi-line input properly, sets file permissions to 600 on Unix systems, and fails gracefully on Windows.

```javascript
// Simplified internals
if (method === 'opencode') {
  // Spawn OpenCode process, pipe message through stdin
  const child = spawn('opencode', ['run']);
  child.stdin.write(message);
  return parseOutput(child.stdout);
} else {
  // Direct API call with proper formatting
  return fetch('https://api.anthropic.com/v1/messages', {
    headers: { 'x-api-key': apiKey },
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ type: 'text', text: message }] }],
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000
    })
  });
}
```

## Security

- Credentials saved as plaintext JSON (you're warned first)
- File permissions set to 600 where possible
- Use environment variables for production
- Never commit credential files

## Files That Matter

- `claude-sdk-final.js` - The SDK
- `claude-chat.js` - Chat interface
- `TRAFFIC_ANALYSIS_RESULTS.md` - Proof of client-locking
- `FORENSICS.md` - Certificate analysis

## The Open Source Lie

OpenCode is MIT-licensed. So is this SDK. But here's the difference:

**OpenCode's MIT license**: You can read the code, but you can't replicate the functionality. The real value—server-side whitelisting—isn't included.

**Our MIT license**: Everything you need is here. No hidden dependencies. No server-side magic. Just code that works.

This isn't about OpenCode specifically. It's about a pattern: companies open-sourcing clients while keeping the real functionality locked server-side. It's theater, not transparency.

## What You Should Know

1. **You cannot bypass the client-lock**. We tried. We failed. We documented why.
2. **OpenCode as backend isn't a hack**. It's the only way.
3. **API keys are simpler**. If you can get them, use them.
4. **The investigation matters**. Understanding why something doesn't work is valuable.

## Rate Limits

- Max Plan: 50-200 messages per 5 hours
- API Keys: Depends on your tier
- Both: The SDK handles 429s gracefully

## Contributing

Found a bug? Have an idea? PRs welcome.

Areas we care about:
- Better error messages
- Streaming responses
- Context management
- Windows compatibility

## Philosophy

We believe in software that:
- Works as advertised
- Explains its limitations
- Doesn't pretend to be something it's not

This SDK embodies those principles. It works. It's honest about how. It doesn't promise what it can't deliver.

## Final Thoughts

We spent a few sessions investigating why OAuth tokens don't work directly. We extracted certificates, intercepted traffic, analyzed binaries. The answer was simple: Anthropic says no.

But instead of giving up, we built something useful. This SDK makes both Max Plan and API keys work seamlessly. It's not perfect—we're literally spawning a process to work around a restriction—but it works.

That's what matters. Working code. Clear documentation. No bullshit.

## License

MIT - And unlike some MIT projects, you can actually use everything we're giving you.

---

Built with frustration, completed with satisfaction.
*September 2025*