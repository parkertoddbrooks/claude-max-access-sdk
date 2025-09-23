#!/usr/bin/env node

/**
 * Monitor OpenCode process and network activity
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Monitoring OpenCode Process Activity...\n');

// Check if OpenCode is running
const checkOpenCode = spawn('ps', ['aux']);

let output = '';
checkOpenCode.stdout.on('data', (data) => {
  output += data.toString();
});

checkOpenCode.on('close', () => {
  if (output.includes('opencode')) {
    console.log('✅ OpenCode is running\n');

    // Get the process ID
    const lines = output.split('\n');
    const opencodeLine = lines.find(line => line.includes('.opencode/bin/opencode'));

    if (opencodeLine) {
      const parts = opencodeLine.split(/\s+/);
      const pid = parts[1];
      console.log(`📍 OpenCode PID: ${pid}\n`);

      // Monitor the process
      console.log('📊 Monitoring OpenCode file descriptors and network connections...\n');

      // Check what files it has open
      const lsof = spawn('lsof', ['-p', pid]);

      lsof.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.includes('TCP') || line.includes('anthropic') || line.includes('claude')) {
            console.log('🌐 Network:', line);
          }
          if (line.includes('auth.json') || line.includes('token')) {
            console.log('🔑 Auth file:', line);
          }
        });
      });

      // Monitor network connections
      const netstat = spawn('netstat', ['-an']);

      netstat.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.includes('443') && line.includes('ESTABLISHED')) {
            console.log('🔌 Connection:', line);
          }
        });
      });
    }
  } else {
    console.log('❌ OpenCode is not running');
    console.log('\nPlease start OpenCode with:');
    console.log('  ~/.opencode/bin/opencode\n');
    console.log('Then run this monitor again in another terminal');
  }
});

// Also monitor any new auth tokens
const authFile = '/Users/parker/.local/share/opencode/auth.json';

if (fs.existsSync(authFile)) {
  console.log('\n📁 Watching auth file for changes...\n');

  fs.watchFile(authFile, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('🔄 Auth file updated!');
      const content = fs.readFileSync(authFile, 'utf8');
      const auth = JSON.parse(content);
      console.log('  New access token:', auth.anthropic?.access?.substring(0, 30) + '...');
      console.log('  Expires:', new Date(auth.anthropic?.expires).toLocaleString());
    }
  });
}

console.log('\n🎯 Now use OpenCode to send a message to Claude');
console.log('   This monitor will show network activity\n');
console.log('Press Ctrl+C to stop monitoring\n');