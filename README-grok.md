# Claude Max Access SDK

A lightweight Node.js SDK for Claude Max Plan and Anthropic Console users, enabling seamless API access via OpenCode's CLI (for OAuth) or direct API keys. This project uncovers why OAuth tokens are restricted and provides a practical workaround.

## Why This SDK?

Claude Max Plan offers 50–200 prompts per 5 hours, ideal for cost-conscious developers, but OAuth tokens are restricted to Anthropic’s whitelisted apps (e.g., OpenCode). API keys from Anthropic Console provide unrestricted access but require a paid plan. This SDK bridges both paths, letting you:
- Use Max Plan OAuth tokens via OpenCode’s whitelisted CLI.
- Make direct API calls with Console API keys.
- Interact via an intuitive CLI with model switching and chat history.

## The Investigation: OAuth Limitations

We aimed to build a standard OAuth 2.0 PKCE SDK for Claude Max Plan, but discovered:
- **OAuth Works, But Is Restricted**: The PKCE flow generates valid `sk-ant-oat01-*` tokens, but direct API calls fail with: `"This credential is only authorized for use with Claude Code."`
- **Whitelisting Is the Culprit**: Anthropic’s servers enforce client-specific access. Mitmproxy traces showed tokens succeeding via OpenCode’s binary but failing elsewhere, likely due to User-Agent or TLS checks. No client certificates were found in OpenCode’s binary (146 PEM blocks analyzed).
- **OpenCode’s MIT Paradox**: OpenCode’s MIT-licensed source suggests full reusability, but functionality depends on Anthropic’s proprietary whitelist. You can copy the code, but not the capability—challenging the “open source” spirit.

Our solution: Proxy Max Plan requests through OpenCode’s CLI or use API keys for direct access.

## Installation

```bash
npm install claude-oauth-sdk
# For Max Plan (OAuth) users, also install:
npm install -g opencode
```

## Quick Start

### Option 1: Max Plan via OpenCode

Authenticate OpenCode first:
```bash
opencode auth login
# Select: Anthropic → Claude Pro/Max
```

Then use the SDK:
```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({ method: 'opencode' });
const response = await sdk.sendMessage('Hello, Claude!');
console.log(response.content[0].text);
```

### Option 2: Anthropic Console API Key

Get your API key from [Anthropic Console](https://console.anthropic.com).
```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({
  method: 'apikey',
  apiKey: process.env.ANTHROPIC_API_KEY
});
const response = await sdk.sendMessage('What is 2+2?');
console.log(response.content[0].text); // 4
```

### Interactive Chat CLI

Run the CLI for an interactive experience:
```bash
npm run chat
# or
node claude-chat.js
```

Features:
- **Commands**: `/auth` (set up OAuth or API key), `/model` (switch between Sonnet, Opus, Haiku), `/clear` (reset history), `/help`, `/exit`.
- Auto-detects credentials (OpenCode or API key).
- Maintains chat history for context-aware conversations.

## How It Works

- **Max Plan (OAuth)**: The SDK runs the OAuth PKCE flow, saves tokens in OpenCode’s format (`~/.local/share/opencode/auth.json`), and pipes requests through `opencode run` using `spawn` for safe, multi-line prompt handling.
- **API Key**: Makes direct HTTPS calls to `https://api.anthropic.com/v1/messages` with structured `content` blocks, no extra glue needed.
- **CLI**: Built on the SDK, offering a user-friendly interface with error handling and progress indicators (e.g., “Claude is thinking...”).

## Security Notes

- Tokens are stored in plaintext JSON (`claude-api-key.json` or OpenCode’s `auth.json`). The SDK prompts before saving and sets `0600` permissions on Unix-like systems.
- For production, use environment variables or external secret stores (e.g., AWS Secrets Manager).
- Review Anthropic’s [Terms of Service](https://www.anthropic.com/legal/terms) to ensure compliance.

## Troubleshooting

- **OpenCode Fails**: Run `opencode auth login` first. Update OpenCode (`npm update -g opencode`) if issues persist.
- **Rate Limits**: Max Plan allows 50–200 prompts per 5 hours. The SDK retries on 429 errors.
- **Invalid Tokens**: Use `/auth` in the CLI to re-authenticate.
- **Windows Users**: OpenCode CLI is tested on Unix-like systems (Linux, macOS). Windows may require extra configuration.

## Technical Details

See these files for in-depth analysis:
- `FORENSICS.md`: Certificate extraction from OpenCode’s binary.
- `TRAFFIC_ANALYSIS_RESULTS.md`: Mitmproxy comparison of OpenCode vs. direct requests.
- `commentary.md`: Full investigation into OAuth restrictions and the MIT license paradox.

## The MIT License Question

OpenCode’s MIT license promises code reusability, but Anthropic’s server-side whitelisting locks functionality to its binary. This SDK, also MIT-licensed, is transparent: you can reuse our code, but Max Plan access requires OpenCode’s CLI due to Anthropic’s restrictions. We ask: when “open source” clients depend on closed server trust, is the license’s promise fulfilled? Our code and research are shared freely, but true openness requires Anthropic to loosen control.

## Requirements

- **Max Plan (OAuth)**: Claude Max Plan subscription, OpenCode CLI (`npm install -g opencode`), authenticated via `opencode auth login`.
- **API Key**: Anthropic Console account with a valid API key.
- **Node.js**: Version 16+ (CommonJS/ESM supported).

## License

MIT

## Contributing

We welcome feedback and contributions! Check our [GitHub repo](https://github.com/your-repo) for issues or PRs. Share thoughts on X about open-source API restrictions to spark discussion.