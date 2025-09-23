# OpenCode Traffic Analysis with mitmproxy

## Overview

This guide helps you intercept and analyze OpenCode's HTTPS traffic to understand how it authenticates with Anthropic's API. We'll use mitmproxy to capture the exact headers, TLS fingerprint, and request structure that makes OpenCode work.

## Prerequisites

### Install mitmproxy
```bash
# macOS
brew install mitmproxy

# or with pip
pip install mitmproxy
```

## Setup Instructions

### Step 1: Create a Separate mitmproxy Config Directory

```bash
# Create a dedicated config directory to avoid conflicts
mkdir -p ~/.mitmproxy-opencode
cd /Users/parker/Documents/dev/claude-engineer/_Projects/claude-oauth-sdk
```

### Step 2: Start mitmproxy with the Capture Script

```bash
# Terminal 1: Start the proxy
mitmdump -s mitmproxy-capture.py --set confdir=~/.mitmproxy-opencode
```

The proxy will start on `http://127.0.0.1:8080`

### Step 3: Install the mitmproxy Certificate

```bash
# The certificate is auto-generated on first run
open ~/.mitmproxy-opencode

# Look for mitmproxy-ca-cert.pem and install it:
# macOS: Double-click to add to Keychain, mark as "Always Trust" for SSL
```

### Step 4: Configure OpenCode to Use the Proxy

```bash
# Terminal 2: Set proxy environment variables
export HTTP_PROXY=http://127.0.0.1:8080
export HTTPS_PROXY=http://127.0.0.1:8080

# Optional: If OpenCode refuses due to cert validation
export NODE_TLS_REJECT_UNAUTHORIZED=0  # Use with caution!

# Test OpenCode through the proxy
echo "What is 2+2?" | opencode run
```

## What to Look For

The script captures and logs:

### 1. **Headers** - Most likely culprit
- `User-Agent` - May contain OpenCode version/build info
- `X-*` headers - Custom headers for identification
- `Authorization` - How the OAuth token is sent

### 2. **TLS Details**
- TLS version (1.2 vs 1.3)
- Cipher suite selection
- ALPN negotiation (h2, http/1.1)
- Client certificate (if any)

### 3. **Request Structure**
- Exact API endpoints used
- Request body format
- HTTP version preferences

### 4. **Response Patterns**
- Different error messages
- Rate limiting headers
- Server identification markers

## Analyzing the Capture

After running OpenCode through the proxy, you'll have a file:
```
opencode-traffic-YYYYMMDD-HHMMSS.jsonl
```

### View the captured data:
```bash
# Pretty print the captured traffic
cat opencode-traffic-*.jsonl | jq '.'

# Extract just the headers
cat opencode-traffic-*.jsonl | jq '.headers'

# Look for unique headers
cat opencode-traffic-*.jsonl | jq -r '.headers | keys[]' | sort | uniq
```

## Common Issues and Solutions

### Issue: OpenCode refuses to connect through proxy

**Solution 1**: Certificate pinning detected
```bash
# OpenCode may pin certificates. Try:
export NODE_EXTRA_CA_CERTS=~/.mitmproxy-opencode/mitmproxy-ca-cert.pem
```

**Solution 2**: Binary signature check
- If OpenCode completely refuses proxied connections, it's doing certificate pinning or binary integrity checks
- This itself is valuable information!

### Issue: TLS handshake fails

**Solution**: OpenCode might use specific TLS settings
```bash
# Try different mitmproxy modes
mitmdump -s mitmproxy-capture.py --set confdir=~/.mitmproxy-opencode --set tls_version_client_min=TLS1_2
```

## Comparison with Direct API Calls

Once you have OpenCode's traffic captured, compare with your SDK:

```bash
# Terminal 3: Capture your SDK's traffic
export HTTP_PROXY=http://127.0.0.1:8080
export HTTPS_PROXY=http://127.0.0.1:8080

# Run your SDK
node test-direct-api.js
```

Then use the comparison script to find differences:
```bash
python3 compare-traffic.py opencode-traffic-*.jsonl sdk-traffic-*.jsonl
```

## Key Findings to Document

When you find differences, document:

1. **Unique Headers**
   - Header name and value
   - Whether it changes between requests

2. **TLS Fingerprint**
   - Cipher suite order
   - Extensions present
   - ALPN values

3. **Authentication Method**
   - How tokens are passed
   - Additional authentication fields

4. **Request Patterns**
   - Timing between requests
   - Retry behavior
   - Keep-alive settings

## Security Notes

⚠️ **IMPORTANT**:
- Tokens are automatically redacted in logs
- Don't share raw packet captures
- Reset proxy settings after testing:
  ```bash
  unset HTTP_PROXY HTTPS_PROXY NODE_TLS_REJECT_UNAUTHORIZED
  ```

## Next Steps

After capturing traffic:

1. **If unique headers found** → Try adding them to your SDK
2. **If TLS fingerprint differs** → Consider using a Node.js client that matches
3. **If everything matches** → The restriction is server-side (OAuth audience check)

## Alternative: System-Level Tracing

If mitmproxy doesn't work due to certificate pinning:

```bash
# macOS: Use dtruss (requires sudo)
sudo dtruss -f -t connect opencode run < test.txt 2>&1 | grep -E "connect|SSL"

# Linux: Use strace
strace -f -e connect,socket opencode run < test.txt 2>&1 | grep -i "anthropic\|443"
```

---

*Remember: The goal is to understand OpenCode's authentication mechanism, not to bypass security. Use findings to improve documentation and inform Anthropic about SDK needs.*