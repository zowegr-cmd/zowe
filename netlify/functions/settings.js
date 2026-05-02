// Netlify Function — settings.js
// Endpoint public (pas d'auth) pour les settings côté client
'use strict';

const { getStore } = require('./_blobs');

const KQ_DEFAULTS = {
  enabled: false,
  url: '',
  button_text: { fr: 'Réserver un Bilan Précision', nl: 'Boek een Precisie-audit', en: 'Book a Precision Assessment' },
  badge:       { fr: 'Disponibilité immédiate', nl: 'Directe beschikbaarheid', en: 'Immediate availability' },
  titre:       { fr: 'Réserver un Bilan Précision', nl: 'Boek een Precisie-audit', en: 'Book a Precision Assessment' },
  description: { fr: "Choisissez directement votre créneau dans l'agenda de Zoé.", nl: 'Kies direct uw tijdslot in de agenda van Zoé.', en: "Choose your slot directly in Zoé's calendar." },
  detail:      { fr: '30 min · 60€', nl: '30 min · 60€', en: '30 min · 60€' },
  btn:         { fr: 'Réserver maintenant', nl: 'Nu reserveren', en: 'Book now' },
  separateur:  { fr: 'ou', nl: 'of', en: 'or' },
};

exports.handler = async function (event) {
  const type = (event.queryStringParameters || {}).type;

  if (type !== 'kinoquick') {
    return { statusCode: 400, body: JSON.stringify({ error: 'type invalide' }) };
  }

  try {
    const store = getStore('settings');
    const saved = await store.get('kinoquick', { type: 'json' }).catch(() => null);
    const data  = saved ? Object.assign({}, KQ_DEFAULTS, saved) : KQ_DEFAULTS;
    return {
      statusCode: 200,
      headers: {
        'Content-Type' : 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(KQ_DEFAULTS),
    };
  }
};
