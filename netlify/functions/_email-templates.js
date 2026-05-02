// netlify/functions/_email-templates.js
// Templates email centralisés — multilingue (fr/nl/en) + dark mode + plain text
'use strict';

const SITE_URL   = process.env.SITE_URL || 'https://zowekine.com';
const PHONE      = '0471 78 37 46';
const PHONE_INTL = '+32471783746';
const EMAIL_ZOE  = 'zoegrede.kine@gmail.com';

// ── Traductions ────────────────────────────────────────────────────────────────
const TR = {
  fr: {
    subject_confirm:  "Bienvenue dans l'expérience Zowe — Votre demande a été reçue avec soin",
    subject_reminder: 'Zowe — Votre demande est bien entre nos mains',
    body1_confirm:    "Votre demande a été reçue avec toute l'attention qu'elle mérite.",
    body2_confirm:    "Zoé prendra personnellement contact avec vous dans la journée afin d'échanger sur vos besoins et de convenir ensemble du moment qui vous conviendra le mieux.",
    footer_cta:       "D'ici là :",
    body1_reminder:   "Zoé prendra contact avec vous très prochainement pour convenir d'un moment qui vous correspond.",
    body2_reminder:   "N'hésitez pas à la contacter directement si vous le souhaitez.",
    unsub:            'Se désinscrire',
    tagline:          'Kinésithérapie de haute précision · Méthode BELTRA',
  },
  nl: {
    subject_confirm:  'Welkom bij de Zowe-ervaring — Uw aanvraag is met zorg ontvangen',
    subject_reminder: 'Zowe — Uw aanvraag is in goede handen',
    body1_confirm:    'Uw aanvraag is met alle aandacht ontvangen die zij verdient.',
    body2_confirm:    'Zoé neemt vandaag nog persoonlijk contact met u op om uw behoeften te bespreken en samen het meest passende moment te kiezen.',
    footer_cta:       'In de tussentijd:',
    body1_reminder:   'Zoé neemt binnenkort contact met u op om een geschikt moment te vinden.',
    body2_reminder:   'Aarzel niet om haar rechtstreeks te contacteren als u dat wenst.',
    unsub:            'Uitschrijven',
    tagline:          'Hoge precisie kinesitherapie · BELTRA-methode',
  },
  en: {
    subject_confirm:  'Welcome to the Zowe experience — Your request has been received with care',
    subject_reminder: 'Zowe — Your request is in good hands',
    body1_confirm:    'Your request has been received with all the attention it deserves.',
    body2_confirm:    'Zoé will personally get in touch with you today to discuss your needs and find a time that suits you best.',
    footer_cta:       'In the meantime:',
    body1_reminder:   'Zoé will get in touch with you very soon to arrange a time that works for you.',
    body2_reminder:   'Feel free to contact her directly if you wish.',
    unsub:            'Unsubscribe',
    tagline:          'High-precision physiotherapy · BELTRA method',
  },
};

function t(lang, key) {
  return (TR[lang] || TR.fr)[key] || TR.fr[key] || '';
}

// ── Shell HTML avec dark mode (classes em-*) ──────────────────────────────────
function emailShell(lang, content) {
  const siteDomain = SITE_URL.replace('https://', '');
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    :root{color-scheme:light dark;}
    @media(prefers-color-scheme:dark){
      body{background-color:#1A0508!important;}
      .em-bg{background-color:#1A0508!important;}
      .em-ct{background-color:#2A0A10!important;}
      .em-hd{color:#E8B89C!important;}
      .em-bd{color:#E8DFD0!important;}
      .em-sb{color:#B0A090!important;}
      .em-lb{color:#E8B89C!important;}
      .em-lg{color:#E8C896!important;}
      .em-dv{background-color:#E8C896!important;opacity:1!important;}
      .em-br{border-top-color:#4A2A30!important;}
      .em-us{color:#7A6A60!important;}
    }
    [data-ogsc] .em-bg,[data-ogsb] .em-bg{background-color:#1A0508!important;}
    [data-ogsc] .em-ct,[data-ogsb] .em-ct{background-color:#2A0A10!important;}
    [data-ogsc] .em-hd,[data-ogsb] .em-hd{color:#E8B89C!important;}
    [data-ogsc] .em-bd,[data-ogsb] .em-bd{color:#E8DFD0!important;}
    [data-ogsc] .em-sb,[data-ogsb] .em-sb{color:#B0A090!important;}
    [data-ogsc] .em-lb,[data-ogsb] .em-lb{color:#E8B89C!important;}
    [data-ogsc] .em-lg,[data-ogsb] .em-lg{color:#E8C896!important;}
  </style>
</head>
<body class="em-bg" style="margin:0;padding:0;background-color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" class="em-bg" style="background-color:#F5F0E8;padding:40px 20px;" role="presentation">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" class="em-ct" style="max-width:560px;margin:0 auto;background-color:#ffffff;" role="presentation">
<tr><td style="padding:48px 44px 40px;">
  <p class="em-hd" style="margin:0 0 36px;font-family:Georgia,serif;font-size:22px;letter-spacing:0.25em;color:#6B1F2A;font-weight:400;">ZOWE</p>
  ${content}
  <div class="em-br" style="margin-top:40px;padding-top:20px;border-top:1px solid #EDE8DF;">
    <p class="em-sb" style="margin:0;font-size:11px;color:#AAAAAA;letter-spacing:0.05em;">
      Zoé — Zowe · ${t(lang, 'tagline')}<br>
      <a href="${SITE_URL}" class="em-lg" style="color:#C9A96E;text-decoration:none;">${siteDomain}</a>
    </p>
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Séparateur texte plain ────────────────────────────────────────────────────
const SEP = '────────────────────────────────────────';

// ── Email 1 : confirmation patient ────────────────────────────────────────────
function buildPatientConfirm(prenom, lang) {
  if (!TR[lang]) lang = 'fr';

  const html = emailShell(lang, `
    <p class="em-hd" style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p class="em-bd" style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">${t(lang, 'body1_confirm')}</p>
    <p class="em-bd" style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">${t(lang, 'body2_confirm')}</p>
    <div class="em-dv" style="width:40px;height:1px;background-color:#C9A96E;margin:28px 0;opacity:0.6;"></div>
    <p class="em-sb" style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.8;">
      ${t(lang, 'footer_cta')}
      <a href="tel:${PHONE_INTL}" class="em-lb" style="color:#6B1F2A;text-decoration:none;">${PHONE}</a>
      ·
      <a href="mailto:${EMAIL_ZOE}" class="em-lb" style="color:#6B1F2A;text-decoration:none;">${EMAIL_ZOE}</a>
    </p>`);

  const text = [
    'ZOWE',
    SEP,
    '',
    `${prenom},`,
    '',
    t(lang, 'body1_confirm'),
    '',
    t(lang, 'body2_confirm'),
    '',
    `${t(lang, 'footer_cta')}`,
    `  ${PHONE}`,
    `  ${EMAIL_ZOE}`,
    '',
    SEP,
    `Zoé — Zowe · ${t(lang, 'tagline')}`,
    SITE_URL,
  ].join('\n');

  return { subject: t(lang, 'subject_confirm'), html, text };
}

// ── Email 2 : rappel 24h ──────────────────────────────────────────────────────
function buildReminder24h(prenom, lang, unsubUrl) {
  if (!TR[lang]) lang = 'fr';

  const unsubHtml = unsubUrl
    ? `<p style="margin:8px 0 0;font-size:10px;"><a href="${unsubUrl}" class="em-us" style="color:#CCCCCC;text-decoration:underline;">${t(lang, 'unsub')}</a></p>`
    : '';

  const html = emailShell(lang, `
    <p class="em-hd" style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p class="em-bd" style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">${t(lang, 'body1_reminder')}</p>
    <p class="em-bd" style="margin:0 0 16px;font-size:15px;color:#5C5C5C;line-height:1.8;">${t(lang, 'body2_reminder')}</p>
    <div class="em-dv" style="width:40px;height:1px;background-color:#C9A96E;margin:28px 0;opacity:0.6;"></div>
    <p class="em-sb" style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.8;">
      <a href="tel:${PHONE_INTL}" class="em-lb" style="color:#6B1F2A;text-decoration:none;">${PHONE}</a>
      ·
      <a href="mailto:${EMAIL_ZOE}" class="em-lb" style="color:#6B1F2A;text-decoration:none;">${EMAIL_ZOE}</a>
    </p>
    ${unsubHtml}`);

  const unsubLine = unsubUrl ? [`${t(lang, 'unsub')}: ${unsubUrl}`] : [];

  const text = [
    'ZOWE',
    SEP,
    '',
    `${prenom},`,
    '',
    t(lang, 'body1_reminder'),
    '',
    t(lang, 'body2_reminder'),
    '',
    `  ${PHONE}`,
    `  ${EMAIL_ZOE}`,
    '',
    SEP,
    `Zoé — Zowe · ${t(lang, 'tagline')}`,
    ...unsubLine,
  ].join('\n');

  return { subject: t(lang, 'subject_reminder'), html, text };
}

module.exports = { buildPatientConfirm, buildReminder24h };
