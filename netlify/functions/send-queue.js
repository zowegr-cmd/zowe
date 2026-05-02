// Netlify Scheduled Function — send-queue.js
// S'exécute toutes les 5 min · envoie les emails en attente (retry après échec)
'use strict';

const { Resend }   = require('resend');
const { getStore } = require('./_blobs');
const { buildPatientConfirm, buildStaffNotification, buildPatronNotification } = require('./_email-templates');
const { createUnsubToken } = require('./unsubscribe');

const SITE_URL  = process.env.SITE_URL || 'https://zowekine.com';
const EMAIL_ZOE = 'zoegrede.kine@gmail.com';

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
      let subject, html, text, replyTo;

      if (item.type === 'patient_confirm') {
        const unsubToken = createUnsubToken(item.to);
        const unsubUrl   = `${SITE_URL}/.netlify/functions/unsubscribe?token=${unsubToken}`;
        const itemLang   = item.lang || 'fr';
        let emailContent = null;
        try {
          const cStore = getStore('email-content');
          emailContent = await cStore.get(`confirm:${itemLang}`, { type: 'json' });
        } catch (_) {}
        ({ subject, html, text } = buildPatientConfirm(item.prenom, itemLang, unsubUrl, emailContent));
        replyTo = EMAIL_ZOE;

      } else if (item.type === 'staff_notification') {
        ({ subject, html, text } = buildStaffNotification(item.staffData || {}));
        replyTo = item.staffData?.email || EMAIL_ZOE;

      } else if (item.type === 'patron_notification') {
        ({ subject, html, text } = buildPatronNotification(item.staffData || {}));
        replyTo = item.staffData?.email || EMAIL_ZOE;

      } else {
        console.warn('[send-queue] type inconnu:', item.type);
        continue;
      }

      const { data, error } = await resend.emails.send({
        from   : fromEmail,
        to     : item.to,
        replyTo,
        subject,
        html,
        text,
        headers: { 'X-Mailer': 'Zowe Mailer 1.0' },
      });
      if (error) throw new Error(error.message);

      await store.setJSON(blob.key, { ...item, status: 'sent', sentAt: new Date().toISOString() });
      console.log(`[send-queue] sent id:${item.id} type:${item.type} to:${item.to}`);
      sent++;

    } catch (e) {
      const attempts = (item.attempts || 0) + 1;
      console.error(`[send-queue] error id:${item.id} attempts:${attempts}`, e.message);

      if (attempts >= 3) {
        await store.setJSON(blob.key, { ...item, status: 'failed', attempts, lastAttempt: new Date().toISOString() });
        // Alerte Resend → Zoé
        try {
          await resend.emails.send({
            from   : fromEmail,
            to     : EMAIL_ZOE,
            subject: `[Zowe] ⚠️ Email échoué : ${item.to}`,
            html   : `<p>L'email de type <strong>${item.type}</strong> n'a pas pu être envoyé à ${item.to} après ${attempts} tentatives.</p>`,
            text   : `Email échoué : ${item.type} → ${item.to} (${attempts} tentatives)`,
          });
        } catch {}
        failed++;
      } else {
        await store.setJSON(blob.key, { ...item, status: 'pending', attempts, lastAttempt: new Date().toISOString() });
      }
    }
  }

  console.log(`[send-queue] done sent:${sent} failed:${failed}`);
  return { statusCode: 200, body: JSON.stringify({ sent, failed }) };
};
