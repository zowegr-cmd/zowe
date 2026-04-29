// Netlify Scheduled Function — send-reminders.js
// S'exécute toutes les 30 min · envoie les rappels 24h arrivés à échéance
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('@netlify/blobs');
const { createUnsubToken } = require('./unsubscribe');

exports.handler = async function () {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { statusCode: 200, body: 'No API key' };

  const resend    = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM || 'Zoé — Zowe <onboarding@resend.dev>';
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

    // C'est l'heure d'envoyer
    try {
      const unsubToken = createUnsubToken(reminder.email);
      const unsubUrl   = `https://zowe.netlify.app/.netlify/functions/unsubscribe?token=${unsubToken}`;
      await resend.emails.send({
        from: fromEmail,
        to: reminder.email,
        subject: 'Zowe — Votre demande est bien entre nos mains',
        html: reminderHtml(reminder.prenom, unsubUrl),
      });
      await store.delete(blob.key); // Supprimer après envoi
    } catch (e) {
      console.error('[Reminder send]', blob.key, e.message);
    }
  }

  return { statusCode: 200, body: 'done' };
};

function reminderHtml(prenom, unsubUrl) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:48px 44px 40px;">
  <p style="margin:0 0 36px;font-family:Georgia,serif;font-size:22px;letter-spacing:0.25em;color:#6B1F2A;">ZOWE</p>
  <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;">${prenom},</p>
  <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
    Zoé prendra contact avec vous très prochainement pour convenir d'un moment qui vous correspond.
  </p>
  <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
    N'hésitez pas à la contacter directement si vous le souhaitez.
  </p>
  <div style="width:40px;height:1px;background:#C9A96E;margin:28px 0;opacity:0.6;"></div>
  <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.8;">
    <a href="tel:+32471783746" style="color:#6B1F2A;text-decoration:none;">0471 78 37 46</a>
    ·
    <a href="mailto:zoegrede.kine@gmail.com" style="color:#6B1F2A;text-decoration:none;">zoegrede.kine@gmail.com</a>
  </p>
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #EDE8DF;">
    <p style="margin:0;font-size:11px;color:#AAAAAA;letter-spacing:0.05em;">
      Zoé — Zowe · Kinésithérapie de haute précision · Méthode BELTRA
    </p>
    ${unsubUrl ? `<p style="margin:8px 0 0;font-size:10px;color:#CCCCCC;">
      <a href="${unsubUrl}" style="color:#CCCCCC;text-decoration:underline;">Se désinscrire</a>
    </p>` : ''}
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
