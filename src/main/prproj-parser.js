/**
 * Parser .prproj : lecture seule. Ne modifie jamais le fichier projet ni le dossier de l'utilisateur.
 * Tout dump de debug est écrit dans le dossier temporaire système (os.tmpdir()), jamais à côté du .prproj.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { promisify } = require('util');
const xml2js = require('xml2js');
const fsExtra = require('fs-extra');

const gunzip = promisify(zlib.gunzip);
const parser = new xml2js.Parser({ explicitArray: true, explicitAttrs: true });

// Extensions reconnues (vidéo, audio, image, graphiques, LUT, sous-titres, projets liés)
const MEDIA_EXTENSIONS = {
  video: ['mp4', 'mov', 'mxf', 'avi', 'mkv', 'mpg', 'mpeg', 'm2v', 'm4v', 'r3d', 'braw', 'arri', 'ari', 'exr', 'dpx', 'cin', 'webm', '3gp', 'vob'],
  audio: ['wav', 'mp3', 'aif', 'aiff', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'caf', 'ape'],
  image: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'psd', 'ai', 'svg', 'eps', 'webp', 'bmp', 'dng'],
  graphics: ['gif', 'mogrt', 'mogrts'],
  lut: ['cube', 'lut', '3dl'],
  captions: ['srt', 'stl', 'scc', 'xml', 'vtt', 'cap'],
  linked: ['aep', 'aet', 'fcpx', 'plproj'],
};
const ALL_EXTENSIONS = [
  ...MEDIA_EXTENSIONS.video,
  ...MEDIA_EXTENSIONS.audio,
  ...MEDIA_EXTENSIONS.image,
  ...MEDIA_EXTENSIONS.graphics,
  ...MEDIA_EXTENSIONS.lut,
  ...MEDIA_EXTENSIONS.captions,
  ...MEDIA_EXTENSIONS.linked,
];

/**
 * Détermine le type de média à partir de l'extension de fichier.
 */
function inferMediaType(ext) {
  const e = ext.toLowerCase().replace(/^\./, '');
  for (const [type, exts] of Object.entries(MEDIA_EXTENSIONS)) {
    if (exts.includes(e)) return type;
  }
  return 'other';
}

/** Taille max de chaîne passée aux regex (évite rétroaction catastrophique sur gros nœuds texte) */
const MAX_STRING_EXTRACT_LENGTH = 80000;

/**
 * Tente d'extraire des chemins de fichiers à partir d'une chaîne de texte.
 * Cherche chemins absolus (/.../fichier.ext), file://... et chemins relatifs (dossier/fichier.ext).
 * Les chaînes trop longues sont tronquées pour éviter le blocage des regex.
 */
function extractPathsFromString(str, results) {
  if (!str || typeof str !== 'string') return;
  if (str.length > MAX_STRING_EXTRACT_LENGTH) {
    str = str.slice(0, MAX_STRING_EXTRACT_LENGTH);
  }

  const extGroup = ALL_EXTENSIONS.join('|');
  let match;
  // Pattern classique : /chemin/vers/fichier.ext
  const classicRegex = new RegExp(`(/[^"<\\n]+\\.(${extGroup}))`, 'gi');
  while ((match = classicRegex.exec(str)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  // Chemins relatifs : dossier/sous-dossier/fichier.ext (au moins un slash, pas file:)
  const relRegex = new RegExp(`(?:^|[\\s"'])((?:[a-zA-Z0-9_.][^"<\\n]*/)+[^"<\\n]+\\.(${extGroup}))(?:["\\s<>]|$)`, 'gi');
  while ((match = relRegex.exec(str)) !== null) {
    const full = match[1].trim();
    if (full && !full.startsWith('file:')) results.push(full);
  }
}

const EXTRACT_PATH_ATTRS = [
  'FilePath', 'MediaPath', 'path', 'Path', 'pathurl', 'PathUrl', 'path_url', 'PathURL',
  'href', 'src', 'url', 'basePath', 'BasePath', 'SourcePath', 'sourcePath',
  'ProjectPath', 'projectPath', 'location', 'Location', 'File', 'file',
];

const EXTRACT_PATHS_MAX_ITERATIONS = 5000000; // garde-fou sur gros XML

/**
 * Extrait tous les chemins de médias depuis l'arbre XML (parcours itératif à la pile).
 * Évite stack overflow et boucles infinies (références circulaires) sur gros .prproj.
 */
function extractPathsFromNode(rootNode, results) {
  if (!rootNode) return;

  const stack = [{ node: rootNode, context: {} }];
  const visited = new WeakSet();
  let iterations = 0;

  while (stack.length > 0 && iterations < EXTRACT_PATHS_MAX_ITERATIONS) {
    iterations += 1;
    const { node, context } = stack.pop();

    if (typeof node === 'string') {
      extractPathsFromString(node, results);
      if (context.currentVolume && !node.startsWith('/Volumes/') && node.startsWith('/')) {
        results.push(`${context.currentVolume}${node}`);
      }
      continue;
    }

    if (typeof node !== 'object' || node === null) continue;
    if (visited.has(node)) continue;
    visited.add(node);

    const localContext = { ...context };

    if (typeof node._ === 'string') {
      extractPathsFromString(node._, results);
    }

    const attrs = node.$ || node.attributes || {};
    if (attrs && typeof attrs === 'object') {
      for (const key of EXTRACT_PATH_ATTRS) {
        if (attrs[key]) {
          const val = String(attrs[key]);
          const volMatch = val.match(/^file:\/\/localhost\/Volumes\/[^/]+|^file:\/\/Volumes\/[^/]+|^\/Volumes\/[^/]+/);
          if (volMatch) {
            const m = volMatch[0].replace('file://localhost', '').replace('file://', '');
            const segments = m.split('/');
            if (segments.length >= 3) {
              localContext.currentVolume = `/${segments[1]}/${segments[2]}`;
            }
          }
          extractPathsFromString(val, results);
          results.push(attrs[key]);
        }
      }
    }

    const maybePrefix = (p) => {
      if (!p || !localContext.currentVolume || typeof p !== 'string') return;
      if (p.startsWith('/Volumes/')) return;
      if (p.startsWith('/')) results.push(`${localContext.currentVolume}${p}`);
    };

    const values = Object.values(node);
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (let j = value.length - 1; j >= 0; j--) {
          stack.push({ node: value[j], context: localContext });
        }
      } else if (typeof value === 'object') {
        stack.push({ node: value, context: localContext });
      } else if (typeof value === 'string') {
        extractPathsFromString(value, results);
        maybePrefix(value);
      }
    }
  }

  if (iterations >= EXTRACT_PATHS_MAX_ITERATIONS) {
    console.warn('[prproj-parser] Limite extraction chemins atteinte, résultat partiel.');
  }
}

/**
 * Normalise un chemin brut provenant du XML en chemin macOS.
 * Décodage URL (Premiere utilise path_url avec %20, etc.).
 */
function normalizeRawPath(mediaPath) {
  if (!mediaPath) return '';
  let normalizedPath = String(mediaPath).trim();

  if (normalizedPath.startsWith('file://localhost')) {
    normalizedPath = normalizedPath.replace('file://localhost', '');
  } else if (normalizedPath.startsWith('file://')) {
    normalizedPath = normalizedPath.replace('file://', '');
  }

  // Décodage URL (espaces %20, etc.) — indispensable pour path_url Premiere
  try {
    normalizedPath = decodeURI(normalizedPath);
  } catch (_) {
    try {
      normalizedPath = decodeURIComponent(normalizedPath);
    } catch (_) {}
  }

  // S'il reste "Volumes/Disque/..." sans slash initial
  if (!normalizedPath.startsWith('/') && normalizedPath.startsWith('Volumes/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  return normalizedPath;
}

/**
 * Lit et parse un fichier .prproj pour en extraire les chemins de médias.
 *
 * @param {string} prprojPath Chemin absolu vers le fichier .prproj
 * @returns {Promise<{projectName: string, premierVersion: string | null, mediaFiles: Array}>}
 */
async function parsePrproj(prprojPath) {
  console.log('[prproj-parser] Lecture du projet :', prprojPath);

  if (!fs.existsSync(prprojPath)) {
    throw new Error(`Fichier .prproj introuvable: ${prprojPath}`);
  }

  const rawBuffer = await fsExtra.readFile(prprojPath);

  let xmlBuffer;
  try {
    xmlBuffer = await gunzip(rawBuffer);
  } catch (err) {
    console.error('[prproj-parser] Erreur de décompression gzip:', err.message);
    throw new Error('Le fichier .prproj ne semble pas être un gzip valide.');
  }

  // Dump XML de debug (uniquement en dossier temporaire : ne jamais écrire dans le projet de l'utilisateur)
  const DEBUG_XML_MAX_BYTES = 2 * 1024 * 1024; // 2 Mo
  if (Buffer.isBuffer(xmlBuffer) && xmlBuffer.length <= DEBUG_XML_MAX_BYTES) {
    try {
      const baseName = path.basename(prprojPath, path.extname(prprojPath));
      const debugXmlPath = path.join(os.tmpdir(), `transporter-debug-${baseName}.xml`);
      await fsExtra.writeFile(debugXmlPath, xmlBuffer);
      console.log('[prproj-parser] XML de debug (tmp) :', debugXmlPath);
    } catch (e) {
      console.warn('[prproj-parser] Impossible d\'écrire le XML de debug :', e.message);
    }
  } else if (xmlBuffer && xmlBuffer.length > DEBUG_XML_MAX_BYTES) {
    console.log('[prproj-parser] XML volumineux (' + (xmlBuffer.length / 1024 / 1024).toFixed(1) + ' Mo), pas de dump debug.');
  }

  const projectDir = path.dirname(prprojPath);
  let projectName = path.basename(prprojPath, path.extname(prprojPath));
  let premierVersion = null;
  const allPaths = [];

  // Seuil au-delà duquel on évite le parse XML complet (très lent) et on ne fait que le scan regex
  const FAST_PATH_THRESHOLD = 1.2 * 1024 * 1024; // 1,2 Mo
  const useFastPath = Buffer.isBuffer(xmlBuffer) && xmlBuffer.length > FAST_PATH_THRESHOLD;

  if (useFastPath) {
    console.log('[prproj-parser] Voie rapide (scan regex uniquement).');
    const xmlStr = xmlBuffer.toString('utf8');
    const BRUT_SCAN_MAX_LEN = 12 * 1024 * 1024; // 12 Mo
    const xmlStrToScan = xmlStr.length > BRUT_SCAN_MAX_LEN ? xmlStr.slice(0, BRUT_SCAN_MAX_LEN) : xmlStr;
    const fileUrlRegex = new RegExp(
      `file://(?:localhost/)?([^"<\\s]*\\.(${ALL_EXTENSIONS.join('|')}))(?:["\\s<>]|$)`,
      'gi',
    );
    let fileMatch;
    while ((fileMatch = fileUrlRegex.exec(xmlStrToScan)) !== null) {
      const pathPart = fileMatch[1];
      if (pathPart) {
        const prefix = fileMatch[0].startsWith('file://localhost') ? 'file://localhost' : 'file://';
        allPaths.push(prefix + (pathPart.startsWith('/') ? pathPart : '/' + pathPart));
      }
    }
    const absPathRegex = new RegExp(
      `(/(?:Volumes|Users)/[^"<\\n]+\\.(${ALL_EXTENSIONS.join('|')}))`,
      'gi',
    );
    while ((fileMatch = absPathRegex.exec(xmlStrToScan)) !== null) {
      if (fileMatch[1]) allPaths.push(fileMatch[1]);
    }
    const head = xmlStr.slice(0, 100000);
    const versionMatch = head.match(/Version="(\d{2,})"/) || head.match(/version="(\d{2,})"/i);
    if (versionMatch) premierVersion = versionMatch[1];
  } else {
    let xml;
    try {
      xml = await parser.parseStringPromise(xmlBuffer.toString('utf8'));
    } catch (err) {
      console.error('[prproj-parser] Erreur de parsing XML:', err.message);
      throw new Error('Le fichier .prproj contient un XML mal formé.');
    }
    try {
      console.log('[prproj-parser] Clés racine XML :', Object.keys(xml));
      const projectRoot = xml.Project || xml.project || xml.PremiereData || null;
      if (projectRoot) {
        const root = Array.isArray(projectRoot) ? projectRoot[0] : projectRoot;
        if (root.$ && root.$.Name) projectName = root.$.Name;
        if (root.$ && (root.$.Version || root.$.version)) {
          const rawV = root.$.Version || root.$.version;
          premierVersion = String(rawV).trim().length >= 2 ? rawV : null;
        }
      }
    } catch (e) {
      console.warn('[prproj-parser] Impossible de lire nom/version:', e.message);
    }
    console.log('[prproj-parser] Extraction des chemins de médias...');
    extractPathsFromNode(xml, allPaths);
    const xmlStr = xmlBuffer.toString('utf8');
    const BRUT_SCAN_MAX_LEN = 12 * 1024 * 1024; // 12 Mo
    const xmlStrToScan = xmlStr.length > BRUT_SCAN_MAX_LEN ? xmlStr.slice(0, BRUT_SCAN_MAX_LEN) : xmlStr;
    const fileUrlRegex = new RegExp(
      `file://(?:localhost/)?([^"<\\s]*\\.(${ALL_EXTENSIONS.join('|')}))(?:["\\s<>]|$)`,
      'gi',
    );
    let fileMatch;
    while ((fileMatch = fileUrlRegex.exec(xmlStrToScan)) !== null) {
      const pathPart = fileMatch[1];
      if (pathPart) {
        const prefix = fileMatch[0].startsWith('file://localhost') ? 'file://localhost' : 'file://';
        allPaths.push(prefix + (pathPart.startsWith('/') ? pathPart : '/' + pathPart));
      }
    }
    const absPathRegex = new RegExp(
      `(/(?:Volumes|Users)/[^"<\\n]+\\.(${ALL_EXTENSIONS.join('|')}))`,
      'gi',
    );
    while ((fileMatch = absPathRegex.exec(xmlStrToScan)) !== null) {
      if (fileMatch[1]) allPaths.push(fileMatch[1]);
    }
  }

  // Nettoyage / normalisation basique des chemins
  const uniquePaths = Array.from(new Set(allPaths.filter(Boolean)));
  const normalizedList = uniquePaths.map((p) => normalizeRawPath(p)).filter(Boolean);

  // Heuristique 1 : suffixes basés sur le tail après /Volumes/<Disque>/... ou /Users/...
  const volumeTailMap = new Map();
  // Heuristique 2 : chemins complets par nom de fichier
  const fullPathByName = new Map();

  for (const p of normalizedList) {
    if (!p) continue;
    if (p.startsWith('/Volumes/') || p.startsWith('/Users/')) {
      const segments = p.split('/');
      if (p.startsWith('/Volumes/') && segments.length > 4) {
        const tail = '/' + segments.slice(3).join('/');
        if (!volumeTailMap.has(tail)) volumeTailMap.set(tail, p);
      } else if (p.startsWith('/Users/') && segments.length > 3) {
        const tail = '/' + segments.slice(3).join('/');
        if (!volumeTailMap.has(tail)) volumeTailMap.set(tail, p);
      }
      const baseName = path.basename(p);
      if (baseName && !fullPathByName.has(baseName)) fullPathByName.set(baseName, p);
    }
  }

  /** Nombre max de niveaux parents à remonter (évite de parcourir toute l'arborescence) */
  const MAX_PARENT_LEVELS = 5;

  /**
   * Résout un chemin relatif ou "tail" par rapport au dossier du projet et ses ancêtres.
   * Cherche d'abord dans le dossier projet, puis remonte jusqu'à MAX_PARENT_LEVELS niveaux.
   * Retourne le premier chemin absolu qui existe, ou null.
   */
  function resolveFromProjectDir(candidate) {
    if (!candidate || projectDir.length === 0) return null;
    const candidateClean = candidate.replace(/^\/+/, '');
    let currentDir = path.resolve(projectDir);
    let levelsUp = 0;

    while (currentDir && levelsUp <= MAX_PARENT_LEVELS) {
      const tries = [
        path.join(currentDir, candidateClean),
        path.join(currentDir, candidate),
        path.resolve(currentDir, candidate),
      ];
      for (const p of tries) {
        const normalized = path.normalize(p);
        const rel = path.relative(currentDir, normalized);
        if (
          normalized !== currentDir &&
          !rel.startsWith('..') &&
          fs.existsSync(normalized)
        ) {
          return normalized;
        }
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
      levelsUp += 1;
    }
    return null;
  }

  const mediaFiles = [];
  const seenPaths = new Set(); // Pour dédupliquer les chemins exacts
  const excludedByReason = {
    'Chemin non absolu': 0,
    'Dupliqué': 0,
    'Rendered': 0,
    'Media Cache Files': 0,
    'Peak Files': 0,
  };

  for (let i = 0; i < normalizedList.length; i += 1) {
    const raw = uniquePaths[i];
    let normalizedPath = normalizedList[i];

    if (normalizedPath) {
      // 1) Tentative de reconstruction par tail (/REDAC/Proj/file -> /Volumes/Disque/REDAC/Proj/file)
      if (
        normalizedPath.startsWith('/') &&
        !normalizedPath.startsWith('/Volumes/') &&
        !normalizedPath.startsWith('/Users/') &&
        volumeTailMap.has(normalizedPath)
      ) {
        const full = volumeTailMap.get(normalizedPath);
        console.log(
          '[prproj-parser] Reconstruction de chemin tronqué (tail) :',
          normalizedPath,
          '→',
          full,
        );
        normalizedPath = full;
      }

      // 2) Tentative de reconstruction par nom de fichier uniquement
      if (!normalizedPath.startsWith('/Volumes/') && !normalizedPath.startsWith('/Users/')) {
        const baseName = path.basename(normalizedPath);
        if (baseName && fullPathByName.has(baseName)) {
          const full = fullPathByName.get(baseName);
          console.log(
            '[prproj-parser] Reconstruction de chemin par nom de fichier :',
            normalizedPath,
            '→',
            full,
          );
          normalizedPath = full;
        }
      }

      // 3) Résolution par rapport au dossier du projet et ses parents (chemins relatifs ou "tail" non reconstruits)
      if (!normalizedPath.startsWith('/Volumes/') && !normalizedPath.startsWith('/Users/')) {
        const resolved = resolveFromProjectDir(normalizedPath);
        if (resolved) {
          console.log(
            '[prproj-parser] Résolution depuis le projet/ancêtres :',
            normalizedPath,
            '→',
            resolved,
          );
          normalizedPath = resolved;
        }
      }

      // 4) Fallback : chemin absolu mais fichier absent (ex. disque démonté, autre machine) → chercher par queue dans les ancêtres
      if (normalizedPath && path.isAbsolute(normalizedPath) && !fs.existsSync(normalizedPath)) {
        const segments = normalizedPath.split(path.sep).filter(Boolean);
        for (let drop = 2; drop < Math.min(segments.length, 7); drop++) {
          const tail = segments.slice(drop).join(path.sep);
          const found = resolveFromProjectDir(tail);
          if (found) {
            console.log(
              '[prproj-parser] Fichier trouvé dans un parent par queue du chemin :',
              normalizedPath,
              '→',
              found,
            );
            normalizedPath = found;
            break;
          }
        }
      }
    }

    // Accepter tout chemin absolu (y compris résolu depuis le dossier projet)
    if (!normalizedPath || !path.isAbsolute(normalizedPath)) {
      excludedByReason['Chemin non absolu'] += 1;
      continue;
    }

    // DÉDUPLICATION : Exclure les fichiers avec exactement le même chemin (déjà vu)
    const normalizedPathLower = normalizedPath.toLowerCase();
    if (seenPaths.has(normalizedPathLower)) {
      excludedByReason['Dupliqué'] += 1;
      continue;
    }
    seenPaths.add(normalizedPathLower);

    // FILTRAGE : Exclure uniquement les caches/rendus (pas les médias utiles)
    const fileName = path.basename(normalizedPath);
    const pathLower = normalizedPath.toLowerCase();
    if (fileName.toLowerCase().startsWith('rendered')) {
      excludedByReason['Rendered'] += 1;
      continue;
    }
    if (pathLower.includes('media cache files')) {
      excludedByReason['Media Cache Files'] += 1;
      continue;
    }
    if (pathLower.includes('peak files')) {
      excludedByReason['Peak Files'] += 1;
      continue;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const type = inferMediaType(ext);

    const exists = fs.existsSync(normalizedPath);
    let size = 0;
    if (exists) {
      try {
        const stat = await fsExtra.stat(normalizedPath);
        size = stat.size;
        console.log('[prproj-parser] DEBUG stat:', JSON.stringify({ path: normalizedPath, exists, size }));
      } catch (e) {
        console.warn('[prproj-parser] Impossible de lire la taille de', normalizedPath, e.message);
      }
    } else {
      console.log('[prproj-parser] DEBUG absent:', JSON.stringify({ path: normalizedPath, exists }));
    }

    mediaFiles.push({
      type,
      name: path.basename(normalizedPath),
      path: normalizedPath,
      size,
      exists,
      extension: ext,
    });
  }

  // Statistiques de debug
  const typeCounts = mediaFiles.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  const extCounts = mediaFiles.reduce((acc, m) => {
    acc[m.extension] = (acc[m.extension] || 0) + 1;
    return acc;
  }, {});

  const totalExcluded = Object.values(excludedByReason).reduce((a, b) => a + b, 0);
  console.log('[prproj-parser] Médias retenus :', mediaFiles.length);
  console.log('[prproj-parser] Répartition par type :', typeCounts);
  console.log('[prproj-parser] Répartition par extension :', extCounts);
  if (totalExcluded > 0) {
    console.log('[prproj-parser] Exclus (cache/rendus/dupliqués) :', totalExcluded, excludedByReason);
  }

  return {
    projectFilePath: prprojPath,
    projectName,
    premierVersion,
    mediaFiles,
    excludedByReason,
    totalExtracted: uniquePaths.length,
  };
}

module.exports = {
  parsePrproj,
};


