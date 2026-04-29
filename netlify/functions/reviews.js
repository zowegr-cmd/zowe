// Netlify Function — reviews.js
// Récupère les avis Google (4★ et 5★ uniquement) · cache Netlify Blobs 1h
'use strict';

const { getStore } = require('@netlify/blobs');

const PLACE_ID   = process.env.GOOGLE_PLACE_ID    || 'ChIJn5VsMLzPw0cRY2yLPAmWNyE';
const CACHE_TTL  = 60 * 60 * 1000; // 1 heure
const CACHE_KEY  = 'google-reviews-cache';

exports.handler = async function () {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // ── Vérifier le cache ────────────────────────────────────────────────────
  try {
    const store  = getStore('reviews-cache');
    const cached = await store.get(CACHE_KEY, { type: 'json' });
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return json(cached.reviews);
    }
  } catch (_) { /* cache miss ou Blobs non disponible en local */ }

  // ── Pas de clé API → renvoyer tableau vide ───────────────────────────────
  if (!apiKey) {
    return json([]);
  }

  // ── Appel Places API ─────────────────────────────────────────────────────
  const url = [
    'https://maps.googleapis.com/maps/api/place/details/json',
    `?place_id=${PLACE_ID}`,
    `&fields=reviews`,
    `&language=fr`,
    `&reviews_sort=newest`,
    `&key=${apiKey}`,
  ].join('');

  let raw;
  try {
    const res = await fetch(url);
    raw = await res.json();
  } catch (e) {
    console.error('[Reviews fetch]', e.message);
    return json([]);
  }

  if (raw.status !== 'OK' || !raw.result?.reviews) {
    console.warn('[Reviews API]', raw.status, raw.error_message || '');
    return json([]);
  }

  // ── Filtrer 4★ et 5★ UNIQUEMENT ─────────────────────────────────────────
  const reviews = raw.result.reviews
    .filter(r => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.time - a.time)
    .slice(0, 5)
    .map(r => ({
      name   : r.author_name,
      rating : r.rating,
      date   : r.relative_time_description,
      text   : r.text || '',
    }));

  // ── Mettre en cache ───────────────────────────────────────────────────────
  try {
    const store = getStore('reviews-cache');
    await store.setJSON(CACHE_KEY, { ts: Date.now(), reviews });
  } catch (_) {}

  return json(reviews);
};

function json(data) {
  return {
    statusCode : 200,
    headers    : {
      'Content-Type'  : 'application/json',
      'Cache-Control' : 'public, max-age=3600',
    },
    body: JSON.stringify(data),
  };
}
