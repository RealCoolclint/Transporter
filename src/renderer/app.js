document.addEventListener('DOMContentLoaded', async () => {

  // ── Mercury Opening ──────────────────────────────────────────
  function runSplash(onComplete) {
    const dg = document.getElementById('dot-grid');
    const rs = document.getElementById('ring-svg');
    const rd = document.getElementById('ring-draw');
    const pe = document.getElementById('patch-el');
    const ve = document.getElementById('ver-el');
    const fe = document.getElementById('flash-el');

    [dg, rs, pe, ve, fe].forEach(el => { el.style.transition = 'none'; el.style.opacity = '0'; });
    rd.style.transition = 'none';
    rd.style.strokeDashoffset = '722';
    pe.style.transform = 'scale(0.88) rotate(5deg)';
    void dg.offsetHeight;

    if (ve && window.APP_VERSION) ve.textContent = window.APP_VERSION;

    const t = (fn, ms) => setTimeout(fn, ms);

    // Dot grid
    const canvas = dg;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.ceil(canvas.width / 28);
    const rows = Math.ceil(canvas.height / 28);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      ctx.beginPath(); ctx.arc(c * 28 + 14, r * 28 + 14, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    t(() => { dg.style.transition = 'opacity 0.7s'; dg.style.opacity = '1'; }, 180);
    t(() => { rs.style.transition = 'opacity 0.3s'; rs.style.opacity = '1'; }, 350);
    t(() => {
      rd.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
      rd.style.strokeDashoffset = '0';
    }, 410);
    t(() => {
      pe.style.transition = 'opacity 1.8s cubic-bezier(0.16,1,0.3,1), transform 2.5s cubic-bezier(0.16,1,0.3,1)';
      pe.style.opacity = '1';
      pe.style.transform = 'scale(1) rotate(0deg)';
    }, 550);
    t(() => { ve.style.transition = 'opacity 0.5s'; ve.style.opacity = '1'; }, 1650);
    t(() => { fe.style.transition = 'opacity 0.22s ease-in'; fe.style.opacity = '1'; }, 4000);
    t(() => {
      fe.style.transition = 'opacity 0.5s ease-out';
      fe.style.opacity = '0';
      if (onComplete) onComplete();
    }, 4230);
  }

  const appContainer = document.querySelector('.app-container');
  const splashScreen = document.getElementById('splashScreen');

  runSplash(() => {
    if (splashScreen) splashScreen.style.display = 'none';
  });

  await new Promise(resolve => setTimeout(resolve, 4800));
  // ── Fin Mercury Opening ───────────────────────────────────────

  // ── Protocole Session Launcher ────────────────────────────────
  const _launcherSession = window.valisePremiere
    ? await window.valisePremiere.getLauncherSession()
    : { connected: false };
  window._launcherSession = _launcherSession;
  // ── Fin Protocole Session ─────────────────────────────────────

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const paramsToggle = document.getElementById('params-toggle');
  const paramsDropdown = document.getElementById('params-dropdown');
  const historyToggle = document.getElementById('history-toggle');
  const historyDropdown = document.getElementById('history-dropdown');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');
  const paramsChangeProfile = document.getElementById('params-change-profile');
  const paramsProfileName = document.getElementById('params-profile-name');
  const autoGofileCheckbox = document.getElementById('auto-gofile-upload');
  const mondayTokenInput = document.getElementById('monday-token-input');
  const mondayTokenSave = document.getElementById('monday-token-save');
  const mondayTokenStatus = document.getElementById('monday-token-status');
  const mondayProjectSection = document.querySelector('.monday-project-section');
  const mondayProjectSelect = document.getElementById('monday-project-select');
  const mondayProjectLoading = document.getElementById('monday-project-loading');
  const mondayProjectError = document.getElementById('monday-project-error');
  const mondayRefreshBtn = document.getElementById('monday-refresh-btn');

  const setProfileDisplayName = (displayName) => {
    if (welcomeProfileName) welcomeProfileName.textContent = displayName;
    if (paramsProfileName) paramsProfileName.textContent = displayName || '—';
    const headerProfileDisplayName = document.getElementById('header-profile-display-name');
    if (headerProfileDisplayName) headerProfileDisplayName.textContent = displayName || '—';
  };

  // Éléments HOME screen
  const homeScreen = document.getElementById('home-screen');
  const profilesGrid = document.getElementById('profiles-grid');
  const addProfileHomeBtn = document.getElementById('add-profile-home-btn');
  const welcomeScreen = document.getElementById('welcome-screen');
  const welcomeProfileName = document.getElementById('welcome-profile-name');
  const changeProfileBtn = document.getElementById('change-profile-btn');
  const analysisScreen = document.getElementById('analysis-screen');
  const uploadScreen = document.getElementById('upload-screen');
  const finalScreen = document.getElementById('final-screen');
  const analysisTitle = document.getElementById('analysis-title');
  const analysisSubtitle = document.getElementById('analysis-subtitle');
  const mediaList = document.getElementById('media-list');
  const toggleSelectBtn = document.getElementById('toggle-select');
  const relinkOfflineBtn = document.getElementById('relink-offline');
  const suitcaseNameInput = document.getElementById('suitcase-name');
  const destinationLabel = document.getElementById('destination-label');
  const chooseDestinationBtn = document.getElementById('choose-destination');
  const destinationEstimates = document.getElementById('destination-estimates');
  const diskSpaceInfo = document.getElementById('disk-space-info');
  const copyTimeEstimate = document.getElementById('copy-time-estimate');
  const gofileTimeEstimate = document.getElementById('gofile-time-estimate');
  const uploadTimeEstimate = document.getElementById('upload-time-estimate');
  const backToWelcomeBtn = document.getElementById('back-to-welcome');
  const createSuitcaseBtn = document.getElementById('create-suitcase');
  const zipSuitcaseCheckbox = document.getElementById('zip-suitcase');
  const copyBarInner = document.getElementById('copy-bar-inner');
  const copyCurrent = document.getElementById('copy-current');
  const copyCount = document.getElementById('copy-count');
  const copyPercent = document.getElementById('copy-percent');
  const copyLoadingGifContainer = document.getElementById('copy-loading-gif-container');
  const copyLoadingGif = document.getElementById('copy-loading-gif');
  // Éléments de gestion des profils
  const profileSelect = document.getElementById('profile-select');
  const newProfileBtn = document.getElementById('new-profile-btn');
  const profileModal = document.getElementById('profile-modal');
  const profileModalTitle = document.getElementById('profile-modal-title');
  const profileModalClose = document.getElementById('profile-modal-close');
  const profileModalCancel = document.getElementById('profile-modal-cancel');
  const profileModalSave = document.getElementById('profile-modal-save');
  const profileModalDelete = document.getElementById('profile-modal-delete');
  const profileNameInput = document.getElementById('profile-name');
  const profileFirstnameInput = document.getElementById('profile-firstname');
  const profileEmailInput = document.getElementById('profile-email');
  const profileFavoriteDestLabel = document.getElementById('profile-favorite-dest-label');
  const profileChooseFavoriteDestBtn = document.getElementById('profile-choose-favorite-dest');
  const profilePhotoPreview = document.getElementById('profile-photo-preview');
  const selectProfilePhotoBtn = document.getElementById('select-profile-photo-btn');
  const removeProfilePhotoBtn = document.getElementById('remove-profile-photo-btn');
  const profileColor1Input = document.getElementById('profile-color1');
  const profileColor2Input = document.getElementById('profile-color2');
  const profileColor3Input = document.getElementById('profile-color3');
  const profileInitialsSuffixInput = document.getElementById('profile-initials-suffix');
  // Éléments de la modale relink
  const relinkModal = document.getElementById('relink-modal');
  const relinkModalClose = document.getElementById('relink-modal-close');
  const relinkModalCancel = document.getElementById('relink-modal-cancel');
  const relinkModalApply = document.getElementById('relink-modal-apply');
  const relinkMediaList = document.getElementById('relink-media-list');

  let currentAnalysis = null;
  let allSelected = true;
  let destinationPath = null;
  let isCopying = false;
  let isAnalyzing = false;
  let showGhostFiles = false;
  let collapsedSections = {};
  let currentProfile = null;
  let profiles = [];
  let editingProfileId = null;
  let currentProfilePhoto = null;
  let mediaFiles = [];
  let selectedProjectPath = null;
  let lastCopyResult = null;

  const syncHeaderProfileAvatar = () => {
    const headerAvatar = document.getElementById('header-profile-avatar');
    if (!headerAvatar) return;

    let src = '';
    let alt = '';

    if (currentProfile && currentProfile.photoPath) {
      src = `file://${currentProfile.photoPath}`;
      alt = currentProfile.isGuest
        ? (currentProfile.name || '')
        : `${currentProfile.firstName || ''} ${currentProfile.name || ''}`.trim();
    } else if (_launcherSession.connected && _launcherSession.profileAvatar) {
      src = _launcherSession.profileAvatar;
      alt = _launcherSession.profileName || '';
    }

    if (src) {
      headerAvatar.src = src;
      headerAvatar.alt = alt;
      headerAvatar.style.display = '';
    } else {
      headerAvatar.removeAttribute('src');
      headerAvatar.alt = '';
      headerAvatar.style.display = 'none';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 o';
    const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  /** Formate une durée en secondes en chaîne lisible (ex: "2 min", "1 h 15 min") */
  const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return '';
    if (seconds < 60) return `${Math.ceil(seconds)} s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `~${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `~${hours} h ${remainMins} min` : `~${hours} h`;
  };

  /** Vitesse de copie par défaut (Mo/s) si pas d'historique */
  const DEFAULT_COPY_SPEED_MB_PER_SEC = 100;
  const OVERHEAD_BYTES = 100 * 1024 * 1024;
  const ZIP_OVERHEAD_MULTIPLIER = 2.0;

  /** Calcule et formate l'estimation du temps d'upload Gofile (basée sur la vitesse réelle mesurée) */
  const getGofileUploadEstimateText = async (totalBytes) => {
    if (!totalBytes || totalBytes <= 0) return { text: '', bytesPerSec: 0 };
    let bytesPerSec = 15 * 1024 * 1024; // 15 Mo/s par défaut (fibre typique)
    let isMeasured = false;
    if (window.valisePremiere && window.valisePremiere.getUploadSpeed) {
      try {
        const res = await window.valisePremiere.getUploadSpeed();
        if (res && res.ok && res.bytesPerSec > 0) {
          bytesPerSec = res.bytesPerSec;
          isMeasured = res.isMeasured === true;
        }
      } catch (e) {
        console.warn('[renderer] getUploadSpeed:', e);
      }
    }
    const uploadTimeSec = totalBytes / bytesPerSec;
    const suffix = isMeasured ? ' (vitesse mesurée)' : ' (estimation)';
    return { text: `Upload Gofile estimé : ${formatDuration(uploadTimeSec)}${suffix}`, bytesPerSec };
  };

  /** Met à jour les estimations (espace disque, temps de copie, upload Gofile) dans la zone destination */
  const updateDestinationEstimates = async () => {
    if (!destinationEstimates || !diskSpaceInfo || !copyTimeEstimate) return;
    if (!destinationPath || !currentAnalysis) {
      destinationEstimates.style.display = 'none';
      return;
    }
    const visible = getVisibleMedia();
    const selected = visible.filter((m) => m.__selected && m.exists);
    const totalBytes = selected.reduce((acc, m) => acc + (m.size || 0), 0);
    const zipSuitcase = zipSuitcaseCheckbox ? zipSuitcaseCheckbox.checked : false;
    const requiredBytes = zipSuitcase
      ? Math.ceil(totalBytes * ZIP_OVERHEAD_MULTIPLIER) + OVERHEAD_BYTES
      : totalBytes + OVERHEAD_BYTES;

    // Temps de copie estimé (basé sur l'historique ou vitesse par défaut)
    let copySpeedBytesPerSec = DEFAULT_COPY_SPEED_MB_PER_SEC * 1024 * 1024;
    if (window.valisePremiere && window.valisePremiere.getCopySpeed) {
      try {
        const res = await window.valisePremiere.getCopySpeed();
        if (res && res.ok && res.bytesPerSec > 0) copySpeedBytesPerSec = res.bytesPerSec;
      } catch (e) {}
    }
    const copyTimeSec = totalBytes / copySpeedBytesPerSec;
    copyTimeEstimate.textContent = totalBytes > 0
      ? `Création estimée : ${formatDuration(copyTimeSec)}`
      : '';

    // Temps d'upload Gofile estimé (basé sur la connexion testée)
    if (gofileTimeEstimate) {
      const gofileRes = await getGofileUploadEstimateText(totalBytes);
      gofileTimeEstimate.textContent = gofileRes.text;
    }

    let spaceText = '';
    if (window.valisePremiere && window.valisePremiere.getDiskSpace) {
      try {
        const res = await window.valisePremiere.getDiskSpace(destinationPath);
        if (res && res.ok && res.availableBytes !== undefined) {
          spaceText = `${formatBytes(res.availableBytes)} disponibles`;
          if (res.availableBytes < requiredBytes && totalBytes > 0) {
            spaceText += ' — ⚠ Espace insuffisant';
            diskSpaceInfo.classList.add('disk-space-warning');
          } else {
            diskSpaceInfo.classList.remove('disk-space-warning');
          }
        }
      } catch (e) {
        console.warn('[renderer] getDiskSpace:', e);
      }
    }
    diskSpaceInfo.textContent = spaceText;

    const hasContent = spaceText || copyTimeEstimate.textContent || (gofileTimeEstimate && gofileTimeEstimate.textContent);
    destinationEstimates.style.display = hasContent ? 'block' : 'none';
  };

  const PREMIERE_VERSION_MAP = {
    19: 'CS3', 21: 'CS4', 23: 'CS5', 24: 'CS5.5', 25: 'CS6',
    26: 'CC', 27: '2014', 29: '2015', 30: '2015', 32: '2017',
    33: '2018', 34: '2018', 36: '2019', 38: '2020', 39: '2021',
    40: '2022', 41: '2023', 42: '2024', 43: '2025', 44: '2026', 45: '2026',
  };
  const formatPremiereVersion = (raw) => {
    if (!raw) return null;
    const num = parseInt(String(raw).trim(), 10);
    if (!Number.isNaN(num) && PREMIERE_VERSION_MAP[num]) {
      return `Premiere Pro ${PREMIERE_VERSION_MAP[num]}`;
    }
    return `Premiere Pro ${String(raw).trim()}`;
  };

  const showScreen = (screen) => {
    if (screen === 'home' && window._launcherSession && window._launcherSession.connected) {
      const ss = document.getElementById('session-screen');
      const hs = document.getElementById('home-screen');
      document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = ''; });
      if (ss) { ss.style.display = ''; ss.classList.add('active'); }
      return;
    }
    // Masquer tous les écrans
    if (homeScreen) homeScreen.classList.remove('active');
    if (welcomeScreen) welcomeScreen.classList.remove('active');
    if (analysisScreen) analysisScreen.classList.remove('active');
    if (uploadScreen) uploadScreen.classList.remove('active');
    if (finalScreen) finalScreen.classList.remove('active');
    // Afficher l'écran demandé
    if (screen === 'home' && homeScreen) homeScreen.classList.add('active');
    else if (screen === 'welcome' && welcomeScreen) welcomeScreen.classList.add('active');
    else if (screen === 'analysis' && analysisScreen) analysisScreen.classList.add('active');
    else if (screen === 'upload' && uploadScreen) uploadScreen.classList.add('active');
    else if (screen === 'final' && finalScreen) finalScreen.classList.add('active');
  };

  const getIconForType = (type) => {
    // Plus d'icônes, retourner une chaîne vide
    return '';
  };

  const updateCreateButtonState = () => {
    if (!currentAnalysis) {
      createSuitcaseBtn.disabled = true;
      return;
    }
    // On autorise la création de valise même s'il reste des offline,
    // ils seront simplement ignorés à la copie. On exige juste au moins
    // un média sélectionné et en ligne.
    const anyOnlineSelected = currentAnalysis.mediaFiles.some(
      (m) => m.__selected && m.exists,
    );
    createSuitcaseBtn.disabled = !anyOnlineSelected || isCopying;
  };

  const renderMediaList = () => {
    if (!currentAnalysis) return;

    const typeOrder = {
      video: 0, audio: 1, image: 2, graphics: 3, lut: 4, captions: 5, linked: 6, other: 7,
    };
    const typeLabels = {
      video: 'Vidéo', audio: 'Audio', image: 'Images', graphics: 'Graphiques',
      lut: 'LUT', captions: 'Sous-titres', linked: 'Projets liés', other: 'Autres',
    };
    const typeRank = (t) => (typeOrder[t] !== undefined ? typeOrder[t] : 7);

    const visible = getVisibleMedia();
    const sortedMedia = [...visible].sort((a, b) => {
      const typeA = typeRank(a.type);
      const typeB = typeRank(b.type);
      if (typeA !== typeB) return typeA - typeB;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'variant' });
    });

    const typeStats = {};
    sortedMedia.forEach((m) => {
      const t = m.type || 'other';
      if (!typeStats[t]) {
        typeStats[t] = { count: 0, size: 0, ok: 0, missing: 0, selected: 0, excluded: 0 };
      }
      typeStats[t].count += 1;
      typeStats[t].size += m.size || 0;
      if (m.exists) typeStats[t].ok += 1;
      else typeStats[t].missing += 1;
      if (m.__selected) typeStats[t].selected += 1;
      else typeStats[t].excluded += 1;
    });

    mediaList.innerHTML = '';
    let lastType = null;
    sortedMedia.forEach((media) => {
      const typeKey = media.type || 'other';
      const isFirstInType = lastType !== typeKey;
      if (isFirstInType) {
        lastType = typeKey;
        const stats = typeStats[typeKey] || { count: 0, size: 0, ok: 0, missing: 0, selected: 0, excluded: 0 };
        const sep = document.createElement('div');
        sep.className = 'media-list-separator';
        sep.dataset.section = typeKey;
        if (collapsedSections[typeKey]) sep.classList.add('media-list-separator--collapsed');
        const left = document.createElement('span');
        left.className = 'media-list-separator-left';
        const chevron = document.createElement('span');
        chevron.className = 'media-list-separator-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '▼';
        const label = document.createElement('span');
        label.className = 'media-list-separator-label';
        label.textContent = typeLabels[typeKey] || typeLabels.other;
        left.appendChild(chevron);
        left.appendChild(label);
        const summary = document.createElement('span');
        summary.className = 'media-list-separator-summary';
        const parts = [
          `${stats.count} fichier${stats.count > 1 ? 's' : ''}`,
          formatBytes(stats.size),
          stats.ok > 0 || stats.missing > 0 ? `${stats.ok} OK, ${stats.missing} Manquant${stats.missing ? 's' : ''}` : '',
          stats.selected > 0 || stats.excluded > 0 ? `${stats.selected} inclus, ${stats.excluded} exclu${stats.excluded > 1 ? 's' : ''}` : '',
        ].filter(Boolean);
        summary.textContent = parts.join(' · ');
        sep.appendChild(left);
        sep.appendChild(summary);
        sep.addEventListener('click', () => {
          collapsedSections[typeKey] = !collapsedSections[typeKey];
          sep.classList.toggle('media-list-separator--collapsed', collapsedSections[typeKey]);
          mediaList.querySelectorAll(`.media-row[data-section="${typeKey}"]`).forEach((row) => {
            row.classList.toggle('media-row--collapsed', collapsedSections[typeKey]);
          });
        });
        mediaList.appendChild(sep);
      }

      const row = document.createElement('div');
      row.className = 'media-row';
      row.dataset.section = typeKey;
      row.dataset.mediaType = typeKey;
      if (collapsedSections[typeKey]) row.classList.add('media-row--collapsed');
      if (media.__ghost) row.classList.add('media-row--ghost');

      const nameCol = document.createElement('div');
      nameCol.className = 'media-name';
      nameCol.textContent = media.name;
      if (media.__ghost) {
        const ghostBadge = document.createElement('span');
        ghostBadge.className = 'media-ghost';
        ghostBadge.textContent = 'Fantôme';
        nameCol.appendChild(ghostBadge);
      }
      if (media.__duplicate) {
        const dupBadge = document.createElement('span');
        dupBadge.className = 'media-duplicate';
        dupBadge.textContent = 'Doublon';
        nameCol.appendChild(dupBadge);
      }

      const pathCol = document.createElement('div');
      pathCol.className = 'media-path';
      pathCol.textContent = media.path || '(chemin inconnu)';

      const sizeCol = document.createElement('div');
      sizeCol.className = 'media-size';
      sizeCol.textContent = formatBytes(media.size);

      const statusCol = document.createElement('div');
      const statusOk = media.exists;
      statusCol.className = `media-status ${statusOk ? 'ok' : 'missing'}`;
      statusCol.textContent = statusOk ? 'OK' : 'Manquant';

      const selectCol = document.createElement('div');
      selectCol.className = 'media-select';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!media.__selected;
      checkbox.addEventListener('change', () => {
        media.__selected = checkbox.checked;
        updateCreateButtonState();
        updateDestinationEstimates();
      });
      selectCol.appendChild(checkbox);

      row.appendChild(nameCol);
      row.appendChild(pathCol);
      row.appendChild(sizeCol);
      row.appendChild(statusCol);
      row.appendChild(selectCol);

      mediaList.appendChild(row);
    });

    updateCreateButtonState();
    updateDestinationEstimates();
  };

  /**
   * Applique marquage fantôme, détection doublons et sélection.
   * Si includeGhosts = false, seuls les fichiers non fantômes sont pris en compte pour doublons et stats (vue propre).
   */
  const applyDuplicateAndSelection = (mediaFiles, includeGhosts) => {
    mediaFiles.forEach((m) => {
      m.__ghost = m.exists === true && (m.size || 0) === 0;
    });
    const listForGroups = (includeGhosts ? mediaFiles : mediaFiles.filter((m) => !m.__ghost)).filter((m) => !m.__isPreview);
    const groups = {};
    listForGroups.forEach((m) => {
      if (m.__isPreview) {
        m.__duplicate = false;
        m.__selected = false;
        return;
      }
      const key = String(m.name ?? '');
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    Object.values(groups).forEach((items) => {
      if (items.length === 1) {
        const m = items[0];
        m.__duplicate = false;
        m.__selected = (m.size || 0) > 0;
        return;
      }
      let best = items[0];
      items.forEach((m) => {
        const bestExists = !!best.exists;
        const mExists = !!m.exists;
        const bestSize = best.size || 0;
        const mSize = m.size || 0;
        if (mExists && !bestExists) {
          best = m;
          return;
        }
        if (mExists !== bestExists) return;
        if (mSize > bestSize) {
          best = m;
          return;
        }
        if (mSize === bestSize && (m.path || '').length > (best.path || '').length) best = m;
      });
      items.forEach((m) => {
        m.__duplicate = true;
        m.__selected = m === best && (best.size || 0) > 0;
      });
    });
    mediaFiles.forEach((m) => {
      if (m.__isPreview) return;
      if (!listForGroups.includes(m)) {
        m.__duplicate = false;
        m.__selected = false;
      }
    });
  };

  const getVisibleMedia = () => {
    if (!currentAnalysis) return [];
    return currentAnalysis.mediaFiles.filter((m) => showGhostFiles || !m.__ghost);
  };

  const renderAnalysis = (analysis) => {
    currentAnalysis = analysis;
    showGhostFiles = false;
    const showGhostCheckbox = document.getElementById('show-ghost-files');
    if (showGhostCheckbox) showGhostCheckbox.checked = false;
    const visible = getVisibleMedia();
    const typeStats = {};
    visible.forEach((m) => {
      const t = m.type || 'other';
      typeStats[t] = (typeStats[t] || 0) + 1;
    });
    collapsedSections = {};
    Object.keys(typeStats).forEach((t) => { collapsedSections[t] = true; });

    analysis.mediaFiles.forEach((m) => {
      const p = (m.path || '').toLowerCase();
      m.__isPreview = p.includes('adobe premiere pro video previews');
    });

    applyDuplicateAndSelection(analysis.mediaFiles, false);

    const totalFiles = visible.length;
    const totalSize = visible.reduce((acc, m) => acc + (m.size || 0), 0);
    const offlineCount = visible.filter((m) => !m.exists).length;

    analysisTitle.textContent = `Analyse du projet : ${analysis.projectName}`;
    const versionText = formatPremiereVersion(analysis.premierVersion) || 'Version Premiere inconnue';
    analysisSubtitle.textContent = [
      versionText,
      `${totalFiles} fichier${totalFiles > 1 ? 's' : ''}`,
      formatBytes(totalSize),
      offlineCount > 0 ? `${offlineCount} manquant${offlineCount > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ');

    const linkMediaWarning = document.getElementById('link-media-warning');
    if (linkMediaWarning) {
      linkMediaWarning.style.display = offlineCount > 0 ? 'flex' : 'none';
    }
    const linkMediaWarningText = document.getElementById('link-media-warning-text');
    if (linkMediaWarningText && offlineCount > 0) {
      linkMediaWarningText.textContent = offlineCount === 1
        ? 'Média manquant pour ce clip :'
        : `Médias manquants pour ces clips (${offlineCount}) :`;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    suitcaseNameInput.value = `VALISE_${analysis.projectName}_${y}${m}${d}`;

    allSelected = visible.length > 0 && visible.every((m) => m.__selected);
    toggleSelectBtn.textContent = allSelected ? 'Tout désélectionner' : 'Tout sélectionner';

    relinkOfflineBtn.disabled = offlineCount === 0;

    renderMediaList();
    updateStatsFromVisible();
    updateDestinationEstimates();
    showScreen('analysis');
  };

  const updateStatsFromVisible = () => {
    if (!currentAnalysis) return;
    const visible = getVisibleMedia();
    const totalFiles = visible.length;
    const totalSize = visible.reduce((acc, m) => acc + (m.size || 0), 0);
    const offlineCount = visible.filter((m) => !m.exists).length;
    const versionText = formatPremiereVersion(currentAnalysis.premierVersion) || 'Version Premiere inconnue';
    if (analysisSubtitle) {
      analysisSubtitle.textContent = [
        versionText,
        `${totalFiles} fichier${totalFiles > 1 ? 's' : ''}`,
        formatBytes(totalSize),
        offlineCount > 0 ? `${offlineCount} manquant${offlineCount > 1 ? 's' : ''}` : null,
      ].filter(Boolean).join(' · ');
    }
    const linkMediaWarning = document.getElementById('link-media-warning');
    if (linkMediaWarning) linkMediaWarning.style.display = offlineCount > 0 ? 'flex' : 'none';
    const linkMediaWarningText = document.getElementById('link-media-warning-text');
    if (linkMediaWarningText && offlineCount > 0) {
      linkMediaWarningText.textContent = offlineCount === 1
        ? 'Média manquant pour ce clip :'
        : `Médias manquants pour ces clips (${offlineCount}) :`;
    }
    relinkOfflineBtn.disabled = offlineCount === 0;
  };

  const setDropzoneAnalyzing = (analyzing) => {
    const titleEl = dropzone && dropzone.querySelector('.dropzone-title');
    const subtitleEl = dropzone && dropzone.querySelector('.dropzone-subtitle');
    if (!dropzone) return;
    if (analyzing) {
      dropzone.classList.add('dropzone--loading');
      dropzone.style.pointerEvents = 'none';
      if (titleEl) titleEl.textContent = 'Analyse en cours…';
      if (subtitleEl) subtitleEl.textContent = 'Veuillez patienter (1 à 2 min pour les gros projets).';
      if (fileInput) fileInput.value = '';
    } else {
      dropzone.classList.remove('dropzone--loading');
      dropzone.style.pointerEvents = '';
      if (titleEl) titleEl.textContent = 'GLISSEZ UN PROJET PREMIERE (.PRPROJ) ICI';
      if (subtitleEl) subtitleEl.textContent = 'OU CLIQUEZ POUR SÉLECTIONNER UN FICHIER';
    }
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    if (isAnalyzing) {
      console.log('[renderer] Analyse déjà en cours, ignoré.');
      return;
    }
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.prproj')) {
      alert('Merci de sélectionner un fichier .prproj valide.');
      return;
    }
    const filePath = file.path || file.name;
    console.log('Fichier .prproj sélectionné :', filePath);

    if (!window.valisePremiere || !window.valisePremiere.analyzePrproj) {
      console.error('[renderer] Bridge valisePremiere.analyzePrproj indisponible.');
      return;
    }

    isAnalyzing = true;
    setDropzoneAnalyzing(true);

    try {
      console.log('[renderer] Analyse du projet en cours…');
      const result = await window.valisePremiere.analyzePrproj(filePath);
      if (!result.ok) {
        console.error('Erreur lors de l’analyse du projet :', result.error);
        alert(`Erreur lors de l'analyse du projet : ${result.error}`);
        return;
      }
      console.log('Analyse terminée :', result.data);
      console.log('Nombre de médias détectés :', result.data.mediaFiles.length);
      renderAnalysis(result.data);
    } finally {
      isAnalyzing = false;
      setDropzoneAnalyzing(false);
    }
  };

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    if (event.dataTransfer && event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files);
  });

  toggleSelectBtn.addEventListener('click', () => {
    if (!currentAnalysis) return;
    const visible = getVisibleMedia();
    allSelected = !allSelected;
    visible.forEach((m) => {
      m.__selected = allSelected;
    });
    toggleSelectBtn.textContent = allSelected ? 'Tout désélectionner' : 'Tout sélectionner';
    renderMediaList();
    updateDestinationEstimates();
  });

  const showGhostFilesCheckbox = document.getElementById('show-ghost-files');
  if (showGhostFilesCheckbox) {
    showGhostFilesCheckbox.checked = false;
    showGhostFilesCheckbox.addEventListener('change', () => {
      showGhostFiles = showGhostFilesCheckbox.checked;
      if (currentAnalysis) {
        applyDuplicateAndSelection(currentAnalysis.mediaFiles, showGhostFiles);
        updateStatsFromVisible();
        renderMediaList();
      }
    });
  }

  backToWelcomeBtn.addEventListener('click', () => {
    showScreen('welcome');
  });

  chooseDestinationBtn.addEventListener('click', () => {
    if (!window.valisePremiere || !window.valisePremiere.chooseFolder) return;
    window.valisePremiere
      .chooseFolder()
      .then((result) => {
        if (!result || !result.ok) return;
        destinationPath = result.path;
        destinationLabel.textContent = result.path;
        updateDestinationEstimates();
      })
      .catch((err) => {
        console.error('Erreur chooseFolder:', err);
      });
  });

  if (zipSuitcaseCheckbox) {
    zipSuitcaseCheckbox.addEventListener('change', () => updateDestinationEstimates());
  }

  // Variable pour stocker les données de relink
  let currentRelinkData = [];

  // Fonction pour ouvrir la modale de relink
  const openRelinkModal = () => {
    if (!currentAnalysis) return;
    
    const offlineMedia = currentAnalysis.mediaFiles.filter((m) => !m.exists);
    if (offlineMedia.length === 0) return;

    // Stocker les médias manquants avec leur nouveau chemin (initialement null)
    currentRelinkData = offlineMedia.map(media => ({
      original: media,
      newPath: null,
      newSize: 0,
    }));

    // Rendre la liste des médias offline
    renderRelinkMediaList(currentRelinkData);

    // Afficher la modale
    if (relinkModal) relinkModal.classList.add('active');
  };

  // Fonction pour rendre la liste des médias offline dans la modale
  const renderRelinkMediaList = (relinkData) => {
    if (!relinkMediaList) return;
    
    relinkMediaList.innerHTML = '';
    
    relinkData.forEach((item, index) => {
      const media = item.original;
      const row = document.createElement('div');
      row.className = 'relink-media-row';
      row.innerHTML = `
        <div class="relink-media-info">
          <div class="relink-media-name">${media.name}</div>
          <div class="relink-media-path">${media.path || '(chemin inconnu)'}</div>
        </div>
        <div class="relink-media-new-path">
          ${item.newPath ? `<span class="relink-path-selected">${item.newPath}</span>` : '<span class="relink-path-empty">Aucun fichier sélectionné</span>'}
        </div>
        <button class="btn btn-primary btn-locate relink-choose-btn" data-index="${index}">Localiser</button>
      `;
      
      const chooseBtn = row.querySelector('.relink-choose-btn');
      if (chooseBtn) {
        chooseBtn.addEventListener('click', async () => {
          if (!window.valisePremiere || !window.valisePremiere.chooseFile) {
            alert('Erreur : la fonction de sélection de fichier n\'est pas disponible.');
            return;
          }
          
          // Déterminer les extensions possibles basées sur le type de média
          const ext = media.extension || '';
          const filters = [];
          if (ext) {
            filters.push({ name: `Fichiers ${ext.toUpperCase()}`, extensions: [ext.replace('.', '')] });
          }
          filters.push({ name: 'Tous les fichiers', extensions: ['*'] });
          
          const result = await window.valisePremiere.chooseFile({
            title: `Sélectionner un fichier pour ${media.name}`,
            filters: filters
          });
          
          if (result && result.ok) {
            // Mettre à jour currentRelinkData directement
            currentRelinkData[index].newPath = result.filePath;
            currentRelinkData[index].newSize = result.size || 0;
            renderRelinkMediaList(currentRelinkData);
            updateRelinkApplyButton(currentRelinkData);
          }
        });
      }
      
      relinkMediaList.appendChild(row);
    });
    
    updateRelinkApplyButton(relinkData);
  };

  // Fonction pour mettre à jour l'état du bouton "Appliquer"
  const updateRelinkApplyButton = (relinkData) => {
    if (!relinkModalApply) return;
    
    // Activer le bouton si au moins un fichier a été sélectionné
    const hasSelection = relinkData.some(item => item.newPath !== null);
    relinkModalApply.disabled = !hasSelection;
  };

  // Fonction pour fermer la modale de relink
  const closeRelinkModal = () => {
    if (relinkModal) relinkModal.classList.remove('active');
  };

  // Fonction pour appliquer les changements de relink
  const applyRelink = (relinkData) => {
    if (!currentAnalysis) return;
    
    let updatedCount = 0;
    
    relinkData.forEach((item) => {
      if (item.newPath) {
        const found = currentAnalysis.mediaFiles.find(
          (m) => m.path === item.original.path && m.name === item.original.name
        );
        if (found) {
          found.path = item.newPath;
          found.size = item.newSize;
          found.exists = true;
          updatedCount++;
        }
      }
    });

    renderMediaList();
    updateStatsFromVisible();
    if (relinkOfflineBtn) relinkOfflineBtn.disabled = currentAnalysis.mediaFiles.filter((m) => !m.exists).length === 0;
    const linkMediaWarning = document.getElementById('link-media-warning');
    if (linkMediaWarning) linkMediaWarning.style.display = currentAnalysis.mediaFiles.filter((m) => !m.exists).length > 0 ? 'flex' : 'none';

    closeRelinkModal();
    
    console.log(`[renderer] ${updatedCount} média(x) relinké(s)`);
  };

  // Event listeners pour la modale relink
  if (relinkOfflineBtn) {
    relinkOfflineBtn.addEventListener('click', () => {
      openRelinkModal();
    });
  }

  if (relinkModalClose) {
    relinkModalClose.addEventListener('click', () => {
      closeRelinkModal();
    });
  }

  if (relinkModalCancel) {
    relinkModalCancel.addEventListener('click', () => {
      closeRelinkModal();
    });
  }

  if (relinkModalApply) {
    relinkModalApply.addEventListener('click', () => {
      applyRelink(currentRelinkData);
    });
  }

  if (window.valisePremiere && window.valisePremiere.onCopyProgress) {
    window.valisePremiere.onCopyProgress((event) => {
      if (!event || !isCopying) return;
      if (event.kind === 'file-start') {
        copyCurrent.textContent = `Copie : ${event.file.name}`;
        copyCount.textContent = `${event.index + 1}/${event.totalFiles}`;
        // Ne pas remettre à 0% si on a déjà une progression
        // Le pourcentage sera mis à jour lors de file-complete
      }
      if (event.kind === 'file-complete') {
        const globalPercent = Math.round((event.globalProgress || 0) * 100);
        copyBarInner.style.width = `${globalPercent}%`;
        if (copyPercent) copyPercent.textContent = `${globalPercent}%`;
        copyCurrent.textContent = `Copié : ${event.file.name}`;
        copyCount.textContent = `${event.copiedFiles}/${event.totalFiles}`;
      }
      if (event.kind === 'file-error') {
        copyCurrent.textContent = `Erreur : ${event.file.name}`;
      }
      if (event.kind === 'zip-start') {
        // S'assurer qu'on affiche bien 90% et pas 100% au début de la compression
        const globalPercent = Math.round((event.globalProgress || 0.9) * 100);
        copyCurrent.textContent = 'Compression en cours…';
        copyCount.textContent = '';
        if (copyPercent) copyPercent.textContent = `${globalPercent}%`;
        copyBarInner.style.width = `${globalPercent}%`;
      }
      if (event.kind === 'zip-progress') {
        const globalPercent = Math.round((event.globalProgress || 0.9) * 100);
        const zipPercent = Math.round((event.progress || 0) * 100);
        copyCurrent.textContent = `Compression en cours… ${zipPercent}%`;
        if (copyPercent) copyPercent.textContent = `${globalPercent}%`;
        copyBarInner.style.width = `${globalPercent}%`;
      }
      if (event.kind === 'zip-complete') {
        copyCurrent.textContent = 'Compression terminée';
        copyCount.textContent = '';
        if (copyPercent) copyPercent.textContent = '100%';
        copyBarInner.style.width = '100%';
      }
      if (event.kind === 'zip-error') {
        copyCurrent.textContent = `Erreur de compression : ${event.error}`;
        if (copyPercent) copyPercent.textContent = 'Erreur';
      }
      if (event.kind === 'all-complete') {
        const globalPercent = Math.round((event.globalProgress || 1.0) * 100);
        copyCurrent.textContent = 'Copie terminée';
        if (copyPercent) copyPercent.textContent = `${globalPercent}%`;
        copyBarInner.style.width = `${globalPercent}%`;
      }
    });
  }

  createSuitcaseBtn.addEventListener('click', async () => {
    if (!currentAnalysis) return;
    if (!window.valisePremiere || !window.valisePremiere.startCopy) return;
    if (!destinationPath) {
      alert('Merci de choisir un dossier de destination.');
      return;
    }

    const selectedFiles = currentAnalysis.mediaFiles.filter((m) => m.__selected && m.exists);
    if (selectedFiles.length === 0) {
      alert('Aucun média sélectionné ou en ligne à copier.');
      return;
    }

    const orgModeInput = document.querySelector('input[name="org-mode"]:checked');
    const orgMode = orgModeInput ? orgModeInput.value : 'type';
    const zipSuitcase = zipSuitcaseCheckbox ? zipSuitcaseCheckbox.checked : false;

    console.log('[renderer] Création de la valise demandée :', {
      project: currentAnalysis.projectName,
      projectFilePath: currentAnalysis.projectFilePath,
      suitcaseName: suitcaseNameInput.value,
      destinationPath,
      orgMode,
      zipSuitcase,
      selectedCount: selectedFiles.length,
    });

    isCopying = true;
    if (analysisScreen) analysisScreen.classList.add('copy-in-progress');
    copyBarInner.style.width = '0%';
    if (copyPercent) copyPercent.textContent = '0%';
    copyCurrent.textContent = zipSuitcase ? 'Préparation de la compression…' : 'Préparation de la copie…';
    copyCount.textContent = '';
    createSuitcaseBtn.disabled = true;

    // Un GIF différent à chaque création de valise (tirage aléatoire dans assets/loading)
    if (copyLoadingGifContainer && copyLoadingGif && window.valisePremiere && window.valisePremiere.listLoadingGifs) {
      try {
        const gifPaths = await window.valisePremiere.listLoadingGifs();
        if (gifPaths && gifPaths.length > 0) {
          const idx = Math.floor(Math.random() * gifPaths.length);
          const gifUrl = `file://${encodeURI(gifPaths[idx].replace(/\\/g, '/'))}`;
          copyLoadingGif.src = gifUrl;
          copyLoadingGif.alt = 'Mise en valise…';
          copyLoadingGifContainer.style.display = 'flex';
        }
      } catch (e) {
        console.warn('[renderer] listLoadingGifs:', e);
      }
    }

    // Construire le nom de la valise avec les initiales du profil si disponibles
    let finalSuitcaseName = suitcaseNameInput.value;
    if (currentProfile && currentProfile.initialsSuffix) {
      // Ajouter le suffixe d'initiales au nom de la valise
      finalSuitcaseName = `${finalSuitcaseName}_${currentProfile.initialsSuffix}`;
    }

    const result = await window.valisePremiere.startCopy({
      files: selectedFiles,
      destinationPath,
      suitcaseName: finalSuitcaseName,
      orgMode,
      zipSuitcase,
      projectFilePath: currentAnalysis.projectFilePath,
      projectName: currentAnalysis.projectName,
      premierVersion: currentAnalysis.premierVersion,
      profileName: currentProfile ? (currentProfile.isGuest ? null : `${currentProfile.firstName} ${currentProfile.name}`) : null,
      profileEmail: currentProfile && !currentProfile.isGuest ? currentProfile.email : null,
    });

    isCopying = false;
    if (analysisScreen) analysisScreen.classList.remove('copy-in-progress');
    if (copyLoadingGifContainer) copyLoadingGifContainer.style.display = 'none';
    if (copyLoadingGif) copyLoadingGif.removeAttribute('src');

    if (!result || !result.ok) {
      console.error('[renderer] Erreur lors de la copie :', result && result.error);
      alert(`Erreur lors de la copie : ${result && result.error}`);
      createSuitcaseBtn.disabled = false;
      return;
    }

    // Ne pas forcer 100% ici, laisser les événements de progression gérer l'affichage
    // Le dernier événement (zip-complete ou all-complete) mettra à jour à 100%
    const isZipped = result.data.zipPath !== null && result.data.zipPath !== undefined;
    // Le texte et le pourcentage seront mis à jour par les événements de progression
    copyCount.textContent = `${result.data.copiedFiles}/${result.data.totalFiles}`;

    console.log('[renderer] Copie terminée :', result.data);
    console.log('[renderer] ZIP créé ?', isZipped, 'Chemin ZIP:', result.data.zipPath);
    
    // Afficher la page finale au lieu de l'alerte
    showFinalScreen(result.data);
  });

  // ========== GESTION DES PROFILS ==========

  const loadProfiles = async () => {
    if (!window.valisePremiere || !window.valisePremiere.profilesLoad) return;
    const result = await window.valisePremiere.profilesLoad();
    if (result.ok) {
      profiles = result.data || [];
      updateProfileSelect();
      renderProfilesGrid();
    }
  };

  const getInitials = (firstName, name) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = name ? name.charAt(0).toUpperCase() : '';
    return `${first}${last}` || '?';
  };

  const renderProfilesGrid = () => {
    if (!profilesGrid) return;
    
    profilesGrid.innerHTML = '';
    
    if (profiles.length === 0) {
      profilesGrid.innerHTML = `
        <div class="empty-profiles">
          <div class="empty-profiles-icon">👤</div>
          <div class="empty-profiles-text">Aucun profil créé</div>
          <button class="btn btn-primary" id="add-profile-empty-btn">+ Créer un profil</button>
        </div>
      `;
      const addProfileEmptyBtn = document.getElementById('add-profile-empty-btn');
      if (addProfileEmptyBtn) {
        addProfileEmptyBtn.addEventListener('click', () => openProfileModal());
      }
      return;
    }
    
    profiles.forEach((profile) => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      if (currentProfile && currentProfile.id === profile.id) {
        card.classList.add('selected');
      }
      
      const initials = getInitials(profile.firstName, profile.name);
      const fullName = profile.isGuest ? profile.name : `${profile.firstName} ${profile.name}`;
      
      // Afficher la photo si disponible
      const photoDisplay = profile.photoPath 
        ? `<img src="file://${profile.photoPath}" alt="${fullName}" class="profile-photo" />`
        : profile.isGuest 
          ? `<div class="profile-photo-placeholder"></div>`
          : `<div class="profile-card-initials">${initials}</div>`;
      
      card.innerHTML = `
        ${photoDisplay}
        <div class="profile-card-name">${fullName}</div>
        ${profile.email && !profile.isGuest ? `<div class="profile-card-email">${profile.email}</div>` : ''}
        ${profile.isGuest ? '<div class="profile-guest-badge">Profil invité</div>' : ''}
        ${!profile.isGuest ? `
          <div class="profile-card-actions">
            <button class="btn btn-ghost profile-card-btn edit-profile-btn" data-profile-id="${profile.id}">Modifier</button>
            <button class="btn btn-ghost profile-card-btn delete-profile-btn" data-profile-id="${profile.id}">Supprimer</button>
          </div>
        ` : ''}
      `;
      
      // Clic sur la carte pour sélectionner le profil
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-profile-btn') && !e.target.closest('.delete-profile-btn')) {
          selectProfile(profile.id);
        }
      });
      
      // Bouton modifier (seulement si ce n'est pas le profil invité)
      if (!profile.isGuest) {
        const editBtn = card.querySelector('.edit-profile-btn');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openProfileModal(profile.id);
          });
        }
        
        // Bouton supprimer
        const deleteBtn = card.querySelector('.delete-profile-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProfile(profile.id);
          });
        }
      }
      
      profilesGrid.appendChild(card);
    });
  };

  const selectProfile = async (profileId) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    
    currentProfile = profile;
    applyCurrentProfile();
    
    const displayName = profile.isGuest ? profile.name : `${profile.firstName} ${profile.name}`;
    setProfileDisplayName(displayName);
    syncHeaderProfileAvatar();

    // Passer à l'écran welcome
    showScreen('welcome');
    
    // Re-rendre la grille pour mettre à jour la sélection visuelle
    renderProfilesGrid();
  };

  const updateProfileSelect = () => {
    if (!profileSelect) return;
    try {
      profileSelect.innerHTML = '<option value="">Aucun profil</option>';
      profiles.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.firstName} ${p.name}`;
        profileSelect.appendChild(opt);
      });
      if (currentProfile && profileSelect) {
        profileSelect.value = currentProfile.id;
      }
    } catch (err) {
      console.warn('[renderer] updateProfileSelect ignoré (profileSelect n\'existe pas):', err);
    }
  };

  const applyCurrentProfile = () => {
    if (!currentProfile) return;
    // Appliquer le dossier favori
    if (currentProfile.favoriteDestination && destinationLabel) {
      destinationPath = currentProfile.favoriteDestination;
      destinationLabel.textContent = currentProfile.favoriteDestination;
    }
    // Appliquer le mode d'organisation par défaut
    if (currentProfile.defaultOrgMode) {
      const orgModeInput = document.querySelector(`input[name="org-mode"][value="${currentProfile.defaultOrgMode}"]`);
      if (orgModeInput) {
        orgModeInput.checked = true;
      }
    }
  };

  const openProfileModal = (profileId = null) => {
    editingProfileId = profileId;
    const isGuestProfile = profileId && profiles.find(p => p.id === profileId)?.isGuest;
    
    if (profileId) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        if (profile.isGuest) {
          alert('Le profil invité ne peut pas être modifié. Créez un nouveau profil pour personnaliser vos préférences.');
          return;
        }
        
        if (profileModalTitle) profileModalTitle.textContent = 'Modifier le profil';
        if (profileNameInput) {
          profileNameInput.value = profile.name || '';
          profileNameInput.disabled = false;
        }
        if (profileFirstnameInput) {
          profileFirstnameInput.value = profile.firstName || '';
          profileFirstnameInput.disabled = false;
        }
        if (profileEmailInput) {
          profileEmailInput.value = profile.email || '';
          profileEmailInput.disabled = false;
        }
        if (profileInitialsSuffixInput) {
          profileInitialsSuffixInput.value = profile.initialsSuffix || '';
          profileInitialsSuffixInput.disabled = false;
        }
        
        // Charger les couleurs
        if (profileColor1Input) {
          profileColor1Input.value = profile.color1 || '#2563eb';
          profileColor1Input.disabled = false;
        }
        if (profileColor2Input) {
          profileColor2Input.value = profile.color2 || '#0f172a';
          profileColor2Input.disabled = false;
        }
        if (profileColor3Input) {
          profileColor3Input.value = profile.color3 || '#ffffff';
          profileColor3Input.disabled = false;
        }
        
        // Charger la photo
        currentProfilePhoto = profile.photoPath || null;
        if (profilePhotoPreview) {
          if (currentProfilePhoto) {
            profilePhotoPreview.style.backgroundImage = `url(file://${currentProfilePhoto})`;
            profilePhotoPreview.innerHTML = '';
            if (removeProfilePhotoBtn) removeProfilePhotoBtn.style.display = 'inline-block';
          } else {
            profilePhotoPreview.style.backgroundImage = '';
            profilePhotoPreview.innerHTML = '<span>👤</span>';
            if (removeProfilePhotoBtn) removeProfilePhotoBtn.style.display = 'none';
          }
        }
        if (selectProfilePhotoBtn) selectProfilePhotoBtn.disabled = false;
        
        const orgModeInput = document.querySelector(`input[name="profile-org-mode"][value="${profile.defaultOrgMode || 'type'}"]`);
        if (orgModeInput) orgModeInput.checked = true;
        if (profileFavoriteDestLabel) profileFavoriteDestLabel.textContent = profile.favoriteDestination || 'Non défini';
        if (profileChooseFavoriteDestBtn) profileChooseFavoriteDestBtn.disabled = false;
        
        // Afficher le bouton supprimer
        if (profileModalDelete) {
          profileModalDelete.style.display = 'inline-block';
        }
      }
    } else {
      if (profileModalTitle) profileModalTitle.textContent = 'Nouveau profil';
      if (profileNameInput) {
        profileNameInput.value = '';
        profileNameInput.disabled = false;
      }
      if (profileFirstnameInput) {
        profileFirstnameInput.value = '';
        profileFirstnameInput.disabled = false;
      }
      if (profileEmailInput) {
        profileEmailInput.value = '';
        profileEmailInput.disabled = false;
      }
      if (profileInitialsSuffixInput) {
        profileInitialsSuffixInput.value = '';
        profileInitialsSuffixInput.disabled = false;
      }
      
      // Réinitialiser les couleurs par défaut
      if (profileColor1Input) {
        profileColor1Input.value = '#2563eb';
        profileColor1Input.disabled = false;
      }
      if (profileColor2Input) {
        profileColor2Input.value = '#0f172a';
        profileColor2Input.disabled = false;
      }
      if (profileColor3Input) {
        profileColor3Input.value = '#ffffff';
        profileColor3Input.disabled = false;
      }
      
      // Réinitialiser la photo
      currentProfilePhoto = null;
      if (profilePhotoPreview) {
        profilePhotoPreview.style.backgroundImage = '';
        profilePhotoPreview.innerHTML = '<span>👤</span>';
      }
      if (removeProfilePhotoBtn) removeProfilePhotoBtn.style.display = 'none';
      if (selectProfilePhotoBtn) selectProfilePhotoBtn.disabled = false;
      
      const defaultOrgModeInput = document.querySelector('input[name="profile-org-mode"][value="type"]');
      if (defaultOrgModeInput) defaultOrgModeInput.checked = true;
      if (profileFavoriteDestLabel) profileFavoriteDestLabel.textContent = 'Non défini';
      if (profileChooseFavoriteDestBtn) profileChooseFavoriteDestBtn.disabled = false;
      
      // Cacher le bouton supprimer lors de la création
      if (profileModalDelete) {
        profileModalDelete.style.display = 'none';
      }
    }
    if (profileModal) profileModal.classList.add('active');
  };

  const closeProfileModal = () => {
    if (profileModal) profileModal.classList.remove('active');
    editingProfileId = null;
  };

  const saveProfile = async () => {
    if (!profileNameInput || !profileFirstnameInput) {
      alert('Erreur : les champs du formulaire ne sont pas disponibles.');
      return;
    }
    
    const name = profileNameInput.value.trim();
    const firstName = profileFirstnameInput.value.trim();
    if (!name || !firstName) {
      alert('Le nom et le prénom sont obligatoires.');
      return;
    }

    const orgModeInput = document.querySelector('input[name="profile-org-mode"]:checked');
    const profileData = {
      name,
      firstName,
      email: profileEmailInput ? profileEmailInput.value.trim() : '',
      defaultOrgMode: orgModeInput ? orgModeInput.value : 'type',
      favoriteDestination: profileFavoriteDestLabel && profileFavoriteDestLabel.textContent !== 'Non défini' ? profileFavoriteDestLabel.textContent : null,
      photoPath: currentProfilePhoto || null,
      color1: profileColor1Input ? profileColor1Input.value : '#2563eb',
      color2: profileColor2Input ? profileColor2Input.value : '#0f172a',
      color3: profileColor3Input ? profileColor3Input.value : '#ffffff',
      initialsSuffix: profileInitialsSuffixInput ? profileInitialsSuffixInput.value.trim().toUpperCase() : '',
    };

    if (!window.valisePremiere) {
      alert('Erreur : l\'API de l\'application n\'est pas disponible.');
      return;
    }

    try {

      if (editingProfileId) {
        if (!window.valisePremiere.profilesUpdate) {
          alert('Erreur : la fonction profilesUpdate n\'est pas disponible.');
          return;
        }
        const result = await window.valisePremiere.profilesUpdate(editingProfileId, profileData);
        if (result && result.ok) {
          await loadProfiles();
          if (currentProfile && currentProfile.id === editingProfileId) {
            currentProfile = result.data;
            applyCurrentProfile();
          }
          closeProfileModal();
        } else {
          const errorMsg = result && result.error ? result.error : 'Erreur inconnue';
          console.error('[renderer] Erreur profilesUpdate:', errorMsg);
          alert(`Erreur lors de la mise à jour : ${errorMsg}`);
        }
      } else {
        if (!window.valisePremiere.profilesCreate) {
          alert('Erreur : la fonction profilesCreate n\'est pas disponible.');
          return;
        }
        const result = await window.valisePremiere.profilesCreate(profileData);
        if (result && result.ok) {
          await loadProfiles();
          currentProfile = result.data;
          if (profileSelect) {
            profileSelect.value = currentProfile.id;
          }
          applyCurrentProfile();
          closeProfileModal(); // Fermer la modale après création
          // Si on est sur HOME, sélectionner automatiquement le nouveau profil
          if (homeScreen && homeScreen.classList.contains('active')) {
            selectProfile(currentProfile.id);
          }
        } else {
          const errorMsg = result && result.error ? result.error : 'Erreur inconnue';
          console.error('[renderer] Erreur profilesCreate:', errorMsg);
          alert(`Erreur lors de la création : ${errorMsg}`);
        }
      }
    } catch (err) {
      console.error('[renderer] Erreur saveProfile:', err);
      alert(`Erreur lors de la sauvegarde du profil : ${err.message || err}`);
    }
  };

  // Event listeners pour les profils
  if (profileSelect) {
    profileSelect.addEventListener('change', (e) => {
      const profileId = e.target.value;
      if (profileId) {
        currentProfile = profiles.find((p) => p.id === profileId) || null;
        applyCurrentProfile();
      } else {
        currentProfile = null;
      }
    });
  }

  if (newProfileBtn) {
    newProfileBtn.addEventListener('click', () => openProfileModal());
  }

  if (addProfileHomeBtn) {
    addProfileHomeBtn.addEventListener('click', () => openProfileModal());
  }

  if (changeProfileBtn) {
    changeProfileBtn.addEventListener('click', () => {
      showScreen('home');
    });
  }

  if (profileModalClose) {
    profileModalClose.addEventListener('click', closeProfileModal);
  }

  if (profileModalCancel) {
    profileModalCancel.addEventListener('click', closeProfileModal);
  }

  if (profileModalSave) {
    profileModalSave.addEventListener('click', saveProfile);
  }

  if (profileModalDelete) {
    profileModalDelete.addEventListener('click', () => {
      if (editingProfileId) {
        deleteProfile(editingProfileId);
      }
    });
  }

  const deleteProfile = async (profileId) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    
    // Empêcher la suppression du profil invité
    if (profile.isGuest || profileId === 'profile_guest') {
      alert('Le profil invité ne peut pas être supprimé.');
      return;
    }
    
    const profileName = profile.firstName && profile.name 
      ? `${profile.firstName} ${profile.name}` 
      : profile.name || 'ce profil';
    
    // Confirmation
    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profileName}" ?\n\nCette action est irréversible.`);
    if (!confirmed) return;
    
    if (!window.valisePremiere || !window.valisePremiere.profilesDelete) {
      alert('Erreur : l\'API de suppression n\'est pas disponible.');
      return;
    }
    
    try {
      const result = await window.valisePremiere.profilesDelete(profileId);
      if (result && result.ok) {
        // Si le profil supprimé était le profil actuellement sélectionné, revenir à HOME
        if (currentProfile && currentProfile.id === profileId) {
          currentProfile = null;
          setProfileDisplayName('Aucun profil sélectionné');
          syncHeaderProfileAvatar();
          showScreen('home');
        }
        
        // Recharger les profils
        await loadProfiles();
        
        // Fermer la modale si elle était ouverte
        closeProfileModal();
      } else {
        const errorMsg = result && result.error ? result.error : 'Erreur inconnue';
        console.error('[renderer] Erreur profilesDelete:', errorMsg);
        alert(`Erreur lors de la suppression : ${errorMsg}`);
      }
    } catch (err) {
      console.error('[renderer] Erreur deleteProfile:', err);
      alert(`Erreur lors de la suppression du profil : ${err.message || err}`);
    }
  };

  if (profileChooseFavoriteDestBtn && window.valisePremiere && window.valisePremiere.chooseFolder) {
    profileChooseFavoriteDestBtn.addEventListener('click', async () => {
      const result = await window.valisePremiere.chooseFolder();
      if (result && result.ok) {
        profileFavoriteDestLabel.textContent = result.path;
      }
    });
  }

  // Gestion de la photo de profil
  if (selectProfilePhotoBtn && window.valisePremiere && window.valisePremiere.selectProfilePhoto) {
    selectProfilePhotoBtn.addEventListener('click', async () => {
      try {
        const result = await window.valisePremiere.selectProfilePhoto();
        if (result && result.filePath) {
          currentProfilePhoto = result.filePath;
          if (profilePhotoPreview) {
            profilePhotoPreview.style.backgroundImage = `url(file://${result.filePath})`;
            profilePhotoPreview.innerHTML = '';
            if (removeProfilePhotoBtn) removeProfilePhotoBtn.style.display = 'inline-block';
          }
        }
      } catch (error) {
        console.error('[renderer] Erreur lors de la sélection de la photo:', error);
      }
    });
  }

  if (removeProfilePhotoBtn) {
    removeProfilePhotoBtn.addEventListener('click', () => {
      currentProfilePhoto = null;
      if (profilePhotoPreview) {
        profilePhotoPreview.style.backgroundImage = '';
        profilePhotoPreview.innerHTML = '<span>👤</span>';
      }
      removeProfilePhotoBtn.style.display = 'none';
    });
  }

  // Charger les profils au démarrage
  if (_launcherSession.connected) {
    const sessionScreen = document.getElementById('session-screen');
    const homeScreen = document.getElementById('home-screen');
    if (appContainer) appContainer.style.opacity = '1';
    if (sessionScreen && homeScreen) {
      homeScreen.classList.remove('active');
      sessionScreen.style.display = '';
      sessionScreen.classList.add('active');
      const initials = _launcherSession.profileName
        ? _launcherSession.profileName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?';
      const nameEl = document.getElementById('session-profile-name');
      const initialsEl = document.getElementById('session-avatar-initials');
      if (nameEl) nameEl.textContent = _launcherSession.profileName || '';
      setProfileDisplayName(_launcherSession.profileName || '—');
      syncHeaderProfileAvatar();
      if (initialsEl) initialsEl.textContent = initials;

      document.getElementById('session-continue-btn').addEventListener('click', () => {
        const tempProfile = {
          id: _launcherSession.profileId,
          firstName: _launcherSession.profileName ? _launcherSession.profileName.split(' ')[0] : '',
          name: _launcherSession.profileName ? _launcherSession.profileName.split(' ').slice(1).join(' ') : '',
          initials: initials,
          role: _launcherSession.profileRole || 'user',
          isAdmin: _launcherSession.profileRole === 'admin',
          fromLauncher: true
        };
        sessionScreen.classList.remove('active');
        sessionScreen.style.display = 'none';
        // Injecter le profil temporaire et passer à welcome
        currentProfile = tempProfile;
        applyCurrentProfile();
        setProfileDisplayName(`${tempProfile.firstName} ${tempProfile.name}`.trim());
        syncHeaderProfileAvatar();
        showScreen('welcome');
      });

      document.getElementById('session-change-btn').addEventListener('click', async () => {
        sessionScreen.classList.remove('active');
        sessionScreen.style.display = 'none';
        homeScreen.classList.add('active');
        await loadProfiles();
      });
    }
  } else {
    if (appContainer) appContainer.style.opacity = '1';
    await loadProfiles();
  }
  
  // Afficher HOME en premier (déjà fait dans le HTML avec class="active")
  // Si un profil est déjà sélectionné (par exemple depuis une session précédente),
  // on pourrait passer directement à welcome, mais pour l'instant on reste sur HOME

  // ========== PAGE FINALE ==========
  
  const finalSuitcaseName = document.getElementById('final-suitcase-name');
  const finalSuitcaseSize = document.getElementById('final-suitcase-size');
  const finalSuitcasePath = document.getElementById('final-suitcase-path');
  const openInFinderBtn = document.getElementById('open-in-finder-btn');
  const viewReportBtn = document.getElementById('view-report-btn');
  const btnGofileUpload = document.getElementById('btn-gofile-upload');
  const gofileProgress = document.getElementById('gofile-progress');
  const gofileProgressFill = document.getElementById('gofile-progress-fill');
  const gofileProgressLabel = document.getElementById('gofile-progress-label');
  const gofileResult = document.getElementById('gofile-result');
  const gofileLink = document.getElementById('gofile-link');
  const btnCopyGofileLink = document.getElementById('btn-copy-gofile-link');
  const gofileError = document.getElementById('gofile-error');
  const gofileUploadEstimate = document.getElementById('gofile-upload-estimate');
  const uploadGifContainer = document.getElementById('upload-gif-container');
  const uploadGif = document.getElementById('upload-gif');
  const uploadProgressFill = document.getElementById('upload-progress-fill');
  const uploadProgressLabel = document.getElementById('upload-progress-label');

  // Charger un GIF aléatoire depuis assets/GIF
  async function loadCelebrationGif() {
    const gifContainer = document.getElementById('celebrationGifContainer');
    const gifElement = document.getElementById('celebrationGif');
    
    if (!gifContainer || !gifElement) return;
    
    // Cacher le conteneur par défaut
    gifContainer.style.display = 'none';
    gifElement.style.display = 'none';
    gifElement.style.opacity = '0';
    gifElement.style.visibility = 'hidden';
    
    // Listener pour afficher le GIF une fois chargé
    const onGifLoad = () => {
      gifContainer.style.display = 'flex';
      gifElement.style.display = 'block';
      gifElement.style.opacity = '1';
      gifElement.style.visibility = 'visible';
      gifElement.removeEventListener('load', onGifLoad);
      gifElement.removeEventListener('error', onGifError);
    };
    
    const onGifError = (e) => {
      console.error('[GIF] Erreur de chargement de l\'image:', e);
      gifElement.removeEventListener('load', onGifLoad);
      gifElement.removeEventListener('error', onGifError);
      gifContainer.style.display = 'none';
    };
    
    gifElement.addEventListener('load', onGifLoad);
    gifElement.addEventListener('error', onGifError);
    
    try {
      // Lister les GIFs disponibles dans assets/GIF
      if (!window.valisePremiere || !window.valisePremiere.listCelebrationGifs) {
        console.warn('[GIF] Fonction listCelebrationGifs non disponible');
        return;
      }
      
      const gifPaths = await window.valisePremiere.listCelebrationGifs();
      
      if (!gifPaths || gifPaths.length === 0) {
        console.warn('[GIF] Aucun GIF trouvé dans assets/GIF');
        gifContainer.style.display = 'none';
        return;
      }
      
      // Sélectionner un GIF aléatoire
      const randomIndex = Math.floor(Math.random() * gifPaths.length);
      const selectedGifPath = gifPaths[randomIndex];
      
      console.log(`[GIF] Chargement du GIF: ${selectedGifPath}`);
      
      // Convertir le chemin de fichier en URL de fichier pour l'affichage dans Electron
      const gifUrl = `file://${encodeURI(selectedGifPath.replace(/\\/g, '/'))}`;
      
      // Définir le src - cela déclenchera l'événement 'load'
      gifElement.src = gifUrl;
      gifElement.alt = 'Celebration';
      
      // Forcer l'affichage après un court délai au cas où l'événement load ne se déclenche pas
      setTimeout(() => {
        if (gifElement.complete && gifElement.naturalHeight !== 0) {
          gifContainer.style.display = 'flex';
          gifElement.style.display = 'block';
          gifElement.style.opacity = '1';
          gifElement.style.visibility = 'visible';
        }
      }, 300);
      
    } catch (error) {
      console.error('[GIF] Erreur lors du chargement du GIF:', error);
      gifContainer.style.display = 'none';
    }
  }

  // Formater les bytes en format lisible (version pour la page finale)
  function formatBytesFinal(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /** Prépare les données de l’écran final et le bloc Gofile (sans afficher l’écran). */
  async function prepareFinalScreenData(copyResult) {
    lastCopyResult = {
      suitcasePath: copyResult.root,
      zipPath: copyResult.zipPath || null,
      suitcaseName: copyResult.root
        ? copyResult.root.split(/[/\\]/).pop().replace(/\.zip$/i, '')
        : 'valise',
    };
    const suitcaseName = copyResult.root ? copyResult.root.split(/[/\\]/).pop() : 'Valise';
    const totalSize = copyResult.copiedBytes || 0;
    if (finalSuitcaseName) finalSuitcaseName.textContent = suitcaseName;
    if (finalSuitcaseSize) finalSuitcaseSize.textContent = formatBytesFinal(totalSize);
    if (finalSuitcasePath) finalSuitcasePath.textContent = copyResult.root || '-';
    if (gofileResult) gofileResult.classList.add('hidden');
    if (gofileError) gofileError.classList.add('hidden');
    if (gofileProgress) gofileProgress.classList.add('hidden');
    if (btnGofileUpload) {
      btnGofileUpload.disabled = false;
      btnGofileUpload.textContent = 'Créer un lien Gofile';
    }
    if (gofileProgressFill) gofileProgressFill.style.width = '0%';
    if (gofileProgressLabel) gofileProgressLabel.textContent = 'Préparation du fichier…';
    // Estimation du temps d'upload Gofile (basée sur la connexion testée)
    if (gofileUploadEstimate && totalSize > 0) {
      const estimateRes = await getGofileUploadEstimateText(totalSize);
      gofileUploadEstimate.textContent = estimateRes.text || `Upload estimé : ${formatDuration(totalSize / (15 * 1024 * 1024))} (estimation)`;
      gofileUploadEstimate.style.display = 'block';
    } else if (gofileUploadEstimate) {
      gofileUploadEstimate.style.display = 'none';
    }
  }

  /** Affiche un GIF aléatoire dans l’écran d’upload (assets/upload). */
  async function setRandomUploadGif() {
    if (!uploadGifContainer || !uploadGif || !window.valisePremiere || !window.valisePremiere.listUploadGifs) return;
    try {
      const paths = await window.valisePremiere.listUploadGifs();
      if (paths && paths.length > 0) {
        const idx = Math.floor(Math.random() * paths.length);
        uploadGif.src = `file://${encodeURI(paths[idx].replace(/\\/g, '/'))}`;
        uploadGif.alt = 'Envoi en cours…';
        uploadGifContainer.style.display = 'flex';
      } else {
        uploadGifContainer.style.display = 'none';
      }
    } catch (e) {
      console.warn('[renderer] listUploadGifs:', e);
      uploadGifContainer.style.display = 'none';
    }
  }

  // Afficher la page finale (ou écran d’upload puis finale si Gofile auto)
  async function showFinalScreen(copyResult) {
    if (!finalScreen) return;

    await prepareFinalScreenData(copyResult);

    const doAutoGofile = autoGofileCheckbox && autoGofileCheckbox.checked && lastCopyResult;

    let uploadDurationMs = null;
    if (doAutoGofile) {
      const totalBytes = copyResult.copiedBytes || 0;
      const estimateRes = await getGofileUploadEstimateText(totalBytes);
      showScreen('upload');
      if (uploadProgressFill) uploadProgressFill.style.width = '0%';
      if (uploadProgressLabel) uploadProgressLabel.textContent = '0%';
      if (uploadTimeEstimate && estimateRes.text) {
        uploadTimeEstimate.textContent = estimateRes.text;
        uploadTimeEstimate.style.display = 'block';
      }
      await setRandomUploadGif();
      const gofileResult = await runGofileUpload();
      if (gofileResult && gofileResult.uploadDurationMs != null) {
        uploadDurationMs = gofileResult.uploadDurationMs;
      }
    }

    await addToHistory(copyResult, uploadDurationMs);

    await loadCelebrationGif();
    showScreen('final');

    // Création silencieuse du sous-élément Monday (si un projet est sélectionné)
    const selectedMondayItemId = mondayProjectSelect?.value || '';
    if (selectedMondayItemId && _mondayToken && window.valisePremiere?.mondayCreateSubitem) {
      const gofileUrl = (() => {
        try { return document.getElementById('gofile-link')?.href || ''; } catch(e) { return ''; }
      })();
      const mondayProfile = currentProfile && !currentProfile.isGuest
        ? `${currentProfile.firstName} ${currentProfile.name}`
        : '';
      window.valisePremiere.mondayCreateSubitem({
        token: _mondayToken,
        parentItemId: selectedMondayItemId,
        suitcaseName: lastCopyResult?.suitcaseName || '',
        date: new Date().toISOString().split('T')[0],
        profile: mondayProfile,
        gofileUrl,
      }).catch(e => console.warn('[Monday] Erreur création sous-élément:', e));
    }
  }

  async function addToHistory(copyResult, uploadDurationMs = null) {
    if (!window.valisePremiere || !window.valisePremiere.historyAdd) return;
    const suitcaseName = copyResult.root ? copyResult.root.split(/[/\\]/).pop().replace(/\.zip$/i, '') : 'Valise';
    await window.valisePremiere.historyAdd({
      suitcaseName,
      copiedBytes: copyResult.copiedBytes || 0,
      copyDurationMs: copyResult.durationMs || 0,
      uploadDurationMs: uploadDurationMs ?? undefined,
    });
  }

  // Event listeners pour les boutons de la page finale
  if (openInFinderBtn) {
    openInFinderBtn.addEventListener('click', async () => {
      const suitcasePath = finalSuitcasePath ? finalSuitcasePath.textContent : null;
      if (suitcasePath && window.valisePremiere && window.valisePremiere.openInFinder) {
        await window.valisePremiere.openInFinder(suitcasePath);
      } else if (suitcasePath) {
        // Fallback : utiliser shell via IPC
        console.warn('[renderer] openInFinder non disponible, utiliser shell.showItemInFolder');
      }
    });
  }

  if (viewReportBtn) {
    viewReportBtn.addEventListener('click', async () => {
      const suitcasePath = finalSuitcasePath ? finalSuitcasePath.textContent : null;
      if (suitcasePath) {
        const reportPath = suitcasePath + '/VALISE_REPORT.txt';
        if (window.valisePremiere && window.valisePremiere.openInFinder) {
          await window.valisePremiere.openInFinder(reportPath);
        } else {
          console.warn('[renderer] openInFinder non disponible');
        }
      }
    });
  }

  // --- Gofile upload ---
  const AUTO_GOFILE_STORAGE_KEY = 'transporter_auto_gofile';

  if (autoGofileCheckbox) {
    try {
      autoGofileCheckbox.checked = localStorage.getItem(AUTO_GOFILE_STORAGE_KEY) === '1';
    } catch (e) {}
    autoGofileCheckbox.addEventListener('change', () => {
      try {
        localStorage.setItem(AUTO_GOFILE_STORAGE_KEY, autoGofileCheckbox.checked ? '1' : '0');
      } catch (e) {}
    });
  }

  if (window.valisePremiere && window.valisePremiere.onGofileProgress) {
    window.valisePremiere.onGofileProgress((data) => {
      const pct = Math.round(data.percent || 0);
      const onUploadScreen = uploadScreen && uploadScreen.classList.contains('active');
      if (onUploadScreen) {
        if (uploadProgressFill) uploadProgressFill.style.width = pct + '%';
      } else {
        if (gofileProgressFill) gofileProgressFill.style.width = pct + '%';
      }
  
      // Formatage du temps restant
      let timeLabel = '';
      if (data.phase === 'uploading' && data.remainingSeconds !== null && data.remainingSeconds !== undefined) {
        if (data.remainingSeconds < 60) {
          timeLabel = `— ${data.remainingSeconds}s restantes`;
        } else {
          const m = Math.floor(data.remainingSeconds / 60);
          const s = data.remainingSeconds % 60;
          timeLabel = `— ${m}min ${s.toString().padStart(2, '0')}s restantes`;
        }
      }

      if (data.phase === 'preparing') {
        if (gofileProgressLabel) gofileProgressLabel.textContent = 'Préparation du fichier…';
        if (uploadProgressLabel) uploadProgressLabel.textContent = 'Préparation du fichier…';
      } else {
        if (gofileProgressLabel) gofileProgressLabel.textContent = `Envoi en cours… ${pct}% ${timeLabel}`;
        if (uploadProgressLabel) uploadProgressLabel.textContent = `Envoi en cours… ${pct}% ${timeLabel}`;
      }
    });
  }

  async function runGofileUpload() {
    if (!lastCopyResult || !window.valisePremiere || !window.valisePremiere.gofileUpload) return null;

    gofileResult.classList.add('hidden');
    gofileError.classList.add('hidden');
    gofileProgress.classList.remove('hidden');
    if (gofileProgressFill) gofileProgressFill.style.width = '0%';
    if (gofileProgressLabel) gofileProgressLabel.textContent = 'Préparation du fichier…';
    if (btnGofileUpload) {
      btnGofileUpload.disabled = true;
      btnGofileUpload.textContent = 'Upload en cours…';
    }

    const payload = {
      suitcaseName: lastCopyResult.suitcaseName || 'valise',
    };
    if (lastCopyResult.zipPath) {
      payload.zipPath = lastCopyResult.zipPath;
    } else if (lastCopyResult.suitcasePath) {
      payload.folderPath = lastCopyResult.suitcasePath;
    }

    const result = await window.valisePremiere.gofileUpload(payload);

    gofileProgress.classList.add('hidden');
    if (btnGofileUpload) btnGofileUpload.disabled = false;

    if (result && result.ok) {
      gofileLink.href = result.downloadUrl;
      gofileLink.textContent = result.downloadUrl;
      gofileResult.classList.remove('hidden');
      if (btnGofileUpload) btnGofileUpload.textContent = 'Recréer un lien';
      if (result.uploadDurationMs != null && window.valisePremiere.historyUpdateLastUpload) {
        await window.valisePremiere.historyUpdateLastUpload(result.uploadDurationMs);
      }
    } else {
      gofileError.textContent = 'Erreur upload : ' + (result && result.error ? result.error : 'Erreur inconnue');
      gofileError.classList.remove('hidden');
      if (btnGofileUpload) btnGofileUpload.textContent = 'Créer un lien Gofile';
    }
    return result;
  }

  if (btnGofileUpload) {
    btnGofileUpload.addEventListener('click', () => runGofileUpload());
  }

  if (btnCopyGofileLink && gofileLink) {
    btnCopyGofileLink.addEventListener('click', async () => {
      const url = gofileLink.href;
      if (url && url !== '#' && window.valisePremiere && window.valisePremiere.copyToClipboard) {
        await window.valisePremiere.copyToClipboard(url);
        btnCopyGofileLink.textContent = 'Copié !';
        setTimeout(() => {
          btnCopyGofileLink.textContent = 'Copier le lien';
        }, 2000);
      }
    });
  }

  // Bouton Quitter
  const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const renderHistory = async () => {
    if (!historyList || !historyEmpty) return;
    if (!window.valisePremiere || !window.valisePremiere.historyLoad) return;
    const res = await window.valisePremiere.historyLoad();
    if (!res || !res.ok || !res.entries) {
      historyList.innerHTML = '';
      historyEmpty.style.display = 'block';
      return;
    }
    const entries = res.entries;
    if (entries.length === 0) {
      historyList.innerHTML = '';
      historyEmpty.style.display = 'block';
      return;
    }
    historyEmpty.style.display = 'none';
    historyList.innerHTML = entries.map((e) => {
      const copyDur = e.copyDurationMs ? formatDuration(e.copyDurationMs / 1000) : '—';
      const uploadDur = e.uploadDurationMs != null ? formatDuration(e.uploadDurationMs / 1000) : '—';
      const size = formatBytes(e.copiedBytes);
      const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="history-item">
          <div class="history-item-name">${escapeHtml(e.suitcaseName || 'Valise')}</div>
          <div class="history-item-meta">
            <span>${size} · Copie : ${copyDur}</span>
            <span>Upload Gofile : ${uploadDur}</span>
            ${date ? `<span>${date}</span>` : ''}
          </div>
        </div>`;
    }).join('');
  };

  if (historyToggle && historyDropdown) {
    historyToggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isHidden = historyDropdown.hidden;
      if (isHidden) {
        await renderHistory();
        if (paramsDropdown) paramsDropdown.hidden = true;
      }
      historyDropdown.hidden = !isHidden;
    });
    document.addEventListener('click', () => {
      if (historyDropdown) historyDropdown.hidden = true;
    });
    if (historyDropdown) {
      historyDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  if (paramsToggle && paramsDropdown) {
    paramsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = paramsDropdown.hidden;
      if (isHidden && historyDropdown) historyDropdown.hidden = true;
      paramsDropdown.hidden = !isHidden;
    });
    document.addEventListener('click', () => {
      paramsDropdown.hidden = true;
    });
    if (paramsDropdown) {
      paramsDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
  }
  if (paramsChangeProfile) {
    paramsChangeProfile.addEventListener('click', () => {
      if (paramsDropdown) paramsDropdown.hidden = true;
      showScreen('home');
    });
  }


  // ── Changelog (clic logo) ──────────────────────────────────
  const changelogLogo    = document.getElementById('changelog-logo');
  const changelogModal   = document.getElementById('changelog-modal');
  const changelogClose   = document.getElementById('changelog-modal-close');
  const changelogOk      = document.getElementById('changelog-modal-ok');
  const changelogContent = document.getElementById('changelog-content');

  const openChangelog = async () => {
    if (!changelogModal) return;
    changelogModal.classList.add('active');
    if (window.valisePremiere && window.valisePremiere.readChangelog) {
      const res = await window.valisePremiere.readChangelog();
      if (res.ok) {
        changelogContent.textContent = res.content;
      } else {
        changelogContent.textContent = 'Impossible de charger le changelog : ' + res.error;
      }
    }
  };

  const closeChangelog = () => changelogModal && changelogModal.classList.remove('active');

  if (changelogLogo)  changelogLogo.addEventListener('click', openChangelog);
  if (changelogClose) changelogClose.addEventListener('click', closeChangelog);
  if (changelogOk)    changelogOk.addEventListener('click', closeChangelog);
  if (changelogModal) {
    changelogModal.addEventListener('click', (e) => {
      if (e.target === changelogModal) closeChangelog();
    });
  }

  // --- Intégration Monday.com ---

  let _mondayToken = '';
  let _mondayProjects = []; // cache de la liste chargée

  // Charger le token au démarrage
  async function loadMondayToken() {
    if (!window.valisePremiere?.mondayGetToken) return;
    const res = await window.valisePremiere.mondayGetToken();
    if (res?.ok && res.token) {
      _mondayToken = res.token;
      if (mondayTokenInput) mondayTokenInput.value = res.token;
    }
  }
  loadMondayToken();

  // Sauvegarder le token
  if (mondayTokenSave) {
    mondayTokenSave.addEventListener('click', async () => {
      const token = mondayTokenInput?.value?.trim() || '';
      if (!token) return;
      const res = await window.valisePremiere?.mondaySaveToken(token);
      if (res?.ok) {
        _mondayToken = token;
        if (mondayTokenStatus) {
          mondayTokenStatus.textContent = '✓ Enregistré';
          setTimeout(() => { if (mondayTokenStatus) mondayTokenStatus.textContent = ''; }, 2000);
        }
      }
    });
  }

  // Charger les projets Monday dans le select
  async function loadMondayProjects() {
    if (!mondayProjectSelect) return;
    if (!_mondayToken) {
      if (mondayProjectError) {
        mondayProjectError.textContent = 'Token Monday non configuré (Paramètres).';
        mondayProjectError.style.display = 'block';
      }
      return;
    }

    if (mondayProjectLoading) mondayProjectLoading.style.display = 'block';
    if (mondayProjectError) mondayProjectError.style.display = 'none';
    if (mondayRefreshBtn) mondayRefreshBtn.disabled = true;

    const previousValue = mondayProjectSelect.value;

    try {
      const res = await window.valisePremiere?.mondayLoadProjects({ token: _mondayToken });

      if (!res?.ok) {
        if (mondayProjectError) {
          mondayProjectError.textContent = res?.error || 'Erreur de chargement.';
          mondayProjectError.style.display = 'block';
        }
        return;
      }

      _mondayProjects = res.items || [];

      // Reconstruire les options
      mondayProjectSelect.innerHTML = '<option value="">— Aucun projet lié —</option>';
      _mondayProjects.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.name}`;
        opt.dataset.statut = item.statut;
        mondayProjectSelect.appendChild(opt);
      });

      // Restaurer la sélection précédente si toujours présente
      if (previousValue) {
        const stillExists = _mondayProjects.find(i => i.id === previousValue);
        if (stillExists) mondayProjectSelect.value = previousValue;
      }

    } catch (e) {
      if (mondayProjectError) {
        mondayProjectError.textContent = 'Erreur réseau : ' + e.message;
        mondayProjectError.style.display = 'block';
      }
    } finally {
      if (mondayProjectLoading) mondayProjectLoading.style.display = 'none';
      if (mondayRefreshBtn) mondayRefreshBtn.disabled = false;
    }
  }

  // Bouton Actualiser
  if (mondayRefreshBtn) {
    mondayRefreshBtn.addEventListener('click', () => loadMondayProjects());
  }

  // Charger les projets quand on arrive sur l'écran d'analyse
  const _origShowAnalysis = typeof showScreen === 'function' ? showScreen : null;
  const _analysisScreenObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const el = m.target;
        if (el.id === 'analysis-screen' && el.classList.contains('active')) {
          if (_mondayProjects.length === 0) loadMondayProjects();
        }
      }
    }
  });
  const _analysisScreenEl = document.getElementById('analysis-screen');
  if (_analysisScreenEl) {
    _analysisScreenObserver.observe(_analysisScreenEl, { attributes: true });
  }
});


