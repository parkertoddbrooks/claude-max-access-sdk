#!/bin/bash

echo "🔍 Monitoring OpenCode network traffic..."
echo ""
echo "This will capture all HTTPS traffic from OpenCode"
echo "You may need to enter your password for sudo"
echo ""

# Create a simple proxy using mitmproxy if available, or use tcpdump
if command -v mitmproxy &> /dev/null; then
    echo "Using mitmproxy to capture traffic..."
    echo "Start OpenCode in another terminal and use it normally"
    echo ""
    mitmdump -s capture.py --set confdir=~/.mitmproxy
else
    echo "Using tcpdump to capture traffic (requires sudo)..."
    echo "This will capture all traffic on port 443 (HTTPS)"
    echo ""
    echo "Press Ctrl+C to stop monitoring"
    echo ""

    # Capture HTTPS traffic and filter for anthropic
    sudo tcpdump -i any -A -s 0 'tcp port 443 and (host api.anthropic.com or host console.anthropic.com or host claude.ai)' 2>/dev/null | grep -E "authorization:|Bearer |POST |GET |anthropic-"
fi