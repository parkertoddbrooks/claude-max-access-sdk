#!/usr/bin/env node

/**
 * Monitor OpenCode's actual OAuth flow
 * Run this before authenticating with OpenCode to see what it's doing
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Create a simple proxy server to monitor requests
const proxy = http.createServer((req, res) => {
  console.log('\n🔍 INTERCEPTED REQUEST:');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    if (body) {
      console.log('Body:', body);
    }

    // Forward the request
    const parsedUrl = url.parse(req.url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: req.method,
      headers: req.headers
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const proxyReq = protocol.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

const PORT = 8888;
proxy.listen(PORT, () => {
  console.log(`🚀 Proxy server listening on http://localhost:${PORT}`);
  console.log('\n📋 To use this proxy with OpenCode:');
  console.log('   export HTTP_PROXY=http://localhost:8888');
  console.log('   export HTTPS_PROXY=http://localhost:8888');
  console.log('   ~/.opencode/bin/opencode auth login');
  console.log('\n⏳ Waiting for requests...');
});