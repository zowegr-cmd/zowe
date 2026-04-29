// Netlify Function — contact.js
// Gère : Formspree (Zoé) + Resend patient + Resend patron + rappel 24h + newsletter
'use strict';

const { Resend } = require('resend');
const { getStore } = require('@netlify/blobs');

const FORMSPREE_ID  = process.env.FORMSPREE_ID  || 'xqewvayo';
const PATRON_EMAIL  = process.env.PATRON_EMAIL   || 'patron@kinovea.be';
const RESEND_FROM   = process.env.RESEND_FROM    || 'Zoé — Zowe <onboarding@resend.dev>';
const AUDIENCE_ID   = process.env.RESEND_AUDIENCE_ID || '';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide.' }) }; }

  const {
    prenom = '', nom = '', email = '',
    telephone = '', message = '',
    newsletter = false,
  } = body;

  if (!prenom.trim() || !email.trim()) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Prénom et email requis.' }) };
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString('fr-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });

  // ── 1. Formspree → zoegrede.kine@gmail.com ──────────────────────────────
  try {
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ prenom, nom, email, telephone, message }),
    });
  } catch (e) { console.error('[Formspree]', e.message); }

  // ── Resend ───────────────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);

    // 2. Email patient — confirmation immédiate
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: email,
        subject: "Bienvenue dans l'expérience Zowe — Votre demande a été reçue avec soin",
        html: patientConfirmHtml(prenom),
      });
    } catch (e) { console.error('[Resend patient confirm]', e.message); }

    // 3. Email patron — notification immédiate
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: PATRON_EMAIL,
        subject: `Nouvelle demande Zowe — ${prenom} ${nom}`,
        html: patronNotifHtml({ prenom, nom, email, telephone, message, dateStr, timeStr }),
      });
    } catch (e) { console.error('[Resend patron]', e.message); }

    // 4. Rappel 24h — stocker dans Netlify Blobs (envoyé par la cron function)
    try {
      const store = getStore('reminders');
      const key   = `${now.getTime()}-${email.replace(/[^a-z0-9]/gi, '')}`;
      await store.setJSON(key, {
        prenom, email,
        sendAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (e) { console.error('[Blobs reminder]', e.message); }

    // 5. Newsletter → Resend Contacts (si audience configurée)
    if ((newsletter === true || newsletter === 'true') && AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          email,
          firstName: prenom,
          lastName: nom,
          audienceId: AUDIENCE_ID,
          unsubscribed: false,
        });
      } catch (e) { console.error('[Resend contact]', e.message); }
    }
  } else {
    console.warn('[Resend] RESEND_API_KEY manquant — emails Resend ignorés.');
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// ─── Templates email ─────────────────────────────────────────────────────────

function emailShell(title, content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:48px 44px 40px;">
  <p style="margin:0 0 36px;font-family:Georgia,serif;font-size:22px;letter-spacing:0.25em;color:#6B1F2A;font-weight:400;">ZOWE</p>
  ${content}
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #EDE8DF;">
    <p style="margin:0;font-size:11px;color:#AAAAAA;letter-spacing:0.05em;">
      Zoé — Zowe · Kinésithérapie de haute précision · Méthode BELTRA<br>
      <a href="https://zowe.netlify.app" style="color:#C9A96E;text-decoration:none;">zowe.netlify.app</a>
    </p>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function patientConfirmHtml(prenom) {
  return emailShell("Votre demande — Zowe", `
    <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
      Votre demande a été reçue avec toute l'attention qu'elle mérite.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">
      Zoé prendra personnellement contact avec vous dans la journée afin d'échanger sur vos besoins et de convenir ensemble du moment qui vous conviendra le mieux.
    </p>
    <div style="width:40px;height:1px;background:#C9A96E;margin:28px 0;opacity:0.6;"></div>
    <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.8;">
      D'ici là :
      <a href="tel:+32471783746" style="color:#6B1F2A;text-decoration:none;">0471 78 37 46</a>
      ·
      <a href="mailto:zoegrede.kine@gmail.com" style="color:#6B1F2A;text-decoration:none;">zoegrede.kine@gmail.com</a>
    </p>
  `);
}

function patientReminderHtml(prenom) {
  return emailShell("Votre demande est entre nos mains — Zowe", `
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
  `);
}

function patronNotifHtml({ prenom, nom, email, telephone, message, dateStr, timeStr }) {
  return emailShell(`Nouvelle demande — ${prenom} ${nom}`, `
    <p style="margin:0 0 24px;font-size:15px;color:#5C5C5C;line-height:1.6;">
      Nouvelle demande reçue via le formulaire Zowe.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE8DF;margin-bottom:24px;">
      ${row('Prénom', prenom)}
      ${row('Nom', nom)}
      ${row('Email', `<a href="mailto:${email}" style="color:#6B1F2A;">${email}</a>`)}
      ${row('GSM', telephone || '—')}
      ${row('Date', dateStr)}
      ${row('Heure', timeStr)}
    </table>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#C9A96E;">Message</p>
    <p style="margin:0;padding:16px;background:#F5F0E8;font-size:14px;color:#5C5C5C;line-height:1.75;white-space:pre-wrap;">${message || '—'}</p>
  `);
}

function row(label, value) {
  return `<tr>
    <td style="padding:10px 14px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#AAAAAA;border-bottom:1px solid #EDE8DF;white-space:nowrap;width:120px;">${label}</td>
    <td style="padding:10px 14px;font-size:14px;color:#1A1A1A;border-bottom:1px solid #EDE8DF;">${value}</td>
  </tr>`;
}
