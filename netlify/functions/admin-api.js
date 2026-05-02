// Netlify Function — admin-api.js
// API admin — auth via header Authorization uniquement
// actions : stats · newsletter · unsub · csv · email-queue · retry-email · admin-logs
'use strict';
const { getStore } = require('./_blobs');
const { Resend }   = require('resend');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const RESEND_KEY     = process.env.RESEND_API_KEY  || '';
const AUDIENCE_ID    = process.env.RESEND_AUDIENCE_ID || '';

// ─── Auth — header Bearer uniquement (jamais dans l'URL) ─────────────────────
function auth(event) {
  const h = (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return !!(ADMIN_PASSWORD && h === ADMIN_PASSWORD);
}

// ─── Rate limiting — 5 échecs / 15 min → blocage 1h ──────────────────────────
async function checkAuthLimit(ip) {
  try {
    const store = getStore('admin-rate-limit');
    const key   = `ip:${(ip || '').replace(/[^a-z0-9:.]/gi, '')}`;
    const now   = Date.now();
    const WIN   = 15 * 60 * 1000;
    let d = { attempts: [], blockedUntil: 0 };
    try { d = await store.get(key, { type: 'json' }) || d; } catch {}
    if (d.blockedUntil && now < d.blockedUntil) return false;
    const recent = (d.attempts || []).filter(t => now - t < WIN);
    return recent.length < 5;
  } catch { return true; }
}

async function recordAuthFail(ip) {
  try {
    const store = getStore('admin-rate-limit');
    const key   = `ip:${(ip || '').replace(/[^a-z0-9:.]/gi, '')}`;
    const now   = Date.now();
    const WIN   = 15 * 60 * 1000;
    const BLK   = 60 * 60 * 1000;
    let d = { attempts: [], blockedUntil: 0 };
    try { d = await store.get(key, { type: 'json' }) || d; } catch {}
    const recent = (d.attempts || []).filter(t => now - t < WIN);
    recent.push(now);
    const blockedUntil = recent.length >= 5 ? now + BLK : 0;
    await store.setJSON(key, { attempts: recent, blockedUntil });
  } catch {}
}

async function clearAuthLimit(ip) {
  try {
    const store = getStore('admin-rate-limit');
    const key   = `ip:${(ip || '').replace(/[^a-z0-9:.]/gi, '')}`;
    await store.setJSON(key, { attempts: [], blockedUntil: 0 });
  } catch {}
}

// ─── Audit log ────────────────────────────────────────────────────────────────
async function logAuth(ip, ua, success, action) {
  try {
    const store = getStore('admin-logs');
    const now   = Date.now();
    const key   = `log:${now}:${Math.random().toString(36).slice(2, 6)}`;
    await store.setJSON(key, {
      timestamp: new Date(now).toISOString(),
      ip       : (ip || '').slice(0, 45),
      userAgent: (ua || '').slice(0, 200),
      success,
      action   : action || 'auth',
    });
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
      id          : c.id,
      email       : c.email,
      prenom      : c.first_name || '',
      nom         : c.last_name  || '',
      unsubscribed: c.unsubscribed,
      created     : c.created_at,
    }));
    return { contacts, source: 'resend' };
  } catch (e) {
    console.error('[newsletter]', e.message);
    return { contacts: [], source: 'error', error: e.message };
  }
}

async function unsubContact(contactId) {
  if (!RESEND_KEY || !AUDIENCE_ID) return false;
  const resend = new Resend(RESEND_KEY);
  await resend.contacts.update({ id: contactId, audienceId: AUDIENCE_ID, unsubscribed: true });
  return true;
}

// ─── Email queue ──────────────────────────────────────────────────────────────
async function getEmailQueue() {
  try {
    const store  = getStore('email-queue');
    const { blobs } = await store.list();
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    const emails = [];
    for (const b of blobs) {
      try {
        const item = await store.get(b.key, { type: 'json' });
        if (item && new Date(item.created).getTime() > cutoff) emails.push(item);
      } catch {}
    }
    emails.sort((a, b) => new Date(b.created) - new Date(a.created));
    return { emails };
  } catch (e) {
    return { emails: [], error: e.message };
  }
}

// ─── Admin logs ───────────────────────────────────────────────────────────────
async function getAdminLogs() {
  try {
    const store = getStore('admin-logs');
    const { blobs } = await store.list();
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const logs   = [];
    for (const b of blobs.slice(-200)) {
      try {
        const log = await store.get(b.key, { type: 'json' });
        if (log && new Date(log.timestamp).getTime() > cutoff) logs.push(log);
      } catch {}
    }
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { logs };
  } catch (e) {
    return { logs: [], error: e.message };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async function(event) {
  const ip = (event.headers['x-nf-client-connection-ip']
    || event.headers['x-forwarded-for']
    || 'unknown').split(',')[0].trim();
  const ua = event.headers['user-agent'] || '';

  // Rate limit AVANT auth
  const allowed = await checkAuthLimit(ip);
  if (!allowed) {
    return json({ error: 'Trop de tentatives. Réessayez dans une heure.' }, 429);
  }

  if (!auth(event)) {
    await recordAuthFail(ip);
    await logAuth(ip, ua, false, 'auth');
    return json({ error: 'Non autorisé.' }, 401);
  }

  await clearAuthLimit(ip);

  const action = event.queryStringParameters?.action
    || (event.httpMethod === 'POST' ? (JSON.parse(event.body || '{}').action || null) : null);

  await logAuth(ip, ua, true, action || 'unknown');

  // GET stats
  if (action === 'stats') {
    const days = Math.min(parseInt(event.queryStringParameters?.days || '30'), 90);
    return json(await getStats(days));
  }

  // GET newsletter
  if (action === 'newsletter') {
    return json(await getNewsletter());
  }

  // POST unsub
  if (action === 'unsub' && event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    if (!body.contactId) return json({ error: 'contactId requis.' }, 400);
    await unsubContact(body.contactId);
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
      body: '﻿' + rows.join('\r\n'),
    };
  }

  // GET email-queue
  if (action === 'email-queue') {
    return json(await getEmailQueue());
  }

  // POST retry-email
  if (action === 'retry-email' && event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    if (!body.emailId) return json({ error: 'emailId requis.' }, 400);
    try {
      const store = getStore('email-queue');
      const item  = await store.get(body.emailId, { type: 'json' });
      if (!item) return json({ error: 'Email introuvable.' }, 404);
      await store.setJSON(body.emailId, { ...item, status: 'pending', attempts: 0 });
      return json({ ok: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // GET admin-logs
  if (action === 'admin-logs') {
    return json(await getAdminLogs());
  }

  return json({ error: 'Action inconnue.' }, 400);
};
