// netlify/functions/_email-templates.js
// Templates email — confirmation patient premium + rappel 24h
// multilingue (fr/nl/en) · dark mode · plain text
'use strict';

const SITE_URL   = process.env.SITE_URL || 'https://zowekine.com';
const PHONE      = '0471 78 37 46';
const PHONE_INTL = '+32471783746';
const EMAIL_ZOE  = 'zoegrede.kine@gmail.com';
const IG_HANDLE  = '@kine.zowe';
const IG_URL     = 'https://instagram.com/kine.zowe';

// ── Traductions partagées (rappel 24h + chaînes communes) ─────────────────────
const TR = {
  fr: {
    subject_confirm:  "Bienvenue dans l'expérience Zowe — Votre demande a été reçue avec soin",
    subject_reminder: 'Zowe — Votre demande est bien entre nos mains',
    body1_reminder:   "Zoé prendra contact avec vous très prochainement pour convenir d'un moment qui vous correspond.",
    body2_reminder:   "N'hésitez pas à la contacter directement si vous le souhaitez.",
    footer_cta:       "D'ici là :",
    unsub:            'Se désinscrire',
    tagline:          'Kinésithérapie de haute précision · Méthode BELTRA',
  },
  nl: {
    subject_confirm:  'Welkom bij de Zowe-ervaring — Uw aanvraag is met zorg ontvangen',
    subject_reminder: 'Zowe — Uw aanvraag is in goede handen',
    body1_reminder:   'Zoé neemt binnenkort contact met u op om een geschikt moment te vinden.',
    body2_reminder:   'Aarzel niet om haar rechtstreeks te contacteren als u dat wenst.',
    footer_cta:       'In de tussentijd:',
    unsub:            'Uitschrijven',
    tagline:          'Hoge precisie kinesitherapie · BELTRA-methode',
  },
  en: {
    subject_confirm:  'Welcome to the Zowe experience — Your request has been received with care',
    subject_reminder: 'Zowe — Your request is in good hands',
    body1_reminder:   'Zoé will get in touch with you very soon to arrange a time that works for you.',
    body2_reminder:   'Feel free to contact her directly if you wish.',
    footer_cta:       'In the meantime:',
    unsub:            'Unsubscribe',
    tagline:          'High-precision physiotherapy · BELTRA method',
  },
};

// ── Traductions spécifiques confirmation premium (éditables depuis l'admin) ───
const CT = {
  fr: {
    subject:       "Bienvenue dans l'expérience Zowe — Votre demande a été reçue avec soin",
    tagline_hero:  "Votre demande a été reçue avec soin.",
    p1:            "Votre demande a été reçue avec toute l'attention qu'elle mérite.",
    p2:            "Zoé prendra personnellement contact avec vous dans la journée afin d'échanger sur vos besoins et de convenir ensemble du moment qui vous conviendra le mieux.",
    contact_title: "D'ici là, retrouvez Zoé directement",
    sig_name:      "Zoé",
    sig1:          "Kinésithérapie de haute précision",
    sig2:          "Méthode BELTRA",
    rights:        "Tous droits réservés.",
    unsub:         "Se désabonner",
  },
  nl: {
    subject:       "Welkom bij de Zowe-ervaring — Uw aanvraag is met zorg ontvangen",
    tagline_hero:  "Uw aanvraag is met zorg ontvangen.",
    p1:            "Uw aanvraag is met alle aandacht ontvangen die zij verdient.",
    p2:            "Zoé neemt vandaag nog persoonlijk contact met u op om uw behoeften te bespreken en samen het meest passende moment te kiezen.",
    contact_title: "In de tussentijd, bereik Zoé rechtstreeks",
    sig_name:      "Zoé",
    sig1:          "Hoge precisie kinesitherapie",
    sig2:          "BELTRA-methode",
    rights:        "Alle rechten voorbehouden.",
    unsub:         "Uitschrijven",
  },
  en: {
    subject:       "Welcome to the Zowe experience — Your request has been received with care",
    tagline_hero:  "Your request has been received with care.",
    p1:            "Your request has been received with all the attention it deserves.",
    p2:            "Zoé will personally get in touch with you today to discuss your needs and find a time that suits you best.",
    contact_title: "In the meantime, reach Zoé directly",
    sig_name:      "Zoé",
    sig1:          "High-precision physiotherapy",
    sig2:          "BELTRA method",
    rights:        "All rights reserved.",
    unsub:         "Unsubscribe",
  },
};

function t(lang, key)  { return (TR[lang] || TR.fr)[key]  || TR.fr[key]  || ''; }
function ct(lang, key) { return (CT[lang] || CT.fr)[key]  || CT.fr[key]  || ''; }

// ── Helper : ligne séparatrice dorée (table 1px) ──────────────────────────────
function goldLine(width) {
  const w = width || '100%';
  return `<table width="${w}" cellpadding="0" cellspacing="0" role="presentation" style="width:${w};margin:0 auto;"><tr><td height="1" bgcolor="#C9A96E" style="background-color:#C9A96E;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

// ── Email 1 : confirmation patient PREMIUM ────────────────────────────────────
// overrides : contenu édité depuis le panel admin (stocké dans Netlify Blobs)
function buildPatientConfirm(prenom, lang, unsubUrl, overrides) {
  if (!CT[lang]) lang = 'fr';
  const tx      = Object.assign({}, CT[lang], overrides || {});
  const subject = tx.subject || t(lang, 'subject_confirm');

  // Signature base64 — require() est mis en cache par Node après le 1er appel
  let sigTag = '';
  try {
    const b64 = require('./_sig_b64');
    sigTag = `<img src="data:image/png;base64,${b64}" width="180" alt="Signature Zoé Grêde" style="display:block;margin:0 auto 14px;max-width:180px;">`;
  } catch (_) {}

  const unsubRow = unsubUrl
    ? `<p style="margin:6px 0 0;text-align:center;"><a href="${unsubUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#C9A96E;text-decoration:underline;">${tx.unsub}</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .bg-cream  { background-color: #1A0508 !important; }
      .bg-white  { background-color: #2A0A10 !important; }
      .text-body { color: #E8DFD0 !important; }
      .text-sub  { color: #B0A090 !important; }
    }
    [data-ogsc] .bg-cream,[data-ogsb] .bg-cream { background-color: #1A0508 !important; }
    [data-ogsc] .bg-white,[data-ogsb] .bg-white  { background-color: #2A0A10 !important; }
    [data-ogsc] .text-body,[data-ogsb] .text-body { color: #E8DFD0 !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" class="bg-cream" style="background-color:#F5F0E8;padding:40px 16px;" role="presentation">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;" role="presentation">

<!-- ══ HEADER ══ -->
<tr>
  <td align="center" bgcolor="#6B1F2A" style="background-color:#6B1F2A;padding:36px 32px 24px;">
    <!--[if !mso]><!-->
    <svg width="70" height="70" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
      <g fill="#C9A96E">
        <path d="M 100 150 L 100 130 L 220 130 L 220 150 L 130 150 L 130 175 L 100 175 Z"/>
        <path d="M 220 130 L 240 130 L 100 290 L 80 290 Z"/>
        <path d="M 80 290 L 80 270 L 200 270 L 200 295 L 230 295 L 230 315 L 80 315 Z"/>
      </g>
      <g fill="#C9A96E" opacity="0.95">
        <path d="M 145 80 L 165 80 L 215 320 L 195 320 Z"/>
        <path d="M 140 80 L 170 80 L 170 88 L 140 88 Z"/>
        <path d="M 215 320 L 235 320 L 250 200 L 230 200 Z"/>
        <path d="M 250 200 L 270 200 L 285 320 L 265 320 Z"/>
        <path d="M 285 320 L 305 320 L 355 80 L 335 80 Z"/>
        <path d="M 330 80 L 360 80 L 360 88 L 330 88 Z"/>
      </g>
    </svg>
    <!--<![endif]-->
    <!--[if mso]><p style="font-family:Georgia,serif;font-size:40px;color:#C9A96E;text-align:center;margin:0;letter-spacing:8px;mso-line-height-rule:exactly;line-height:48px;">ZW</p><![endif]-->
    <p style="margin:14px 0 0;font-family:Georgia,serif;font-size:11px;letter-spacing:6px;color:#C9A96E;text-align:center;font-weight:400;text-transform:uppercase;">ZOWE</p>
    <p style="margin:20px 0 0;font-size:0;line-height:0;">&nbsp;</p>
  </td>
</tr>
<!-- Gold separator -->
<tr><td style="font-size:0;line-height:0;">${goldLine()}</td></tr>

<!-- ══ ACCROCHE ══ -->
<tr>
  <td align="center" class="bg-cream" style="background-color:#F5F0E8;padding:30px 48px 26px;">
    <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#6B1F2A;line-height:1.5;text-align:center;">${tx.tagline_hero}</p>
  </td>
</tr>
<tr><td style="font-size:0;line-height:0;">${goldLine()}</td></tr>

<!-- ══ CORPS ══ -->
<tr>
  <td class="bg-white" style="background-color:#ffffff;padding:44px 48px 40px;">
    <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p class="text-body" style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${tx.p1}</p>
    <p class="text-body" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${tx.p2}</p>
  </td>
</tr>

<!-- ══ BLOC CONTACT ══ -->
<tr>
  <td bgcolor="#6B1F2A" style="background-color:#6B1F2A;padding:28px 44px 32px;">
    <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:13px;font-style:italic;color:#C9A96E;letter-spacing:2px;text-align:center;">${tx.contact_title}</p>
    <table width="60" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 22px;">${goldLine(60)}</table>
    <!-- Téléphone -->
    <p style="margin:0 0 12px;text-align:center;">
      <a href="tel:${PHONE_INTL}" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#C9A96E;text-decoration:none;letter-spacing:1px;">${PHONE}</a>
    </p>
    <!-- Email -->
    <p style="margin:0 0 8px;text-align:center;">
      <a href="mailto:${EMAIL_ZOE}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#F5F0E8;text-decoration:none;">${EMAIL_ZOE}</a>
    </p>
    <!-- Instagram -->
    <p style="margin:0;text-align:center;">
      <a href="${IG_URL}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#C9A96E;text-decoration:none;">${IG_HANDLE}</a>
    </p>
  </td>
</tr>
<tr><td style="font-size:0;line-height:0;">${goldLine()}</td></tr>

<!-- ══ SIGNATURE ══ -->
<tr>
  <td align="center" class="bg-cream" style="background-color:#F5F0E8;padding:36px 40px 32px;">
    ${sigTag}
    <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;font-style:italic;color:#6B1F2A;text-align:center;">${tx.sig_name || 'Zoé'}</p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:4px;color:#C9A96E;text-align:center;text-transform:uppercase;">${tx.sig1}</p>
    <table width="30" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 14px;">${goldLine(30)}</table>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;color:#6B1F2A;text-align:center;text-transform:uppercase;">${tx.sig2}</p>
  </td>
</tr>

<!-- ══ FOOTER ══ -->
<tr>
  <td align="center" bgcolor="#0F0F0F" style="background-color:#0F0F0F;padding:24px 32px;">
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#888888;text-align:center;">&copy; 2025 Zowe &mdash; Zoé Grêde. ${tx.rights}</p>
    ${unsubRow}
    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#565656;text-align:center;">zowekine.com</p>
  </td>
</tr>

</table>
</td></tr>
</table>
</body></html>`;

  // ── Version texte plain ──────────────────────────────────────────────────────
  const SEP = '────────────────────────────────────────';
  const unsubLine = unsubUrl ? [`${tx.unsub}: ${unsubUrl}`] : [];
  const text = [
    'ZOWE',
    SEP,
    '',
    tx.tagline_hero,
    '',
    `${prenom},`,
    '',
    tx.p1,
    '',
    tx.p2,
    '',
    SEP,
    tx.contact_title,
    `  ${PHONE}`,
    `  ${EMAIL_ZOE}`,
    `  ${IG_HANDLE}`,
    '',
    SEP,
    'Zoé',
    `${tx.sig1} · ${tx.sig2}`,
    SITE_URL,
    ...unsubLine,
  ].join('\n');

  return { subject, html, text };
}

// ── Email 2 : rappel 24h (shell épuré + dark mode) ────────────────────────────
function buildReminder24h(prenom, lang, unsubUrl) {
  if (!TR[lang]) lang = 'fr';
  const subject  = t(lang, 'subject_reminder');
  const siteDomain = SITE_URL.replace('https://', '');

  const unsubHtml = unsubUrl
    ? `<p style="margin:8px 0 0;font-size:10px;text-align:center;"><a href="${unsubUrl}" style="color:#CCCCCC;text-decoration:underline;font-family:Arial,Helvetica,sans-serif;">${t(lang, 'unsub')}</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
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
      .em-br{border-top-color:#4A2A30!important;}
    }
    [data-ogsc] .em-bg,[data-ogsb] .em-bg{background-color:#1A0508!important;}
    [data-ogsc] .em-ct,[data-ogsb] .em-ct{background-color:#2A0A10!important;}
    [data-ogsc] .em-hd,[data-ogsb] .em-hd{color:#E8B89C!important;}
    [data-ogsc] .em-bd,[data-ogsb] .em-bd{color:#E8DFD0!important;}
    [data-ogsc] .em-lb,[data-ogsb] .em-lb{color:#E8B89C!important;}
  </style>
</head>
<body class="em-bg" style="margin:0;padding:0;background-color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" class="em-bg" style="background-color:#F5F0E8;padding:40px 16px;" role="presentation">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" class="em-ct" style="max-width:600px;width:100%;background-color:#ffffff;" role="presentation">
<tr><td style="padding:48px 48px 40px;">
  <!-- Header word mark -->
  <p class="em-hd" style="margin:0 0 36px;font-family:Georgia,serif;font-size:22px;letter-spacing:6px;color:#6B1F2A;font-weight:400;text-transform:uppercase;text-align:left;">ZOWE</p>
  <!-- Greeting -->
  <p class="em-hd" style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#6B1F2A;">${prenom},</p>
  <!-- Body -->
  <p class="em-bd" style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${t(lang, 'body1_reminder')}</p>
  <p class="em-bd" style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${t(lang, 'body2_reminder')}</p>
  <!-- Gold divider -->
  ${goldLine(40)}
  <!-- Contact -->
  <p class="em-sb" style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;line-height:1.8;">
    <a href="tel:${PHONE_INTL}" class="em-lb" style="color:#6B1F2A;text-decoration:none;font-weight:600;">${PHONE}</a>
    &nbsp;&middot;&nbsp;
    <a href="mailto:${EMAIL_ZOE}" class="em-lb" style="color:#6B1F2A;text-decoration:none;">${EMAIL_ZOE}</a>
  </p>
  <!-- Footer -->
  <div class="em-br" style="margin-top:36px;padding-top:20px;border-top:1px solid #EDE8DF;">
    <p class="em-sb" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#AAAAAA;letter-spacing:1px;">
      Zoé — Zowe &middot; ${t(lang, 'tagline')}<br>
      <a href="${SITE_URL}" style="color:#C9A96E;text-decoration:none;">${siteDomain}</a>
    </p>
    ${unsubHtml}
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  // ── Version texte plain ──────────────────────────────────────────────────────
  const SEP = '────────────────────────────────────────';
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

  return { subject, html, text };
}

module.exports = { buildPatientConfirm, buildReminder24h, CT_DEFAULTS: CT };
