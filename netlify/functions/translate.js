// Netlify Function — translate.js
// Proxy Google Translate (client=gtx, gratuit, pas de clé API)
// POST { texts: string[], lang: "nl"|"en" } → { translations: string[] }
'use strict';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { texts, lang } = body;
  if (!Array.isArray(texts) || !texts.length || !['nl', 'en'].includes(lang)) {
    return { statusCode: 400, body: 'texts[] + lang (nl|en) requis' };
  }

  // Limite : 200 textes max, 500 chars par texte
  const safe = texts.slice(0, 200).map(function(t) {
    return typeof t === 'string' ? t.slice(0, 500) : '';
  });

  try {
    const translations = await Promise.all(safe.map(function(text) {
      if (!text.trim()) return Promise.resolve(text);
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl='
                + encodeURIComponent(lang) + '&dt=t&q=' + encodeURIComponent(text);
      return fetch(url)
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (!data || !Array.isArray(data[0])) return text;
          return data[0].map(function(seg) { return seg[0] || ''; }).join('');
        })
        .catch(function() { return text; });
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations }),
    };
  } catch (e) {
    console.error('[translate]', e.message);
    return { statusCode: 500, body: 'Translation error' };
  }
};
