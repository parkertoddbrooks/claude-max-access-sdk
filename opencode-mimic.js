/**
 * Mimic OpenCode exactly
 * If it's MIT and works, we should be able to replicate it
 */

const https = require('https');
const zlib = require('zlib');

// OpenCode's exact OAuth plugin code
async function makeRequestLikeOpenCode(tokens, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: message }],
      max_tokens: 100
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'authorization': `Bearer ${tokens.access}`,
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(data),
        // Mimic OpenCode/Bun
        'user-agent': 'Bun/1.2.21',
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br',
        // OpenCode runs locally
        'origin': 'http://localhost:4096',
        'referer': 'http://localhost:4096/'
      },
      // Standard HTTPS options
      rejectUnauthorized: true
    };

    const req = https.request(options, (res) => {
      let chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        let body = Buffer.concat(chunks);

        // Handle compressed responses
        if (res.headers['content-encoding'] === 'gzip') {
          body = zlib.gunzipSync(body);
        } else if (res.headers['content-encoding'] === 'br') {
          body = zlib.brotliDecompressSync(body);
        } else if (res.headers['content-encoding'] === 'deflate') {
          body = zlib.inflateSync(body);
        }

        const data = JSON.parse(body.toString());

        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test it
async function testMimic() {
  const fs = require('fs').promises;
  const tokens = JSON.parse(await fs.readFile('./oauth-tokens.json', 'utf8')).tokens;

  console.log('Testing OpenCode mimic...\n');

  try {
    const response = await makeRequestLikeOpenCode(tokens, 'Say "Hello from mimic!" and nothing else.');
    console.log('✅ SUCCESS!', response);
  } catch (error) {
    console.log('❌ Failed:', error.body || error);
  }
}

if (require.main === module) {
  testMimic().catch(console.error);
}

module.exports = { makeRequestLikeOpenCode };