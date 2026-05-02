// Netlify Function — unsubscribe.js
// Désinscription newsletter via token signé HMAC (valable 48h)
// URL : /.netlify/functions/unsubscribe?token=XXX
'use strict';

const crypto = require('crypto');
const { Resend } = require('resend');

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'zowe-fallback-secret-change-me';

function createToken(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + 48 * 3600 * 1000,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('Token invalide');
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Signature invalide');
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (Date.now() > data.exp) throw new Error('Token expiré');
  return data.email;
}

exports.handler = async function (event) {
  const token = event.queryStringParameters && event.queryStringParameters.token;

  // Vérification du token
  let email;
  try {
    email = verifyToken(token);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: page('Lien invalide', `<p>Ce lien de désinscription est invalide ou a expiré.<br>
        <a href="https://zowekine.com" style="color:#6B1F2A;">Retour à l'accueil</a></p>`),
    };
  }

  // Désinscription via Resend (si audience configurée)
  const apiKey     = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (apiKey && audienceId) {
    try {
      const resend = new Resend(apiKey);
      // Récupérer le contact puis le marquer unsubscribed
      const { data: contacts } = await resend.contacts.list({ audienceId });
      const contact = (contacts || []).find(c => c.email === email);
      if (contact) {
        await resend.contacts.update({
          id: contact.id,
          audienceId,
          unsubscribed: true,
        });
      }
    } catch (e) {
      console.error('[Unsubscribe] Resend error:', e.message);
    }
  }

  console.log('[Unsubscribe] Désinscription:', email);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: page('Désinscription confirmée', `
      <p>L'adresse <strong>${email.replace(/</g, '&lt;')}</strong>
      a bien été retirée de la liste de diffusion Zowe.</p>
      <a href="https://zowekine.com" style="color:#6B1F2A;">Retour à l'accueil →</a>
    `),
  };
};

function page(title, content) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${title} — Zowe</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 2rem;color:#5C5C5C;}
h1{font-family:Georgia,serif;color:#6B1F2A;font-weight:300;font-style:italic;}</style>
</head><body>
<p style="font-family:Georgia,serif;font-size:1.1rem;letter-spacing:0.2em;color:#6B1F2A;">ZOWE</p>
<h1>${title}</h1>
${content}
</body></html>`;
}

// Utilitaire exporté pour générer les tokens dans d'autres fonctions
module.exports.createUnsubToken = createToken;
