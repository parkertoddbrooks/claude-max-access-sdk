// Test if running through Bun makes a difference
const tokens = {
  "access": "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"
};

async function test() {
  console.log('Testing with Bun runtime...\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${tokens.access}`,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: 'Say "Hello from Bun!" and nothing else.'
        }],
        max_tokens: 100
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS with Bun!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Failed with Bun');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

test();