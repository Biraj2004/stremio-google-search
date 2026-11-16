const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Sync shared files into chrome/ and firefox/
require('./sync.js');

const extensionsDir = path.join(__dirname, 'extensions');
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

const chromeManifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'chrome/manifest.json'), 'utf8'));
const version = chromeManifest.version || '2.0.0';

const tempStaging = path.join(__dirname, '.build_temp');
if (fs.existsSync(tempStaging)) {
  fs.rmSync(tempStaging, { recursive: true, force: true });
}
fs.mkdirSync(tempStaging, { recursive: true });

function createZipWithRootFolder(sourceDir, archiveBaseName) {
  const stagedFolder = path.join(tempStaging, archiveBaseName);
  fs.mkdirSync(stagedFolder, { recursive: true });
  fs.cpSync(sourceDir, stagedFolder, { recursive: true });

  const zipPath = path.join(extensionsDir, `${archiveBaseName}.zip`);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync(`tar -a -c -f "${zipPath}" -C "${tempStaging}" "${archiveBaseName}"`);
  console.log(`Created: extensions/${archiveBaseName}.zip (containing folder '${archiveBaseName}/')`);
}

console.log('Building extension packages for extensions/ folder...');

// Build the two variation zips (Chrome and Firefox) with matching root folders
createZipWithRootFolder(path.join(__dirname, 'chrome'), `stremio-google-search-chrome-v${version}`);
createZipWithRootFolder(path.join(__dirname, 'firefox'), `stremio-google-search-firefox-v${version}`);

// Clean up temporary staging
fs.rmSync(tempStaging, { recursive: true, force: true });

console.log('==== Build Complete: All variations ready in extensions/ ====');
