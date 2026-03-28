const { spawn } = require('child_process');
const _soundHour = new Date().getHours();
const _soundFile = _soundHour >= 5 && _soundHour < 11 ? 'startup-matin.mp3'
  : _soundHour >= 11 && _soundHour < 17 ? 'startup-aprem.mp3'
  : _soundHour >= 17 && _soundHour < 22 ? 'startup-soir.mp3'
  : 'startup-nuit.mp3';
const _soundBase = __dirname.includes('app.asar')
  ? require('path').join(__dirname.replace('app.asar', 'app.asar.unpacked'), '../renderer/assets/sounds')
  : require('path').join(__dirname, '../renderer/assets/sounds');
spawn('afplay', [require('path').join(_soundBase, _soundFile)]);

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const https = require('https');
const { Transform, PassThrough } = require('stream');
const { exec } = require('child_process');
const { Worker } = require('worker_threads');
const fsExtra = require('fs-extra');
const glob = require('glob');
const archiver = require('archiver');
const { startCopy } = require('./file-manager');
const { readLauncherSession } = require('./session-reader');
const {
  loadProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getProfile,
} = require('./profile-manager');
const { loadHistory, addHistory, updateLastWithUpload, getEstimatesFromHistory } = require('./history-manager');

let mainWindow;

const TRANSPORTER_DATA_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'TransPorter');
const UPLOAD_SPEED_FILE = path.join(TRANSPORTER_DATA_DIR, 'upload-speed.json');
const MONDAY_CONFIG_FILE = path.join(TRANSPORTER_DATA_DIR, 'monday-config.json');

/** Vitesse d'upload Gofile réelle (octets/s) — mesurée lors des uploads, persistée */
let measuredUploadSpeedBytesPerSec = null;
const DEFAULT_UPLOAD_SPEED_MB_PER_SEC = 15; // Fallback réaliste (fibre typique) quand aucun historique

/**
 * Charge la vitesse d'upload enregistrée depuis le dernier upload Gofile réussi.
 */
async function loadUploadSpeed() {
  try {
    if (await fsExtra.pathExists(UPLOAD_SPEED_FILE)) {
      const data = await fsExtra.readJson(UPLOAD_SPEED_FILE);
      if (data && typeof data.bytesPerSec === 'number' && data.bytesPerSec > 0) {
        measuredUploadSpeedBytesPerSec = Math.min(data.bytesPerSec, 200 * 1024 * 1024); // plafond 200 Mo/s
        console.log('[main] Vitesse upload chargée:', (measuredUploadSpeedBytesPerSec / (1024 * 1024)).toFixed(1), 'Mo/s');
      }
    }
  } catch (e) {
    console.warn('[main] loadUploadSpeed:', e.message);
  }
}

/**
 * Enregistre la vitesse d'upload mesurée (moyenne glissante avec la précédente si elle existe).
 */
async function saveUploadSpeed(bytesPerSec) {
  try {
    await fsExtra.ensureDir(TRANSPORTER_DATA_DIR);
    let previous = measuredUploadSpeedBytesPerSec;
    const smoothed = previous
      ? Math.round(0.4 * previous + 0.6 * bytesPerSec) // lissage
      : bytesPerSec;
    measuredUploadSpeedBytesPerSec = Math.min(smoothed, 200 * 1024 * 1024);
    await fsExtra.writeJson(UPLOAD_SPEED_FILE, {
      bytesPerSec: measuredUploadSpeedBytesPerSec,
      lastUpdated: new Date().toISOString(),
    });
    console.log('[main] Vitesse upload enregistrée:', (measuredUploadSpeedBytesPerSec / (1024 * 1024)).toFixed(1), 'Mo/s');
  } catch (e) {
    console.warn('[main] saveUploadSpeed:', e.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 920,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: '#1e293b',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Gestion des erreurs de chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[main] Erreur de chargement:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[renderer] ${message}`);
  });
}

// --- Monday.com helpers ---

async function mondayRequest(token, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: 'api.monday.com',
      path: '/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'API-Version': '2024-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getMondayConfig() {
  try {
    if (await fsExtra.pathExists(MONDAY_CONFIG_FILE)) {
      return await fsExtra.readJson(MONDAY_CONFIG_FILE);
    }
  } catch (e) {}
  return {};
}

async function saveMondayConfig(config) {
  await fsExtra.ensureDir(TRANSPORTER_DATA_DIR);
  await fsExtra.writeJson(MONDAY_CONFIG_FILE, config, { spaces: 2 });
}

// Enregistrer tous les handlers IPC avant la création de la fenêtre
// IPC: analyse d'un fichier .prproj (dans un worker pour ne pas bloquer l'UI)
ipcMain.handle('analyze-prproj', async (_event, prprojPath) => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        worker.terminate();
      } catch (_) {}
      resolve(payload);
    };
    const workerPath = path.join(__dirname, 'prproj-worker.js');
    const worker = new Worker(workerPath, {
      workerData: { prprojPath },
      resourceLimits: { stackSizeMb: 32 },
    });
    const timeout = setTimeout(() => {
      finish({ ok: false, error: 'Analyse interrompue (délai dépassé). Projet peut-être trop volumineux.' });
    }, 120000); // 2 min max
    worker.on('message', (msg) => {
      if (msg.ok) {
        const sample = (msg.result.mediaFiles || []).slice(0, 3);
        sample.forEach((f) => {
          console.log('[main] DEBUG media:', JSON.stringify({ name: f.name, path: f.path, exists: f.exists, size: f.size }));
        });
        finish({ ok: true, data: msg.result });
      } else {
        finish({ ok: false, error: msg.error || 'Erreur inconnue' });
      }
    });
    worker.on('error', (err) => {
      console.error('[main] Worker prproj:', err.message);
      finish({ ok: false, error: err.message });
    });
    worker.on('exit', (code) => {
      if (!settled && code !== 0 && code !== null) {
        finish({ ok: false, error: `Worker arrêté (code ${code})` });
      }
    });
  });
});

// IPC: choix d'un dossier (pour relier médias offline ou destination)
ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (result.canceled || !result.filePaths || !result.filePaths[0]) {
    return { ok: false };
  }

  return { ok: true, path: result.filePaths[0] };
});

// IPC: vérifier l'espace disque disponible pour un chemin
ipcMain.handle('get-disk-space', async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      return { ok: false, error: 'Chemin invalide' };
    }
    // Sur macOS/Linux : df -k retourne l'espace en blocs de 1024 octets
    // Colonne "Available" = 4e colonne (index 3)
    const safePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
    const output = execSync(`df -k ${JSON.stringify(safePath)}`, { encoding: 'utf8', maxBuffer: 4096 });
    const lines = output.trim().split('\n');
    if (lines.length < 2) return { ok: false, error: 'Impossible de lire l\'espace disque' };
    const cols = lines[1].trim().split(/\s+/);
    // Format: Filesystem 1024-blocks Used Available Capacity [Mounted on]
    let availableBytes = 0;
    if (cols.length >= 4) {
      const availBlocks = parseInt(cols[3], 10);
      if (!Number.isNaN(availBlocks) && availBlocks >= 0) {
        availableBytes = availBlocks * 1024; // blocs de 1024 octets
      }
    }
    return { ok: true, availableBytes };
  } catch (err) {
    console.error('[main] get-disk-space:', err.message);
    return { ok: false, error: err.message };
  }
});

// IPC: obtenir la vitesse d'upload (priorité: historique > mesure directe > défaut)
ipcMain.handle('get-upload-speed', async () => {
  const { uploadSpeedBytesPerSec: fromHistory } = await getEstimatesFromHistory();
  const bytesPerSec = fromHistory ?? measuredUploadSpeedBytesPerSec
    ?? (DEFAULT_UPLOAD_SPEED_MB_PER_SEC * 1024 * 1024);
  const isMeasured = fromHistory !== null || measuredUploadSpeedBytesPerSec !== null;
  return { ok: true, bytesPerSec, isMeasured };
});

// IPC: obtenir la vitesse de copie (priorité: historique > défaut)
ipcMain.handle('get-copy-speed', async () => {
  const { copySpeedBytesPerSec } = await getEstimatesFromHistory();
  const DEFAULT_COPY_MB_PER_SEC = 100;
  const bytesPerSec = copySpeedBytesPerSec ?? (DEFAULT_COPY_MB_PER_SEC * 1024 * 1024);
  return { ok: true, bytesPerSec, isMeasured: copySpeedBytesPerSec !== null };
});

// IPC: historique des valises
ipcMain.handle('history-load', async () => {
  try {
    const entries = await loadHistory();
    return { ok: true, entries };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('history-add', async (_event, entry) => {
  try {
    await addHistory(entry);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('history-update-last-upload', async (_event, uploadDurationMs) => {
  try {
    await updateLastWithUpload(uploadDurationMs);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: choix d'un fichier (pour relier un média offline spécifique)
ipcMain.handle('choose-file', async (_event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Sélectionner un fichier',
      filters: options.filters || [
        { name: 'Tous les fichiers', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || !result.filePaths[0]) {
      return { ok: false };
    }

    // Obtenir la taille du fichier
    let size = 0;
    try {
      const stat = await fsExtra.stat(result.filePaths[0]);
      size = stat.size;
    } catch (e) {
      // Laisser size à 0 si erreur
    }

    return { ok: true, filePath: result.filePaths[0], size };
  } catch (error) {
    console.error('[main] Erreur choose-file:', error.message);
    return { ok: false, error: error.message };
  }
});

// IPC: tentative de reliage des médias offline à partir d'un dossier racine
ipcMain.handle('relink-offline-media', async (_event, { rootPath, mediaFiles }) => {
  try {
    if (!rootPath || !Array.isArray(mediaFiles)) {
      throw new Error('Paramètres invalides pour relink-offline-media');
    }

    const updated = [];

    for (const media of mediaFiles) {
      if (!media || !media.name) continue;

      const pattern = `**/${media.name}`;
      const matches = glob.sync(pattern, {
        cwd: rootPath,
        nocase: true,
        absolute: true,
      });

      if (matches && matches.length > 0) {
        const newPath = matches[0];
        let size = 0;
        try {
          const stat = await fsExtra.stat(newPath);
          size = stat.size;
        } catch (e) {
          // on laisse size à 0 si erreur
        }

        updated.push({
          originalPath: media.path,
          name: media.name,
          newPath,
          size,
        });
      }
    }

    return { ok: true, updated };
  } catch (error) {
    console.error('[main] Erreur relink-offline-media:', error.message);
    return { ok: false, error: error.message };
  }
});

// Constantes pour l'estimation d'espace disque
const OVERHEAD_BYTES = 100 * 1024 * 1024; // 100 Mo (prproj, rapport, structure)
const ZIP_OVERHEAD_MULTIPLIER = 2.0; // En mode ZIP : dossier + archive temporaire

// IPC: lancement de la copie des médias sélectionnés
ipcMain.handle('start-copy', async (_event, payload) => {
  try {
    if (!payload || !Array.isArray(payload.files) || !payload.destinationPath) {
      throw new Error('Paramètres invalides pour start-copy');
    }

    // Vérification de l'espace disque disponible avant de lancer
    const totalBytes = payload.files.reduce((acc, f) => acc + (f.size || 0), 0);
    const zipSuitcase = Boolean(payload.zipSuitcase);
    const requiredBytes = zipSuitcase
      ? Math.ceil(totalBytes * ZIP_OVERHEAD_MULTIPLIER) + OVERHEAD_BYTES
      : totalBytes + OVERHEAD_BYTES;

    try {
      const dfOutput = execSync(`df -k ${JSON.stringify(payload.destinationPath)}`, {
        encoding: 'utf8',
        maxBuffer: 4096,
      });
      const lines = dfOutput.trim().split('\n');
      if (lines.length >= 2) {
        const cols = lines[1].trim().split(/\s+/);
        if (cols.length >= 4) {
          const availBlocks = parseInt(cols[3], 10);
          const availableBytes = Number.isNaN(availBlocks) ? 0 : availBlocks * 1024;
          if (availableBytes < requiredBytes) {
            const formatGb = (b) => (b / (1024 ** 3)).toFixed(1);
            return {
              ok: false,
              error: `Espace disque insuffisant. Requis : ~${formatGb(requiredBytes)} Go, disponible : ~${formatGb(availableBytes)} Go. Choisissez un autre emplacement ou libérez de l'espace.`,
            };
          }
        }
      }
    } catch (spaceErr) {
      console.warn('[main] Vérification espace disque ignorée:', spaceErr.message);
      // On continue malgré l'erreur (ex: chemin invalide temporairement)
    }

    const result = await startCopy(payload, (progressEvent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('copy-progress', progressEvent);
      }
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error('[main] Erreur start-copy:', error.message);
    return { ok: false, error: error.message };
  }
});

// IPC: gestion des profils utilisateur
ipcMain.handle('get-launcher-session', () => global.launcherSession || { connected: false });
ipcMain.handle('profiles-load', async () => {
  try {
    const profiles = await loadProfiles();
    return { ok: true, data: profiles };
  } catch (error) {
    console.error('[main] Erreur profiles-load:', error.message);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('profiles-create', async (_event, profileData) => {
  try {
    const profile = await createProfile(profileData);
    return { ok: true, data: profile };
  } catch (error) {
    console.error('[main] Erreur profiles-create:', error.message);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('profiles-update', async (_event, { profileId, updates }) => {
  try {
    const profile = await updateProfile(profileId, updates);
    return { ok: true, data: profile };
  } catch (error) {
    console.error('[main] Erreur profiles-update:', error.message);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('profiles-delete', async (_event, profileId) => {
  try {
    await deleteProfile(profileId);
    return { ok: true };
  } catch (error) {
    console.error('[main] Erreur profiles-delete:', error.message);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('profiles-get', async (_event, profileId) => {
  try {
    const profile = await getProfile(profileId);
    return { ok: true, data: profile };
  } catch (error) {
    console.error('[main] Erreur profiles-get:', error.message);
    return { ok: false, error: error.message };
  }
});

// IPC: sélection d'une photo de profil
ipcMain.handle('select-profile-photo', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Sélectionner une photo de profil',
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled) {
      return null;
    }
    
    return { filePath: result.filePaths[0] };
  } catch (error) {
    console.error('[main] Erreur select-profile-photo:', error.message);
    return null;
  }
});

// IPC: lister les GIFs de célébration
ipcMain.handle('list-celebration-gifs', async () => {
  try {
    const gifsDir = path.join(__dirname, '..', 'renderer', 'assets', 'GIF');
    
    // Vérifier si le dossier existe
    if (!await fsExtra.pathExists(gifsDir)) {
      console.warn('[GIF] Le dossier assets/GIF n\'existe pas');
      return [];
    }
    
    // Lire les fichiers du dossier
    const files = await fsExtra.readdir(gifsDir);
    
    // Filtrer pour ne garder que les fichiers .gif
    const gifFiles = files.filter(file => 
      file.toLowerCase().endsWith('.gif')
    );
    
    console.log(`[GIF] ${gifFiles.length} GIF(s) trouvé(s) dans assets/GIF`);
    return gifFiles.map(file => path.join(gifsDir, file));
  } catch (error) {
    console.error('[GIF] Erreur lors de la lecture du dossier assets/GIF:', error);
    return [];
  }
});

// IPC: lister les GIFs de "mise en valise" (pendant la copie)
ipcMain.handle('list-loading-gifs', async () => {
  try {
    const loadingDir = path.join(__dirname, '..', 'renderer', 'assets', 'loading');
    if (!(await fsExtra.pathExists(loadingDir))) return [];
    const files = await fsExtra.readdir(loadingDir);
    const gifFiles = files.filter(file => file.toLowerCase().endsWith('.gif'));
    return gifFiles.map(file => path.join(loadingDir, file));
  } catch (error) {
    console.warn('[main] list-loading-gifs:', error.message);
    return [];
  }
});

// IPC: lister les GIFs d'écran "upload Gofile" (avant l'écran final)
ipcMain.handle('list-upload-gifs', async () => {
  try {
    const uploadDir = path.join(__dirname, '..', 'renderer', 'assets', 'upload');
    if (!(await fsExtra.pathExists(uploadDir))) return [];
    const files = await fsExtra.readdir(uploadDir);
    const gifFiles = files.filter(file => file.toLowerCase().endsWith('.gif'));
    return gifFiles.map(file => path.join(uploadDir, file));
  } catch (error) {
    console.warn('[main] list-upload-gifs:', error.message);
    return [];
  }
});

// IPC: ouvrir dans le Finder
ipcMain.handle('open-in-finder', async (_event, filePath) => {
  try {
    if (!filePath) {
      return { ok: false, error: 'Chemin non fourni' };
    }
    
    // Utiliser shell.showItemInFolder pour ouvrir le Finder et sélectionner l'élément
    await shell.showItemInFolder(filePath);
    return { ok: true };
  } catch (error) {
    console.error('[main] Erreur open-in-finder:', error.message);
    return { ok: false, error: error.message };
  }
});

// IPC: copier du texte dans le presse-papier
ipcMain.handle('copy-to-clipboard', (_event, text) => {
  try {
    clipboard.writeText(text || '');
    return { ok: true };
  } catch (error) {
    console.error('[main] Erreur copy-to-clipboard:', error.message);
    return { ok: false, error: error.message };
  }
});

// IPC: upload Gofile (ZIP ou dossier zippé à la volée)
const GOFILE_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

ipcMain.handle('gofile-upload', async (event, payload) => {
  const sendProgress = (percent, extra = {}) => {
    try {
      if (event.sender && !event.sender.isDestroyed()) {
        const phase = percent === -1 ? 'preparing' : 'uploading';
        event.sender.send('gofile-upload-progress', { percent: percent === -1 ? 0 : percent, phase, ...extra });
      }
    } catch (e) {
      console.warn('[main] gofile sendProgress:', e.message);
    }
  };

  let fileToUpload = null;
  let tempZipPath = null;

  try {
    if (!payload || (!payload.zipPath && !payload.folderPath)) {
      return { ok: false, error: 'zipPath ou folderPath requis' };
    }

    const suitcaseName = payload.suitcaseName || 'valise';

    if (payload.zipPath && (await fsExtra.pathExists(payload.zipPath))) {
      fileToUpload = payload.zipPath;
    } else if (payload.folderPath && (await fsExtra.pathExists(payload.folderPath))) {
      sendProgress(-1);
      tempZipPath = path.join(os.tmpdir(), `transporter-gofile-${Date.now()}-${suitcaseName}.zip`);
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tempZipPath);
        const archive = archiver('zip', { zlib: { level: 0 } });
        output.on('close', () => resolve());
        archive.on('error', reject);
        archive.pipe(output);
        const folderName = path.basename(payload.folderPath);
        archive.directory(payload.folderPath, folderName, false);
        archive.finalize();
      });
      fileToUpload = tempZipPath;
    } else {
      return { ok: false, error: 'Fichier ou dossier introuvable' };
    }

    const stat = await fs.promises.stat(fileToUpload);
    const totalBytes = stat.size;
    if (totalBytes === 0) {
      return { ok: false, error: 'Le fichier à envoyer est vide' };
    }

    // Étape 1 — récupérer le meilleur serveur Gofile
    const serverName = await new Promise((resolve, reject) => {
      const req = https.get('https://api.gofile.io/servers', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'ok' && json.data && json.data.servers && json.data.servers[0]) {
              resolve(json.data.servers[0].name);
            } else {
              reject(new Error(json.message || 'Réponse API serveurs invalide'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout serveurs Gofile')); });
    });

    const boundary = '----TransPorter' + Date.now();
    const filename = path.basename(fileToUpload);
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`,
      'utf8'
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const contentLength = header.length + totalBytes + footer.length;

    let bytesSent = 0;
    let transferStartTime = null; // Début du transfert réel (après latence connexion)
    let transferEndTime = null;
    let uploadTransformStart = null;

    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        if (uploadTransformStart === null) uploadTransformStart = Date.now();
        bytesSent += chunk.length;
        const pct = (bytesSent / totalBytes) * 100;
        if (pct >= 5 && transferStartTime === null) {
          transferStartTime = Date.now();
        }
        if (pct >= 95 && transferEndTime === null) {
          transferEndTime = Date.now();
        }
        const elapsedSec = (Date.now() - uploadTransformStart) / 1000;
        let remainingSeconds = null;
        if (elapsedSec > 0.5 && bytesSent > 0) {
          const speedBytesPerSec = bytesSent / elapsedSec;
          const remaining = (totalBytes - bytesSent) / speedBytesPerSec;
          remainingSeconds = Math.max(0, Math.round(remaining));
        }
        sendProgress(Math.min(99, pct), { remainingSeconds });
        callback(null, chunk);
      },
    });

    const bodyStream = new PassThrough();
    bodyStream.write(header);
    fs.createReadStream(fileToUpload)
      .pipe(progressTransform)
      .pipe(bodyStream, { end: false });
    progressTransform.on('end', () => {
      bodyStream.write(footer);
      bodyStream.end();
    });

    const uploadStartTime = Date.now();
    const uploadResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: `${serverName}.gofile.io`,
        path: '/uploadFile',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength,
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          sendProgress(100);
          const uploadDurationMs = Date.now() - uploadStartTime;
          try {
            const json = JSON.parse(data);
            if (json.status === 'ok' && json.data && json.data.downloadPage) {
              if (transferStartTime && transferEndTime && transferEndTime > transferStartTime) {
                const elapsedSec = (transferEndTime - transferStartTime) / 1000;
                const bytesInWindow = totalBytes * 0.9;
                const measuredSpeed = bytesInWindow / elapsedSec;
                if (measuredSpeed > 100 * 1024) {
                  saveUploadSpeed(measuredSpeed);
                }
              }
              resolve({ ok: true, downloadUrl: json.data.downloadPage, uploadDurationMs });
            } else {
              resolve({ ok: false, error: json.message || (data && data.trim()) || 'Réponse upload invalide' });
            }
          } catch (e) {
            // Gofile peut renvoyer du texte brut (ex. "error-file ...") au lieu de JSON
            const rawMessage = (data && typeof data === 'string' && data.trim()) ? data.trim() : e.message;
            resolve({ ok: false, error: rawMessage });
          }
        });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.setTimeout(GOFILE_UPLOAD_TIMEOUT_MS, () => {
        req.destroy();
        resolve({ ok: false, error: 'Délai d\'upload dépassé (5 min)' });
      });
      bodyStream.pipe(req);
    });

    if (tempZipPath && (await fsExtra.pathExists(tempZipPath))) {
      await fsExtra.remove(tempZipPath).catch((e) => console.warn('[main] Suppression ZIP tmp:', e.message));
    }

    return uploadResult;
  } catch (error) {
    console.error('[main] Erreur gofile-upload:', error.message);
    if (tempZipPath && (await fsExtra.pathExists(tempZipPath))) {
      await fsExtra.remove(tempZipPath).catch(() => {});
    }
    return { ok: false, error: error.message || 'Erreur inconnue' };
  }
});

// Fonction pour fermer Terminal directement
function closeTerminalDirectly(callback) {
  if (process.platform === 'darwin') {
    // Vérifier si on est dans Terminal (pas dans une app packagée)
    const isTerminal = process.env.TERM_PROGRAM === 'Apple_Terminal' || 
                       process.env.TERM_PROGRAM === 'iTerm.app';
    
    if (isTerminal) {
      console.log('[main] Fermeture de Terminal...');
      
      const { execSync } = require('child_process');
      
      // Méthode la plus fiable : trouver le PID de Terminal et le tuer directement
      try {
        // Trouver le PID de Terminal.app
        let terminalPid;
        try {
          if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
            terminalPid = execSync(`pgrep -x Terminal`, { encoding: 'utf8' }).trim();
          } else if (process.env.TERM_PROGRAM === 'iTerm.app') {
            terminalPid = execSync(`pgrep -x iTerm2`, { encoding: 'utf8' }).trim();
          }
        } catch (e) {
          // Si pgrep ne trouve rien, essayer avec ps
          const psOutput = execSync(`ps aux | grep -i "Terminal.app" | grep -v grep | awk '{print $2}' | head -1`, { encoding: 'utf8' }).trim();
          if (psOutput) terminalPid = psOutput;
        }
        
        if (terminalPid) {
          console.log(`[main] PID Terminal trouvé: ${terminalPid}`);
          // Tuer Terminal de manière forcée (évite la modale)
          execSync(`kill -9 ${terminalPid}`, { stdio: 'ignore', timeout: 1000 });
          console.log('[main] Terminal fermé via kill -9');
        } else {
          console.log('[main] PID Terminal non trouvé, tentative AppleScript...');
          // Fallback : AppleScript
          const script = `tell application "Terminal" to quit saving no`;
          execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { 
            timeout: 2000,
            stdio: 'ignore'
          });
          console.log('[main] Terminal fermé via AppleScript');
        }
      } catch (error) {
        console.log('[main] Erreur lors de la fermeture de Terminal:', error.message);
      }
    }
  }
  
  // Appeler le callback après un court délai
  if (callback) setTimeout(callback, 300);
}

// IPC: quitter l'application
ipcMain.handle('quit-app', async () => {
  try {
    console.log('[main] Fermeture de l\'application demandée');
    // Fermer toutes les fenêtres
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
    
    // Quitter l'application
    app.quit();
    
    // Fermer Terminal directement, puis terminer le processus
    closeTerminalDirectly(() => {
      // Forcer la fermeture du processus Node.js
      process.exit(0);
    });
    
    return { ok: true };
  } catch (error) {
    console.error('[main] Erreur quit-app:', error.message);
    return { ok: false, error: error.message };
  }
});

// Log pour confirmer l'enregistrement du handler
console.log('[main] Handler quit-app enregistré');

ipcMain.handle('read-changelog', async () => {
  try {
    const { app } = require('electron');
    const changelogPath = path.join(app.getAppPath(), 'CHANGELOG.md');
    if (!(await fsExtra.pathExists(changelogPath))) {
      return { ok: false, error: 'CHANGELOG.md introuvable' };
    }
    const content = await fsExtra.readFile(changelogPath, 'utf8');
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: récupérer le token Monday
ipcMain.handle('monday-get-token', async () => {
  try {
    const config = await getMondayConfig();
    return { ok: true, token: config.token || '' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: sauvegarder le token Monday
ipcMain.handle('monday-save-token', async (_event, token) => {
  try {
    const config = await getMondayConfig();
    config.token = token;
    await saveMondayConfig(config);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: charger les projets Monday filtrés (statut 3 à 8)
ipcMain.handle('monday-load-projects', async (_event, { token }) => {
  try {
    // Étape 1 : récupérer l'ID de la colonne "Statut Prod" (avec cache)
    const config = await getMondayConfig();
    let statutColId = config.statutProdColId || null;

    if (!statutColId) {
      const colGql = `query {
        boards(ids: [5033664702]) {
          columns { id title }
        }
      }`;
      const colRes = await mondayRequest(token, colGql);
      const columns = colRes?.data?.boards?.[0]?.columns || [];
      const col = columns.find(c => c.title === 'Statut Prod');
      if (!col) return { ok: false, error: 'Colonne "Statut Prod" introuvable sur le board.' };
      statutColId = col.id;
      config.statutProdColId = statutColId;
      await saveMondayConfig(config);
    }

    // Étape 2 : récupérer tous les items avec la valeur de "Statut Prod"
    // On pagine jusqu'à 200 items max
    let allItems = [];
    let cursor = null;
    let page = 0;

    do {
      const cursorParam = cursor ? `, cursor: "${cursor}"` : '';
      const gql = `query {
        boards(ids: [5033664702]) {
          items_page(limit: 50${cursorParam}) {
            cursor
            items {
              id
              name
              column_values(ids: ["${statutColId}"]) {
                text
              }
            }
          }
        }
      }`;
      const res = await mondayRequest(token, gql);
      const page_data = res?.data?.boards?.[0]?.items_page;
      const items = page_data?.items || [];
      allItems = allItems.concat(items);
      cursor = page_data?.cursor || null;
      page++;
    } while (cursor && page < 4);

    // Étape 3 : filtrer sur statut commençant par 3, 4, 5, 6, 7 ou 8
    const filtered = allItems.filter(item => {
      const statut = item.column_values?.[0]?.text || '';
      return /^[3-8]/.test(statut);
    }).map(item => ({
      id: item.id,
      name: item.name,
      statut: item.column_values?.[0]?.text || '',
    }));

    // Trier par statut puis par nom
    filtered.sort((a, b) => {
      if (a.statut < b.statut) return -1;
      if (a.statut > b.statut) return 1;
      return a.name.localeCompare(b.name);
    });

    return { ok: true, items: filtered };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: créer un sous-élément Monday
ipcMain.handle('monday-create-subitem', async (_event, { token, parentItemId, suitcaseName, date, profile, gofileUrl }) => {
  try {
    console.log('[Monday] Création sous-élément pour parentItemId:', parentItemId, '| valise:', suitcaseName);
    // Étape 1 : créer le sous-élément (nom uniquement)
    const subitemName = `Valise — ${suitcaseName}`;
    const createGql = `mutation {
      create_subitem(parent_item_id: ${parentItemId}, item_name: "${subitemName.replace(/"/g, "'")}") {
        id
        board { id }
      }
    }`;
    const createRes = await mondayRequest(token, createGql);
    const subitem = createRes?.data?.create_subitem;
    if (!subitem?.id) {
      return { ok: false, error: 'Création sous-élément échouée : ' + JSON.stringify(createRes?.errors) };
    }
    const subitemId = subitem.id;
    const subitemBoardId = subitem.board?.id;

    // Étape 2 : découvrir les colonnes du board de sous-éléments
    let columnMappings = {};
    if (subitemBoardId) {
      const config = await getMondayConfig();
      // Invalider l'ancien cache si incomplet
      if (config.subitemColumns && (!config.subitemColumns.text || !config.subitemColumns.link || !config.subitemColumns.date)) {
        delete config.subitemColumns;
        delete config.subitemBoardId;
        await saveMondayConfig(config);
        console.log('[Monday] Cache subitemColumns invalidé (incomplet)');
      }
      if (config.subitemColumns && config.subitemBoardId === subitemBoardId
          && config.subitemColumns.text && config.subitemColumns.link
          && config.subitemColumns.date) {
        columnMappings = config.subitemColumns;
      } else {
        const colGql = `query { boards(ids: [${subitemBoardId}]) { columns { id type title } } }`;
        const colRes = await mondayRequest(token, colGql);
        const columns = colRes?.data?.boards?.[0]?.columns || [];
        for (const col of columns) {
          // Mapping par titre — colonnes propriétaires de TransPorter
          if (col.title === 'Date valise') columnMappings.date = col.id;
          if (col.title === 'Profil') columnMappings.text = col.id;
          if (col.title === 'Lien Gofile') columnMappings.link = col.id;
        }
        // Créer les colonnes manquantes sur le board de sous-éléments
        if (!columnMappings.date) {
          const createDateGql = `mutation {
            create_column(board_id: ${subitemBoardId}, title: "Date valise", column_type: date) { id }
          }`;
          const createDateRes = await mondayRequest(token, createDateGql);
          const newDateId = createDateRes?.data?.create_column?.id;
          if (newDateId) {
            columnMappings.date = newDateId;
            console.log('[Monday] Colonne date créée:', newDateId);
          }
        }
        if (!columnMappings.text) {
          const createTextGql = `mutation {
            create_column(board_id: ${subitemBoardId}, title: "Profil", column_type: text) { id }
          }`;
          const createTextRes = await mondayRequest(token, createTextGql);
          const newTextId = createTextRes?.data?.create_column?.id;
          if (newTextId) {
            columnMappings.text = newTextId;
          }
        }
        if (!columnMappings.link) {
          const createLinkGql = `mutation {
            create_column(board_id: ${subitemBoardId}, title: "Lien Gofile", column_type: link) { id }
          }`;
          const createLinkRes = await mondayRequest(token, createLinkGql);
          const newLinkId = createLinkRes?.data?.create_column?.id;
          if (newLinkId) {
            columnMappings.link = newLinkId;
          }
        }
        config.subitemColumns = columnMappings;
        config.subitemBoardId = subitemBoardId;
        await saveMondayConfig(config);
      }
    }

    // Étape 3 : mettre à jour les colonnes découvertes
    const colValues = {};
    if (columnMappings.date && date) colValues[columnMappings.date] = { date };
    if (columnMappings.text && profile) colValues[columnMappings.text] = profile;
    if (columnMappings.link && gofileUrl) colValues[columnMappings.link] = { url: gofileUrl, text: 'Lien Gofile' };

    if (Object.keys(colValues).length > 0) {
      const colValuesStr = JSON.stringify(JSON.stringify(colValues));
      const updateGql = `mutation {
        change_multiple_column_values(item_id: ${subitemId}, board_id: ${subitemBoardId}, column_values: ${colValuesStr}) {
          id
        }
      }`;
      await mondayRequest(token, updateGql);
    }

    return { ok: true, subitemId };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

app.whenReady().then(async () => {
  global.launcherSession = await readLauncherSession();
  console.log('[Session] mode:', global.launcherSession.connected ? 'connecté' : 'standalone');
  createWindow();
  await loadUploadSpeed();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    // Fermer Terminal aussi après la fermeture de toutes les fenêtres
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
});



