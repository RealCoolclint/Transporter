const path = require('path');
const fsExtra = require('fs-extra');
const os = require('os');

const TRANSPORTER_DATA_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'TransPorter');
const HISTORY_FILE = path.join(TRANSPORTER_DATA_DIR, 'suitcase-history.json');
const MAX_ENTRIES = 5;

/**
 * @typedef {Object} HistoryEntry
 * @property {string} suitcaseName
 * @property {number} copiedBytes
 * @property {number} copyDurationMs
 * @property {number} [uploadDurationMs] - présent si upload Gofile effectué
 * @property {string} createdAt - ISO date
 */

/**
 * Charge l'historique des valises (max 5).
 * @returns {Promise<HistoryEntry[]>}
 */
async function loadHistory() {
  try {
    await fsExtra.ensureDir(TRANSPORTER_DATA_DIR);
    if (!(await fsExtra.pathExists(HISTORY_FILE))) {
      return [];
    }
    const data = await fsExtra.readJson(HISTORY_FILE);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return entries.slice(0, MAX_ENTRIES);
  } catch (e) {
    console.warn('[history-manager] loadHistory:', e.message);
    return [];
  }
}

/**
 * Ajoute une entrée à l'historique (plus récent en premier, max 5).
 * @param {HistoryEntry} entry
 */
async function addHistory(entry) {
  try {
    const entries = await loadHistory();
    const newEntry = {
      suitcaseName: entry.suitcaseName || 'Valise',
      copiedBytes: Number(entry.copiedBytes) || 0,
      copyDurationMs: Number(entry.copyDurationMs) || 0,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    if (entry.uploadDurationMs != null) {
      newEntry.uploadDurationMs = Number(entry.uploadDurationMs);
    }
    entries.unshift(newEntry);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    await fsExtra.writeJson(HISTORY_FILE, { entries: trimmed });
  } catch (e) {
    console.warn('[history-manager] addHistory:', e.message);
  }
}

/**
 * Met à jour la dernière entrée avec la durée d'upload Gofile (quand l'utilisateur uploade manuellement).
 * @param {number} uploadDurationMs
 */
async function updateLastWithUpload(uploadDurationMs) {
  try {
    const entries = await loadHistory();
    if (entries.length > 0 && entries[0].uploadDurationMs == null) {
      entries[0].uploadDurationMs = Number(uploadDurationMs) || 0;
      await fsExtra.writeJson(HISTORY_FILE, { entries });
    }
  } catch (e) {
    console.warn('[history-manager] updateLastWithUpload:', e.message);
  }
}

/**
 * Calcule les vitesses moyennes à partir de l'historique pour des estimations plus précises.
 * @returns {Promise<{ copySpeedBytesPerSec: number | null, uploadSpeedBytesPerSec: number | null }>}
 */
async function getEstimatesFromHistory() {
  const entries = await loadHistory();
  let copySpeedBytesPerSec = null;
  let uploadSpeedBytesPerSec = null;

  const copySpeeds = [];
  const uploadSpeeds = [];

  for (const e of entries) {
    if (e.copiedBytes > 0 && e.copyDurationMs > 0) {
      const speed = (e.copiedBytes * 1000) / e.copyDurationMs;
      if (speed > 1024 * 1024 && speed < 500 * 1024 * 1024) {
        copySpeeds.push(speed);
      }
    }
    if (e.uploadDurationMs != null && e.uploadDurationMs > 0 && e.copiedBytes > 0) {
      const speed = (e.copiedBytes * 1000) / e.uploadDurationMs;
      if (speed > 100 * 1024 && speed < 200 * 1024 * 1024) {
        uploadSpeeds.push(speed);
      }
    }
  }

  if (copySpeeds.length > 0) {
    copySpeedBytesPerSec = copySpeeds.reduce((a, b) => a + b, 0) / copySpeeds.length;
  }
  if (uploadSpeeds.length > 0) {
    uploadSpeedBytesPerSec = uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length;
  }

  return { copySpeedBytesPerSec, uploadSpeedBytesPerSec };
}

module.exports = {
  loadHistory,
  addHistory,
  updateLastWithUpload,
  getEstimatesFromHistory,
};
