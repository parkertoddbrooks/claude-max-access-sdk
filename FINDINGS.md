# OAuth Token Restrictions - Findings

## Summary
The Claude OAuth tokens obtained through the standard OAuth flow are **restricted to Claude Code CLI only** and cannot be used for general API access, even with the correct headers and implementation.

## What Works
✅ OAuth Authentication Flow
- Successfully authenticate with `claude.ai/oauth/authorize`
- Get valid access tokens (`sk-ant-oat01-...`)
- Get valid refresh tokens (`sk-ant-ort01-...`)
- Tokens have 8-hour expiry

✅ Technical Implementation
- PKCE flow works correctly
- Token exchange works with JSON body containing both `code` and `state`
- Required scopes: `org:create_api_key user:profile user:inference`

## What Doesn't Work
❌ API Access with OAuth Tokens
- API returns: "This credential is only authorized for use with Claude Code"
- This is an application-level restriction, not a technical issue

## OpenCode's Approach
OpenCode (`github.com/sst/opencode`) successfully uses OAuth because:

1. **Special Permission**: They likely have a partnership or special arrangement with Anthropic
2. **Custom Plugin**: Uses `opencode-anthropic-auth@0.0.2` package
3. **Beta Headers**: Includes `oauth-2025-04-20` in anthropic-beta header
4. **Custom Fetch**: Intercepts all API calls to add OAuth tokens

## Key Headers Required
```javascript
{
  'Authorization': 'Bearer ${access_token}',
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
  // x-api-key header must be removed
}
```

## Conclusion
The OAuth flow works perfectly, but the tokens are restricted at the API level. This appears to be intentional by Anthropic to prevent unauthorized use of Max Plan subscriptions outside of their official tools.

### Options:
1. **Use Official API Keys**: Purchase separate API access ($20+/month)
2. **Use Claude Code CLI**: The official supported method
3. **Partnership**: Contact Anthropic for special OAuth access (like OpenCode has)

### Technical Achievement:
Despite the API restriction, we successfully:
- Implemented the complete OAuth flow
- Matched OpenCode's exact implementation
- Proved that the restriction is policy-based, not technical

This SDK could work immediately if Anthropic removes the application restriction or grants special access.