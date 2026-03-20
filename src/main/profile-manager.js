const path = require('path');
const fsExtra = require('fs-extra');
const os = require('os');

const PROFILES_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'TransPorter');
const PROFILES_FILE = path.join(PROFILES_DIR, 'profiles.json');

/**
 * Charge tous les profils depuis le fichier de stockage.
 * @returns {Promise<Array>} Liste des profils
 */
async function loadProfiles() {
  try {
    await fsExtra.ensureDir(PROFILES_DIR);
    console.log('[profile-manager] Dossier vérifié:', PROFILES_DIR);
    if (!(await fsExtra.pathExists(PROFILES_FILE))) {
      console.log('[profile-manager] Fichier de profils inexistant, création du profil invité');
      // Créer le profil invité par défaut
      const guestProfile = {
        id: 'profile_guest',
        name: 'Invité',
        firstName: '',
        email: '',
        defaultOrgMode: 'type',
        favoriteDestination: null,
        photoPath: null,
        color1: '#2563eb',
        color2: '#0f172a',
        color3: '#ffffff',
        initialsSuffix: '',
        isGuest: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveProfiles([guestProfile]);
      return [guestProfile];
    }
    const data = await fsExtra.readJson(PROFILES_FILE);
    let profiles = Array.isArray(data.profiles) ? data.profiles : [];
    
    // Vérifier si le profil invité existe, sinon le créer
    const hasGuest = profiles.some(p => p.id === 'profile_guest' || p.isGuest);
    if (!hasGuest) {
      const guestProfile = {
        id: 'profile_guest',
        name: 'Invité',
        firstName: '',
        email: '',
        defaultOrgMode: 'type',
        favoriteDestination: null,
        photoPath: null,
        color1: '#2563eb',
        color2: '#0f172a',
        color3: '#ffffff',
        initialsSuffix: '',
        isGuest: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      profiles.unshift(guestProfile); // Ajouter en premier
      await saveProfiles(profiles);
    }
    
    console.log('[profile-manager] Profils chargés:', profiles.length);
    return profiles;
  } catch (error) {
    console.error('[profile-manager] Erreur lors du chargement des profils:', error.message);
    console.error('[profile-manager] Stack:', error.stack);
    return [];
  }
}

/**
 * Sauvegarde tous les profils dans le fichier de stockage.
 * @param {Array} profiles Liste des profils
 * @returns {Promise<void>}
 */
async function saveProfiles(profiles) {
  try {
    await fsExtra.ensureDir(PROFILES_DIR);
    console.log('[profile-manager] Dossier créé/vérifié:', PROFILES_DIR);
    await fsExtra.writeJson(PROFILES_FILE, { profiles }, { spaces: 2 });
    console.log('[profile-manager] Profils sauvegardés avec succès:', profiles.length);
  } catch (error) {
    console.error('[profile-manager] Erreur lors de la sauvegarde des profils:', error.message);
    console.error('[profile-manager] Stack:', error.stack);
    throw error;
  }
}

/**
 * Crée un nouveau profil.
 * @param {Object} profileData Données du profil (nom, prénom, email, etc.)
 * @returns {Promise<Object>} Profil créé avec ID
 */
async function createProfile(profileData) {
  try {
    console.log('[profile-manager] Création d\'un nouveau profil:', profileData);
    const profiles = await loadProfiles();
    const newProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: profileData.name || '',
      firstName: profileData.firstName || '',
      email: profileData.email || '',
      defaultOrgMode: profileData.defaultOrgMode || 'type',
      favoriteDestination: profileData.favoriteDestination || null,
      photoPath: profileData.photoPath || null,
      color1: profileData.color1 || '#2563eb',
      color2: profileData.color2 || '#0f172a',
      color3: profileData.color3 || '#ffffff',
      initialsSuffix: profileData.initialsSuffix || '',
      isGuest: profileData.isGuest || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profiles.push(newProfile);
    await saveProfiles(profiles);
    console.log('[profile-manager] Profil créé avec succès:', newProfile.id);
    return newProfile;
  } catch (error) {
    console.error('[profile-manager] Erreur dans createProfile:', error.message);
    throw error;
  }
}

/**
 * Met à jour un profil existant.
 * @param {string} profileId ID du profil
 * @param {Object} updates Données à mettre à jour
 * @returns {Promise<Object>} Profil mis à jour
 */
async function updateProfile(profileId, updates) {
  try {
    console.log('[profile-manager] Mise à jour du profil:', profileId, updates);
    const profiles = await loadProfiles();
    const index = profiles.findIndex((p) => p.id === profileId);
    if (index === -1) {
      throw new Error(`Profil introuvable: ${profileId}`);
    }
    // Empêcher la modification du profil invité
    if (profiles[index].isGuest || profileId === 'profile_guest') {
      throw new Error('Le profil invité ne peut pas être modifié');
    }
    profiles[index] = {
      ...profiles[index],
      ...updates,
      // Ne pas permettre de changer isGuest
      isGuest: profiles[index].isGuest,
      updatedAt: new Date().toISOString(),
    };
    await saveProfiles(profiles);
    console.log('[profile-manager] Profil mis à jour avec succès:', profileId);
    return profiles[index];
  } catch (error) {
    console.error('[profile-manager] Erreur dans updateProfile:', error.message);
    throw error;
  }
}

/**
 * Supprime un profil.
 * @param {string} profileId ID du profil
 * @returns {Promise<void>}
 */
async function deleteProfile(profileId) {
  const profiles = await loadProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) {
    throw new Error(`Profil introuvable: ${profileId}`);
  }
  // Empêcher la suppression du profil invité
  if (profile.isGuest || profileId === 'profile_guest') {
    throw new Error('Le profil invité ne peut pas être supprimé');
  }
  const filtered = profiles.filter((p) => p.id !== profileId);
  await saveProfiles(filtered);
}

/**
 * Récupère un profil par son ID.
 * @param {string} profileId ID du profil
 * @returns {Promise<Object|null>} Profil ou null
 */
async function getProfile(profileId) {
  const profiles = await loadProfiles();
  return profiles.find((p) => p.id === profileId) || null;
}

module.exports = {
  loadProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getProfile,
};

