const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] Chargement du preload Valise Premiere...');

// Pont minimal pour l'analyse de fichiers .prproj
contextBridge.exposeInMainWorld('valisePremiere', {
  version: '0.1.0-mvp',
  analyzePrproj: (filePath) => {
    console.log('[preload] analyzePrproj appelé avec :', filePath);
    return ipcRenderer.invoke('analyze-prproj', filePath);
  },
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  getDiskSpace: (targetPath) => ipcRenderer.invoke('get-disk-space', targetPath),
  getUploadSpeed: () => ipcRenderer.invoke('get-upload-speed'),
  getCopySpeed: () => ipcRenderer.invoke('get-copy-speed'),
  historyLoad: () => ipcRenderer.invoke('history-load'),
  historyAdd: (entry) => ipcRenderer.invoke('history-add', entry),
  historyUpdateLastUpload: (uploadDurationMs) => ipcRenderer.invoke('history-update-last-upload', uploadDurationMs),
  chooseFile: (options) => ipcRenderer.invoke('choose-file', options),
  relinkOffline: (rootPath, mediaFiles) =>
    ipcRenderer.invoke('relink-offline-media', { rootPath, mediaFiles }),
  startCopy: (payload) => ipcRenderer.invoke('start-copy', payload),
  onCopyProgress: (callback) => {
    ipcRenderer.on('copy-progress', (_event, data) => {
      if (typeof callback === 'function') {
        callback(data);
      }
    });
  },
  // Gestion des profils
  profilesLoad: () => ipcRenderer.invoke('profiles-load'),
  profilesCreate: (profileData) => ipcRenderer.invoke('profiles-create', profileData),
  profilesUpdate: (profileId, updates) => ipcRenderer.invoke('profiles-update', { profileId, updates }),
  profilesDelete: (profileId) => ipcRenderer.invoke('profiles-delete', profileId),
  profilesGet: (profileId) => ipcRenderer.invoke('profiles-get', profileId),
  selectProfilePhoto: () => ipcRenderer.invoke('select-profile-photo'),
  // GIFs de célébration
  listCelebrationGifs: () => ipcRenderer.invoke('list-celebration-gifs'),
  listLoadingGifs: () => ipcRenderer.invoke('list-loading-gifs'),
  listUploadGifs: () => ipcRenderer.invoke('list-upload-gifs'),
  // Ouvrir dans le Finder
  openInFinder: (filePath) => ipcRenderer.invoke('open-in-finder', filePath),
  // Quitter l'application
  quitApp: () => ipcRenderer.invoke('quit-app'),
  // Gofile : upload et progression
  gofileUpload: (payload) => ipcRenderer.invoke('gofile-upload', payload),
  onGofileProgress: (callback) => {
    ipcRenderer.on('gofile-upload-progress', (_event, data) => {
      if (typeof callback === 'function') callback(data);
    });
  },
  // Copier dans le presse-papier
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  readChangelog: () => ipcRenderer.invoke('read-changelog'),
  mondayGetToken: () => ipcRenderer.invoke('monday-get-token'),
  mondaySaveToken: (token) => ipcRenderer.invoke('monday-save-token', token),
  mondayLoadProjects: (params) => ipcRenderer.invoke('monday-load-projects', params),
  mondayCreateSubitem: (params) => ipcRenderer.invoke('monday-create-subitem', params),
});


