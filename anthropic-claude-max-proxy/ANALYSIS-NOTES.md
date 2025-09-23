# OAuth Direct Access Analysis

## Quick Summary

- **HANDSHAKE-DISCOVERY.md** documents the "handshake" idea: replicate the exact request shape (special anthropic-beta flags + UA + query param) to make OAuth tokens work directly.
- **claude-oauth-direct.js** is a working test harness that implements that approach (PKCE auth, stores tokens, then calls /v1/messages with the special headers / UA / optional ?beta=true).
- **claude-oauth-tokens.json** shows a real token was obtained (sk-ant-oat01…), with refresh token and organization/account metadata — i.e., the OAuth flow works and produces usable tokens under some conditions.

## What the Direct Approach is Doing (Concrete)

- It runs a standard PKCE OAuth flow and exchanges a code for sk-ant-oat01-... tokens.
- When calling the API it tries to "look like" a whitelisted client by:
  - adding `anthropic-beta: <comma-separated beta flags>` header,
  - spoofing `User-Agent: Claude-Code/1.0.0` (or opencode/1.0.0),
  - trying `https://api.anthropic.com/v1/messages?beta=true` as a variant.

## Why This Sometimes Works (and Why It's Fragile)

- **Why it can work**: servers often perform behavioral checks (UA, specific headers, query flags) and accept tokens when a request resembles a whitelisted client. The repo's code reproduces those signals and so sometimes gets accepted.
- **Why it's brittle / short-lived**: Anthropic can (and has) tightened validation to enforce token audience, binary identity, TLS fingerprints, or other server-side checks. Your earlier forensic/traffic work already showed the server differentiates clients even at the same endpoint. That means this request-forgery approach can break at any time (and apparently has been patched in recent infra).

## Real Risks and Cautions

1. **ToS / policy risk**. Intentionally mimicking client identity to use private endpoints can violate Anthropic's terms. The repo author likely intended it as an educational / local-proxy solution, but it's risky to use in production or share widely.
2. **Security hygiene**. claude-oauth-tokens.json stores tokens in plaintext — don't leave that in repos or shared machines. Rotate and secure refresh tokens.
3. **Fragility / maintenance cost**. Minor server tweaks (new required header, token audience check, TLS fingerprint change) will break the approach. That's high operational debt.

## Recommendation — What You Should Do Instead

- **Primary**: Keep the approach you've already built into the Claude Max Access SDK: OAuth path → OpenCode/local official client bridge, API-key path → direct POST /v1/messages. That's stable, transparent, and defensible. (Your SDK already does this well.)
- **Secondary / experimental**: Keep claude-oauth-direct.js as a research/testing artifact only (document it clearly as experimental, ephemeral, and possibly ToS-violating). If you publish it, include explicit warnings and remove auto-storing of tokens in plaintext.
- **Vendor route**: Use your diagnostics (binary hash, JA3, redacted traces) and send a reproducible report to Anthropic asking for an official dev pathway or whitelisting for your SDK. That's the only long-term, legitimate path to "pure OAuth → public API."

## Concrete Next Steps

- **A**. Add a short experimental disclaimer section to claude-oauth-direct.js and remove plaintext token storage (or encrypt it).
- **B**. Draft the vendor email with the exact reproducible artifacts (sha256 of opencode / claude-oauth-direct.js trace data + ja3 + redacted request/response) for Anthropic.
- **C**. Create a README addendum marking claude-oauth-direct.js as research only, with clear legal/ToS warnings and safer storage examples for tokens.

## One-line Verdict

The direct "handshake" forgery approach is insightful and useful for research, but unreliable and risky for production — the robust, ethical path is to either (a) use the official OpenCode CLI as a local bridge or (b) work with Anthropic to get an official whitelist for your SDK.