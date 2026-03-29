const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_PATH = path.join(
  os.homedir(),
  'Library', 'Application Support',
  'tranquility-suite', 'session.json'
);
const SESSION_MAX_AGE_HOURS_DEFAULT = 8;

async function readLauncherSession() {
  try {
    if (!fs.existsSync(SESSION_PATH)) {
      return { connected: false, reason: 'no_file' };
    }
    const raw = fs.readFileSync(SESSION_PATH, 'utf-8');
    const session = JSON.parse(raw);
    const maxAgeHours = session.expiresAfterHours ?? SESSION_MAX_AGE_HOURS_DEFAULT;
    const writtenAt = new Date(session.writtenAt);
    const ageHours = (Date.now() - writtenAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > maxAgeHours) {
      return { connected: false, reason: 'expired' };
    }
    return {
      connected: true,
      profileId: session.profile?.id,
      profileName: session.profile?.name,
      profileRole: session.profile?.role || 'user',
      profileAvatar: session.profile?.avatar || null,
      launcherVersion: session.launcherVersion,
      apiKeys: session.apiKeys || {}
    };
  } catch (e) {
    return { connected: false, reason: 'read_error' };
  }
}

module.exports = { readLauncherSession };
