# TransPorter – Document récapitulatif pour l'amélioration de l'application

Ce document décrit l'application TransPorter afin qu'un assistant (ex. Claude) puisse proposer des évolutions cohérentes avec l'existant.

---

## 1. Vue d'ensemble

**TransPorter** est une application **Electron** pour **macOS** qui crée une **valise** pour des projets Adobe Premiere Pro :

- Analyse d'un fichier `.prproj` (XML compressé en gzip).
- Extraction des chemins de médias référencés (vidéo, audio, images, LUT, sous-titres, etc.).
- Affichage des médias par type, avec doublons, fichiers fantômes (0 Ko), médias manquants.
- Relink des médias manquants via recherche dans un dossier.
- Copie des fichiers **sélectionnés** + `.prproj` mis à jour dans un dossier de destination (ou ZIP).
- **Gofile** : sur l'écran final, bouton « Créer un lien Gofile » pour envoyer la valise (ZIP ou dossier zippé à la volée) sur Gofile.io et afficher le lien de téléchargement, avec copie dans le presse-papier.
- **Historique** : les 5 dernières valises avec temps de copie et d'upload réels ; utilisé pour affiner les estimations.
- **Estimations** : temps de création et d'upload basés sur l'historique réel et les vitesses mesurées.
- **Vérification espace disque** : blocage de la création si espace insuffisant en destination.

**Principe de sécurité** : TransPorter **ne modifie jamais les fichiers d'origine** ; il ne fait que les **lire** et les **copier** dans la valise.

**Version** : format `V1.DD.MM.AA` (jour, mois, année). Mise à jour par **scripts/prebuild.js** avant chaque build (index.html, CHANGELOG.md, tag Git). Affichée dans le header et sur le splash.

---

## 2. Stack technique

- **Runtime** : Node.js (côté main) + navigateur Chromium (renderer).
- **Framework** : Electron 28.x.
- **Dépendances principales** : `fs-extra`, `archiver`, `xml2js`, `pako` (gzip), `glob`, `md5-file`.
- **UI** : HTML/CSS/JS vanilla (pas de framework front). Thème sombre par défaut (`.dark-theme`).
- **Stockage** : `~/Library/Application Support/TransPorter/`
  - `profiles.json` — profils utilisateur
  - `upload-speed.json` — vitesse d'upload Gofile mesurée
  - `suitcase-history.json` — historique des 5 dernières valises

---

## 3. Architecture des processus

| Rôle | Fichier(s) | Rôle |
|------|------------|------|
| **Main** | `src/main/main.js` | Fenêtre Electron, IPC handlers, orchestration. |
| **Preload** | `src/main/preload.js` | Pont sécurisé : `contextBridge.exposeInMainWorld('valisePremiere', { ... })`. Le renderer n'a accès qu'à cette API. |
| **Renderer** | `src/renderer/index.html`, `app.js`, `styles.css` | Interface utilisateur, écrans, logique métier côté UI. |
| **Worker** | `src/main/prproj-worker.js` | Parse du `.prproj` dans un worker pour ne pas bloquer l'UI (timeout 2 min). |

Le renderer appelle **uniquement** `window.valisePremiere.*` ; le main expose les handlers IPC correspondants.

---

## 4. Structure des dossiers (source)

```
Tranporter/
├── package.json              # "main": "src/main/main.js", scripts: start, build (prebuild + electron-builder + postbuild)
├── electron-builder.json     # productName "TransPorter", mac.icon "build/icon.icns"
├── CHANGELOG.md              # Journal des versions (mis à jour par prebuild)
├── DOCUMENTATION_APPLICATION.md
├── TRANSPORTER_DOCUMENTATION_APPLICATION.md  # Ce document
├── TRANSPORTER_DOCUMENTATION_INTERFACE_UX.md # Design et UX
├── scripts/
│   ├── prebuild.js           # Avant build : version V1.JJ.MM.AA, index.html, CHANGELOG.md, tag Git
│   ├── postbuild.js          # Après build : applique build/icon.icns sur TransPorter.app (fileicon)
│   └── fix-electron-quarantine.js
├── build/
│   └── icon.icns             # Icône macOS (appliquée en postbuild)
├── src/
│   ├── main/
│   │   ├── main.js           # Point d'entrée Electron, IPC handlers
│   │   ├── preload.js        # API exposée au renderer (valisePremiere)
│   │   ├── prproj-worker.js  # Worker : parsePrproj(prprojPath) → result
│   │   ├── prproj-parser.js  # Parser .prproj (lecture seule)
│   │   ├── path-updater.js   # Met à jour les chemins dans le .prproj
│   │   ├── file-manager.js   # Copie, ZIP, rapport
│   │   ├── report-generator.js
│   │   ├── profile-manager.js
│   │   └── history-manager.js # Historique des valises (max 5)
│   └── renderer/
│       ├── index.html
│       ├── app.js
│       ├── styles.css
│       └── assets/
│           ├── LOGO.png
│           ├── GIF/          # GIFs de célébration (écran final)
│           ├── loading/      # GIFs pendant la copie
│           └── upload/       # GIFs pendant l'upload Gofile
```

---

## 5. Parcours utilisateur et écrans

Les écrans sont des `<section class="screen">` ; affichage via la classe `active` (une seule à la fois). Gestion dans `app.js` via `showScreen('home' | 'welcome' | 'analysis' | 'upload' | 'final')`.

1. **Splash** (animation ~3,7 s) : logo + version, puis disparition.
2. **HOME** (`#home-screen`) : grille de profils, « + Ajouter un profil ». Clic sur un profil → **welcome**.
3. **Welcome** (`#welcome-screen`) : nom du profil, « Changer de profil », zone de drop pour déposer un `.prproj`. Analyse → **analysis**.
4. **Analysis** (`#analysis-screen`) :
   - Titre / sous-titre (version Premiere, nb fichiers, poids, manquants).
   - Nom de la valise, dossier de destination.
   - Estimations : espace disque, temps de création, temps d'upload Gofile (basées sur l'historique).
   - Liste des médias par type (séparateurs repliables), cases « Inclure », statut (OK / manquant).
   - Boutons « Tout désélectionner », « Localiser » (relink), « Retour », « Créer la valise » (+ « Zipper la valise »).
   - Pendant la copie : barre de progression + GIF, puis **final** (ou **upload** si Gofile auto).
5. **Upload** (`#upload-screen`) : écran intermédiaire si upload Gofile automatique (titre, GIF, barre de progression, estimation temps).
6. **Final** (`#final-screen`) : résumé (nom, taille, chemin), « Ouvrir dans le Finder », « Voir le rapport », section **Gofile** (estimation upload, « Créer un lien Gofile », lien + « Copier le lien »).

**Header global** : **logo** (clic → modale « Notes de version » = contenu de CHANGELOG.md), version, **Historique** (dropdown, 5 dernières valises), **Paramètres** (profil, fichiers fantômes, structure, upload Gofile auto), **Quitter**.

---

## 6. Données et état (renderer – `app.js`)

| Variable | Rôle |
|----------|------|
| `currentAnalysis` | Résultat du parse : `{ projectName, premierVersion, mediaFiles }`. |
| `mediaFiles` | Liste des médias (path, name, type, size, exists, __ghost, __selected, __duplicate, etc.). |
| `allSelected` | État du bouton « Tout sélectionner / Tout désélectionner ». |
| `destinationPath` | Dossier de destination. |
| `isCopying` / `isAnalyzing` | Verrous pendant copie / analyse. |
| `showGhostFiles` | Afficher les fichiers 0 Ko (Paramètres). |
| `collapsedSections` | `{ [typeKey]: boolean }` pour replier/déplier par type. |
| `currentProfile` | Profil sélectionné. |
| `profiles` | Liste des profils. |
| `lastCopyResult` | Dernier résultat de copie (pour Gofile, etc.). |

---

## 7. API exposée au renderer (`window.valisePremiere`)

| Méthode | Rôle |
|--------|------|
| `analyzePrproj(filePath)` | Analyse le .prproj. Retourne `{ ok, data }` ou `{ ok: false, error }`. |
| `chooseFolder()` | Dialogue « Choisir un dossier ». |
| `chooseFile(options)` | Dialogue « Choisir un fichier ». |
| `getDiskSpace(targetPath)` | Espace disque disponible (octets). |
| `getUploadSpeed()` | Vitesse d'upload (octets/s) pour estimation Gofile. |
| `getCopySpeed()` | Vitesse de copie (octets/s) pour estimation création. |
| `relinkOffline(rootPath, mediaFiles)` | Recherche médias manquants. |
| `startCopy(payload)` | Lance la copie. |
| `onCopyProgress(callback)` | Listener progression copie. |
| `profilesLoad()` | Charge les profils. |
| `profilesCreate(profileData)` | Crée un profil. |
| `profilesUpdate(profileId, updates)` | Met à jour un profil. |
| `profilesDelete(profileId)` | Supprime un profil. |
| `profilesGet(profileId)` | Récupère un profil. |
| `selectProfilePhoto()` | Dialogue photo de profil. |
| `historyLoad()` | Charge l'historique (5 dernières valises). |
| `historyAdd(entry)` | Ajoute une entrée à l'historique. |
| `historyUpdateLastUpload(uploadDurationMs)` | Met à jour la dernière entrée avec la durée d'upload. |
| `listCelebrationGifs()` | Liste des GIFs de célébration. |
| `listLoadingGifs()` | Liste des GIFs pendant la copie. |
| `listUploadGifs()` | Liste des GIFs pendant l'upload. |
| `openInFinder(filePath)` | Ouvre le Finder. |
| `quitApp()` | Ferme l'application. |
| `gofileUpload(payload)` | Upload sur Gofile.io. ZIP à la volée (compression 0). Retourne `{ ok, downloadUrl, uploadDurationMs }` ou erreur. |
| `onGofileProgress(callback)` | Progression : `data.percent` (0–100), `data.phase` (`'preparing'` = création ZIP, `'uploading'` = envoi). |
| `readChangelog()` | Lit CHANGELOG.md. Retourne `{ ok, content }` ou `{ ok: false, error }`. Pour la modale Notes de version (clic logo). |
| `copyToClipboard(text)` | Copie dans le presse-papier. |

---

## 8. Modules main (résumé)

### 8.1 `history-manager.js`

- Fichier : `~/Library/Application Support/TransPorter/suitcase-history.json`.
- `loadHistory()` : charge les 5 dernières entrées.
- `addHistory(entry)` : ajoute (suitcaseName, copiedBytes, copyDurationMs, uploadDurationMs?, createdAt).
- `updateLastWithUpload(uploadDurationMs)` : met à jour la dernière entrée si upload manuel.
- `getEstimatesFromHistory()` : calcule les vitesses moyennes (copy et upload) pour les estimations.

### 8.2 Vitesse d'upload

- Fichier : `upload-speed.json`.
- Mesurée pendant les uploads Gofile réels (5 % → 95 % du transfert).
- Utilisée pour l'estimation du temps d'upload ; priorité à l'historique si disponible.

### 8.3 Vérification espace disque

- Avant `startCopy` : `df -k` sur le chemin de destination.
- Requis : totalBytes + overhead (100 Mo) ; en mode ZIP : 2×totalBytes + 100 Mo.
- Bloque la copie et affiche une alerte si espace insuffisant.

### 8.4 Autres modules

- **prproj-parser.js** : lecture seule, extraction chemins, types, taille. Résolution des chemins : recherche dans le dossier projet puis jusqu'à 5 niveaux parents (MAX_PARENT_LEVELS) ; fallback par « queue » du chemin si chemin absolu absent.
- **path-updater.js** : remplacements de chemins dans le .prproj.
- **file-manager.js** : copie, ZIP, rapport, callbacks progression.
- **profile-manager.js** : CRUD profils.
- **report-generator.js** : `VALISE_REPORT.txt`.

---

## 9. Règles de sécurité

- **Ne jamais modifier ni supprimer les fichiers sources** : lecture + copie uniquement.
- **Écriture uniquement dans la valise** : chemins de destination contenus dans le dossier choisi par l'utilisateur.
- Parser : debug XML éventuel dans `os.tmpdir()` uniquement.

---

## 10. Lancer et builder

- **Développement** : `npm start`
- **Build** : `npm run build` = **node scripts/prebuild.js** (version, CHANGELOG.md, tag Git) → **electron-builder** (dist/mac-arm64/TransPorter.app) → **node scripts/postbuild.js** (icône build/icon.icns appliquée via fileicon). Electron en devDependencies.

---

*Document à mettre à jour lorsque l'architecture ou les fonctionnalités évoluent.*
