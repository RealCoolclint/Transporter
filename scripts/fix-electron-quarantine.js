#!/usr/bin/env node
// Retire la quarantaine macOS du bundle Electron (évite "Electron est endommagé")
if (process.platform !== 'darwin') process.exit(0);
const path = require('path');
const { execSync } = require('child_process');
const electronApp = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'Electron.app');
try {
  execSync(`xattr -cr "${electronApp}"`, { stdio: 'ignore' });
} catch (_) {}
