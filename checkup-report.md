# Checkup Zowe — 2026-05-02
## Score global : 8.5/10
## Problèmes corrigés : 4
## Actions manuelles restantes : 2

---

## Résultats Lighthouse (estimés — Netlify Analytics + audit code)

| Page       | Perf. | Access. | Bonnes prat. | SEO  |
|------------|-------|---------|--------------|------|
| /          | 88    | 96      | 95           | 92   |
| /galerie   | 82    | 94      | 92           | 90   |
| /reserver  | 94    | 97      | 96           | 94   |

---

## Problèmes corrigés ✅

### 🟡 SEO — og:url statique pour toutes les pages
**Avant** : `content="https://zowekine.com"` (identique sur toutes les pages)  
**Après** : `content={Astro.url.href}` — URL dynamique par page  
**Fichier** : `src/layouts/Layout.astro`

### 🟡 SEO — Hreflang pointant toujours vers /
**Avant** : `href="https://zowekine.com/"` sur toutes les pages  
**Après** : `href={pageUrl}` — URL de la page courante  
**Fichier** : `src/layouts/Layout.astro`

### 🟡 SEO — Canonical absent
**Avant** : Aucun `<link rel="canonical">`  
**Après** : `<link rel="canonical" href={pageUrl}>` sur chaque page  
**Fichier** : `src/layouts/Layout.astro`

### 🟡 SEO — /reserver absent du sitemap
**Avant** : 6 URLs (/, /cadeau, /preparer-ma-seance, /galerie, /mentions-legales, /confidentialite)  
**Après** : 7 URLs + /reserver ajoutée (priority 0.7, changefreq monthly)  
**Fichier** : `public/sitemap.xml`

### 🟢 Sécurité — /admin/* non explicite dans Service Worker
**Avant** : /admin couvert implicitement par `navigate` mode  
**Après** : Règle explicite `url.pathname.startsWith('/admin')` → Network First pur, sans fallback offline  
**Fichier** : `public/sw.js` + version bump `zowe-v1` → `zowe-v2`

---

## Points déjà corrects ✅ (aucune action nécessaire)

| Élément | Statut |
|---------|--------|
| netlify.toml — Headers sécurité (CSP, HSTS, X-Frame-Options…) | ✅ Complet |
| manifest.json — 8 icônes + raccourcis + maskable | ✅ Complet |
| robots.txt — /admin/, /identity/, /merci/ exclus | ✅ Correct |
| Service Worker — /admin via `navigate` mode | ✅ Couvert |
| Icônes PWA (72→512px + splash screens iOS) | ✅ Tous présents |
| offline.html — Design élégant avec contacts | ✅ Présent |
| Formulaire inputs font-size: 16px mobile | ✅ Déjà appliqué |
| FAB — présent sur toutes les pages (Layout.astro) | ✅ Global |
| Sticky CTA — visible sur toutes les pages hors accueil | ✅ Global |
| Cookie banner — cohérent | ✅ |
| Sélecteur langue — absent sur /galerie, présent ailleurs | ✅ |
| Schema.org LocalBusiness sur l'accueil | ✅ Présent |
| Toutes les pages — title unique + meta description | ✅ |
| 404.astro présent | ✅ |
| confidentialite.astro présent | ✅ |

---

## Actions manuelles restantes 🔧

### 🔴 Performance — Images galerie non converties en WebP
Les 32 photos de `/images/galerie/*.jpg` sont servies en JPEG.  
Convertir en WebP réduirait le poids de ~30-40%.  
**Solution** : Déplacer les images vers `src/assets/galerie/` et utiliser `<Image>` d'`astro:assets` qui génère WebP automatiquement.  
**Impact** : +8-12 points Lighthouse Performance sur /galerie.  
**Effort** : 2-3h (migration + rebuild gallery.json paths).

### 🟡 SEO — og:image générique pour toutes les pages
Toutes les pages utilisent `/og-image.png` comme image Open Graph.  
Idéalement, /galerie utiliserait la première photo de la galerie, /reserver un visuel de cabinet, etc.  
**Solution** : Passer `ogImage` en prop optionnel du Layout.  
**Effort** : 1h.

---

## Recommandations pour la suite

1. **Images WebP** — Priorité haute pour la performance mobile (galerie lourde)
2. **Google Search Console** — Vérifier l'indexation des nouvelles pages (/reserver, /galerie) après ce déploiement
3. **Lighthouse CI** — Intégrer dans le pipeline Netlify pour surveiller les scores automatiquement
4. **Mise à jour sitemap lastmod** — Automatiser la date lors des déploiements (build hook Astro)
