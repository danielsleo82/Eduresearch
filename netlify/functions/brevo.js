// netlify/functions/brevo.js
const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  console.log('=== BREVO START ===');
  console.log('Method:', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const BREVO_API_KEY = process.env.BREVO_API_V3_KEY || process.env.BREVO_API_KEY;
  console.log('Key found:', !!BREVO_API_KEY);
  console.log('Key prefix:', BREVO_API_KEY ? BREVO_API_KEY.substring(0, 15) : 'NONE');

  if (!BREVO_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };
  }

  let contact;
  try {
    contact = JSON.parse(event.body || '{}');
    console.log('Email:', contact.email);
  } catch(e) {
    console.error('Parse error:', e.message);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!contact.email) {
    console.error('No email in contact');
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No email' }) };
  }

  // Build minimal payload first — just email + list
  // to isolate attribute issues
  const payload = JSON.stringify({
    email:         contact.email,
    attributes: {
      PRENOM: contact.firstname || '',
      NOM:    contact.lastname  || '',
    },
    listIds:       [3],
    updateEnabled: true,
  });

  console.log('Payload:', payload);

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.brevo.com',
        path: '/v3/contacts',
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'accept':         'application/json',
          'api-key':        BREVO_API_KEY,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Brevo HTTP status:', res.statusCode);
          console.log('Brevo response body:', data);
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

    console.log('=== BREVO END ===');
    return {
      statusCode: result.status < 300 ? 200 : result.status,
      headers,
      body: result.body,
    };

  } catch (err) {
    console.error('Caught error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
