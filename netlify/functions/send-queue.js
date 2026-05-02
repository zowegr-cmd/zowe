// Netlify Scheduled Function — send-queue.js
// S'exécute toutes les 5 min · envoie les emails en attente (retry après échec)
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('./_blobs');
const { buildPatientConfirm } = require('./_email-templates');
const { createUnsubToken }    = require('./unsubscribe');

const FORMSPREE_ID = process.env.FORMSPREE_ID || 'xqewvayo';
const PATRON_EMAIL = process.env.PATRON_EMAIL || 'patron@kinovea.be';
const SITE_URL     = process.env.SITE_URL     || 'https://zowekine.com';
const EMAIL_ZOE    = 'zoegrede.kine@gmail.com';

exports.handler = async function () {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { statusCode: 200, body: 'No API key' };

  const resend    = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Zoé — Zowe <onboarding@resend.dev>';
  const store     = getStore('email-queue');

  let list;
  try {
    const { blobs } = await store.list();
    list = blobs;
  } catch (e) {
    console.error('[send-queue] list error:', e.message);
    return { statusCode: 200, body: 'Blob error' };
  }

  let sent = 0, failed = 0;

  for (const blob of list) {
    let item;
    try { item = await store.get(blob.key, { type: 'json' }); }
    catch { continue; }

    if (!item || item.status !== 'pending') continue;

    try {
      let subject, html, text;
      if (item.type === 'patient_confirm') {
        ({ subject, html, text } = buildPatientConfirm(item.prenom, item.lang || 'fr'));
      } else {
        console.warn('[send-queue] type inconnu:', item.type);
        continue;
      }

      const unsubToken = createUnsubToken(item.to);
      const unsubUrl   = `${SITE_URL}/.netlify/functions/unsubscribe?token=${unsubToken}`;

      const { data, error } = await resend.emails.send({
        from   : fromEmail,
        to     : item.to,
        replyTo: EMAIL_ZOE,
        subject,
        html,
        text,
        headers: {
          'X-Mailer'             : 'Zowe Mailer 1.0',
          'List-Unsubscribe'     : `<mailto:${EMAIL_ZOE}?subject=unsubscribe>, <${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (error) throw new Error(error.message);

      await store.setJSON(blob.key, {
        ...item, status: 'sent',
        sentAt: new Date().toISOString(),
      });
      console.log(`[send-queue] sent id:${item.id} to:${item.to}`);
      sent++;

    } catch (e) {
      const attempts = (item.attempts || 0) + 1;
      console.error(`[send-queue] error id:${item.id} attempts:${attempts}`, e.message);

      if (attempts >= 3) {
        await store.setJSON(blob.key, {
          ...item, status: 'failed', attempts,
          lastAttempt: new Date().toISOString(),
        });
        // Alerter Zoé via Formspree
        try {
          await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body   : JSON.stringify({
              _to     : PATRON_EMAIL,
              subject : `[Zowe] Email échoué : ${item.to}`,
              message : `L'email de type "${item.type}" n'a pas pu être envoyé à ${item.to} après ${attempts} tentatives.`,
            }),
          });
        } catch {}
        failed++;
      } else {
        await store.setJSON(blob.key, {
          ...item, status: 'pending', attempts,
          lastAttempt: new Date().toISOString(),
        });
      }
    }
  }

  console.log(`[send-queue] done sent:${sent} failed:${failed}`);
  return { statusCode: 200, body: JSON.stringify({ sent, failed }) };
};
