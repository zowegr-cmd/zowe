// Netlify Scheduled Function — backup.js
// Sauvegarde quotidienne à 2h UTC du contenu CMS dans Netlify Blobs
// Conserve les 30 derniers backups
'use strict';

const { getStore } = require('@netlify/blobs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN  || '';
const GITHUB_REPO  = process.env.GITHUB_REPO   || 'zowegr-cmd/zowe';

const CONTENT_FILES = [
  'src/content/hero.json',
  'src/content/about.json',
  'src/content/experience.json',
  'src/content/services.json',
  'src/content/faq.json',
  'src/content/contact.json',
  'src/content/infos.json',
  'src/content/meta.json',
  'src/content/gallery.json',
  'src/content/session.json',
];

async function fetchFile(path) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'Zowe-Backup/1.0',
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res.text();
}

exports.handler = async function () {
  if (!GITHUB_TOKEN) {
    console.warn('[Backup] GITHUB_TOKEN manquant — backup ignoré');
    return { statusCode: 200, body: 'No token' };
  }

  const store  = getStore('backups');
  const date   = new Date().toISOString().split('T')[0];
  const backup = {};
  let   saved  = 0;

  for (const file of CONTENT_FILES) {
    try {
      backup[file] = await fetchFile(file);
      saved++;
    } catch (e) {
      console.error(`[Backup] ${file}:`, e.message);
    }
  }

  if (saved === 0) {
    console.error('[Backup] Aucun fichier sauvegardé');
    return { statusCode: 500, body: 'Backup failed' };
  }

  const key = `backup-${date}-${Date.now()}`;
  await store.set(key, JSON.stringify(backup));
  console.log(`[Backup] ${saved} fichiers sauvegardés → ${key}`);

  // Garder uniquement les 30 derniers backups
  try {
    const { blobs } = await store.list();
    const sorted = (blobs || []).map(b => b.key).sort();
    if (sorted.length > 30) {
      for (const old of sorted.slice(0, sorted.length - 30)) {
        await store.delete(old);
        console.log('[Backup] Suppression ancien backup:', old);
      }
    }
  } catch (e) {
    console.warn('[Backup] Nettoyage échoué:', e.message);
  }

  return { statusCode: 200, body: `Backup OK — ${saved} files` };
};
