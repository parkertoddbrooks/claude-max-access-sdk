const axios = require('axios');

// Add request interceptor to debug
axios.interceptors.request.use(request => {
  console.log('\n=== AXIOS REQUEST DEBUG ===');
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  console.log('Headers:', request.headers);
  console.log('Data:', JSON.stringify(request.data, null, 2));
  console.log('===========================\n');
  return request;
});

// Add response interceptor
axios.interceptors.response.use(
  response => {
    console.log('\n=== AXIOS RESPONSE DEBUG ===');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Data type:', typeof response.data);
    console.log('Data:', response.data);
    console.log('============================\n');
    return response;
  },
  error => {
    console.log('\n=== AXIOS ERROR DEBUG ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    console.log('=========================\n');
    return Promise.reject(error);
  }
);

// Now run the SDK
const ClaudeSDK = require('./src/index');

async function main() {
  const sdk = new ClaudeSDK({
    storage: 'file',
    storagePath: './claude-tokens.json'
  });

  try {
    const response = await sdk.sendMessage('Hello Claude! Can you count to 5?');
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();