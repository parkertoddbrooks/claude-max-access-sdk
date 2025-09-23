const axios = require('axios');

// Add request interceptor to debug
axios.interceptors.request.use(request => {
  console.log('\n=== AXIOS REQUEST DEBUG ===');
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  console.log('Headers:', JSON.stringify(request.headers, null, 2));
  console.log('Data:', JSON.stringify(request.data, null, 2));
  console.log('===========================\n');
  return request;
});

// Add response interceptor
axios.interceptors.response.use(
  response => {
    console.log('\n=== AXIOS RESPONSE DEBUG ===');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Data type:', typeof response.data);
    if (typeof response.data === 'object') {
      console.log('Data keys:', Object.keys(response.data));
    } else {
      console.log('Data:', response.data);
    }
    console.log('============================\n');
    return response;
  },
  error => {
    console.log('\n=== AXIOS ERROR DEBUG ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    console.log('=========================\n');
    return Promise.reject(error);
  }
);

// Now run authenticate.js
require('./examples/authenticate')();