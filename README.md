# TransPorter – Version Web

Application web pour créer une valise Premiere Pro (même logique que l’app Electron, sans installation).

## Développement

```bash
cd web
npm install
npm run dev
```

Ouvre http://localhost:5173 (ou l’URL affichée).  
**Sélection du dossier** : fonctionne dans Chrome/Edge (API File System Access). Sur Firefox/Safari, l’option peut être indisponible ou limitée.

## Build

```bash
npm run build
```

Génère le dossier `dist/` (site statique).  
Pour GitHub Pages, la base des URLs est `/Tranporter/` par défaut. Pour un autre dépôt :

```bash
BASE_URL=/MonRepo/ npm run build
```

## Déploiement sur GitHub Pages

### Option 1 : Déploiement manuel

1. Build : `npm run build`
2. Dans les paramètres du dépôt GitHub : **Settings → Pages → Source** : « Deploy from a branch »
3. Branch : `gh-pages`, dossier : `/ (root)` (ou déployer le contenu de `web/dist` sur cette branche).

Pour pousser `dist` sur `gh-pages` une fois :

```bash
cd web && npm run build
git checkout --orphan gh-pages
git reset --hard
cp -r dist/* .
git add -A && git commit -m "Deploy web" && git push -u origin gh-pages
git checkout main
```

### Option 2 : GitHub Actions (recommandé)

Utiliser le workflow `.github/workflows/deploy-web.yml` à la racine du dépôt : à chaque push sur `main`, il build la version web et déploie sur GitHub Pages (branch `gh-pages` ou action « GitHub Pages »).

## Limitations version web

- **Dossier du projet** : nécessite un navigateur compatible avec l’API File System Access (Chrome, Edge). Sur d’autres navigateurs, seuls le dépôt du .prproj et l’analyse sont possibles ; la création du ZIP demande un dossier.
- **Destination** : la valise est toujours téléchargée en ZIP (pas de choix de dossier de destination comme en desktop).
- **Hébergement** : tout s’exécute dans le navigateur ; aucun envoi de vos fichiers sur un serveur.
