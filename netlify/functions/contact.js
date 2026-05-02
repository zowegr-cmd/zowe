// Netlify Function — contact.js
// Formspree (notif Zoé) · Resend (confirmation patient) · Blobs (rappel 24h, queue retry)
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('./_blobs');
const { buildPatientConfirm } = require('./_email-templates');

const FORMSPREE_ID     = process.env.FORMSPREE_ID          || 'xqewvayo';
const PATRON_EMAIL     = process.env.PATRON_EMAIL          || 'patron@kinovea.be';
const AUDIENCE_ID      = process.env.RESEND_AUDIENCE_ID    || '';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY  || '';

// ─── Sanitisation ─────────────────────────────────────────────────────────────
function sanitize(str, maxLen = 2000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

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
    return true;
  }
}

// ─── Vérification reCAPTCHA v3 ────────────────────────────────────────────────
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET || !token) return true;
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
    return true;
  }
}

// ─── File de retry email ──────────────────────────────────────────────────────
async function queueEmail({ to, prenom, lang, type, ts }) {
  try {
    const store = getStore('email-queue');
    const id    = `${ts}-${Math.random().toString(36).slice(2,8)}-${type}`;
    await store.setJSON(id, {
      id, to, prenom, lang, type,
      attempts: 0, status: 'pending',
      created: new Date(ts).toISOString(),
      lastAttempt: null,
    });
    console.log(`[contact] step:email-queued id:${id}`);
  } catch (e) {
    console.error('[contact] step:email-queue-error', e.message);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ip = (event.headers['x-nf-client-connection-ip']
    || event.headers['x-forwarded-for']
    || 'unknown').split(',')[0].trim();

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide.' }) }; }

  // Honeypot
  if (body.website && body.website.trim() !== '') {
    console.log('[Honeypot] Bot détecté depuis', ip);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // reCAPTCHA
  const recaptchaOk = await verifyRecaptcha(body.recaptchaToken);
  if (!recaptchaOk) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Requête refusée.' }) };
  }

  // Rate limiting
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Trop de tentatives. Réessayez dans une heure.' }) };
  }

  // Validation & sanitisation
  const prenom     = sanitize(body.prenom    || '', 100);
  const nom        = sanitize(body.nom       || '', 100);
  const email      = sanitize(body.email     || '', 254);
  const telephone  = sanitize(body.telephone || '', 30);
  const message    = sanitize(body.message   || '', 2000);
  const newsletter = body.newsletter === true || body.newsletter === 'true';
  const lang       = ['fr', 'nl', 'en'].includes(body.lang) ? body.lang : 'fr';

  if (!prenom || !email || !telephone) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Prénom, email et téléphone requis.' }) };
  }
  if (!isValidEmail(email)) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Format email invalide.' }) };
  }

  const ts = Date.now();

  // ── 1. Formspree → Zoé ──────────────────────────────────────────────────────
  try {
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body   : JSON.stringify({ prenom, nom, email, telephone, message, _cc: PATRON_EMAIL }),
    });
    console.log(`[contact] step:formspree status:ok ts:${ts}`);
  } catch (e) {
    console.error(`[contact] step:formspree status:error ts:${ts}`, e.message);
  }

  // ── 2. Resend — confirmation patient ────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const from   = process.env.RESEND_FROM_EMAIL || 'Zoé — Zowe <onboarding@resend.dev>';

    try {
      const { subject, html } = buildPatientConfirm(prenom, lang);
      const { data, error } = await resend.emails.send({
        from,
        to      : email,
        replyTo : 'zoegrede.kine@gmail.com',
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      console.log(`[contact] step:resend-patient status:ok messageId:${data.id} ts:${ts}`);
    } catch (e) {
      console.error(`[contact] step:resend-patient status:error ts:${ts}`, e.message);
      await queueEmail({ to: email, prenom, lang, type: 'patient_confirm', ts });
    }

    // ── 3. Queue rappel 24h ────────────────────────────────────────────────────
    try {
      const store = getStore('reminders');
      const key   = `${ts}-${email.replace(/[^a-z0-9]/gi, '')}`;
      await store.setJSON(key, {
        prenom, email, lang,
        sendAt: new Date(ts + 24 * 3600 * 1000).toISOString(),
      });
      console.log(`[contact] step:reminder-queued status:ok ts:${ts}`);
    } catch (e) {
      console.error(`[contact] step:reminder-queued status:error ts:${ts}`, e.message);
    }

    // ── 4. Newsletter ──────────────────────────────────────────────────────────
    if (newsletter && AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email, firstName: prenom, lastName: nom,
          audienceId: AUDIENCE_ID, unsubscribed: false,
        });
      } catch (e) {
        console.error('[contact] step:newsletter status:error', e.message);
      }
    }
  } else {
    console.warn('[contact] RESEND_API_KEY non défini — email patient non envoyé');
    await queueEmail({ to: email, prenom, lang, type: 'patient_confirm', ts });
  }

  // ── 5. Analytics ───────────────────────────────────────────────────────────
  try {
    const aStore = getStore('analytics');
    const today  = new Date().toISOString().split('T')[0];
    const aKey   = `daily/${today}`;
    let aData = {};
    try { aData = await aStore.get(aKey, { type: 'json' }) || {}; } catch {}
    aData.form_submit = (aData.form_submit || 0) + 1;
    await aStore.setJSON(aKey, aData);
  } catch {}

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
