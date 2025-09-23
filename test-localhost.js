// Test if requests from localhost work differently
const http = require('http');
const axios = require('axios');
const fs = require('fs').promises;

// Create a local server
const server = http.createServer(async (req, res) => {
  if (req.url === '/test') {
    try {
      const tokens = JSON.parse(await fs.readFile('claude-tokens.json', 'utf8'));

      // Make request from the server (localhost context)
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello from localhost!" and nothing else.'
        }],
        max_tokens: 100
      }, {
        headers: {
          'authorization': `Bearer ${tokens.access}`,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
        }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: response.data }));
    } catch (error) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.response?.data || error.message
      }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4096, 'localhost', () => {
  console.log('Server running at http://localhost:4096/');
  console.log('Testing OAuth from localhost context...\n');

  // Make a request to our local server
  axios.get('http://localhost:4096/test')
    .then(response => {
      console.log('Result:', JSON.stringify(response.data, null, 2));
      server.close();
    })
    .catch(error => {
      console.error('Error:', error.message);
      server.close();
    });
});