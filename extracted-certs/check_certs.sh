#!/bin/bash
for f in cert-*.pem; do
  subject=$(openssl x509 -in "$f" -noout -subject 2>/dev/null)
  issuer=$(openssl x509 -in "$f" -noout -issuer 2>/dev/null)
  if [ "$subject" != "$issuer" ]; then
    echo "Non-self-signed: $f"
    echo "$subject"
    echo "$issuer"
    echo "---"
  fi
done
