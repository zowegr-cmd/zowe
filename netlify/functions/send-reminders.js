// Netlify Scheduled Function — send-reminders.js
// S'exécute toutes les 30 min · envoie les rappels 24h arrivés à échéance
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('./_blobs');
const { createUnsubToken } = require('./unsubscribe');
const { buildReminder24h } = require('./_email-templates');

const SITE_URL = process.env.SITE_URL || 'https://zowekine.com';

exports.handler = async function () {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { statusCode: 200, body: 'No API key' };

  const resend    = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Zoé — Zowe <onboarding@resend.dev>';
  const store     = getStore('reminders');
  const now       = new Date();

  let list;
  try {
    const { blobs } = await store.list();
    list = blobs;
  } catch (e) {
    console.error('[Reminders list]', e.message);
    return { statusCode: 200, body: 'Blob error' };
  }

  for (const blob of list) {
    let reminder;
    try { reminder = await store.get(blob.key, { type: 'json' }); }
    catch { continue; }

    if (!reminder || new Date(reminder.sendAt) > now) continue;

    try {
      const unsubToken = createUnsubToken(reminder.email);
      const unsubUrl   = `${SITE_URL}/.netlify/functions/unsubscribe?token=${unsubToken}`;
      const lang       = reminder.lang || 'fr';

      const { subject, html } = buildReminder24h(reminder.prenom, lang, unsubUrl);

      await resend.emails.send({
        from   : fromEmail,
        to     : reminder.email,
        replyTo: 'zoegrede.kine@gmail.com',
        subject,
        html,
      });
      console.log(`[Reminders] Envoyé à ${reminder.email} (${lang})`);
      await store.delete(blob.key);
    } catch (e) {
      console.error('[Reminder send]', blob.key, e.message);
    }
  }

  return { statusCode: 200, body: 'done' };
};
