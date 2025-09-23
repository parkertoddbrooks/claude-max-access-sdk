#!/usr/bin/env python3
"""
mitmproxy script for capturing and analyzing OpenCode traffic
Safely redacts sensitive tokens while preserving request structure

Usage:
    mitmdump -s mitmproxy-capture.py --set confdir=~/.mitmproxy-opencode

Then in another terminal:
    export HTTPS_PROXY=http://127.0.0.1:8080
    export HTTP_PROXY=http://127.0.0.1:8080
    opencode run < test.txt
"""

import json
import re
from datetime import datetime
from mitmproxy import http, ctx

class OpenCodeAnalyzer:
    def __init__(self):
        self.request_count = 0
        self.log_file = f"opencode-traffic-{datetime.now().strftime('%Y%m%d-%H%M%S')}.jsonl"

    def redact_token(self, text):
        """Redact sensitive tokens while preserving structure for analysis"""
        if not text:
            return text

        # Redact OAuth tokens (sk-ant-oat01-...)
        text = re.sub(r'(sk-ant-oat\d+-)[A-Za-z0-9_-]{20,}', r'\1[REDACTED]', text)

        # Redact API keys (sk-ant-api03-...)
        text = re.sub(r'(sk-ant-api\d+-)[A-Za-z0-9_-]{20,}', r'\1[REDACTED]', text)

        # Redact Bearer tokens in headers
        text = re.sub(r'(Bearer\s+)([A-Za-z0-9_-]{40,})', r'\1[REDACTED]', text)

        # Redact refresh tokens
        text = re.sub(r'(refresh_token["\s:]+)([A-Za-z0-9_-]{20,})', r'\1[REDACTED]', text)

        # Redact access tokens
        text = re.sub(r'(access_token["\s:]+)([A-Za-z0-9_-]{20,})', r'\1[REDACTED]', text)

        return text

    def safe_json_parse(self, content):
        """Safely parse JSON content"""
        try:
            if isinstance(content, bytes):
                content = content.decode('utf-8', errors='replace')
            return json.loads(content)
        except:
            return content

    def request(self, flow: http.HTTPFlow) -> None:
        """Capture and log outgoing requests"""
        if 'anthropic' not in flow.request.pretty_host and 'claude' not in flow.request.pretty_host:
            return

        self.request_count += 1

        # Extract request details
        request_data = {
            'timestamp': datetime.now().isoformat(),
            'request_id': self.request_count,
            'method': flow.request.method,
            'url': flow.request.pretty_url,
            'host': flow.request.pretty_host,
            'path': flow.request.path,
            'http_version': flow.request.http_version,
            'headers': {},
            'body': None,
            'tls': {}
        }

        # Capture headers (with redaction)
        for key, value in flow.request.headers.items():
            request_data['headers'][key] = self.redact_token(value)

        # Capture body (with redaction)
        if flow.request.content:
            body = self.safe_json_parse(flow.request.content)
            if isinstance(body, dict):
                body_str = json.dumps(body)
                body_str = self.redact_token(body_str)
                request_data['body'] = json.loads(body_str)
            elif isinstance(body, bytes):
                request_data['body'] = self.redact_token(body.decode('utf-8', errors='replace'))
            else:
                request_data['body'] = self.redact_token(str(body))

        # Capture TLS details if available
        if flow.client_conn and flow.client_conn.tls_established:
            request_data['tls'] = {
                'version': flow.client_conn.tls_version if hasattr(flow.client_conn, 'tls_version') else None,
                'cipher': flow.client_conn.cipher if hasattr(flow.client_conn, 'cipher') else None,
                'alpn': flow.client_conn.alpn if hasattr(flow.client_conn, 'alpn') else None,
                'sni': flow.request.pretty_host
            }

        # Log to file
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(request_data) + '\n')

        # Also log key details to console
        ctx.log.info(f"[Request #{self.request_count}] {flow.request.method} {flow.request.pretty_host}{flow.request.path}")

        # Log interesting headers
        interesting_headers = [
            'user-agent', 'x-api-key', 'authorization',
            'x-opencode', 'x-client-id', 'x-device-id',
            'x-request-id', 'x-session-id', 'x-build-version'
        ]

        for header in interesting_headers:
            if header in flow.request.headers:
                value = self.redact_token(flow.request.headers[header])
                ctx.log.info(f"  {header}: {value}")

    def response(self, flow: http.HTTPFlow) -> None:
        """Capture responses for correlation"""
        if 'anthropic' not in flow.request.pretty_host and 'claude' not in flow.request.pretty_host:
            return

        response_data = {
            'timestamp': datetime.now().isoformat(),
            'request_id': self.request_count,
            'status_code': flow.response.status_code,
            'headers': {},
            'body_preview': None
        }

        # Capture response headers
        for key, value in flow.response.headers.items():
            response_data['headers'][key] = self.redact_token(value)

        # Capture response body preview (first 500 chars, redacted)
        if flow.response.content:
            body = self.safe_json_parse(flow.response.content)
            if isinstance(body, dict):
                body_str = json.dumps(body)[:500]
                response_data['body_preview'] = self.redact_token(body_str)
            else:
                response_data['body_preview'] = self.redact_token(str(body)[:500])

        # Log response
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(response_data) + '\n')

        ctx.log.info(f"[Response #{self.request_count}] Status: {flow.response.status_code}")

        # Log any error messages
        if flow.response.status_code >= 400:
            ctx.log.warn(f"  Error response: {response_data.get('body_preview', 'No body')}")

addons = [OpenCodeAnalyzer()]