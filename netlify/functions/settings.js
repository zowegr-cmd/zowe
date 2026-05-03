// Netlify Function — settings.js
// Endpoint public (pas d'auth) pour les settings côté client
'use strict';

const { getStore } = require('./_blobs');

const KQ_DEFAULTS = {
  enabled: false,
  url: '',
  domicile_enabled:     false,
  domicile_zones:       ['Rhode-Saint-Genèse', 'Uccle', 'Linkebeek', 'Beersel'],
  step1_desc:           { fr: 'Sélectionnez Rhode-Saint-Genèse comme emplacement.', nl: 'Selecteer Rhode-Saint-Genèse als locatie.', en: 'Select Rhode-Saint-Genèse as the location.' },
  step1_desc_domicile:  { fr: 'Sélectionnez Rhode-Saint-Genèse pour une séance au cabinet, ou À domicile si vous souhaitez que Zoé se déplace chez vous.', nl: 'Selecteer Rhode-Saint-Genèse voor een afspraak in het kabinet, of Aan huis als u wilt dat Zoé bij u thuis langskomt.', en: 'Select Rhode-Saint-Genèse for a clinic session, or At home if you would like Zoé to visit you.' },
  domicile_desc:        { fr: 'Zoé se déplace à votre domicile dans les zones suivantes :', nl: 'Zoé komt aan huis in de volgende zones :', en: 'Zoé visits you at home in the following areas :' },
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

  const HEADERS_JSON = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', 'Access-Control-Allow-Origin': '*' };

  if (type === 'kinoquick') {
    try {
      const store = getStore('settings');
      const saved = await store.get('kinoquick', { type: 'json' }).catch(() => null);
      const data  = saved ? Object.assign({}, KQ_DEFAULTS, saved) : KQ_DEFAULTS;
      return { statusCode: 200, headers: HEADERS_JSON, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(KQ_DEFAULTS) };
    }
  }

  if (type === 'mobile-accordion') {
    const DEFAULTS = { enabled: false, default_open: false, one_at_a_time: true };
    try {
      const store = getStore('settings');
      const saved = await store.get('mobile_accordion', { type: 'json' }).catch(() => null);
      const data  = saved ? Object.assign({}, DEFAULTS, saved) : DEFAULTS;
      return { statusCode: 200, headers: HEADERS_JSON, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(DEFAULTS) };
    }
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'type invalide' }) };
};
