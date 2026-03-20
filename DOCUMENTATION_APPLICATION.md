# TransPorter – Document récapitulatif pour l’amélioration de l’application

Ce document décrit l’application TransPorter afin qu’un assistant (ex. Claude) puisse proposer des évolutions cohérentes avec l’existant.

---

## 1. Vue d’ensemble

**TransPorter** est une application **Electron** pour **macOS** qui crée une **valise** pour des projets Adobe Premiere Pro :

- Analyse d’un fichier `.prproj` (XML compressé en gzip).
- Extraction des chemins de médias référencés (vidéo, audio, images, LUT, sous-titres, etc.).
- Affichage des médias par type, avec doublons, fichiers fantômes (0 Ko), médias manquants.
- Relink des médias manquants via recherche dans un dossier.
- Copie des fichiers **sélectionnés** + `.prproj` mis à jour dans un dossier de destination (ou ZIP).
- **Gofile** : sur l’écran final, bouton « Créer un lien Gofile » pour envoyer la valise (ZIP ou dossier zippé à la volée) sur Gofile.io et afficher le lien de téléchargement, avec copie dans le presse-papier.

**Principe de sécurité** : TransPorter **ne modifie jamais les fichiers d’origine** ; il ne fait que les **lire** et les **copier** dans la valise.

**Version** : format `V1.DD.MM.AA` (jour, mois, année). La version est mise à jour par le script **prebuild** avant chaque build : mise à jour de `window.APP_VERSION` dans `index.html`, entrée dans `CHANGELOG.md` (commits depuis le dernier tag), et création du tag Git. Affichée dans le header et sur le splash.

---

## 2. Stack technique

- **Runtime** : Node.js (côté main) + navigateur Chromium (renderer).
- **Framework** : Electron 28.x.
- **Dépendances principales** : `fs-extra`, `archiver`, `xml2js`, `pako` (gzip), `glob`, `md5-file`. **Electron** est en `devDependencies`.
- **UI** : HTML/CSS/JS vanilla (pas de framework front). Thème sombre par défaut (`.dark-theme`).
- **Stockage** : profils dans `~/Library/Application Support/TransPorter/profiles.json`.

---

## 3. Architecture des processus

| Rôle | Fichier(s) | Rôle |
|------|------------|------|
| **Main** | `src/main/main.js` | Fenêtre Electron, IPC handlers, orchestration. |
| **Preload** | `src/main/preload.js` | Pont sécurisé : `contextBridge.exposeInMainWorld('valisePremiere', { ... })`. Le renderer n’a accès qu’à cette API. |
| **Renderer** | `src/renderer/index.html`, `app.js`, `styles.css` | Interface utilisateur, écrans, logique métier côté UI. |
| **Worker** | `src/main/prproj-worker.js` | Parse du `.prproj` dans un worker pour ne pas bloquer l’UI (timeout 2 min). |

Le renderer appelle **uniquement** `window.valisePremiere.*` ; le main expose les handlers IPC correspondants.

---

## 4. Structure des dossiers (source)

```
Tranporter/
├── package.json              # "main": "src/main/main.js", scripts: start, build (prebuild + electron-builder + postbuild)
├── electron-builder.json     # productName "TransPorter", mac.icon "build/icon.icns", output dist/
├── CHANGELOG.md              # Journal des versions (mis à jour par prebuild)
├── DOCUMENTATION_APPLICATION.md  # Ce document
├── scripts/
│   ├── prebuild.js           # Avant build : version V1.JJ.MM.AA, index.html, CHANGELOG.md, tag Git
│   ├── postbuild.js          # Après build : applique l'icône sur dist/mac-arm64/TransPorter.app (fileicon)
│   └── fix-electron-quarantine.js
├── build/
│   └── icon.icns             # Icône macOS de l'app (appliquée en postbuild)
├── src/
│   ├── main/
│   │   ├── main.js           # Point d’entrée Electron, createWindow, tous les ipcMain.handle
│   │   ├── preload.js        # API exposée au renderer (valisePremiere)
│   │   ├── prproj-worker.js   # Worker : parsePrproj(prprojPath) → result
│   │   ├── prproj-parser.js  # Parser .prproj (lecture seule, extraction chemins, types)
│   │   ├── path-updater.js   # Met à jour les chemins dans le .prproj pour la valise (écrit uniquement dans projectDir)
│   │   ├── file-manager.js   # Copie des fichiers, structure valise, ZIP, rapport
│   │   ├── report-generator.js # Génère VALISE_REPORT.txt
│   │   └── profile-manager.js  # CRUD profils (fichier JSON dans Application Support)
│   └── renderer/
│       ├── index.html        # Splash, header (logo + version + Paramètres + Quitter), 4 écrans
│       ├── app.js            # Logique complète de l’UI (~1500+ lignes)
│       ├── styles.css        # Thème, écrans, composants
│       └── assets/
│           ├── LOGO.png
│           ├── GIF/           # GIFs de célébration (écran final), un choisi aléatoirement
│           └── loading/        # GIFs pendant la copie (mise en valise), un choisi aléatoirement
```

---

## 5. Parcours utilisateur et écrans

Les écrans sont des `<section class="screen">` ; l’affichage se fait en ajoutant la classe `active` (une seule à la fois). Gestion dans `app.js` via `showScreen('home' | 'welcome' | 'analysis' | 'final')`.

1. **Splash** (animation ~3,7 s) : logo + version, puis disparition.
2. **HOME** (`#home-screen`) : grille de profils, « + Ajouter un profil ». Clic sur un profil → sélection + passage à **welcome**.
3. **Welcome** (`#welcome-screen`) : nom du profil, « Changer de profil », zone de drop (ou clic) pour déposer un `.prproj`. Analyse lancée → **analysis**.
4. **Analysis** (`#analysis-screen`) :
   - Titre / sous-titre (version Premiere, nb fichiers, poids, manquants).
   - Nom de la valise, dossier de destination.
   - Liste des médias par type (séparateurs repliables), avec cases « Inclure », statut (OK / manquant).
   - Boutons « Tout désélectionner », « Localiser » (relink), « Retour », « Créer la valise » (+ option « Zipper la valise »).
   - Pendant la copie : barre de progression, puis passage à **final**.
5. **Final** (`#final-screen`) : résumé (nom, taille, chemin), boutons « Ouvrir dans le Finder », « Voir le rapport », puis **Gofile** : bouton « Créer un lien Gofile » (upload de la valise sur Gofile.io), barre de progression pendant l’upload, affichage du lien avec bouton « Copier le lien ». Design sans icônes, aligné sur le reste de l’app.

**Header global** (toujours visible sauf splash) : logo, **Paramètres** (dropdown : profil + « Changer », « Afficher les fichiers fantômes », structure « Par type » / « Arborescence d’origine »), **Quitter**.

---

## 6. Données et état (renderer – `app.js`)

Variables globales côté renderer (dans le closure du `DOMContentLoaded`) :

| Variable | Rôle |
|----------|------|
| `currentAnalysis` | Résultat du parse : `{ projectName, premierVersion, mediaFiles }`. |
| `mediaFiles` | Liste des médias (chaque élément : `path`, `name`, `type`, `size`, `exists`, `__ghost`, `__selected`, `__duplicate`, etc.). |
| `allSelected` | État du bouton « Tout sélectionner / Tout désélectionner ». |
| `destinationPath` | Dossier de destination de la valise. |
| `isCopying` / `isAnalyzing` | Verrous pendant copie / analyse. |
| `showGhostFiles` | Afficher ou non les fichiers 0 Ko (checkbox dans Paramètres). |
| `collapsedSections` | `{ [typeKey]: boolean }` pour replier/déplier les blocs par type (par défaut repliés). |
| `currentProfile` | Profil sélectionné (objet avec id, name, firstName, favoriteDestination, defaultOrgMode, etc.). |
| `profiles` | Liste de tous les profils. |
| `editingProfileId` | ID du profil en cours d’édition dans la modale. |
| `selectedProjectPath` | Chemin du .prproj chargé. |

**Format d’un média** (après analyse + enrichissement) :  
`path`, `name`, `type` (video | audio | image | graphics | lut | captions | linked | other), `size`, `exists` (booléen), `__ghost` (0 Ko), `__selected`, `__duplicate`, `__isPreview` (optionnel).

---

## 7. API exposée au renderer (`window.valisePremiere`)

Tout est asynchrone (promesses) sauf les listeners.

| Méthode | Rôle |
|--------|------|
| `analyzePrproj(filePath)` | Analyse le .prproj (via worker). Retourne `{ ok, data }` ou `{ ok: false, error }`. |
| `chooseFolder()` | Dialogue « Choisir un dossier ». Retourne `{ ok, path }` ou `{ ok: false }`. |
| `chooseFile(options)` | Dialogue « Choisir un fichier » (optionnel : title, filters). Retourne `{ ok, filePath, size }`. |
| `relinkOffline(rootPath, mediaFiles)` | Recherche les noms de médias dans `rootPath` et retourne `{ ok, updated }` (liste avec newPath, size). |
| `startCopy(payload)` | Lance la copie. `payload` : files, destinationPath, suitcaseName, orgMode, zipSuitcase, projectFilePath, projectName, premierVersion, profileName, profileEmail. Retourne `{ ok, data }`. |
| `onCopyProgress(callback)` | Enregistre un listener pour les événements `copy-progress` (progression, fichier en cours). |
| `profilesLoad()` | Charge les profils. Retourne `{ ok, data: profiles }`. |
| `profilesCreate(profileData)` | Crée un profil. |
| `profilesUpdate(profileId, updates)` | Met à jour un profil. |
| `profilesDelete(profileId)` | Supprime un profil. |
| `profilesGet(profileId)` | Récupère un profil par ID. |
| `selectProfilePhoto()` | Dialogue pour choisir une image (photo de profil). Retourne `{ filePath }` ou null. |
| `listCelebrationGifs()` | Liste les chemins des GIF dans `renderer/assets/GIF`. |
| `listLoadingGifs()` | Liste les chemins des GIF dans `renderer/assets/loading` (affichés aléatoirement pendant la copie). |
| `openInFinder(filePath)` | Ouvre le Finder et sélectionne le fichier/dossier. |
| `quitApp()` | Ferme l’application. |
| `gofileUpload(payload)` | Envoie la valise sur Gofile.io. `payload` : `{ zipPath?`, `folderPath?`, `suitcaseName }`. Retourne `{ ok, downloadUrl }` ou `{ ok: false, error }`. ZIP créé à la volée avec niveau de compression 0. |
| `onGofileProgress(callback)` | Listener pour la progression de l’upload Gofile `data.percent` (0–100) et `data.phase` (`'preparing'` pendant la création du ZIP, `'uploading'` pendant l'envoi). |
| `readChangelog()` | Lit le fichier `CHANGELOG.md` à la racine du projet. Retourne `{ ok: true, content }` ou `{ ok: false, error }`. Utilisé par la modale « Notes de version » (clic sur le logo). |
| `copyToClipboard(text)` | Copie le texte dans le presse-papier. |

---

## 8. Modules main (résumé)

### 8.1 `prproj-parser.js`

- **Lecture seule** du fichier .prproj (gzip → XML).
- Dump XML de debug éventuel **uniquement** dans `os.tmpdir()`, jamais à côté du projet.
- Extraction des chemins : attributs (FilePath, MediaPath, path, etc.) + scan de chaînes (regex) avec garde-fou sur la taille des chaînes et le nombre d’itérations.
- **Voie rapide** : si XML > 1,2 Mo, scan regex uniquement (pas de parse xml2js complet) pour éviter blocage.
- Détection de la version Premiere (XML), nom du projet.
- Pour chaque chemin : normalisation (file://, décodage URL), résolution (existence, taille), type déduit de l’extension (`MEDIA_EXTENSIONS`), marquage `__ghost` si taille 0.
- Retour : `{ projectName, premierVersion, mediaFiles }` avec `path`, `name`, `type`, `size`, `exists`.

### 8.2 `prproj-worker.js`

- Worker qui reçoit `prprojPath`, appelle `parsePrproj(prprojPath)` et envoie `{ ok, result }` ou `{ ok: false, error }` au main.

### 8.3 `path-updater.js`

- **Sécurité** : lit le .prproj original, **n’écrit que** dans `projectDir` (dossier Project/ de la valise).
- Prend le fichier original, le décompresse, applique les remplacements de chemins (src → chemin relatif dans la valise) avec patterns file://, file://localhost, chemin brut.
- Écrit le .prproj mis à jour sous `Project/<nom>_UPDATED.prproj`.
- Vérification que le chemin d’écriture reste dans la valise.

### 8.4 `file-manager.js`

- **Sécurité** : lecture des sources uniquement ; écriture **uniquement** dans le dossier de destination (valise).
- `startCopy(options, onProgress)` :
  - Crée la racine valise + `Project/`.
  - Copie le .prproj original en `_ORIGINAL.prproj`.
  - Pour chaque fichier sélectionné : copie vers `root/<Type>/` (mode type) ou `root/<arborescence d’origine>` (mode original), vérification taille + MD5 après copie.
  - Appel à `path-updater` pour générer `_UPDATED.prproj`.
  - Si `zipSuitcase` : création d’une archive ZIP de toute la valise (archiver).
  - Génération du rapport (`report-generator`) → `VALISE_REPORT.txt`.
  - Callbacks `onProgress` pour le renderer (file-start, pourcentage, etc.).

### 8.5 `profile-manager.js`

- Fichier : `~/Library/Application Support/TransPorter/profiles.json`.
- Structure : `{ profiles: [ { id, name, firstName, email, defaultOrgMode, favoriteDestination, photoPath, color1, color2, color3, initialsSuffix, isGuest, createdAt, updatedAt }, ... ] }`.
- Profil invité créé par défaut si aucun fichier. Pas de suppression du profil invité.
- `loadProfiles`, `saveProfiles`, `createProfile`, `updateProfile`, `deleteProfile`, `getProfile`.

### 8.6 `report-generator.js`

- Génère `VALISE_REPORT.txt` à la racine de la valise : résumé (projet, version Premiere, profil, date, durée, nombre de fichiers, taille, liste des fichiers copiés, etc.).

---

## 9. Règles de sécurité à respecter

- **Ne jamais modifier ni supprimer les fichiers sources** : lecture + copie uniquement.
- **Écriture uniquement dans la valise** : tous les chemins d’écriture doivent être sous le dossier de destination choisi par l’utilisateur.
- Parser : pas d’écriture à côté du .prproj ; debug XML éventuel dans `os.tmpdir()`.
- Path-updater et file-manager : vérifications explicites que les chemins de destination sont bien contenus dans la valise.

---

## 10. UI et styles

- **Thème** : `styles.css` avec variables CSS (`:root` et `.dark-theme`). Palette limitée (bleu primaire, noir/gris, blanc/gris clair).
- **Écrans** : `.screen` masqué par défaut ; `.screen.active` affiché.
- **Splash** : `.splash-screen`, `.splash-logo-container`, `.splash-version` (version sous le logo). Animation du logo via keyframe **splashRotate** dans un bloc `<style>` de `index.html` (scale 0.9→1.1, rotation légère -2°→2°, opacité 0→1, 3.7 s, `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Header** : `.app-header`, `.top-bar-brand` (logo + `#app-version`), `.top-bar-actions` (Paramètres + Quitter côte à côte). Dropdown Paramètres aligné à droite.
- **Paramètres** : `#params-toggle`, `#params-dropdown` (caché avec `hidden`), profil, checkbox `#show-ghost-files`, radios `name="org-mode"` (value `type` | `original`).
- **Liste médias** : séparateurs par type avec en-tête cliquable (repli/dépli), lignes avec nom, chemin, taille, statut, case « Inclure ». Doublons : un seul sélectionnable par groupe (même nom de fichier).
- **Gofile (écran final)** : `#btn-gofile-upload`, `#gofile-progress`, `#gofile-result` (lien + `#btn-copy-gofile-link`), `#gofile-error`. Pas d’icônes dans les libellés ; styles basés sur `var(--bg-tertiary)`, `var(--border)`, `var(--accent)`. Upload géré dans `main.js` (handler `gofile-upload`) : récupération serveur Gofile, ZIP à la volée si pas de ZIP existant, multipart vers `{server}.gofile.io/uploadFile`, événements `gofile-upload-progress` pour la barre.

---

## 11. Version et journal des versions

- **Version affichée** : mise à jour par **scripts/prebuild.js** avant chaque build : calcul `V1.JJ.MM.AA` (date du jour), remplacement de `window.APP_VERSION` dans `src/renderer/index.html`, puis utilisation pour `#splash-version` et `#app-version`.
- **CHANGELOG.md** : prebuild récupère les messages de commit depuis le dernier tag Git (ou les 20 derniers commits), ajoute une entrée pour la version du jour si elle n'existe pas, et crée le tag Git correspondant.
- **Modale « Notes de version »** : clic sur le logo du header ouvre une modale affichant le contenu de `CHANGELOG.md` (lecture via IPC `read-changelog`).

---

## 12. Lancer et builder

- **Développement** : `npm start` (lance Electron avec `main` = `src/main/main.js`).
- **Build** : `npm run build` exécute : **node scripts/prebuild.js** (version, CHANGELOG, tag) → **electron-builder** (génère le .app dans `dist/mac-arm64/`) → **node scripts/postbuild.js** (applique l'icône `build/icon.icns` sur `TransPorter.app` via `fileicon set`). Pas de DevTools à l’ouverture (l’appel à `openDevTools()` a été retiré dans `main.js`).

---

## 13. Pistes d’amélioration possibles

- **Performance** : très gros .prproj (voie rapide déjà en place) ; possibilité de pagination ou virtualisation de la liste des médias.
- **UX** : sauvegarde du dernier dossier de destination ; raccourcis clavier ; indicateur de progression plus détaillé (nom du fichier en cours).
- **Profils** : export/import de profils ; synchronisation optionnelle.
- **Valise** : options de filtre par type avant copie ; exclusion par motif (glob).
- **Tests** : tests unitaires sur le parser, path-updater, file-manager (chemins, sécurité).
- **Accessibilité** : labels, rôles ARIA, contraste (déjà partiellement en place).
- **i18n** : tout le texte est en français ; extraction dans un fichier de langues si besoin d’autres langues.

---

*Document généré pour faciliter l’amélioration de l’application TransPorter. À mettre à jour lorsque l’architecture ou les fonctionnalités évoluent.*
