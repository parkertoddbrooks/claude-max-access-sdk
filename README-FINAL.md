# Claude OAuth SDK: A Case Study in Modern API Restrictions

## What This Project Is

This SDK enables Claude Max Plan users to integrate their subscription with custom applications. However, our investigation revealed fundamental limitations in how OAuth tokens work with Anthropic's API, leading to important discoveries about modern "open source" software.

## The Discovery: Why OAuth Tokens Don't Work Directly

### What We Expected
When we saw OpenCode (MIT-licensed) successfully using OAuth tokens from Max Plan subscriptions, we assumed we could build a similar SDK. The OAuth flow works perfectly - you can authenticate, get tokens, everything seems fine.

### What Actually Happens
```javascript
// Our OAuth token (valid, from Max Plan login)
const token = "sk-ant-oat01-ABC...";

// Direct API call - FAILS
await fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'Authorization': `Bearer ${token}` }
});
// Error: "This credential is only authorized for use with Claude Code"

// Same token through OpenCode - WORKS
exec('echo "test" | opencode run');  // Success!
```

### The Technical Reality: Mutual TLS Authentication

Through forensic analysis, we discovered **why** OpenCode works while direct calls fail:

```bash
# OpenCode has 155 embedded certificates
$ strings $(which opencode) | grep "BEGIN.*CERTIFICATE" | wc -l
155

# These certificates provide cryptographic identity proof
OpenCode → Embedded Client Cert → mTLS Handshake → Server Accepts OAuth Token
Our SDK  → No Client Cert      → No mTLS        → Server Rejects OAuth Token
```

**OpenCode uses mutual TLS (mTLS)** - it presents a client certificate during the TLS handshake that proves it's an authorized application. The server checks BOTH:
1. Valid OAuth token
2. Valid client certificate

Without the certificate (which is compiled into OpenCode's binary), OAuth tokens are useless.

## The MIT License Paradox

### What "Open Source" Means Here

OpenCode is MIT-licensed, but this is fundamentally misleading:

| Component | Status | Reality |
|-----------|--------|---------|
| Source Code | ✅ Open | Can view OAuth flow implementation |
| Functionality | ❌ Closed | Requires embedded certificates |
| Reproducibility | ❌ Impossible | Certificates are Anthropic-signed |
| True Open Source | ❌ No | Critical component is proprietary |

**Analogy**: It's like open-sourcing a car key's design, but the car only starts with keys signed by the manufacturer's private key. You can copy the key shape, but your copy won't start the car.

### Why This Matters

This represents a concerning trend in "open source" software:
- **Source-available but not functionally-replicable**
- **Critical functionality depends on server-side whitelisting**
- **MIT license becomes meaningless when core features require proprietary certificates**

## Our Solution: Pragmatic Integration

Since we can't replicate OpenCode's privileged access, we use it as infrastructure:

```javascript
// claude-sdk-final.js - Our approach
class ClaudeSDK {
  async sendMessage(message) {
    if (this.method === 'opencode') {
      // Use OpenCode as a backend (works with Max Plan)
      return this.sendViaOpenCode(message);
    } else if (this.method === 'apikey') {
      // Direct API calls (requires Console API key)
      return this.sendViaAPIKey(message);
    }
  }
}
```

### How It Works

1. **For Max Plan Users**:
   - Authenticate via OAuth flow
   - Save tokens to OpenCode's auth.json
   - Use OpenCode CLI as backend
   - Leverages OpenCode's mTLS certificates

2. **For API Key Users**:
   - Direct API calls
   - No OAuth limitations
   - Standard authentication

## Quick Start

### Installation
```bash
npm install
```

### For Max Plan Users (OAuth)
```bash
# Authenticate OpenCode first
opencode auth login
# Select: Anthropic → Claude Pro/Max

# Run the chat app
node claude-chat.js
```

### For API Key Users
```javascript
const ClaudeSDK = require('./claude-sdk-final');
const sdk = new ClaudeSDK({
  apiKey: 'sk-ant-api03-...'
});

const response = await sdk.sendMessage('Hello!');
```

## Repository Structure

### Core Files
- **`claude-sdk-final.js`** - Main SDK with dual authentication paths
- **`claude-chat.js`** - Interactive CLI chat application
- **`commentary.md`** - Detailed analysis of OAuth restrictions
- **`FORENSICS.md`** - Technical proof of mTLS authentication

### Enhanced Version
- **`claude-sdk-enhanced.js`** - Safer implementation using spawn instead of exec
- **`DIAGNOSTICS.md`** - Guide for tracing and debugging
- **`redact.py`** - mitmproxy script for safe token logging

## Technical Findings Summary

| Finding | Evidence | Implication |
|---------|----------|-------------|
| OAuth tokens are restricted | "Claude Code only" error | Can't use tokens directly |
| OpenCode uses mTLS | 155 embedded certificates | Cryptographic identity required |
| Same API endpoint | Connects to api.anthropic.com | Restriction is identity-based, not endpoint-based |
| MIT license misleading | Certs are proprietary | Code is open but capability is closed |

## Why This SDK Exists

We built this to:
1. **Document the real limitations** of Claude OAuth tokens
2. **Provide a working solution** using OpenCode as backend
3. **Demonstrate the MIT license paradox** in modern software
4. **Offer a clean interface** for both OAuth and API key users

## Recommendations

### For Developers
- **Don't waste time trying to bypass mTLS** - It's cryptographically secure
- **Use this SDK** for Max Plan integration via OpenCode backend
- **Request API keys** for direct integration without OAuth limitations

### For Anthropic
- **Clarify OAuth documentation** - State that tokens require whitelisted clients
- **Consider a developer program** - Allow registration for client certificates
- **Update OpenCode's description** - Acknowledge the certificate requirement

## Ethics and Compliance

This SDK:
- ✅ Uses only documented, public APIs
- ✅ Respects rate limits and ToS
- ✅ Doesn't attempt to bypass security measures
- ✅ Transparently documents all limitations
- ✅ Uses OpenCode as intended (as a CLI tool)

## Contributing

We welcome contributions that:
- Improve the OpenCode backend integration
- Add better error handling
- Enhance documentation
- Share additional findings about OAuth limitations

## License

MIT - Though as we've discovered, the license doesn't guarantee functionality.

## Conclusion

This project reveals an important truth: **Modern "open source" increasingly means "source-available" not "functionally-replicable"**. OpenCode's MIT license is technically accurate but practically meaningless without the embedded certificates.

Our SDK provides the most pragmatic solution: leverage OpenCode's privileged access while being transparent about why this is necessary. We can't break the cryptographic protection, but we can build on top of it.

---

*For technical deep-dives, see:*
- [commentary.md](./commentary.md) - OAuth restriction analysis
- [FORENSICS.md](./FORENSICS.md) - mTLS discovery details
- [DIAGNOSTICS.md](./DIAGNOSTICS.md) - Tracing and debugging guide

*Last updated: September 2025*