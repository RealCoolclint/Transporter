const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const appPath = path.join(ROOT, 'dist', 'mac-arm64', 'TransPorter.app');
const iconSrc = path.join(ROOT, 'build', 'icon.icns');

try {
  if (fs.existsSync(appPath) && fs.existsSync(iconSrc)) {
    execSync(`fileicon set "${appPath}" "${iconSrc}"`, { cwd: ROOT });
    console.log('[postbuild] Icône personnalisée appliquée sur TransPorter.app');
  } else {
    console.warn('[postbuild] .app ou icône introuvable, icône non appliquée');
    console.warn('  appPath:', appPath);
    console.warn('  iconSrc:', iconSrc);
  }
} catch (e) {
  console.warn('[postbuild] Erreur application icône :', e.message);
}
