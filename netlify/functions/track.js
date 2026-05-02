// Netlify Function — track.js
// Endpoint public — enregistre les événements analytics dans Netlify Blobs
'use strict';
const { getStore } = require('./_blobs');

const SITE_URL = process.env.SITE_URL || 'https://zowekine.com';

const ALLOWED = new Set([
  'wa_click', 'ig_click', 'form_submit', 'share_click',
  'lang_fr', 'lang_nl', 'lang_en',
  'cta_click', 'cta_form', 'cta_itinerary',
  'form_submit_source',
]);

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers }; }

  const evt = body.event;
  if (!ALLOWED.has(evt)) return { statusCode: 400, headers };

  try {
    const store = getStore('analytics');
    const today = new Date().toISOString().split('T')[0];
    const key   = `daily/${today}`;
    let data = {};
    try { data = await store.get(key, { type: 'json' }) || {}; } catch {}
    data[evt] = (data[evt] || 0) + 1;
    await store.setJSON(key, data);
  } catch (e) { console.error('[track]', e.message); }

  return { statusCode: 200, headers, body: '{"ok":true}' };
};
