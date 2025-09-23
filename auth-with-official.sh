#!/bin/bash
echo "Starting official OpenCode auth flow..."
echo ""
echo "This will open a browser. After auth, copy the code and paste it here."
echo ""

# Run the auth login command
~/.opencode/bin/opencode auth login

echo ""
echo "Authentication complete. Checking stored tokens..."
cat /Users/parker/.local/share/opencode/auth.json