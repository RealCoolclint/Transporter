# Mise en ligne sur GitHub (RealCoolclint/Transporter)

Ton dépôt est déjà créé avec un README. Suis ces étapes **dans l’ordre** depuis le dossier du projet (Tranporter).

---

## 1. Vérifier que Git est initialisé

Ouvre un terminal dans le dossier du projet et exécute :

```bash
cd "/Volumes/BACKUP PRO/Outils/App Persos/Tranporter"
git status
```

- Si tu vois "not a git repository" → passe à l’étape 2.
- Si tu vois la liste des fichiers → passe à l’étape 3.

---

## 2. Initialiser Git (si besoin)

```bash
git init
git add .
git commit -m "Initial commit - TransPorter app + version web"
```

---

## 3. Branche principale

Assure-toi d’être sur `main` (GitHub utilise `main` par défaut) :

```bash
git branch -M main
```

---

## 4. Raccorder le dépôt GitHub

Remplace par ton URL si besoin (déjà le bon pour RealCoolclint/Transporter) :

```bash
git remote add origin https://github.com/RealCoolclint/Transporter.git
```

Si tu as déjà un `origin` et que tu veux le remplacer :

```bash
git remote remove origin
git remote add origin https://github.com/RealCoolclint/Transporter.git
```

---

## 5. Récupérer le README déjà sur GitHub

Comme tu as créé le dépôt avec un README, il y a déjà un commit sur GitHub. Il faut le récupérer puis fusionner :

```bash
git pull origin main --allow-unrelated-histories
```

- Si un éditeur s’ouvre pour un message de merge : enregistre et ferme (souvent `:wq` sous vim, ou Ctrl+X sous nano).
- S’il y a un conflit sur `README.md` : ouvre le fichier, garde ce que tu veux (ton contenu ou celui de GitHub), sauvegarde, puis :

```bash
git add README.md
git commit -m "Merge README from GitHub"
```

---

## 6. Pousser le code

```bash
git push -u origin main
```

Si on te demande de te connecter : utilise ton compte GitHub (ou un **Personal Access Token** si l’auth par mot de passe est désactivée).

---

## 7. Activer GitHub Pages (méthode « branche »)

1. **Pousse d’abord** les derniers changements (dont le workflow) :
   ```bash
   git add .
   git commit -m "Deploy via branche gh-pages"
   git push origin main
   ```
2. Va sur **https://github.com/RealCoolclint/Transporter** → onglet **Actions**
3. Attends que le workflow **Deploy Web (GitHub Pages)** soit **vert** (il crée la branche `gh-pages`).
4. Ensuite : **Settings** (Paramètres) → menu de gauche **Pages**
5. Sous **Build and deployment** :
   - **Source** : **Deploy from a branch**
   - **Branch** : **gh-pages** → dossier **/ (root)** → **Save**

Ton site sera alors en ligne à : **https://realcoolclint.github.io/Transporter/**

---

## Résumé des commandes (copier-coller)

À exécuter une par une dans le dossier du projet :

```bash
cd "/Volumes/BACKUP PRO/Outils/App Persos/Tranporter"
git status
```

Si pas encore un dépôt Git :

```bash
git init
git add .
git commit -m "Initial commit - TransPorter app + version web"
```

Puis dans tous les cas :

```bash
git branch -M main
git remote add origin https://github.com/RealCoolclint/Transporter.git
git pull origin main --allow-unrelated-histories
git push -u origin main
```

Ensuite : **Settings → Pages → Source = GitHub Actions**.

Si une étape bloque (message d’erreur ou conflit), copie le message ou la sortie du terminal et on pourra débloquer précisément.
