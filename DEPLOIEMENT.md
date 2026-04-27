# Guide de mise en ligne — Site Zowe

Suivez ces étapes dans l'ordre. Durée estimée : 30 minutes.

---

## ÉTAPE 1 — Créer un compte GitHub (gratuit)

1. Allez sur **github.com** et créez un compte (bouton "Sign up")
2. Choisissez le plan gratuit
3. Vérifiez votre adresse email

---

## ÉTAPE 2 — Mettre le dossier Zowe sur GitHub

1. Une fois connecté sur GitHub, cliquez sur le bouton vert **"New"** (ou **"+"** en haut à droite → "New repository")
2. Nommez le dépôt : `zowe-site`
3. Laissez-le en **Public**
4. Cliquez **"Create repository"**
5. Sur la page suivante, cliquez **"uploading an existing file"**
6. Glissez-déposez **tout le contenu** du dossier Zowe (tous les fichiers et dossiers)
7. Cliquez **"Commit changes"** en bas de la page

---

## ÉTAPE 3 — Créer un compte Netlify et connecter GitHub

1. Allez sur **netlify.com** et créez un compte gratuit (choisissez "Sign up with GitHub")
2. Autorisez Netlify à accéder à votre GitHub
3. Cliquez **"Add new site"** → **"Import an existing project"**
4. Choisissez **GitHub**, puis sélectionnez le dépôt `zowe-site`
5. Les paramètres de build se remplissent automatiquement grâce au fichier `netlify.toml`
6. Cliquez **"Deploy site"**
7. Attendez 2-3 minutes → votre site est en ligne ! Netlify vous donne une URL du type `zowe-site.netlify.app`

---

## ÉTAPE 4 — Activer le panneau d'administration (Decap CMS)

### 4a — Activer Netlify Identity

1. Dans votre tableau de bord Netlify, allez dans **Site configuration** → **Identity**
2. Cliquez **"Enable Identity"**
3. Dans la section **"Registration"**, sélectionnez **"Invite only"** (pour que seul vous puissiez vous connecter)
4. Descendez jusqu'à **"External providers"** et activez **GitHub** (optionnel mais pratique)

### 4b — Activer Git Gateway

1. Toujours dans **Identity**, descendez jusqu'à **"Services"**
2. Cliquez **"Enable Git Gateway"**
3. Cliquez **"Save"**

### 4c — Vous inviter comme administrateur

1. Dans **Identity**, cliquez **"Invite users"**
2. Entrez votre propre adresse email
3. Vous recevrez un email d'invitation → cliquez le lien pour créer votre mot de passe admin

---

## ÉTAPE 5 — Configurer Formspree (emails de RDV)

1. Allez sur **formspree.io** et créez un compte gratuit (jusqu'à 50 soumissions/mois gratuitement)
2. Cliquez **"New Form"**
3. Donnez-lui un nom : `Rendez-vous Zowe`
4. Copiez l'**ID** qui apparaît dans l'URL (exemple : si l'URL est `formspree.io/f/xrgvepxq`, l'ID est `xrgvepxq`)
5. Dans les paramètres Formspree, renseignez votre email pour recevoir les notifications
6. Allez sur votre site à `/admin`, connectez-vous, et dans **"Formulaire de contact"**, collez cet ID dans le champ "ID Formspree"
7. Sauvegardez → Netlify rebuild automatiquement le site en 2 minutes

---

## ÉTAPE 6 — Modifier votre contenu

1. Allez sur `votre-site.netlify.app/admin`
2. Connectez-vous avec l'email/mot de passe créé à l'étape 4c
3. Vous voyez l'interface d'administration avec toutes les sections
4. Modifiez ce que vous voulez, cliquez **"Publish"**
5. Le site se met à jour automatiquement en 1-2 minutes

---

## Personnaliser votre domaine (optionnel)

Si vous souhaitez une adresse du type `www.zowe.be` :

1. Achetez un nom de domaine sur **namecheap.com** ou **ovhcloud.com** (~10€/an)
2. Dans Netlify → **Domain management** → **"Add custom domain"**
3. Suivez les instructions pour configurer les DNS (Netlify vous guide pas à pas)

---

## Questions fréquentes

**Comment modifier une photo ?**
Dans le panneau `/admin`, utilisez le gestionnaire de médias (icône image) pour uploader vos photos, puis référencez-les dans le contenu.

**Le formulaire ne fonctionne pas ?**
Vérifiez que l'ID Formspree est correctement renseigné dans le panneau admin (section "Formulaire de contact").

**Je n'arrive pas à me connecter à /admin ?**
Vérifiez que Netlify Identity et Git Gateway sont bien activés (étape 4).
