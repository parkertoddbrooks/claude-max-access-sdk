# Diagnostics: Tracing OpenCode's Actual Endpoint

## The Discovery

Through our investigation, we confirmed that OpenCode hits a **different endpoint** than the public API. OAuth tokens work at Claude Code's backend, not `/v1/messages`.

## How to Trace OpenCode's Endpoint

### Method 1: HTTPS Proxy Interception

#### Setup
```bash
# Install mitmproxy
brew install mitmproxy

# Create redaction script to avoid logging tokens
cat > redact.py << 'EOF'
from mitmproxy import http

def request(flow: http.HTTPFlow):
    if "authorization" in flow.request.headers:
        flow.request.headers["authorization"] = "[REDACTED]"
EOF

# Run proxy
mitmproxy -s redact.py --listen-host 127.0.0.1 --listen-port 8080
```

#### Trace OpenCode
```javascript
const { spawn } = require('child_process');

function traceOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('opencode', ['run'], {
      env: {
        ...process.env,
        HTTPS_PROXY: 'http://127.0.0.1:8080',
        // OpenCode might need:
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
      }
    });

    let output = '';
    child.stdout.on('data', d => output += d);
    child.on('close', code => {
      if (code === 0) resolve(output);
      else reject(new Error(`Exit code ${code}`));
    });

    child.stdin.write(prompt + '\n');
    child.stdin.end();
  });
}

// Run trace
traceOpenCode('diagnostic: respond OK')
  .then(() => console.log('Check mitmproxy for endpoint'))
  .catch(console.error);
```

### Method 2: Network Monitoring (if TLS pinning blocks proxy)

```bash
# macOS: Watch network connections
sudo lsof -i -n | grep opencode

# Or use tcpdump to see hostnames
sudo tcpdump -i any -n host api.anthropic.com or host api.claude.ai

# Or use nettop (macOS)
nettop -P opencode
```

### Method 3: Process Tracing

```bash
# Linux: Use strace
strace -e trace=network -s 10000 opencode run

# macOS: Use dtruss (requires SIP disabled)
sudo dtruss -f -t connect opencode run
```

## What We Found

Based on our testing, OpenCode likely hits one of:
- A private Claude Code API endpoint (not `/v1/messages`)
- A special OAuth-enabled variant of the messages endpoint
- An internal service that validates against Claude Code's client ID

The exact endpoint doesn't matter for our SDK because:
1. We can't call it directly (not whitelisted)
2. It could change without notice
3. Using it would violate ToS

## Improved OpenCode Integration

### Current Implementation (Shell-based)
```javascript
// Current - uses shell with escaping
exec(`echo "${message}" | opencode run`, callback);
```

### Improved Implementation (Direct spawn)
```javascript
// Better - no shell injection risk
function callOpenCode(message) {
  return new Promise((resolve, reject) => {
    const child = spawn('opencode', ['run'], {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => stdout += chunk);
    child.stderr.on('data', chunk => stderr += chunk);

    child.on('close', code => {
      if (code === 0) {
        // Clean ANSI codes and format
        const cleaned = stdout
          .replace(/\x1b\[[0-9;]*m/g, '')
          .replace(/\[0m/g, '')
          .trim();
        resolve(cleaned);
      } else {
        reject(new Error(stderr || `Exit code ${code}`));
      }
    });

    // Write to stdin instead of using echo
    child.stdin.write(message);
    child.stdin.end();
  });
}
```

## SDK Diagnostic Mode

Add to `claude-sdk-final.js`:

```javascript
class ClaudeSDK {
  async runDiagnostics() {
    console.log('🔍 Running diagnostics...\n');

    // 1. Check OpenCode installation
    try {
      await execPromise('which opencode');
      console.log('✅ OpenCode installed');
    } catch {
      console.log('❌ OpenCode not found');
      return;
    }

    // 2. Check OpenCode auth
    try {
      const { stdout } = await execPromise('opencode auth list');
      if (stdout.includes('Anthropic')) {
        console.log('✅ OpenCode authenticated');
      } else {
        console.log('❌ OpenCode not authenticated');
      }
    } catch (e) {
      console.log('❌ Could not check auth:', e.message);
    }

    // 3. Test connection (optional proxy)
    if (process.env.TRACE_OPENCODE) {
      console.log('📡 Tracing mode enabled (check proxy)');
      process.env.HTTPS_PROXY = 'http://127.0.0.1:8080';
    }

    try {
      const response = await this.sendViaOpenCode('diagnostic: respond OK');
      console.log('✅ OpenCode connection works');

      if (process.env.TRACE_OPENCODE) {
        console.log('📋 Check mitmproxy for endpoint details');
      }
    } catch (e) {
      console.log('❌ OpenCode call failed:', e.message);
    }
  }
}
```

## Usage

```bash
# Normal usage
node claude-chat.js

# With diagnostics
TRACE_OPENCODE=1 node claude-chat.js --diagnostics

# Check proxy output to see actual endpoint
```

## Key Findings

1. **OAuth tokens are audience-locked** to Claude Code's backend
2. **OpenCode is whitelisted** at the service level, not just OAuth
3. **The endpoint differs** from public `/v1/messages`
4. **Direct calls will fail** even with valid tokens
5. **OpenCode as proxy** is the only stable solution

## Security Notes

- Never log full tokens
- Use process spawn instead of shell execution
- Validate and sanitize all inputs
- Keep diagnostic mode optional and explicit
- Don't persist discovered endpoints (they're private and could change)

## Conclusion

While we can trace the exact endpoint OpenCode uses, it doesn't change our approach. The SDK must use OpenCode as a backend because:
- We're not whitelisted
- The endpoint is private/internal
- Direct usage would violate ToS
- It could change without notice

The diagnostic capability helps understand what's happening but doesn't provide a way around the fundamental restriction.

---

*This diagnostic guide accompanies the Claude OAuth SDK investigation.*