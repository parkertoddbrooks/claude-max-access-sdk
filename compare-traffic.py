#!/usr/bin/env python3
"""
Compare captured traffic between OpenCode and direct SDK calls
Identifies differences in headers, TLS settings, and request patterns

Usage:
    python3 compare-traffic.py opencode-traffic.jsonl sdk-traffic.jsonl
"""

import json
import sys
from collections import defaultdict
from typing import Dict, List, Set, Tuple

class TrafficComparator:
    def __init__(self):
        self.opencode_data = []
        self.sdk_data = []

    def load_file(self, filepath: str) -> List[Dict]:
        """Load JSONL file"""
        data = []
        with open(filepath, 'r') as f:
            for line in f:
                try:
                    data.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue
        return data

    def extract_headers(self, data: List[Dict]) -> Set[str]:
        """Extract unique header names"""
        headers = set()
        for entry in data:
            if 'headers' in entry:
                headers.update(entry['headers'].keys())
        return headers

    def extract_header_values(self, data: List[Dict]) -> Dict[str, Set[str]]:
        """Extract unique header values for each header"""
        header_values = defaultdict(set)
        for entry in data:
            if 'headers' in entry:
                for key, value in entry['headers'].items():
                    if value and '[REDACTED]' not in value:
                        header_values[key.lower()].add(value)
        return header_values

    def extract_tls_info(self, data: List[Dict]) -> Dict:
        """Extract TLS configuration"""
        tls_info = {
            'versions': set(),
            'ciphers': set(),
            'alpn': set()
        }
        for entry in data:
            if 'tls' in entry and entry['tls']:
                if entry['tls'].get('version'):
                    tls_info['versions'].add(entry['tls']['version'])
                if entry['tls'].get('cipher'):
                    tls_info['ciphers'].add(entry['tls']['cipher'])
                if entry['tls'].get('alpn'):
                    tls_info['alpn'].add(entry['tls']['alpn'])
        return tls_info

    def compare(self, opencode_file: str, sdk_file: str):
        """Main comparison function"""
        print("=" * 80)
        print("OpenCode vs SDK Traffic Comparison")
        print("=" * 80)

        # Load data
        self.opencode_data = self.load_file(opencode_file)
        self.sdk_data = self.load_file(sdk_file)

        print(f"\nLoaded {len(self.opencode_data)} OpenCode requests")
        print(f"Loaded {len(self.sdk_data)} SDK requests")

        # Compare headers
        print("\n" + "=" * 80)
        print("HEADER ANALYSIS")
        print("=" * 80)

        opencode_headers = self.extract_headers(self.opencode_data)
        sdk_headers = self.extract_headers(self.sdk_data)

        unique_to_opencode = opencode_headers - sdk_headers
        unique_to_sdk = sdk_headers - opencode_headers
        common_headers = opencode_headers & sdk_headers

        if unique_to_opencode:
            print("\n🔍 Headers ONLY in OpenCode (IMPORTANT!):")
            for header in sorted(unique_to_opencode):
                print(f"  ✓ {header}")
                # Show sample values
                values = self.extract_header_values(self.opencode_data)
                if header.lower() in values:
                    for value in list(values[header.lower()])[:3]:
                        print(f"      Sample: {value}")

        if unique_to_sdk:
            print("\n📝 Headers ONLY in SDK:")
            for header in sorted(unique_to_sdk):
                print(f"  - {header}")

        # Compare header values for common headers
        print("\n" + "=" * 80)
        print("HEADER VALUE DIFFERENCES")
        print("=" * 80)

        opencode_values = self.extract_header_values(self.opencode_data)
        sdk_values = self.extract_header_values(self.sdk_data)

        for header in sorted(common_headers):
            header_lower = header.lower()
            if header_lower in opencode_values and header_lower in sdk_values:
                oc_vals = opencode_values[header_lower]
                sdk_vals = sdk_values[header_lower]
                if oc_vals != sdk_vals:
                    print(f"\n{header}:")
                    print(f"  OpenCode: {list(oc_vals)[:3]}")
                    print(f"  SDK:      {list(sdk_vals)[:3]}")

        # Compare TLS settings
        print("\n" + "=" * 80)
        print("TLS CONFIGURATION")
        print("=" * 80)

        opencode_tls = self.extract_tls_info(self.opencode_data)
        sdk_tls = self.extract_tls_info(self.sdk_data)

        print("\nTLS Versions:")
        print(f"  OpenCode: {opencode_tls['versions'] or 'Not captured'}")
        print(f"  SDK:      {sdk_tls['versions'] or 'Not captured'}")

        print("\nALPN Negotiation:")
        print(f"  OpenCode: {opencode_tls['alpn'] or 'Not captured'}")
        print(f"  SDK:      {sdk_tls['alpn'] or 'Not captured'}")

        print("\nCipher Suites:")
        print(f"  OpenCode: {list(opencode_tls['ciphers'])[:3] if opencode_tls['ciphers'] else 'Not captured'}")
        print(f"  SDK:      {list(sdk_tls['ciphers'])[:3] if sdk_tls['ciphers'] else 'Not captured'}")

        # Compare request patterns
        print("\n" + "=" * 80)
        print("REQUEST PATTERNS")
        print("=" * 80)

        self.analyze_patterns(self.opencode_data, "OpenCode")
        self.analyze_patterns(self.sdk_data, "SDK")

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY & RECOMMENDATIONS")
        print("=" * 80)

        if unique_to_opencode:
            print("\n⚠️  OpenCode has unique headers that may be required for authentication")
            print("   Try adding these headers to your SDK requests:")
            for header in sorted(unique_to_opencode):
                print(f"     '{header}': '<value>',")

        if opencode_tls != sdk_tls:
            print("\n⚠️  TLS configurations differ")
            print("   The server might be fingerprinting TLS handshakes")

        if not unique_to_opencode and opencode_tls == sdk_tls:
            print("\n✅ No significant differences found in captured traffic")
            print("   The restriction is likely server-side (OAuth audience validation)")

    def analyze_patterns(self, data: List[Dict], label: str):
        """Analyze request patterns"""
        if not data:
            return

        print(f"\n{label} Patterns:")

        # HTTP methods used
        methods = defaultdict(int)
        paths = defaultdict(int)

        for entry in data:
            if 'method' in entry:
                methods[entry['method']] += 1
            if 'path' in entry:
                paths[entry['path']] += 1

        print(f"  HTTP Methods: {dict(methods)}")
        print(f"  Unique Paths: {len(paths)}")

        # Most common path
        if paths:
            most_common_path = max(paths.items(), key=lambda x: x[1])
            print(f"  Most Common Path: {most_common_path[0]} ({most_common_path[1]} requests)")

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 compare-traffic.py <opencode-traffic.jsonl> <sdk-traffic.jsonl>")
        sys.exit(1)

    comparator = TrafficComparator()
    try:
        comparator.compare(sys.argv[1], sys.argv[2])
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()