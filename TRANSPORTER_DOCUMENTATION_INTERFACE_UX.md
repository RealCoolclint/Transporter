# TransPorter – Documentation Interface & Design UX

Ce document décrit en détail le design et le fonctionnement de l’interface TransPorter. Il sert de **référence réutilisable** pour créer d’autres applications dans la continuité de ce style.

---

## 1. Philosophie du design

### 1.1 Principes directeurs

- **Minimalisme** : palette limitée à 3 couleurs, pas de fioritures.
- **Clarté** : hiérarchie visuelle nette, états explicites.
- **Cohérence** : mêmes motifs pour boutons, formulaires, modales.
- **Accessibilité** : contraste suffisant, libellés explicites.
- **Sans icônes superflues** : les libellés textuels priment.

### 1.2 Ton visuel

- Professionnel, sobre, moderne.
- Thème sombre par défaut, compatible thème clair.
- Polices : Open Sans (corps), Lato (titres).

---

## 2. Palette de couleurs

### 2.1 Les 3 couleurs de base

| Couleur | Variable | Usage | Valeur (hex) |
|---------|----------|-------|--------------|
| **Bleu** | `--color-primary` | Accent, actions, liens | `#2563eb` |
| **Noir/Gris foncé** | `--color-dark` | Fond sombre, texte | `#0f172a` |
| **Blanc/Gris clair** | `--color-light` | Fond clair, texte clair | `#ffffff` |

### 2.2 Variables sémantiques

```css
/* Fonds */
--bg-primary      /* Fond principal */
--bg-secondary    /* Fond secondaire (zone de contenu) */
--bg-tertiary     /* Fond tertiaire (zones surélevées légères) */
--bg-elevated     /* Fond pour cartes, dropdowns, modales */

/* Texte */
--text-primary    /* Texte principal */
--text-secondary  /* Texte secondaire (labels, métadonnées) */
--text-tertiary   /* Texte discret, placeholders */

/* Accent et actions */
--accent          /* Couleur d'accent (bleu) */
--accent-hover    /* État survol */
--accent-light    /* Lueur, focus, bordures actives */

/* États */
--success, --success-light
--danger, --danger-light     /* Rouge pour erreurs/suppression */
--warning, --warning-light
--info, --info-light

/* Bordures et ombres */
--border, --border-light
--shadow-sm, --shadow, --shadow-md, --shadow-lg, --shadow-xl
```

### 2.3 Thème sombre (`.dark-theme`)

- Inversion fond/texte : fond sombre, texte clair.
- Bordures en `rgba(255,255,255,0.1)`.
- Ombres plus marquées (opacité noir augmentée).

---

## 3. Typographie

### 3.1 Polices

```css
font-family: 'Open Sans', 'Lato', -apple-system, BlinkMacSystemFont, sans-serif;
```

- **Open Sans** : corps de texte, formulaires.
- **Lato** : titres, en-têtes, éléments marquants.

### 3.2 Hiérarchie

| Élément | Classe / Contexte | Taille | Poids |
|---------|-------------------|--------|-------|
| Titre écran | `.home-title`, `.analysis-title`, etc. | ~1.5–2rem | 700 |
| Sous-titre | `.home-subtitle`, `.analysis-subtitle` | 0.95em | 400 |
| Labels | `.params-label`, `.field-group label` | 0.75em | 600, uppercase |
| Corps | défaut | 0.95em | 400 |
| Métadonnées | `.text-secondary` | 0.85–0.9em | 400 |

### 3.3 Espacement des lettres

- Labels : `letter-spacing: 0.5px`
- Titres : `letter-spacing: 1–1.5px` (optionnel)

---

## 4. Composants réutilisables

### 4.1 Boutons

**Base** : `.btn`

```css
.btn {
  font-family: 'Open Sans', 'Lato', sans-serif;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius);  /* 6px */
  font-size: 0.95em;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}
```

**Variants** :

| Classe | Usage | Style |
|--------|-------|-------|
| `.btn-primary` | Action principale | Fond accent, texte blanc, ombre |
| `.btn-secondary` | Action secondaire | Fond elevated, bordure |
| `.btn-ghost` | Actions discrètes | Transparent, survol léger |
| `.btn-danger` | Suppression | Rouge |
| `.btn-sm` | Boutons compacts (header) | padding 8px 16px, 0.9em |
| `.btn-small` | Très petit | 12px, padding réduit |

**États** :

- `:hover` : léger translateY(-2px) pour primary
- `:disabled` : opacity 0.5, cursor not-allowed
- Focus : accent-color, pas d’outline par défaut (à adapter pour accessibilité)

### 4.2 Champs de formulaire

**Input texte** : `.text-input`

```css
.text-input {
  padding: 12px 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.95em;
  background: var(--bg-elevated);
}
.text-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
```

**Groupe de champ** : `.field-group`

- `label` au-dessus
- `gap: 10px` entre label et input
- Labels en `.params-label` (uppercase, 0.75em)

### 4.3 Cases à cocher et radios

**Checkbox** : `.checkbox-label`

- Flex, align-items center
- `accent-color: var(--accent)` pour les inputs
- Taille checkbox : 18×18px

**Radios en pill** : `.radio-pill`

- `display: inline-flex`
- Bordure, border-radius, padding 8px 16px
- État actif : bordure accent, texte accent

### 4.4 Dropdown (header)

**Structure** :

```html
<div class="top-bar-params">
  <button id="toggle" class="btn btn-ghost btn-sm">Label</button>
  <div id="dropdown" class="params-dropdown" hidden>
    <!-- contenu -->
  </div>
</div>
```

**Style** : `.params-dropdown`

- `position: absolute`, `top: 100%`, `margin-top: 8px`
- `min-width: 280px`, `padding: 16px`
- `background: var(--bg-elevated)`, `border`, `border-radius`, `box-shadow`
- Aligné à droite dans la barre d’actions : `left: auto; right: 0`

**Comportement** :

- Clic sur le bouton : toggle `hidden`
- Clic en dehors : fermeture
- `stopPropagation` sur le contenu du dropdown pour éviter fermeture au clic interne

### 4.5 Modales

**Structure** :

```html
<div id="modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Titre</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">...</div>
    <div class="modal-footer">...</div>
  </div>
</div>
```

**Style** :

- `.modal` : `position: fixed`, plein écran, `display: none` ; `display: flex` quand `.active`
- Fond semi-transparent (backdrop)
- `.modal-content` : `max-width: 520px`, `max-height: 90vh`, scroll du body si besoin
- Header : bordure basse, titre + bouton fermer
- Footer : boutons alignés à droite (Annuler, Valider)

**Modale « Notes de version »** (`#changelog-modal`) :

- Ouverture : clic sur le logo du header. Contenu chargé via IPC `read-changelog` (fichier `CHANGELOG.md`).
- Structure : titre « Notes de version — TransPorter », bouton fermer (×), zone scrollable `<pre id="changelog-content">` (style : `white-space: pre-wrap`, police Open Sans, `max-height: 60vh`), footer avec bouton « Fermer ».
- Fermeture : bouton ×, bouton « Fermer », ou clic sur le fond (backdrop).

---

## 5. Structure de la mise en page

### 5.1 Barre de titre (macOS)

- `.title-bar` : 40px, `-webkit-app-region: drag`, `backdrop-filter`
- Permet le déplacement de la fenêtre

### 5.2 Header principal

- `.app-header` : fond `--sidebar-bg`, bordure basse
- Trois zones : `.top-bar-brand` (logo + version), `.top-bar-nav` (optionnel), `.top-bar-actions` (Historique, Paramètres, Quitter)
- **Logo** (`#changelog-logo`, classe `.app-logo`) : cliquable, `cursor: pointer`, `title="Notes de version"`. Au clic, ouvre la modale « Notes de version » qui affiche le contenu de `CHANGELOG.md`.
- Hauteur min 80px, padding 8px 24px

### 5.3 Zone de contenu

- `.app-main` : `flex: 1`, `overflow-y: auto`, padding 24px 32px
- Fond `--bg-secondary`

### 5.4 Écrans (screens)

- `.screen` : `display: none` par défaut
- `.screen.active` : `display: block`, animation `fadeIn` (opacity + translateY)
- Une seule `.screen.active` à la fois

---

## 6. Composants métier

### 6.1 Zone de dépôt (Dropzone)

- Bordure en pointillés au survol / drag-over
- Titre en majuscules
- Sous-titre discret
- Hover : léger translateY, bordure accent

### 6.2 Cartes de profil

- Grille flexible
- Carte : bordure, border-radius, padding
- État sélectionné : bordure accent
- Photo ou initiales, nom, actions (Modifier, Supprimer)

### 6.3 Liste avec séparateurs repliables

- `.media-list-separator` : en-tête cliquable, chevron, résumé (stats)
- `.media-list-separator--collapsed` : contenu masqué
- Lignes `.media-row` avec colonnes (nom, chemin, taille, statut, checkbox)

### 6.4 Barre de progression

- Conteneur : fond `--border`, `border-radius: full`
- Barre interne : largeur en %, `background: var(--accent)`, transition
- Labels : pourcentage, fichier en cours. Pour l’upload Gofile, le libellé varie selon la phase : « Préparation du fichier… » (`data.phase === 'preparing'`) ou « Upload : X % » en phase d’envoi (`data.phase === 'uploading'`). Deux emplacements possibles : `#gofile-progress-label` (écran final) et `#upload-progress-label` (écran upload intermédiaire).

### 6.5 Bandeaux d’avertissement

- `.link-media-warning` : fond jaune/ambre semi-transparent, bordure, icône ⚠
- Texte en couleur d’avertissement

---

## 7. Splash screen

- Plein écran, fond noir (`.splash-screen`)
- Logo centré (`.splash-logo`), version en dessous (`.splash-version`)
- **Animation du logo** : keyframe CSS `splashRotate` dans un bloc `<style>` de `index.html` :
  - 0 % : `scale(0.9) rotate(-2deg)`, `opacity: 0`
  - 100 % : `scale(1.1) rotate(2deg)`, `opacity: 1`
  - Durée 3,7 s, courbe `cubic-bezier(0.16, 1, 0.3, 1)`, `forwards`
- Phases de fond : blanc → noir ; logo en fondu + zoom/rotation ; puis disparition du logo et transition vers `.app-container` (opacity 0→1)

---

## 8. Animations et transitions

### 8.1 Durées

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 8.2 Usages

- Changement d’écran : `fadeIn` 0.3s
- Boutons : `transform`, `box-shadow` au hover
- Dropdowns : pas d’animation, apparition immédiate
- Modales : léger fadeIn du overlay

---

## 9. Rayons de bordure (radius)

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--radius-sm` | 4px | Petits éléments |
| `--radius` | 6px | Boutons, inputs |
| `--radius-md` | 8px | Cartes, dropdowns |
| `--radius-lg` | 10px | Dropzone |
| `--radius-xl` | 12px | Modales |
| `--radius-full` | 9999px | Pills, barres de progression |

---

## 10. Scrollbars

- Largeur 8px
- Thumb : `--border`, `border-radius: full`
- Hover : `--text-tertiary`

---

## 11. Règles UX

### 11.1 Feedback utilisateur

- **Chargement** : GIF animé ou barre de progression, libellé explicite (« Analyse en cours… », « Copie : fichier.mp4 »)
- **Succès** : écran de confirmation, message clair, actions de suivi
- **Erreur** : zone dédiée, texte d’erreur lisible, pas uniquement une alerte système

### 11.2 Estimations

- Toujours indiquer une estimation (temps, espace) quand une opération peut être longue
- Préciser la source : « (vitesse mesurée) » ou « (estimation) »

### 11.3 États désactivés

- Boutons : `disabled` avec `opacity: 0.5`
- Expliquer pourquoi (ex. « Choisir un dossier de destination »)

### 11.4 Notices de sécurité

- Texte court, `role="note"`, couleur secondaire
- Ex. : « TransPorter ne modifie jamais vos fichiers d’origine »

---

## 12. Checklist pour une nouvelle app au même style

- [ ] Définir les variables `:root` et `.dark-theme` (palette 3 couleurs)
- [ ] Importer Open Sans et Lato
- [ ] Appliquer `.dark-theme` sur `body`
- [ ] Créer `.title-bar` et `.app-header` avec structure brand / actions
- [ ] Utiliser `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` pour les boutons
- [ ] Utiliser `.text-input`, `.field-group` pour les formulaires
- [ ] Utiliser `.params-dropdown` pour les menus déroulants du header
- [ ] Utiliser `.modal`, `.modal-content`, `.modal-header/body/footer` pour les modales
- [ ] Gérer les écrans avec `.screen` et `.screen.active`
- [ ] Appliquer `--radius-*`, `--shadow-*`, `--transition` pour cohérence
- [ ] Prévoir splash si nécessaire (même structure que TransPorter : keyframe type splashRotate, logo + version)
- [ ] Si logo en header : prévoir ouverture modale type « Notes de version » (changelog) au clic
- [ ] Éviter les icônes superflues, privilégier le texte

---

*Document de référence pour la création d’applications au style TransPorter. À adapter selon le contexte métier.*
