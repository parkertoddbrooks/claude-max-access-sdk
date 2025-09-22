# Product Requirements Document: Claude OAuth SDK

## Executive Summary

The Claude OAuth SDK is a lightweight Node.js library that enables developers to authenticate with Claude Code's Max Plan using standard OAuth 2.0 PKCE flow and make API requests to Anthropic's endpoints. This SDK provides a clean, bug-free alternative to existing solutions while adhering to standard developer practices and OAuth protocols.

## Background & Context

### Problem Statement
Developers with Claude Max Plan subscriptions want to use their allocated resources (50-200 prompts per 5 hours) in custom applications beyond the official Claude Code CLI. Current solutions like OpenCode have bugs including:
- Authentication migration failures
- Silent rate limit freezes
- UI/integration glitches
- Provider/model inconsistencies

### Opportunity
By implementing standard OAuth 2.0 protocols with PKCE flow, we can provide developers a reliable way to:
- Access Claude models (Opus, Sonnet) through their Max Plan subscription
- Build custom integrations (web apps, scripts, automation)
- Avoid the complexity and bugs of existing solutions
- Follow standard developer practices without reverse engineering

## Goals & Objectives

### Primary Goals
1. **Enable OAuth Authentication**: Implement standard OAuth 2.0 PKCE flow for Claude Max Plan
2. **Provide Simple API Access**: Offer clean methods for making requests to Claude's API
3. **Ensure Reliability**: Handle token refresh, rate limits, and errors gracefully
4. **Maintain Simplicity**: Keep the SDK minimal and easy to understand

### Success Metrics
- Zero authentication failures when following standard flow
- <100ms overhead on API requests
- <500 lines of core code
- 100% test coverage for critical paths
- Clear documentation with working examples

## User Personas

### Primary User: Individual Developer
- Has Claude Max Plan subscription
- Wants to build custom tools/integrations
- Familiar with Node.js and OAuth concepts
- Values simplicity and reliability over features

### Secondary User: Small Team/Startup
- Needs to integrate Claude into internal tools
- Has limited engineering resources
- Requires clear documentation and examples
- Concerned about ToS compliance

## Technical Requirements

### Core Functionality

#### 1. Authentication Module (Manual Code Input - Like Claude Code)
- **OAuth 2.0 PKCE Implementation**
  - Generate code challenge/verifier pairs
  - Build authorization URL with PKCE parameters
  - Open browser to Claude login page
  - **Manual code input**: User copies code from redirect URL
  - Exchange authorization code for tokens
  - Store tokens securely

- **Authentication Flow (Same as Claude Code CLI)**
  1. SDK generates OAuth URL with PKCE challenge
  2. Opens browser to `https://claude.ai/oauth/authorize`
  3. User logs in with Claude account
  4. Browser redirects to `https://console.anthropic.com/oauth/code/callback?code=XXX`
  5. User manually copies the `code` parameter from URL
  6. User pastes code back into the app/terminal
  7. SDK exchanges code for access/refresh tokens

- **Endpoints**
  - Authorization: `https://claude.ai/oauth/authorize`
  - Token Exchange: `https://console.anthropic.com/v1/oauth/token`
  - Redirect URI: `https://console.anthropic.com/oauth/code/callback`

- **Required Parameters**
  - Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
  - Response Type: `code`
  - Code Challenge Method: `S256`

#### 2. API Request Module
- **Request Handling**
  - Add Bearer token authentication
  - Include required beta headers
  - Remove conflicting headers (x-api-key)
  - Handle request/response formatting

- **Headers Configuration**
  ```
  Authorization: Bearer ${access_token}
  anthropic-beta: oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14
  Content-Type: application/json
  ```

#### 3. Token Management
- **Automatic Refresh**
  - Detect expired tokens (401 responses)
  - Refresh using refresh_token
  - Retry failed requests after refresh
  - Handle refresh failures gracefully

#### 4. Rate Limit Handling
- **Max Plan Limits**
  - Track usage within 5-hour windows
  - Provide usage statistics
  - Warn before hitting limits
  - Handle 429 responses appropriately

### Non-Functional Requirements

#### Performance
- Token refresh: <500ms
- API request overhead: <100ms
- Memory footprint: <50MB

#### Security
- No credential storage in code
- Secure token storage options
- PKCE implementation for OAuth security
- No logging of sensitive data

#### Compatibility
- Node.js 16+ support
- CommonJS and ESM module support
- TypeScript definitions included
- Works in server environments

## Architecture & Design

### Module Structure
```
claude-oauth-sdk/
├── src/
│   ├── index.js           # Main SDK entry point
│   ├── auth/
│   │   ├── oauth.js       # OAuth flow implementation
│   │   ├── pkce.js        # PKCE utilities
│   │   └── token.js       # Token management
│   ├── api/
│   │   ├── client.js      # API client
│   │   ├── request.js     # Request handling
│   │   └── headers.js     # Header management
│   └── utils/
│       ├── storage.js     # Token storage
│       └── errors.js      # Error handling
├── examples/
│   ├── basic.js           # Simple usage example
│   ├── manual-auth.js     # Manual code input flow
│   └── web-server.js      # Express server example
├── cli/                   # Demo CLI Application (built after SDK)
│   ├── index.js           # CLI entry point
│   ├── commands/
│   │   ├── auth.js        # Authentication command
│   │   ├── chat.js        # Interactive chat command
│   │   ├── ask.js         # Single query command
│   │   ├── usage.js       # Usage statistics command
│   │   └── logout.js      # Clear tokens command
│   ├── lib/
│   │   ├── config.js      # CLI configuration
│   │   └── prompts.js     # User interaction helpers
│   ├── package.json       # Separate package for CLI
│   ├── README.md          # CLI-specific documentation
│   └── bin/
│       └── claude-cli     # Executable script
├── tests/
│   └── ...                # Test files
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

### Demo CLI Application (claude-cli)

The demo CLI will be built AFTER the SDK is complete to provide a working example and testing tool.

#### Purpose
- **Demonstration**: Show developers how the SDK works in practice
- **Testing**: Allow users to test authentication and API calls before integration
- **Validation**: Verify SDK functionality with real Max Plan accounts
- **Learning**: Provide code examples through a working implementation

#### CLI Commands
```bash
# Install globally
npm install -g @claude-oauth/cli

# Authenticate with Claude Max Plan
claude-cli auth
# -> Opens browser, prompts for code, saves tokens

# Single question
claude-cli ask "What is the capital of France?"
# -> Makes one API call and returns response

# Interactive chat session
claude-cli chat
# -> Starts interactive session with Claude

# Check usage statistics
claude-cli usage
# -> Shows prompts used, time until reset

# Clear stored tokens
claude-cli logout
# -> Removes saved authentication

# Help and version
claude-cli --help
claude-cli --version
```

#### Implementation Details
- Built using Commander.js or Yargs for CLI framework
- Stores tokens in `~/.claude-cli/` directory
- Uses the SDK as a dependency
- Includes spinner/progress indicators for better UX
- Colored output for readability
- Error handling with helpful messages

### API Design

#### SDK Initialization
```javascript
const ClaudeSDK = require('claude-oauth-sdk');
const sdk = new ClaudeSDK({
  storage: 'memory' | 'file' | customStorageAdapter,
  debug: false
});
```

#### Authentication (Manual Code Input Flow - Same as Claude Code/OpenCode)
```javascript
// Primary flow - Manual code input (like Claude Code CLI)
// 1. SDK generates OAuth URL and opens browser
const authUrl = await sdk.startAuth();
console.log('Opening browser to:', authUrl);

// 2. User logs in and gets redirected to:
// https://console.anthropic.com/oauth/code/callback?code=AUTH_CODE_HERE

// 3. User copies the 'code' parameter from the URL
// 4. User pastes it back into the app
const code = await sdk.promptForCode(); // or get from user input
const tokens = await sdk.exchangeCode(code);

// Alternative: All-in-one method with built-in prompt
const tokens = await sdk.authenticate(); // Opens browser & prompts for code
```

#### Making Requests
```javascript
const response = await sdk.request({
  model: 'claude-3.5-sonnet',
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ],
  max_tokens: 1024
});
```

#### Token Management
```javascript
// Check token validity
const isValid = await sdk.isAuthenticated();

// Get current usage
const usage = await sdk.getUsage();

// Manual refresh
await sdk.refreshToken();
```

## Implementation Plan

### Phase 1: Core OAuth Implementation (Week 1)
- [ ] Set up project structure
- [ ] Implement PKCE generation
- [ ] Build OAuth flow
- [ ] Create token exchange
- [ ] Add token storage

### Phase 2: API Client (Week 2)
- [ ] Implement request client
- [ ] Add header management
- [ ] Handle responses
- [ ] Implement error handling
- [ ] Add automatic retry logic

### Phase 3: Token Management (Week 3)
- [ ] Build refresh mechanism
- [ ] Add usage tracking
- [ ] Implement rate limit handling
- [ ] Create storage adapters

### Phase 4: Testing & Documentation (Week 4)
- [ ] Write unit tests
- [ ] Create integration tests
- [ ] Write documentation
- [ ] Create examples
- [ ] Performance optimization

### Phase 5: Demo CLI Application (Week 5)
- [ ] Build interactive CLI using the completed SDK
- [ ] Implement authentication command
- [ ] Add chat/query functionality
- [ ] Include usage tracking command
- [ ] Create installer for global npm installation
- [ ] Write CLI-specific documentation

## Risk Analysis

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Anthropic changes OAuth endpoints | High | Monitor for changes, version SDK |
| Token scope restrictions | Medium | Document limitations, test thoroughly |
| Rate limit changes | Low | Make limits configurable |

### Legal/Compliance Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| ToS interpretation | Medium | Add clear disclaimers, focus on standard OAuth |
| Account suspension | Low | Document as experimental, recommend official API for production |

## Dependencies

### Required NPM Packages
- `axios` or `node-fetch`: HTTP requests
- `pkce-challenge`: PKCE generation
- `open`: Browser opening (optional)

### Development Dependencies
- `jest` or `mocha`: Testing
- `eslint`: Linting
- `prettier`: Formatting

## Success Criteria

### Launch Criteria
- [ ] All core features implemented
- [ ] 90%+ test coverage
- [ ] Documentation complete
- [ ] 3+ working examples
- [ ] Successfully tested with Max Plan account
- [ ] Demo CLI application working and installable
- [ ] CLI demonstrates all SDK features
- [ ] Video or GIF showing CLI in action

### Adoption Metrics (Post-Launch)
- 100+ GitHub stars within 3 months
- 500+ npm downloads/month
- <5 critical bug reports
- Active community contributions

## Timeline

- **Week 1-2**: Core SDK implementation
- **Week 3**: Testing and refinement
- **Week 4**: Documentation and examples
- **Week 5**: Demo CLI application development
- **Week 6**: Beta release (SDK + CLI)
- **Week 7**: Incorporate feedback
- **Week 8**: 1.0 release

## Open Questions

1. Should we support browser environments or focus on Node.js only?
2. Should we implement a proxy server option for production use?
3. How should we handle token persistence across application restarts?
4. Should we add TypeScript as a first-class citizen or just provide definitions?

## Appendix

### OAuth Flow Diagram (Manual Code Input)
```
1. User runs app
2. SDK generates OAuth URL with PKCE
3. SDK opens browser -> claude.ai/oauth/authorize
4. User logs in to Claude
5. Browser redirects to -> console.anthropic.com/oauth/code/callback?code=ABC123
6. User sees redirect page (might be error page - that's ok!)
7. User copies 'ABC123' from the URL
8. User returns to app/terminal
9. App prompts: "Enter the code from the URL:"
10. User pastes: ABC123
11. SDK exchanges code for tokens -> console.anthropic.com/v1/oauth/token
12. SDK can now make API calls with Bearer token
```

This is exactly how Claude Code CLI and OpenCode work - no local server needed!

### Example Error Codes
- `AUTH_FAILED`: OAuth flow failed
- `TOKEN_EXPIRED`: Access token expired
- `RATE_LIMITED`: Hit Max Plan limits
- `INVALID_REQUEST`: Malformed API request

## Document History

- **Version 1.0** - Initial PRD (September 22, 2025)
- **Author**: Parker (with Claude assistance)
- **Status**: Draft

---

*Note: This SDK implements standard OAuth 2.0 protocols and is intended for personal use with valid Claude Max Plan subscriptions. Users should review Anthropic's Terms of Service and use at their own discretion.*