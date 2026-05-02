// netlify/functions/_blobs.js
// Wrapper @netlify/blobs — passe siteID/token explicitement si NETLIFY_BLOBS_CONTEXT absent
'use strict';
const { getStore: _gs } = require('@netlify/blobs');

function getStore(name) {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_TOKEN;
  // Contexte runtime Netlify (normal) : laisse la lib le détecter seule
  if (process.env.NETLIFY_BLOBS_CONTEXT) return _gs(name);
  // Fallback : variables manuelles (défini dans Netlify → Environment variables)
  if (siteID && token) return _gs({ name, siteID, token });
  // Dernière tentative — lève l'erreur native si vraiment rien n'est disponible
  return _gs(name);
}

module.exports = { getStore };
