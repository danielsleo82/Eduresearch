// netlify/functions/claude.js
const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const model = 'claude-3-5-sonnet-20241022'; // stable dated model string
    const max_tokens = Math.min(body.max_tokens || 1000, 4000);

    console.log('Calling Anthropic with model:', model, 'max_tokens:', max_tokens);

    const payload = JSON.stringify({
      model,
      max_tokens,
      messages: body.messages,
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Anthropic status:', res.statusCode);
          if (res.statusCode !== 200) {
            console.error('Anthropic error body:', data.substring(0, 300));
          }
          resolve({ status: res.statusCode, body: data });
        });
      });

      req.on('error', (e) => {
        console.error('Request error:', e.message);
        reject(e);
      });
      req.write(payload);
      req.end();
    });

    if (result.status !== 200) {
      return { statusCode: result.status, headers, body: result.body };
    }

    return { statusCode: 200, headers, body: result.body };

  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
