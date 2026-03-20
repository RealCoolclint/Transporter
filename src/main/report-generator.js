const fs = require('fs');
const path = require('path');

const line = '───────────────────────────────────────────────────────';
const heavyLine = '═══════════════════════════════════════════════════════';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Génère le fichier VALISE_REPORT.txt à la racine de la valise.
 *
 * @param {string} root Chemin racine de la valise
 * @param {Object} context
 * @param {Array} context.copyLog Entrées de copie (src, dest, ok, size, type)
 * @param {number} context.durationMs Durée de l'opération
 * @param {number} context.copiedFiles Nombre de fichiers copiés
 * @param {number} context.copiedBytes Poids total copié
 * @param {string} [context.projectName]
 * @param {string} [context.premierVersion]
 * @param {string} [context.profileName]
 * @param {string} [context.profileEmail]
 * @returns {Promise<string>} Chemin du rapport généré
 */
async function generateReport(root, context) {
  const {
    copyLog,
    durationMs,
    copiedFiles,
    copiedBytes,
    projectName,
    premierVersion,
    profileName,
    profileEmail,
  } = context;

  const now = new Date();
  const dateStr = now.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const userDisplay =
    profileName || profileEmail
      ? `${profileName || ''}${profileEmail ? ` (${profileEmail})` : ''}`
      : '—';

  const ppVersion = premierVersion || 'Inconnue';
  const projNameDisplay = projectName || 'Projet sans nom';

  const typeStats = {};
  copyLog
    .filter((e) => e && e.ok)
    .forEach((e) => {
      const t = e.type || 'other';
      if (!typeStats[t]) typeStats[t] = { count: 0, size: 0 };
      typeStats[t].count += 1;
      typeStats[t].size += e.size || 0;
    });

  const errors = copyLog.filter((e) => !e.ok);

  let report = '';
  report += `${heavyLine}\n`;
  report += `  RAPPORT DE CRÉATION - VALISE PREMIERE PRO\n`;
  report += `${heavyLine}\n\n`;

  report += `📅 DATE DE CRÉATION : ${dateStr}\n`;
  report += `👤 CRÉÉ PAR : ${userDisplay}\n`;
  report += `🎬 VERSION PREMIERE PRO : ${ppVersion}\n`;
  report += `📁 PROJET ORIGINAL : ${projNameDisplay}\n\n`;

  report += `${line}\n`;
  report += `📊 STATISTIQUES GLOBALES\n`;
  report += `${line}\n`;
  report += `✓ Fichiers copiés : ${copiedFiles}\n`;
  report += `📦 Poids total : ${formatBytes(copiedBytes)}\n`;
  report += `⏱️ Durée de l'opération : ${formatDuration(durationMs)}\n`;
  report += `📂 Dossier de la valise : ${root}\n\n`;

  report += `${line}\n`;
  report += `📂 RÉPARTITION PAR TYPE\n`;
  report += `${line}\n`;

  const typeLabels = {
    video: '🎥 Vidéo',
    audio: '🎵 Audio',
    image: '🖼️ Images',
    graphics: '✨ Graphics',
    lut: '🎨 LUTs',
    captions: '📝 Sous-titres',
    linked: '🔗 Projets liés',
    other: '📄 Autres',
  };

  Object.keys(typeStats).forEach((key) => {
    const stat = typeStats[key];
    const label = typeLabels[key] || typeLabels.other;
    report += `${label} : ${stat.count} fichiers (${formatBytes(stat.size)})\n`;
  });

  report += `\n${line}\n`;
  report += `📋 LISTE COMPLÈTE DES FICHIERS\n`;
  report += `${line}\n\n`;

  copyLog.forEach((e) => {
    const status = e.ok ? '✓' : '✗';
    report += `${status} ${e.name}\n`;
    report += `  Origine : ${e.src}\n`;
    if (e.ok) {
      report += `  Taille : ${formatBytes(e.size)}\n`;
      report += `  Destination : ${e.dest}\n`;
    } else {
      report += `  ERREUR : ${e.error}\n`;
    }
    report += '\n';
  });

  report += `${line}\n`;
  report += `⚠️ ERREURS ET AVERTISSEMENTS\n`;
  report += `${line}\n`;
  if (errors.length === 0) {
    report += `• Aucune erreur de copie détectée.\n`;
  } else {
    errors.forEach((e) => {
      report += `• Échec copie : ${e.name} (${e.src}) → ${e.error}\n`;
    });
  }
  report += `\n${heavyLine}\n`;
  report += `✅ VALISE CRÉÉE AVEC SUCCÈS\n`;
  report += `${heavyLine}\n`;

  const reportPath = path.join(root, 'VALISE_REPORT.txt');
  await fs.promises.writeFile(reportPath, report, 'utf8');

  console.log('[report-generator] Rapport écrit dans :', reportPath);
  return reportPath;
}

module.exports = {
  generateReport,
};


