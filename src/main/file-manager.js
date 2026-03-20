const path = require('path');
const fsExtra = require('fs-extra');
const md5File = require('md5-file');

// SÉCURITÉ : Les chemins sources (fichiers originaux) sont en LECTURE SEULE.
// On ne fait que lire (scan/copie) et écrire UNIQUEMENT dans le dossier de destination (valise).
// Aucune suppression, modification ou renommage des fichiers d'origine.
let archiver;
try {
  archiver = require('archiver');
} catch (e) {
  console.error('[file-manager] Erreur lors du chargement d\'archiver:', e.message);
  console.error('[file-manager] Veuillez exécuter: npm install archiver');
  archiver = null;
}
const { updateProjectPaths } = require('./path-updater');
const { generateReport } = require('./report-generator');

function getTypeFolder(type) {
  switch (type) {
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'image':
      return 'Images';
    case 'graphics':
      return 'Graphics';
    case 'lut':
      return 'LUTs';
    case 'captions':
      return 'Captions';
    case 'linked':
      return 'Linked_Projects';
    default:
      return 'Other';
  }
}

/**
 * Lance la copie des fichiers sélectionnés.
 *
 * @param {Object} options
 * @param {Array} options.files Liste de médias sélectionnés ({ path, type, name, size })
 * @param {string} options.destinationPath Dossier racine de la valise
 * @param {string} options.suitcaseName Nom de la valise (dossier)
 * @param {string} options.orgMode 'type' | 'original'
 * @param {boolean} [options.zipSuitcase] Si true, compresse la valise en .zip
 * @param {string} [options.projectFilePath] Chemin du fichier .prproj original
 * @param {string} [options.projectName]
 * @param {string} [options.premierVersion]
 * @param {string} [options.profileName]
 * @param {string} [options.profileEmail]
 * @param {(event: Object) => void} onProgress Callback de progression (appelé à chaque étape)
 */
async function startCopy(options, onProgress) {
  const {
    files,
    destinationPath,
    suitcaseName,
    orgMode,
    zipSuitcase = false,
    projectFilePath,
    projectName,
    premierVersion,
    profileName,
    profileEmail,
  } = options;
  const safeSuitcaseName = suitcaseName || 'VALISE_PREMIERE';

  // S'assurer que zipSuitcase est un booléen
  const shouldZip = Boolean(zipSuitcase);
  console.log('[file-manager] startCopy appelé avec zipSuitcase:', zipSuitcase, '→ shouldZip:', shouldZip);

  const root = path.join(destinationPath, safeSuitcaseName);
  const projectDir = path.join(root, 'Project');

  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Calculer les plages de pourcentage global
  // Si compression activée : 0-90% pour copie, 90-100% pour compression
  // Si pas de compression : 0-100% pour copie
  const COPY_PERCENT_RANGE = shouldZip ? 0.90 : 1.0; // 90% si ZIP, 100% sinon
  const ZIP_PERCENT_RANGE = shouldZip ? 0.10 : 0.0; // 10% si ZIP, 0% sinon
  const COPY_PERCENT_START = 0.0;
  const COPY_PERCENT_END = COPY_PERCENT_RANGE;
  const ZIP_PERCENT_START = COPY_PERCENT_END;
  const ZIP_PERCENT_END = 1.0;

  const copyLog = [];
  let copiedFiles = 0;
  let copiedBytes = 0;

  const startedAt = Date.now();

  await fsExtra.ensureDir(root);
  await fsExtra.ensureDir(projectDir);

  // Copie du .prproj original dans Project/ (backup)
  if (projectFilePath) {
    try {
      const baseName = path.basename(projectFilePath, path.extname(projectFilePath));
      const destOriginal = path.join(projectDir, `${baseName}_ORIGINAL.prproj`);
      await fsExtra.copy(projectFilePath, destOriginal);
      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'project-copied',
          projectOriginal: projectFilePath,
          destOriginal,
        });
      }
    } catch (e) {
      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'project-copy-error',
          error: e.message,
          projectOriginal: projectFilePath,
        });
      }
    }
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file.path) {
      // on ignore les entrées sans chemin réel
      continue;
    }

    const src = file.path;

    let destDir;
    if (orgMode === 'original' && file.path) {
      // On reconstruit l'arbo d'origine à partir du chemin complet
      const parsed = path.parse(src);
      const relFromRoot = parsed.dir.startsWith(path.sep)
        ? parsed.dir.slice(1)
        : parsed.dir;
      destDir = path.join(root, relFromRoot);
    } else {
      // Mode par type (défaut)
      const typeFolder = getTypeFolder(file.type);
      destDir = path.join(root, typeFolder);
    }

    const dest = path.join(destDir, path.basename(src));
    if (!dest.startsWith(root)) {
      console.error('[file-manager] Sécurité : destination hors valise, ignoré:', dest);
      continue;
    }

    try {
      await fsExtra.ensureDir(destDir);

      const beforeSize = file.size || (await fsExtra.stat(src)).size;
      const beforeMd5 = await md5File(src);

      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'file-start',
          index,
          totalFiles,
          file: {
            name: path.basename(src),
            src,
            dest,
          },
        });
      }

      await fsExtra.copy(src, dest);

      const afterStat = await fsExtra.stat(dest);
      const afterMd5 = await md5File(dest);

      const ok = beforeSize === afterStat.size && beforeMd5 === afterMd5;

      copiedFiles += 1;
      copiedBytes += afterStat.size;

      const elapsed = (Date.now() - startedAt) / 1000;
      const speed = elapsed > 0 ? copiedBytes / elapsed : 0;
      // Calculer la progression de la copie (0.0 à 1.0)
      const copyProgress = totalBytes > 0 ? copiedBytes / totalBytes : copiedFiles / totalFiles;
      // Convertir en pourcentage global (0-90% si ZIP, 0-100% sinon)
      const globalProgress = COPY_PERCENT_START + (copyProgress * (COPY_PERCENT_END - COPY_PERCENT_START));

      const logEntry = {
        name: path.basename(src),
        src,
        dest,
        ok,
        size: afterStat.size,
        type: file.type,
      };
      copyLog.push(logEntry);

      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'file-complete',
          index,
          totalFiles,
          file: logEntry,
          globalProgress,
          copiedFiles,
          copiedBytes,
          speedBytesPerSec: speed,
        });
      }
    } catch (error) {
      const logEntry = {
        name: path.basename(src),
        src,
        dest,
        ok: false,
        error: error.message,
        type: file.type,
      };
      copyLog.push(logEntry);
      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'file-error',
          index,
          totalFiles,
          file: logEntry,
        });
      }
    }
  }

  const durationMs = Date.now() - startedAt;

  // Mise à jour du .prproj dans la valise (création de *_UPDATED.prproj)
  let updatedProjectPath = null;
  if (projectFilePath) {
    updatedProjectPath = await updateProjectPaths(projectFilePath, copyLog, root, projectDir);
    if (typeof onProgress === 'function' && updatedProjectPath) {
      onProgress({
        kind: 'project-updated',
        updatedProjectPath,
      });
    }
  }

  // Génération du rapport texte à la racine de la valise
  let reportPath = null;
  try {
    reportPath = await generateReport(root, {
      copyLog,
      durationMs,
      copiedFiles,
      copiedBytes,
      projectName,
      premierVersion,
      profileName,
      profileEmail,
    });
    if (typeof onProgress === 'function') {
      onProgress({
        kind: 'report-generated',
        reportPath,
      });
    }
  } catch (e) {
    console.error('[file-manager] Erreur génération rapport :', e.message);
  }

  let finalPath = root;
  let zipPath = null;

  // Si compression demandée, créer un ZIP
  if (shouldZip) {
    if (!archiver) {
      const errorMsg = 'Le package archiver n\'est pas installé. Exécutez: npm install archiver';
      console.error('[file-manager]', errorMsg);
      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'zip-error',
          error: errorMsg,
        });
      }
      throw new Error(errorMsg);
    }

    console.log('[file-manager] Compression ZIP demandée pour:', root);
    
    if (typeof onProgress === 'function') {
      // Au début de la compression, on est à COPY_PERCENT_END (90% si ZIP activé)
      onProgress({
        kind: 'zip-start',
        root,
        globalProgress: COPY_PERCENT_END, // 90% si ZIP, sinon ne devrait pas arriver ici
      });
    }

    zipPath = path.join(destinationPath, `${safeSuitcaseName}.zip`);
    console.log('[file-manager] Chemin ZIP cible:', zipPath);
    
    try {
      // Compter le nombre total de fichiers à compresser pour calculer la progression
      let totalEntries = 0;
      try {
        const countEntries = async (dir) => {
          const items = await fsExtra.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              await countEntries(fullPath);
            } else {
              totalEntries += 1;
            }
          }
        };
        await countEntries(root);
        console.log('[file-manager] Nombre total d\'entrées à compresser:', totalEntries);
      } catch (e) {
        console.warn('[file-manager] Impossible de compter les entrées:', e.message);
      }

      await new Promise((resolve, reject) => {
        const output = fsExtra.createWriteStream(zipPath);
        const archive = archiver('zip', {
          zlib: { level: 9 }, // Compression maximale
        });

        output.on('close', () => {
          const size = archive.pointer();
          console.log(`[file-manager] ZIP créé : ${zipPath} (${size} bytes)`);
          resolve();
        });

        archive.on('error', (err) => {
          console.error('[file-manager] Erreur archiver:', err);
          reject(err);
        });

        output.on('error', (err) => {
          console.error('[file-manager] Erreur output stream:', err);
          reject(err);
        });

        // Suivre la progression de la compression basée sur le nombre d'entrées
        archive.on('progress', (progress) => {
          if (typeof onProgress === 'function') {
            let zipProgress = 0;
            if (totalEntries > 0) {
              // Utiliser le nombre d'entrées traitées
              zipProgress = Math.min(progress.entries.processed / totalEntries, 1);
            } else if (progress.entries.total > 0) {
              // Fallback : utiliser le total d'entrées fourni par archiver
              zipProgress = Math.min(progress.entries.processed / progress.entries.total, 1);
            } else {
              // Dernier fallback : progression approximative basée sur les entrées traitées
              // On suppose qu'on est à environ 50% quand on a traité quelques entrées
              zipProgress = Math.min(progress.entries.processed * 0.1, 0.95);
            }
            
            // Convertir la progression ZIP (0-1) en pourcentage global (90-100% si ZIP activé)
            const globalProgress = ZIP_PERCENT_START + (zipProgress * (ZIP_PERCENT_END - ZIP_PERCENT_START));
            
            onProgress({
              kind: 'zip-progress',
              progress: zipProgress, // Progression relative de la compression (0-1)
              globalProgress, // Progression globale totale (0-1)
              processedEntries: progress.entries.processed,
              totalEntries: totalEntries || progress.entries.total || 0,
            });
          }
        });

        archive.pipe(output);

        // Ajouter tout le contenu du dossier root au ZIP
        console.log('[file-manager] Ajout du dossier au ZIP:', root, '→', safeSuitcaseName);
        archive.directory(root, safeSuitcaseName, false);

        archive.finalize();
      });

      // Vérifier que le ZIP existe avant de supprimer le dossier
      const zipExists = await fsExtra.pathExists(zipPath);
      if (!zipExists) {
        throw new Error('Le fichier ZIP n\'a pas été créé');
      }

      // Supprimer le dossier root après compression
      await fsExtra.remove(root);
      console.log(`[file-manager] Dossier ${root} supprimé après compression`);

      if (typeof onProgress === 'function') {
        // La compression est terminée, on est à 100%
        onProgress({
          kind: 'zip-complete',
          zipPath,
          globalProgress: 1.0, // 100%
        });
      }

      finalPath = zipPath;
    } catch (error) {
      console.error('[file-manager] Erreur lors de la compression ZIP :', error.message);
      console.error('[file-manager] Stack:', error.stack);
      if (typeof onProgress === 'function') {
        onProgress({
          kind: 'zip-error',
          error: error.message,
        });
      }
      // En cas d'erreur, on garde le dossier
      finalPath = root;
    }
  } else {
    console.log('[file-manager] Compression ZIP non demandée (zipSuitcase = false)');
    // Si pas de compression, s'assurer qu'on est à 100% à la fin
    if (typeof onProgress === 'function') {
      onProgress({
        kind: 'all-complete',
        globalProgress: 1.0, // 100%
      });
    }
  }

  return {
    root: finalPath,
    zipPath,
    totalFiles,
    copiedFiles,
    copiedBytes,
    durationMs,
    copyLog,
    updatedProjectPath,
    reportPath,
  };
}

module.exports = {
  startCopy,
};


