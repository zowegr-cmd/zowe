// netlify/functions/_email-templates.js
// Templates email — confirmation patient premium + rappel 24h
// multilingue (fr/nl/en) · anti dark-mode inversion · plain text
'use strict';

const SITE_URL   = process.env.SITE_URL || 'https://zowekine.com';
const PHONE      = '0471 78 37 46';
const PHONE_INTL = '+32471783746';
const EMAIL_ZOE  = 'zoegrede.kine@gmail.com';
const IG_HANDLE  = '@kine.zowe';
const IG_URL     = 'https://instagram.com/kine.zowe';

// ── Actifs binaires chargés au démarrage du module (mis en cache) ─────────────
let _SIG_B64      = '';
let _MONOGRAM_B64 = '';
try { _SIG_B64      = require('./_sig_b64');      } catch (_) {}
try { _MONOGRAM_B64 = require('./_monogram_b64'); } catch (_) {}

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

  // Monogramme — centrage via align="center" du td, pas display:block
  const monogramSrc = `${SITE_URL}/images/monogram-email.png`;
  const monogramTag = `<img src="${monogramSrc}" width="80" height="77" alt="" border="0" style="border:0;outline:none;text-decoration:none;">`;

  // Signature manuscrite — URL absolue HTTPS, alignée à droite dans le corps
  const sigSrc = `${SITE_URL}/images/signature_zoe_premium.png`;
  const sigTag = `<img src="${sigSrc}" width="160" height="auto" alt="Signature Zoé Grêde" border="0" style="display:block;margin:0;max-width:160px;border:0;outline:none;text-decoration:none;">`;

  const unsubRow = unsubUrl
    ? `<p style="margin:6px 0 0;text-align:center;"><a href="${unsubUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#C9A96E;text-decoration:underline;">${tx.unsub}</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style type="text/css">
    /* Bloquer TOUTE inversion automatique de couleur (Samsung, Gmail) */
    :root { color-scheme: light only; }
    * { -webkit-text-size-adjust: 100%; }

    /* ── Classes couleur forcées ── */
    .header-bg  { background-color: #6B1F2A !important; }
    .contact-bg { background-color: #6B1F2A !important; }
    .cream-bg   { background-color: #F5F0E8 !important; }
    .white-bg   { background-color: #FFFFFF !important; }
    .footer-bg  { background-color: #0F0F0F !important; }

    /* ── Bloquer inversion Outlook.com mode sombre ── */
    [data-ogsc] .header-bg,  [data-ogsb] .header-bg  { background-color: #6B1F2A !important; }
    [data-ogsc] .contact-bg, [data-ogsb] .contact-bg { background-color: #6B1F2A !important; }
    [data-ogsc] .cream-bg,   [data-ogsb] .cream-bg   { background-color: #F5F0E8 !important; }
    [data-ogsc] .white-bg,   [data-ogsb] .white-bg   { background-color: #FFFFFF !important; }
    [data-ogsc] .footer-bg,  [data-ogsb] .footer-bg  { background-color: #0F0F0F !important; }

    /* ── Samsung Mail / clients qui ignorent color-scheme ── */
    @media (prefers-color-scheme: dark) {
      .header-bg  { background-color: #6B1F2A !important; }
      .contact-bg { background-color: #6B1F2A !important; }
      .cream-bg   { background-color: #F5F0E8 !important; }
      .white-bg   { background-color: #1a1a1a !important; }
      .footer-bg  { background-color: #0F0F0F !important; }
      .text-body  { color: #E8DFD0 !important; }
    }

    /* ── Mobile ── */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-body      { padding: 28px 20px !important; }
      .contact-block   { padding: 22px 20px !important; }
      .sig-block       { padding: 28px 20px !important; }
      .phone-link      { font-size: 22px !important; }
      .accroche-text   { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F0E8;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;width:100%;">

<!-- ══ HEADER ══ -->
<tr>
  <td align="center" bgcolor="#6B1F2A" class="header-bg" style="background-color:#6B1F2A;padding:36px 32px 24px;">
    ${monogramTag}
    <p style="margin:14px 0 0;font-family:Georgia,serif;font-size:11px;letter-spacing:8px;color:#C9A96E;text-align:center;font-weight:400;text-transform:uppercase;">Z O W E</p>
    <p style="margin:16px 0 0;font-size:0;line-height:0;">${goldLine(40)}</p>
  </td>
</tr>

<!-- ══ ACCROCHE ══ -->
<tr>
  <td align="center" bgcolor="#F5F0E8" class="cream-bg" style="background-color:#F5F0E8;padding:30px 48px 26px;">
    <p class="accroche-text" style="margin:0;font-family:Georgia,serif;font-size:22px;font-style:italic;color:#6B1F2A;line-height:1.5;text-align:center;">${tx.tagline_hero}</p>
  </td>
</tr>
<tr><td bgcolor="#F5F0E8" class="cream-bg" style="background-color:#F5F0E8;font-size:0;line-height:0;">${goldLine()}</td></tr>

<!-- ══ CORPS ══ -->
<tr>
  <td bgcolor="#FFFFFF" class="white-bg email-body" style="background-color:#FFFFFF;padding:44px 48px 32px;border-left:1px solid #EDE8E0;border-right:1px solid #EDE8E0;">
    <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#6B1F2A;">${prenom},</p>
    <p class="text-body" style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${tx.p1}</p>
    <p class="text-body" style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#4A4A4A;line-height:1.85;">${tx.p2}</p>
    <!-- Signature manuscrite alignée à droite -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
      <tr>
        <td align="right" style="padding:0;">
          ${sigTag}
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- ══ BLOC CONTACT ══ -->
<tr>
  <td align="center" bgcolor="#6B1F2A" class="contact-bg contact-block" style="background-color:#6B1F2A;padding:32px 44px 36px;">
    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:13px;font-style:italic;color:#C9A96E;letter-spacing:2px;text-align:center;">${tx.contact_title}</p>
    <!-- Icônes cliquables -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="padding:0 10px;">
          <a href="mailto:${EMAIL_ZOE}" style="text-decoration:none;">
            <img src="${SITE_URL}/images/icon-email.png" width="44" height="44" alt="Email" border="0" style="display:block;border:0;outline:none;">
          </a>
        </td>
        <td style="padding:0 10px;">
          <a href="${IG_URL}" style="text-decoration:none;">
            <img src="${SITE_URL}/images/icon-instagram.png" width="44" height="44" alt="Instagram" border="0" style="display:block;border:0;outline:none;">
          </a>
        </td>
        <td style="padding:0 10px;">
          <a href="https://wa.me/${PHONE_INTL.replace('+','')}" style="text-decoration:none;">
            <img src="${SITE_URL}/images/icon-whatsapp.png" width="44" height="44" alt="WhatsApp" border="0" style="display:block;border:0;outline:none;">
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>
<!-- ══ MENTIONS LÉGALES ══ -->
<tr>
  <td align="center" bgcolor="#F5F0E8" class="cream-bg" style="background-color:#F5F0E8;padding:20px 40px 28px;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#AAAAAA;text-align:center;line-height:1.8;">
      Zoé Grêde · Kinésithérapeute · Méthode BELTRA<br>
      Rue des Iris, Boîte 2 · 1640 Rhode-Saint-Genèse<br>
      <a href="${SITE_URL}/mentions-legales" style="color:#AAAAAA;text-decoration:none;">Mentions légales</a>
      &nbsp;·&nbsp;
      <a href="${SITE_URL}/confidentialite" style="color:#AAAAAA;text-decoration:none;">Confidentialité</a>
      &nbsp;·&nbsp;
      <a href="${SITE_URL}" style="color:#AAAAAA;text-decoration:none;">zowekine.com</a>
    </p>
  </td>
</tr>


</table>
</td>
</tr>
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
    tx.sig_name || 'Zoé',
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
