/**
 * Local proxy server that makes requests look like they're coming from OpenCode
 * This runs a local server that intercepts and forwards requests
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;

class ClaudeProxyServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Proxy endpoint for Claude API
    this.app.post('/v1/messages', async (req, res) => {
      try {
        // Get OAuth tokens
        const tokens = JSON.parse(
          await fs.readFile('./claude-tokens.json', 'utf8').catch(() => '{}')
        );

        if (!tokens.access) {
          return res.status(401).json({
            error: 'No OAuth tokens found. Run authentication first.'
          });
        }

        // Forward to Anthropic with OAuth
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          req.body,
          {
            headers: {
              'authorization': `Bearer ${tokens.access}`,
              'content-type': 'application/json',
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
              // Try to mimic OpenCode's request signature
              'user-agent': 'opencode/0.11.1',
              'accept': 'application/json',
              'accept-encoding': 'gzip, deflate, br'
            },
            // Use different axios adapter or options that might bypass detection
            decompress: true,
            validateStatus: () => true
          }
        );

        res.status(response.status).json(response.data);
      } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({
          error: error.message
        });
      }
    });

    // OAuth callback endpoint
    this.app.get('/oauth/callback', async (req, res) => {
      const { code, state } = req.query;
      res.send(`
        <html>
          <body>
            <h1>Authorization successful!</h1>
            <p>Code: ${code}</p>
            <p>State: ${state}</p>
            <p>Copy this full code string:</p>
            <pre>${code}#${state}</pre>
          </body>
        </html>
      `);
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Claude Proxy Server running on http://localhost:${this.port}`);
      console.log(`📍 API endpoint: http://localhost:${this.port}/v1/messages`);
      console.log(`🔐 OAuth callback: http://localhost:${this.port}/oauth/callback`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Export for use as module
module.exports = ClaudeProxyServer;

// Run directly if called as script
if (require.main === module) {
  const server = new ClaudeProxyServer(8080);
  server.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down proxy server...');
    server.stop();
    process.exit(0);
  });
}