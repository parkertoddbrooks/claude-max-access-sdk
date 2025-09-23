#!/usr/bin/env bash
set -euo pipefail

# Where we'll write extracted certs
OUTDIR="./extracted-certs"
mkdir -p "$OUTDIR"

# Locate opencode binary
OPENCODE_BIN="$(which opencode || true)"
if [ -z "$OPENCODE_BIN" ]; then
  echo "ERROR: 'opencode' not found in PATH. Install or point to binary. You can set OPENCODE_BIN=/path/to/opencode and re-run."
  exit 1
fi
echo "Using binary: $OPENCODE_BIN"

# Count approximate PEM certificate blocks embedded (quick check)
PEM_BLOCKS=$(strings -n 10 "$OPENCODE_BIN" | grep -c "-----BEGIN CERTIFICATE-----" || true)
echo "Approx PEM blocks found: $PEM_BLOCKS"

# Extract certificates by carving BEGIN/END blocks (PEM)
echo "Carving PEM certs to $OUTDIR/cert-###.pem ..."
c=0
# Use awk to write sequential files
strings -n 10 "$OPENCODE_BIN" | awk '
  /-----BEGIN CERTIFICATE-----/ {out=sprintf("'"$OUTDIR"'/cert-%04d.pem", ++c); print > out}
  { if (out) print > out }
  /-----END CERTIFICATE-----/ {close(out); out=""}
  END { if (c==0) print "NO_PEM_CERTS_FOUND" > "/dev/stderr"; else print c " certs extracted" > "/dev/stderr" }
' 2>/dev/null || true

# If none extracted, try a broader carve for keys/certs
if [ "$(ls -1 "$OUTDIR" 2>/dev/null | wc -l)" -eq 0 ]; then
  echo "No PEM certs found via strings carve. Trying a binary search with binwalk (if installed)."
  if command -v binwalk >/dev/null 2>&1; then
    TMPDIR="$(mktemp -d)"
    echo "Running binwalk extraction into $TMPDIR (may take a moment)..."
    binwalk --dd='.*' -e "$OPENCODE_BIN" -C "$TMPDIR" >/dev/null 2>&1 || true
    # find any pem-like files
    find "$TMPDIR" -type f -exec grep -l "BEGIN CERTIFICATE" {} \; -exec sh -c 'f="$1"; n=$(basename "$f"); cp "$f" "'"$OUTDIR"'/$n.pem"' _ {} \;
    echo "Copied candidate files to $OUTDIR"
  else
    echo "binwalk not installed; if you suspect DER blobs, install binwalk or use a hex-carving approach."
  fi
fi

# Summary: list files
COUNT=$(ls -1 "$OUTDIR"/*.pem 2>/dev/null | wc -l || true)
echo "Extracted cert files count: $COUNT"
if [ "$COUNT" -eq 0 ]; then
  echo "No PEM certs found. You may have DER blobs embedded; consider binwalk or dd/carve."
  exit 0
fi

# Inspect each cert: subject, issuer, validity, fingerprints
echo "Inspecting certs (subject / issuer / dates / serial / fingerprint SHA1 & SHA256):"
i=0
for f in "$OUTDIR"/*.pem; do
  i=$((i+1))
  echo "-----------------------------------------------------------------"
  echo "[$i] $f"
  # Defensive: ensure openssl can parse it
  if openssl x509 -in "$f" -noout >/dev/null 2>&1; then
    openssl x509 -in "$f" -noout -subject -issuer -dates -serial
    echo "SHA1-Fingerprint: $(openssl x509 -in "$f" -noout -fingerprint -sha1 | sed 's/subject=//')"
    echo "SHA256-Fingerprint: $(openssl x509 -in "$f" -noout -fingerprint -sha256 | sed 's/subject=//')"
  else
    echo "WARN: openssl could not parse $f as a certificate."
  fi
done

# Search for any private key blocks in the binary
echo "Scanning binary for PRIVATE KEY blocks (will NOT write keys out) ..."
KEY_BLOCKS=$(strings -n 10 "$OPENCODE_BIN" | grep -c -E "-----BEGIN .*PRIVATE KEY-----" || true)
if [ "$KEY_BLOCKS" -gt 0 ]; then
  echo "!!! WARNING: Found $KEY_BLOCKS PRIVATE KEY blocks present in binary output via strings. Do NOT distribute. Check carefully:"
  strings -n 10 "$OPENCODE_BIN" | grep -E -n "-----BEGIN .*PRIVATE KEY-----" | head -n 20
  echo "If you see private keys, remove/custodially secure them. Do not share."
else
  echo "No obvious PEM-format private key blocks found via strings output (good)."
fi

echo "DONE. Extracted certs are in: $OUTDIR"
echo "If you want to remove them securely, run:"
echo "  shred -u $OUTDIR/*.pem 2>/dev/null || rm -f $OUTDIR/*.pem"