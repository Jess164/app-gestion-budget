# PasD'Tal'

Le budget de deux sœurs : les dépenses de chacune, leurs dépenses communes et leurs abonnements, sur Android et sur iPhone.

- Les données restent sur vos téléphones et dans une feuille Google Sheets de ton Google Drive. Il n'y a pas de base de données.
- Un petit script Google, collé une seule fois dans cette feuille, synchronise vos deux téléphones.
- L'appli est une appli web installable, hébergée gratuitement sur GitHub Pages.

**Où en est l'appli** : étape 3 sur 4. Elle a le budget de chacune, les dépenses, les paramètres, la calculatrice et la synchro (étape 1), le commun, le solde, « On est quittes » et les abonnements (étape 2), et les prévisions : « Et si je le prenais ? » et les achats envisagés (étape 3). Reste l'APK Android avec les alertes.

## Installer le script Google (une seule fois, environ 5 minutes)

1. Ouvre [sheets.new](https://sheets.new) : une nouvelle feuille Google Sheets se crée dans ton Drive. Renomme-la « PasD'Tal' ».
2. Menu **Extensions**, puis **Apps Script**.
3. Dans le fichier `Code.gs`, efface tout et colle le contenu de [`apps-script/Code.gs`](apps-script/Code.gs) (bouton « Copy raw file » sur GitHub).
4. Clique sur l'icône de disquette pour enregistrer, et nomme le projet « PasD'Tal' ».
5. Bouton bleu **Déployer**, puis **Nouveau déploiement**. Clique sur la roue dentée, puis choisis **Application Web**.
6. Choisis **Exécuter en tant que : Moi** et **Qui a accès : Tout le monde**, puis clique sur **Déployer**.
7. Clique sur **Autoriser l'accès** et choisis ton compte. Google affiche « Google n'a pas validé cette application » : c'est normal, c'est ton propre script. Clique sur **Paramètres avancés**, puis **Accéder à PasD'Tal' (non sécurisé)**, puis **Autoriser**. Le script n'a accès qu'à cette feuille.
8. Copie l'**URL de l'application Web** : elle commence par `https://script.google.com/macros/s/` et finit par `/exec`.

## Relier ton téléphone

1. Ouvre l'appli sur ton téléphone. Sur iPhone, ajoute-la d'abord à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), puis ouvre-la depuis l'icône.
2. Choisis « C'est moi qui ai installé le script Google », colle l'URL, puis entre vos deux prénoms.
3. L'appli crée un code secret et affiche le **lien d'invitation** pour ta sœur. Tu le retrouves ensuite dans Paramètres, puis « Inviter ma sœur ».

Le lien d'invitation donne accès à vos données : ne l'envoie qu'à ta sœur.

## Mettre à jour le script Google

Quand une nouvelle version de `Code.gs` arrive, recolle-la dans l'éditeur Apps Script et enregistre. Ensuite, clique sur **Déployer**, puis **Gérer les déploiements**, puis l'icône crayon. Choisis **Version : Nouvelle version**, puis **Déployer**. L'URL ne change pas.

## Repartir de zéro

Dans l'éditeur Apps Script, choisis la fonction `oublierLeCodeSecret` en haut, puis clique sur **Exécuter**. Le code secret est effacé, mais les données restent dans la feuille. Sur chaque téléphone, va dans Paramètres et choisis « Déconnecter ce téléphone ».

## Pour développer

```bash
npm install
npm run dev      # appli en local
npm test         # tests des calculs, de la synchro et du script Google
npm run build && npx vite preview --port 4173 &
npm run e2e      # parcours complet sur deux téléphones simulés (Playwright)
```

- `src/domain` : les calculs du budget, sans interface et testés.
- `src/data` : le stockage sur le téléphone, la synchro et le lien d'invitation.
- `src/screens` : les écrans.
- `apps-script/Code.gs` : le script Google, testé dans `test/apps-script.test.ts`.
- [`CONTEXT.md`](CONTEXT.md) : le vocabulaire de l'appli.
- [`docs/adr`](docs/adr) : les décisions importantes et leurs raisons.

À chaque envoi sur la branche `main`, GitHub lance les tests et publie l'appli sur GitHub Pages (`.github/workflows/publier.yml`).
