# Migration zowekine.com — Checklist des actions manuelles

## 1. Netlify — Configuration du domaine

- [ ] Aller dans **Site settings → Domain management → Add custom domain**
- [ ] Ajouter `zowekine.com`
- [ ] Ajouter `www.zowekine.com` → configuré en alias ou redirection 301
- [ ] Activer **HTTPS automatique Let's Encrypt** (bouton Verify DNS)
- [ ] Vérifier que `zowe.netlify.app` redirige bien vers `zowekine.com` (configuré dans netlify.toml)

## 2. Registrar (là où zowekine.com a été acheté)

- [ ] Ajouter les enregistrements DNS Netlify :
  - `A` ou `ALIAS/CNAME` sur `@` → `apex-loadbalancer.netlify.com`
  - `CNAME` sur `www` → `zowekine.netlify.app`

## 3. Resend — Envoi depuis contact@zowekine.com

- [ ] Aller sur **resend.com → Domains → Add Domain → `zowekine.com`**
- [ ] Resend fournit des enregistrements DNS (SPF, DKIM, DMARC) — les ajouter chez le registrar
- [ ] Attendre la vérification (5–30 min)
- [ ] Aller dans **Netlify → Site settings → Environment variables** et ajouter :
  ```
  RESEND_FROM_EMAIL = Zoé — Zowe <contact@zowekine.com>
  SITE_URL          = https://zowekine.com
  ```
- [ ] Vérifier l'envoi avec un formulaire test → email reçu depuis `contact@zowekine.com` ✓

## 4. Google Search Console

- [ ] Ajouter la propriété `https://zowekine.com` dans Google Search Console
- [ ] Soumettre le sitemap : `https://zowekine.com/sitemap.xml`
- [ ] Demander l'indexation de la page d'accueil

## 5. Google Analytics GA4

- [ ] Aller dans **GA4 → Admin → Data streams → Web**
- [ ] Mettre à jour l'URL du flux : `https://zowekine.com`
- [ ] Vérifier que le tag continue de fonctionner (Realtime dans GA4)

## 6. Google My Business

- [ ] Aller dans **Google Business Profile**
- [ ] Mettre à jour le site web : `https://zowekine.com`

## 7. reCAPTCHA

- [ ] Aller dans **Google reCAPTCHA Admin Console**
- [ ] Ajouter `zowekine.com` dans la liste des domaines autorisés
- [ ] (Optionnel) Supprimer `zowe.netlify.app` si plus utilisé

## 8. Instagram & réseaux sociaux

- [ ] Mettre à jour le lien en bio Instagram : `https://zowekine.com`
- [ ] Mettre à jour les 3 QR codes si imprimés (reel, story, WhatsApp)
  - Nouveaux liens UTM dans `/public/utm-links.txt`

## 9. Variables Netlify — Récapitulatif complet

| Variable               | Valeur attendue                              | Statut     |
|------------------------|----------------------------------------------|------------|
| `RESEND_API_KEY`       | `re_xxxxxxxxxxxx`                            | Existante  |
| `RESEND_FROM_EMAIL`    | `Zoé — Zowe <contact@zowekine.com>`          | **À ajouter** |
| `RESEND_AUDIENCE_ID`   | ID de l'audience Resend                      | Existante  |
| `SITE_URL`             | `https://zowekine.com`                       | **À ajouter** |
| `ADMIN_PASSWORD`       | Mot de passe dashboard (sans espace parasite)| Existante  |
| `FORMSPREE_ID`         | `xqewvayo`                                   | Existante  |
| `PATRON_EMAIL`         | Email de notification Zoé                    | Existante  |
| `RECAPTCHA_SECRET_KEY` | Clé secrète reCAPTCHA v3                     | Existante  |
| `ADMIN_JWT_SECRET`     | Secret pour tokens désabonnement             | Existante  |
| `BREVO_API_KEY`        | ~~Plus utilisé~~                             | **À supprimer** |

> **Note ADMIN_PASSWORD** : si le dashboard ne fonctionne pas, vérifier qu'il n'y a pas d'espace avant/après la valeur dans Netlify. Le mot de passe doit correspondre exactement, caractère par caractère.

## 10. Tests de validation post-migration

- [ ] **F.A** — Soumettre le formulaire → email Zoé reçu (Formspree) + email patient reçu depuis `contact@zowekine.com`
- [ ] **F.B** — Tenter 6 mauvais mots de passe dashboard → bloqué 1h, message 429
- [ ] **F.C** — Dashboard : onglet Emails affiche les envois des 7 derniers jours
- [ ] **F.D** — Dashboard : onglet Sécurité affiche les logs de connexion
- [ ] **F.E** — Couper Resend (mauvaise clé) → formulaire → email en statut `pending` dans onglet Emails → remettre clé → `sent` au prochain cron (5 min)
- [ ] **F.F** — `https://zowekine.com` → site s'affiche ✓
- [ ] **F.F** — `https://zowe.netlify.app` → redirige 301 vers `zowekine.com` ✓
- [ ] **F.F** — `https://www.zowekine.com` → redirige 301 vers `zowekine.com` ✓
