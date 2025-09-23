# Claude Max Access SDK: Investigation & Usage Guide

  ## Study at a Glance
  - Goal: let Claude Max Plan subscribers reuse their OAuth tokens in custom applications.
  - Reality: the tokens are bound to whitelisted clients; direct calls return “OAuth authentication is currently not supported.”
  - Result: an SDK that keeps the standard API-key path, and for Max Plan users transparently leans on the opencode CLI, a client
  Anthropic currently accepts with those OAuth tokens.

  ## What We Learned
  1. **PKCE flow works end-to-end.** We can trigger the official OAuth sequence, exchange codes, and receive valid `sk-ant-oat01-*` tokens.
  2. **Certificates aren’t the differentiator.** Extracting 146 PEM blocks from the opencode binary showed only public root CAs—no Anthropic-
  issued client certificates.
  3. **Traffic tells the story.** Mitmproxy traces showed the same OAuth token succeeding through opencode and failing from our own client. User-
  Agent strings, TLS fingerprints, or other server-side checks identify approved binaries.
  4. **Client identity is enforced server-side.** opencode’s binary is effectively on a whitelist. Anything else must use Anthropic Console API
  keys.

  ## Architecture in Practice
  - **opencode pathway (Max Plan OAuth):** we hand opencode the OAuth tokens in its native `auth.json`, stream prompts through `opencode run`,
  and parse the CLI output. The SDK now uses `spawn` to avoid shell quoting pitfalls and to support multi-line prompts.
  - **API key pathway (Console access):** standard HTTPS calls to `https://api.anthropic.com/v1/messages`, now formatted with Claude’s structured
  `content` blocks so direct API usage works without additional glue code.

  ## Getting Started
  ### Installation
  ```bash
  npm install claude-oauth-sdk
  # Optional, required for the Max Plan route:
  npm install -g opencode
  ```

  ### Option 1 – Max Plan via opencode
  ```bash
  opencode auth login       # Authenticate the CLI once
  ```
  ```javascript
  const ClaudeSDK = require('claude-oauth-sdk');
  const sdk = new ClaudeSDK({ method: 'opencode' });

  const response = await sdk.sendMessage('Hello, Claude!');
  console.log(response.content[0].text);
  ```

  ### Option 2 – Anthropic Console API Key
  ```javascript
  const ClaudeSDK = require('claude-oauth-sdk');
  const sdk = new ClaudeSDK({ method: 'apikey', apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await sdk.sendMessage('Quick status update, please.');
  console.log(response.content[0].text);
  ```

  ### Interactive Chat
  ```bash
  npm run chat
  # or
  node claude-chat.js
  ```
  The CLI auto-detects existing credentials, offers either authentication flow, and writes saved tokens with `0600` permissions on Unix-like
  systems.

  ## Security Notes
  - Stored credentials stay in plaintext JSON; the SDK prompts before saving and tightens file permissions where the OS allows.
  - For long-running deployments, environment variables or external secret stores remain recommended.

  ## Reference Materials
  - `FORENSICS.md` – certificate extraction results
  - `TRAFFIC_ANALYSIS_RESULTS.md` – mitmproxy comparisons of opencode vs. direct requests

  ## MIT License, then and now
  opencode ships under MIT, yet the actual capability hinges on Anthropic’s server accepting only its signed client. The code is available,
  but the trust relationship is not. That tension invites a broader question: when we publish permissively licensed clients that rely on closed
  server whitelists, what value does the license convey by itself? In this project, we kept the same MIT terms while documenting the gap; using
  the license to share tooling and research, even though the upstream gate remains closed. MIT’s promise of reuse still matters, but only when
  paired with infrastructure that lets others exercise that promise.