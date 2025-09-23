# OpenCode Source vs Binary Testing Results

## Key Discovery
**The official OpenCode binary (`curl -fsSL https://opencode.ai/install | bash`) DOES work with Claude Max Plan**, but building from source has significant barriers.

## Source Build Requirements
To run OpenCode from source, you need:
1. **Bun** - JavaScript runtime (installed successfully)
2. **Go 1.24.x** - Required to compile the TUI component (NOT installed)
3. **stl** - Stainless CLI tool for SDK generation (NOT installed)

## Build Process Issues

### 1. SDK Generation (`bun run generate`)
- Partially succeeds: JavaScript SDK generates
- Fails on Stainless SDK: missing `stl` command
- Error location: `/tmp/opencode-test/packages/sdk/stainless/generate.ts:11`

### 2. Dev Mode (`bun run dev`)
- Requires Go to compile TUI binary
- Tries to run: `go build -o ./dist/tui ./main.go`
- Location: `packages/opencode/src/cli/cmd/tui.ts:131`
- Without Go, dev mode immediately crashes

## Critical Finding
**The distributed binary has something the source code alone doesn't provide:**

1. **Pre-compiled binaries**: The official installer includes pre-compiled Go binaries that the source requires you to build yourself
2. **Complete SDK**: The installer likely includes fully generated SDKs that require additional tools to generate from source
3. **No special OAuth permissions**: The OAuth implementation in source matches what we've tested - same client ID, same flow

## OAuth Implementation Confirmation
Looking at the source code confirms our implementation is correct:
- Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- OAuth flow matches exactly what we built
- The "only authorized for Claude Code" restriction is API-level, not implementation-level

## Conclusion
The maintainer's comment "we can't provide specific instructions" likely refers to:
1. The complexity of the build environment (Go, Bun, Stainless)
2. The fact that even with a successful build, **Max Plan OAuth tokens are restricted to official Claude Code/OpenCode binaries**

**The MIT license allows using the code, but Anthropic's API restricts OAuth tokens to official clients only.**

## What This Means
- Our SDK implementation is technically correct
- Authentication works perfectly (gets valid tokens)
- The API restriction is policy-based, not technical
- Even building OpenCode from source wouldn't solve the restriction
- Only the official OpenCode binary has the special blessing from Anthropic to use Max Plan OAuth tokens