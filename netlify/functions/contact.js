// Netlify Function — contact.js
// Formspree · Brevo · Blobs rappel 24h · Honeypot · reCAPTCHA · Rate limit
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('@netlify/blobs');

const FORMSPREE_ID = process.env.FORMSPREE_ID  || 'xqewvayo';
const PATRON_EMAIL = process.env.PATRON_EMAIL  || 'patron@kinovea.be';
const AUDIENCE_ID  = process.env.RESEND_AUDIENCE_ID || '';
const BREVO_KEY    = process.env.BREVO_API_KEY || '';
const BREVO_SENDER = { name: 'Zoé — Zowe', email: 'zoegrede.kine@gmail.com' };
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

// ─── Sanitisation ─────────────────────────────────────────────────────────────
function sanitize(str, maxLen = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLen)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

// ─── Validation email ─────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email);
}

// ─── Rate limiting (3 soumissions / IP / heure) ───────────────────────────────
async function checkRateLimit(ip) {
  try {
    const store = getStore('rate-limits');
    const key   = `contact-${(ip || 'unknown').replace(/[^a-z0-9:.]/gi, '')}`;
    const now   = Date.now();
    const hour  = 3600 * 1000;

    let timestamps = [];
    try { timestamps = await store.get(key, { type: 'json' }) || []; } catch (_) {}

    const recent = timestamps.filter(ts => now - ts < hour);
    if (recent.length >= 3) return false;

    recent.push(now);
    await store.set(key, JSON.stringify(recent));
    return true;
  } catch (e) {
    console.warn('[RateLimit] Blobs error, skipping:', e.message);
    return true; // fail open si Blobs indisponible
  }
}

// ─── Vérification reCAPTCHA v3 ────────────────────────────────────────────────
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET || !token) return true; // désactivé si pas de clé
  try {
    const res  = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method : 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body   : `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return data.success && data.score >= 0.4;
  } catch (e) {
    console.warn('[reCAPTCHA] Vérification échouée:', e.message);
    return true; // fail open en cas d'erreur réseau
  }
}

// ─── Brevo ────────────────────────────────────────────────────────────────────
async function brevoSend({ to, toName, subject, html }) {
  if (!BREVO_KEY) return;
  const res  = await fetch('https://api.brevo.com/v3/smtp/email', {
    method  : 'POST',
    headers : { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body    : JSON.stringify({
      sender : BREVO_SENDER,
      to     : [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  });
  const data = await res.json();
  if (!res.ok) console.error('[Brevo] Erreur', res.status, JSON.stringify(data));
  else         console.log('[Brevo] Envoyé à', to, '— messageId:', data.messageId);
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // IP client
  const ip = (event.headers['x-nf-client-connection-ip']
    || event.headers['x-forwarded-for']
    || 'unknown').split(',')[0].trim();

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide.' }) }; }

  // ── Honeypot (champ "website" invisible) ─────────────────────────────────
  if (body.website && body.website.trim() !== '') {
    console.log('[Honeypot] Bot détecté depuis', ip);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // silencieux
  }

  // ── reCAPTCHA v3 ─────────────────────────────────────────────────────────
  const recaptchaOk = await verifyRecaptcha(body.recaptchaToken);
  if (!recaptchaOk) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Requête refusée.' }) };
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Trop de tentatives. Réessayez dans une heure.' }) };
  }

  // ── Validation & sanitisation côté serveur ───────────────────────────────
  const prenom    = sanitize(body.prenom    || '', 100);
  const nom       = sanitize(body.nom       || '', 100);
  const email     = sanitize(body.email     || '', 254);
  const telephone = sanitize(body.telephone || '', 30);
  const message   = sanitize(body.message   || '', 2000);
  const newsletter = body.newsletter === true || body.newsletter === 'true';

  if (!prenom || !email) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Prénom et email requis.' }) };
  }
  if (!isValidEmail(email)) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Format email invalide.' }) };
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString('fr-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });

  // ── 1. Formspree → zoegrede.kine@gmail.com ──────────────────────────────
  try {
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ prenom, nom, email, telephone, message, _cc: PATRON_EMAIL }),
    });
  } catch (e) { console.error('[Formspree]', e.message); }

  // ── 2. Brevo — confirmation patient ─────────────────────────────────────
  try {
    await brevoSend({
      to      : email,
      toName  : prenom,
      subject : "Bienvenue dans l'expérience Zowe — Votre demande a été reçue avec soin",
      html    : patientConfirmHtml(prenom),
    });
  } catch (e) { console.error('[Brevo patient]', e.message); }

  // ── 3. Resend — rappel 24h + newsletter ─────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);

    try {
      const store = getStore('reminders');
      const key   = `${now.getTime()}-${email.replace(/[^a-z0-9]/gi, '')}`;
      await store.setJSON(key, {
        prenom, email,
        sendAt: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      });
    } catch (e) { console.error('[Blobs reminder]', e.message); }

    if (newsletter && AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email, firstName: prenom, lastName: nom,
          audienceId: AUDIENCE_ID, unsubscribed: false,
        });
      } catch (e) { console.error('[Resend contact]', e.message); }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// ─── Templates email ──────────────────────────────────────────────────────────

function emailShell(title, content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:48px 44px 40px;">
  <p style="margin:0 0 36px;font-family:Georgia,serif;font-size:22px;letter-spacing:0.25em;color:#6B1F2A;font-weight:400;">ZOWE</p>
  ${content}
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #EDE8DF;">
    <p style="margin:0;font-size:11px;color:#AAAAAA;letter-spacing:0.05em;">
      Zoé — Zowe · Kinésithérapie de haute précision · Méthode BELTRA<br>
      <a href="https://zowe.netlify.app" style="color:#C9A96E;text-decoration:none;">zowe.netlify.app</a>
    </p>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function patientConfirmHtml(prenom) {
  return emailShell("Votre demande — Zowe", `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
      Votre demande a été reçue avec toute l'attention qu'elle mérite.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
      Zoé prendra personnellement contact avec vous dans la journée afin d'échanger sur vos besoins et de convenir ensemble du moment qui vous conviendra le mieux.
    </p>
    <div style="width:40px;height:1px;background:#C9A96E;margin:28px 0;opacity:0.6;"></div>
    <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.8;">
      D'ici là :
      <a href="tel:+32471783746" style="color:#6B1F2A;text-decoration:none;">0471 78 37 46</a>
      ·
      <a href="mailto:zoegrede.kine@gmail.com" style="color:#6B1F2A;text-decoration:none;">zoegrede.kine@gmail.com</a>
    </p>
  `);
}
