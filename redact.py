#!/usr/bin/env python3
"""
Simple token redaction script for safe logging
Can be used standalone or imported

Usage:
    python3 redact.py < input.txt > output.txt

Or in Python:
    from redact import redact_sensitive
    safe_text = redact_sensitive(original_text)
"""

import sys
import re
import json

def redact_sensitive(text):
    """
    Redact sensitive information while preserving structure for debugging
    """
    if not text:
        return text

    # Convert bytes to string if needed
    if isinstance(text, bytes):
        text = text.decode('utf-8', errors='replace')

    # OAuth tokens (sk-ant-oat01-...)
    text = re.sub(
        r'(sk-ant-oat\d+-)([A-Za-z0-9_-]{8})[A-Za-z0-9_-]{12,}',
        r'\1\2...[REDACTED]',
        text
    )

    # API keys (sk-ant-api03-...)
    text = re.sub(
        r'(sk-ant-api\d+-)([A-Za-z0-9_-]{8})[A-Za-z0-9_-]{12,}',
        r'\1\2...[REDACTED]',
        text
    )

    # Bearer tokens in Authorization headers
    text = re.sub(
        r'(Bearer\s+)([A-Za-z0-9_-]{10})[A-Za-z0-9_-]{30,}',
        r'\1\2...[REDACTED]',
        text
    )

    # Generic API keys in headers or JSON
    text = re.sub(
        r'(["\']?[Aa]pi[-_]?[Kk]ey["\']\s*:\s*["\']+)([A-Za-z0-9]{8})[A-Za-z0-9]{16,}(["\'])',
        r'\1\2...[REDACTED]\3',
        text
    )

    # Refresh tokens
    text = re.sub(
        r'(refresh_token["\']\s*:\s*["\']+)([A-Za-z0-9_-]{8})[A-Za-z0-9_-]{12,}(["\'])',
        r'\1\2...[REDACTED]\3',
        text
    )

    # Access tokens
    text = re.sub(
        r'(access_token["\']\s*:\s*["\']+)([A-Za-z0-9_-]{8})[A-Za-z0-9_-]{12,}(["\'])',
        r'\1\2...[REDACTED]\3',
        text
    )

    # JWT tokens (three base64 parts separated by dots)
    text = re.sub(
        r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
        'eyJ...[JWT-REDACTED]',
        text
    )

    # Session IDs
    text = re.sub(
        r'([Ss]ession[-_]?[Ii]d["\']\s*:\s*["\']+)([A-Za-z0-9]{8})[A-Za-z0-9]{16,}(["\'])',
        r'\1\2...[REDACTED]\3',
        text
    )

    return text

def redact_json(obj):
    """
    Recursively redact sensitive data in JSON objects
    """
    if isinstance(obj, dict):
        return {k: redact_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [redact_json(item) for item in obj]
    elif isinstance(obj, str):
        return redact_sensitive(obj)
    else:
        return obj

def main():
    """
    Read from stdin, redact, write to stdout
    """
    input_text = sys.stdin.read()

    # Try to parse as JSON first
    try:
        data = json.loads(input_text)
        redacted = redact_json(data)
        print(json.dumps(redacted, indent=2))
    except json.JSONDecodeError:
        # Not JSON, treat as plain text
        print(redact_sensitive(input_text))

if __name__ == "__main__":
    main()