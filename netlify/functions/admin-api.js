// Netlify Function — admin-api.js
// API admin protégée par mot de passe (ADMIN_PASSWORD)
// actions : stats · newsletter · unsub · csv
'use strict';
const { getStore } = require('@netlify/blobs');
const { Resend }   = require('resend');

const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || '';
const RESEND_KEY      = process.env.RESEND_API_KEY || '';
const AUDIENCE_ID     = process.env.RESEND_AUDIENCE_ID || '';

function auth(event) {
  const h     = (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  const query = (event.queryStringParameters || {}).token || '';
  const token = h || query;
  return !!(ADMIN_PASSWORD && token === ADMIN_PASSWORD);
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

// ─── Stats 30 jours ───────────────────────────────────────────────────────────
async function getStats(days = 30) {
  const store  = getStore('analytics');
  const result = [];
  const now    = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d    = new Date(now); d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    let data = {};
    try { data = await store.get(`daily/${date}`, { type: 'json' }) || {}; } catch {}
    result.push({ date, ...data });
  }

  const totals = result.reduce((acc, day) => {
    for (const k of Object.keys(day)) {
      if (k === 'date') continue;
      acc[k] = (acc[k] || 0) + day[k];
    }
    return acc;
  }, {});

  return { days: result, totals };
}

// ─── Newsletter (Resend) ──────────────────────────────────────────────────────
async function getNewsletter() {
  if (!RESEND_KEY || !AUDIENCE_ID) return { contacts: [], source: 'none' };
  try {
    const resend = new Resend(RESEND_KEY);
    const { data, error } = await resend.contacts.list({ audienceId: AUDIENCE_ID });
    if (error) throw new Error(error.message);
    const contacts = (data?.data || []).map(c => ({
      id:          c.id,
      email:       c.email,
      prenom:      c.first_name || '',
      nom:         c.last_name  || '',
      unsubscribed:c.unsubscribed,
      created:     c.created_at,
    }));
    return { contacts, source: 'resend' };
  } catch (e) {
    console.error('[newsletter]', e.message);
    return { contacts: [], source: 'error', error: e.message };
  }
}

// ─── Désinscription manuelle ──────────────────────────────────────────────────
async function unsubscribe(contactId) {
  if (!RESEND_KEY || !AUDIENCE_ID) return false;
  const resend = new Resend(RESEND_KEY);
  await resend.contacts.update({ id: contactId, audienceId: AUDIENCE_ID, unsubscribed: true });
  return true;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async function(event) {
  if (!auth(event)) return json({ error: 'Non autorisé.' }, 401);

  const action = event.queryStringParameters?.action
    || (event.httpMethod === 'POST' ? JSON.parse(event.body || '{}').action : null);

  // GET stats
  if (action === 'stats') {
    const days = parseInt(event.queryStringParameters?.days || '30');
    return json(await getStats(Math.min(days, 90)));
  }

  // GET newsletter
  if (action === 'newsletter') {
    return json(await getNewsletter());
  }

  // POST unsub
  if (action === 'unsub' && event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const { contactId } = body;
    if (!contactId) return json({ error: 'contactId requis.' }, 400);
    await unsubscribe(contactId);
    return json({ ok: true });
  }

  // GET csv
  if (action === 'csv') {
    const { contacts } = await getNewsletter();
    const rows = ['Prénom,Nom,Email,Date inscription,Désinscrit'];
    for (const c of contacts) {
      const date = c.created ? c.created.split('T')[0] : '';
      rows.push(`"${c.prenom}","${c.nom}","${c.email}","${date}","${c.unsubscribed ? 'oui' : 'non'}"`);
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="newsletter-zowe.csv"',
        'Cache-Control': 'no-store',
      },
      body: '﻿' + rows.join('\r\n'), // BOM for Excel
    };
  }

  return json({ error: 'Action inconnue.' }, 400);
};
