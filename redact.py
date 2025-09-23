#!/usr/bin/env python3
"""
mitmproxy addon to redact sensitive tokens from logs
Usage: mitmproxy -s redact.py --listen-host 127.0.0.1 --listen-port 8080
"""

from mitmproxy import http

def request(flow: http.HTTPFlow):
    """Redact authorization headers to prevent token leakage"""
    headers_to_redact = [
        "authorization",
        "x-api-key",
        "anthropic-api-key",
        "cookie"
    ]

    for header in headers_to_redact:
        if header in flow.request.headers:
            # Keep header type visible but redact the value
            if "Bearer" in flow.request.headers[header]:
                flow.request.headers[header] = "Bearer [REDACTED]"
            elif "sk-ant-" in flow.request.headers[header]:
                # Show token type but redact the actual token
                prefix = flow.request.headers[header][:12]  # e.g. "sk-ant-oat01"
                flow.request.headers[header] = f"{prefix}...[REDACTED]"
            else:
                flow.request.headers[header] = "[REDACTED]"

def response(flow: http.HTTPFlow):
    """Log the endpoint that was hit"""
    print(f"\n🎯 Endpoint traced:")
    print(f"   Host: {flow.request.pretty_host}")
    print(f"   Path: {flow.request.path}")
    print(f"   Method: {flow.request.method}")
    print(f"   Status: {flow.response.status_code}")