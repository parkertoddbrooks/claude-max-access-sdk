const axios = require('axios');

async function testDirectAPI() {
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [{ role: 'user', content: 'What is 2+2?' }]
        }, {
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            proxy: {
                host: '127.0.0.1',
                port: 8080,
                protocol: 'http'
            }
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        console.log('ERROR:', error.response?.data || error.message);
    }
}

testDirectAPI();
