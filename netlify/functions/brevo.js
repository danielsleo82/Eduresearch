// netlify/functions/brevo.js
// Proxy sécurisé vers l'API Brevo (contacts)

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

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Brevo key not configured' }) };
  }

  try {
    const contact = JSON.parse(event.body);

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email: contact.email,
        attributes: {
          PRENOM:            contact.firstname,
          NOM:               contact.lastname,
          PAYS:              contact.country,
          PROFIL:            contact.profile,
          ORGANISATION:      contact.org,
          LANGUE:            contact.lang,
          FICHES_VUES:       contact.seenCount,
          THEME_DECLENCHEUR: contact.triggerTheme,
          SOURCE:            'EduResearch',
        },
        listIds:      [3],
        updateEnabled: true,
      }),
    });

    const data = await response.json();
    return { statusCode: response.ok ? 200 : response.status, headers, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
