const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const sharedDir = path.join(__dirname, 'shared');
const chromeDir = path.join(__dirname, 'chrome');
const firefoxDir = path.join(__dirname, 'firefox');

console.log('Syncing shared/ -> chrome/ and firefox/ ...');
copyDirRecursive(sharedDir, chromeDir);
copyDirRecursive(sharedDir, firefoxDir);
console.log('==== Sync Done ====');
