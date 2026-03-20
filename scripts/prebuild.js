const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// --- Calcul de la date du jour ---
const now = new Date();
const jj = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const aa = String(now.getFullYear()).slice(-2);
const version = `V1.${jj}.${mm}.${aa}`;

const moisFR = ['janvier','février','mars','avril','mai','juin',
                'juillet','août','septembre','octobre','novembre','décembre'];
const dateLisible = `${parseInt(jj)} ${moisFR[now.getMonth()]} 20${aa}`;

console.log(`[prebuild] Version du jour : ${version}`);

// --- 1. Mettre à jour APP_VERSION dans index.html ---
const htmlPath = path.join(ROOT, 'src', 'renderer', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(
  /window\.APP_VERSION\s*=\s*'V1\.[^']*';/,
  `window.APP_VERSION = '${version}';`
);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`[prebuild] index.html mis à jour → ${version}`);

// --- 2. Récupérer les commits Git depuis le dernier tag ---
let commits = [];
try {
  let log = '';
  try {
    // Essayer depuis le dernier tag
    execSync('git describe --tags --abbrev=0', { cwd: ROOT });
    log = execSync('git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"%s"', {
      cwd: ROOT, encoding: 'utf8'
    });
  } catch (e) {
    // Pas de tag : prendre les 20 derniers commits
    log = execSync('git log --pretty=format:"%s" -20', {
      cwd: ROOT, encoding: 'utf8'
    });
  }
  commits = log.split('\n').map(l => l.trim()).filter(Boolean);
} catch (e) {
  console.warn('[prebuild] Impossible de lire les commits Git :', e.message);
}

// --- 3. Mettre à jour CHANGELOG.md ---
const changelogPath = path.join(ROOT, 'CHANGELOG.md');
let changelog = fs.existsSync(changelogPath)
  ? fs.readFileSync(changelogPath, 'utf8')
  : '';

const entryHeader = `## ${version}`;
if (!changelog.includes(entryHeader)) {
  const lignes = commits.length > 0
    ? commits.map(c => `- ${c}`).join('\n')
    : '- (aucun commit depuis le dernier build)';

  const nouvelleEntree =
    `${entryHeader} — ${dateLisible}\n\n` +
    `### Modifications\n${lignes}\n\n---\n\n`;

  changelog = nouvelleEntree + changelog;
  fs.writeFileSync(changelogPath, changelog, 'utf8');
  console.log(`[prebuild] CHANGELOG.md mis à jour avec ${commits.length} commit(s)`);
} else {
  console.log(`[prebuild] Entrée ${version} déjà présente dans CHANGELOG.md`);
}

// --- 4. Créer le tag Git ---
try {
  execSync(`git tag ${version}`, { cwd: ROOT });
  console.log(`[prebuild] Tag Git créé : ${version}`);
} catch (e) {
  console.log(`[prebuild] Tag ${version} déjà existant, ignoré`);
}
