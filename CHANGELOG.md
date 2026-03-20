## V1.19.03.26 — 19 mars 2026

### Modifications
- feat: intégration Monday.com — sélecteur écran analyse + création sous-élément silencieuse
- fix: CHANGELOG.md inclus dans le build + chemin via app.getAppPath()
- fix: CHANGELOG.md accessible dans le build packagé (asarUnpack)
- fix: logos sonores dans build packagé (asarUnpack + chemin asar.unpacked)
- fix: version Premiere Pro → nom officiel (45 = 2026)
- Splash : animation rotation douce du patch (ease out expo)
- Icône transparente générée avec iconutil
- Déplacement application icône en postbuild
- Remplacement logo interface par le patch mission TransPorter
- Ajout icône TransPorter (patch mission) + logo interface
- Fix nom de l'application : TransPorter

---

## V1.15.03.26 — 15 mars 2026

### Modifications
- Ajout script prebuild automatique — version + changelog + tag Git à chaque build
- Init — TransPorter V1.15.03.26 Mercury
- Web: refonte accueil - bouton explicite + zone dropzone grande et cliquable
- Fix: attacher tous les boutons après cacheElements + retour visuel analyse
- Indicateur de chargement et message si le script ne charge pas
- Fix: chargement à la demande du parser et zip-builder pour éviter blocage
- Fix: label natif pour sélection fichier + drag & drop
- Fix: polyfills Node (events/stream) pour xml2js en navigateur
- Fix: chargement DOM et sélection fichier pour la version web
- Fix deploy: add contents write permission
- Deploy GitHub Pages via branche gh-pages
- Merge branch 'main' of https://github.com/RealCoolclint/Transporter
- Initial commit - TransPorter app + version web
- Delete vite.config.js
- Delete package.json
- Delete package-lock.json
- Delete index.html
- Delete src directory
- Delete public/assets directory
- Delete dist directory

---

# Journal des versions – TransPorter

Format des versions : **V1.DD.MM.AA** (numéro majeur . jour . mois . année de la mise à jour).

---

## V1.15.02.26 (15 février 2026)

### Nouveautés
- **Bouton « Créer un lien Gofile »** sur l’écran final : upload de la valise sur Gofile.io et affichage du lien de téléchargement.
- Upload du fichier ZIP existant si l’option « Zipper la valise » a été cochée ; sinon compression du dossier à la volée puis envoi.
- Barre de progression en temps réel pendant l’upload.
- Zone de résultat avec lien cliquable et bouton « Copier le lien » (presse-papier).
- Gestion des états : chargement, succès, erreur ; bouton « Recréer un lien » après succès.

---

## V1.14.02.26 (14 février 2026)

### Nouveautés
- **Première version** de TransPorter.
- Création de valises pour projets Adobe Premiere Pro : analyse d’un `.prproj`, liste des médias référencés, copie des fichiers sélectionnés et du projet mis à jour dans un dossier ou ZIP.
- **Profils** : gestion de plusieurs profils (nom, prénom, email, photo, couleurs, dossier favori, mode d’organisation par défaut).
- **Analyse des médias** : détection des types (vidéo, audio, images, etc.), séparateurs repliables par type, cumuls (nombre de fichiers, taille, OK / manquants, inclus / exclus).
- **Doublons** : regroupement par nom de fichier exact, un seul représentant sélectionné par défaut.
- **Fichiers fantômes** (0 Ko) : exclus par défaut ; option « Afficher les fichiers fantômes » dans Paramètres.
- **Structure de la valise** : choix « Par type » ou « Arborescence d’origine » (menu Paramètres).
- **Relink** : localisation des médias manquants via dialogue de recherche.
- **Interface** : thème sombre, écran d’ouverture (splash) avec version, barre de titre avec Paramètres (profil, fantômes, structure) et affichage de la version à côté du logo.
- **Sécurité** : TransPorter ne modifie jamais les fichiers d’origine (lecture et copie uniquement).

### Technique
- Application Electron pour macOS.
- Analyse du XML du projet dans un worker pour ne pas bloquer l’interface.
- Préférences et profils stockés localement.

---

*Pour les prochaines mises à jour, ajouter une section ci-dessus avec la date et la liste des modifications.*
