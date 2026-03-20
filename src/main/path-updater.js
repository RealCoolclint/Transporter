const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Met à jour les chemins d'un fichier .prproj en pointant vers la valise.
 * SÉCURITÉ : lit UNIQUEMENT le .prproj original (jamais modifié). Écrit le fichier
 * mis à jour UNIQUEMENT dans projectDir (dossier de la valise), jamais à l'emplacement source.
 *
 * @param {string} projectFilePath Chemin du .prproj original (lecture seule)
 * @param {Array} copyLog Journal de copie avec src/dest
 * @param {string} rootPath Racine de la valise (dossier VALISE_...)
 * @param {string} projectDir Dossier Project/ dans la valise (seul emplacement d'écriture)
 * @returns {Promise<string|null>} Chemin du .prproj mis à jour dans la valise, ou null
 */
async function updateProjectPaths(projectFilePath, copyLog, rootPath, projectDir) {
  if (!projectFilePath || !fs.existsSync(projectFilePath)) {
    console.warn('[path-updater] projectFilePath introuvable, abandon de la mise à jour');
    return null;
  }

  try {
    const originalBuffer = await fs.promises.readFile(projectFilePath);
    const xmlBuffer = await gunzip(originalBuffer);
    let xmlText = xmlBuffer.toString('utf8');

    // Construction du mapping src -> nouveau chemin relatif
    const replacements = [];
    copyLog
      .filter((entry) => entry && entry.ok && entry.src && entry.dest)
      .forEach((entry) => {
        const src = entry.src;
        const dest = entry.dest;

        const relFromRoot = path
          .relative(rootPath, dest)
          .split(path.sep)
          .join('/'); // normalisation en slashs

        const newRelative = `./${relFromRoot}`;

        const normalizedSrc = src.split(path.sep).join('/');
        replacements.push({
          original: normalizedSrc,
          replacement: newRelative,
        });
      });

    // Application des remplacements dans le texte XML
    replacements.forEach(({ original, replacement }) => {
      if (!original) return;

      const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const patterns = [
        new RegExp(escaped, 'g'),
        new RegExp(`file://localhost${escaped}`, 'g'),
        new RegExp(`file://${escaped}`, 'g'),
      ];

      patterns.forEach((re) => {
        xmlText = xmlText.replace(re, replacement);
      });
    });

    const updatedBuffer = await gzip(Buffer.from(xmlText, 'utf8'));

    const baseName = path.basename(projectFilePath, path.extname(projectFilePath));
    const updatedPath = path.join(projectDir, `${baseName}_UPDATED.prproj`);
    const rootResolved = path.resolve(rootPath);
    if (!path.resolve(updatedPath).startsWith(rootResolved)) {
      console.error('[path-updater] Sécurité : chemin d\'écriture hors valise, abandon');
      return null;
    }

    await fs.promises.writeFile(updatedPath, updatedBuffer);

    console.log('[path-updater] Projet mis à jour écrit dans :', updatedPath);
    return updatedPath;
  } catch (error) {
    console.error('[path-updater] Erreur lors de la mise à jour du .prproj :', error.message);
    return null;
  }
}

module.exports = {
  updateProjectPaths,
};


