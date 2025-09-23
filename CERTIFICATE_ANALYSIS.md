# Certificate Extraction Analysis Report

## Executive Summary

We successfully extracted and analyzed 146 certificates from the OpenCode binary. Contrary to our initial hypothesis, these are **NOT client certificates for mTLS authentication**, but rather a standard root CA trust store.

## Extraction Results

### Certificate Count
- **Total certificates extracted**: 146
- **Total PEM blocks in binary**: ~155 (includes some non-certificate data)
- **Private keys found**: 1 (appears to be in bundled JavaScript crypto code, not an actual key)

### Certificate Types
All 146 certificates are **self-signed root CA certificates** from well-known Certificate Authorities:

Sample organizations found:
- Entrust, Inc.
- QuoVadis Limited
- DigiCert Inc
- SwissSign AG
- SecureTrust Corporation

### Key Findings

1. **No Client Certificates**: We found no client certificates that would be used for mTLS authentication
2. **No Anthropic-Specific Certificates**: No certificates containing "Anthropic", "Claude", or "OpenCode" in their subject/issuer fields
3. **Standard Trust Store**: These appear to be a standard set of root CAs, likely bundled for certificate validation
4. **Alternative Authentication Method**: Since these aren't client certificates, OpenCode must use a different mechanism for authentication

## Sample Certificate Details

```
Certificate 1: Entrust Root Certification Authority
- Valid: Nov 27 20:23:42 2006 GMT to Nov 27 20:53:42 2026 GMT
- Self-signed root CA

Certificate 2: QuoVadis Root CA 2
- Valid: Nov 24 18:27:00 2006 GMT to Nov 24 18:23:33 2031 GMT
- Self-signed root CA

Certificate 3: DigiCert Global Root CA
- Valid: Nov 10 00:00:00 2006 GMT to Nov 10 00:00:00 2031 GMT
- Self-signed root CA
```

## Revised Authentication Hypothesis

Since the embedded certificates are just a trust store, OpenCode likely uses one of these authentication methods:

1. **Binary Signature Verification**: Server validates the OpenCode binary signature/hash
2. **Hidden Client Certificate**: Client cert embedded in a different format (not PEM)
3. **Custom Headers/Tokens**: OpenCode sends special identifying headers
4. **Certificate Pinning**: OpenCode pins specific server certificates for additional security
5. **Hardcoded Credentials**: Authentication credentials compiled into the binary in a different form

## Technical Details

### Extraction Method
```bash
# Used strings to extract PEM blocks
strings -n 10 /Users/parker/.opencode/bin/opencode | awk '
  /-----BEGIN CERTIFICATE-----/ {out=sprintf("cert-%04d.pem", ++c); print > out}
  { if (out) print > out }
  /-----END CERTIFICATE-----/ {close(out); out=""}
'
```

### Verification
- All certificates parse correctly with OpenSSL
- All are self-signed (subject == issuer)
- Standard root CA certificates used for TLS validation

## Conclusion

The presence of 146 root CA certificates doesn't explain OpenCode's privileged access to Anthropic's API. These are standard certificates for validating server certificates, not for client authentication. The actual authentication mechanism remains undiscovered and may involve:

- Binary fingerprinting
- Embedded credentials in non-PEM format
- Custom protocol extensions
- Server-side application whitelisting based on other factors

Our SDK approach of using OpenCode as a backend remains the most practical solution for integrating with Claude Max Plan OAuth tokens.

---
*Analysis completed: September 23, 2025*
*Certificates extracted: ./extracted-certs/*