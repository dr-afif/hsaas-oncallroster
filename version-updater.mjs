import fs from 'fs';
import path from 'path';

const FILES_TO_UPDATE_HTML = [
  'index.html',
  'contacts.html',
  'fileviewer.html',
  'login.html',
  'signup.html',
  'access-denied.html'
];

const CONFIG_TEMPLATE = 'app-config.template.js';
const CONFIG_FILE = 'app-config.js';
const SERVICE_WORKER = 'service-worker.js';
const README = 'README.md';

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (type === 'major') {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }
  return parts.join('.');
}

async function updateVersion() {
  const type = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node version-updater.mjs [major|minor|patch]');
    process.exit(1);
  }

  // 1. Read current version from template
  let templateContent = fs.readFileSync(CONFIG_TEMPLATE, 'utf8');
  const versionMatch = templateContent.match(/window\.APP_VERSION = "([^"]+)"/);
  if (!versionMatch) {
    console.error('Could not find version in app-config.template.js');
    process.exit(1);
  }

  const currentVersion = versionMatch[1];
  const newVersion = bumpVersion(currentVersion, type);
  console.log(`Bumping version: ${currentVersion} -> ${newVersion} (${type})`);

  // 2. Update app-config.template.js
  templateContent = templateContent.replace(
    /window\.APP_VERSION = "[^"]+"/,
    `window.APP_VERSION = "${newVersion}"`
  );
  fs.writeFileSync(CONFIG_TEMPLATE, templateContent);

  // 3. Update app-config.js (if it exists)
  if (fs.existsSync(CONFIG_FILE)) {
    let configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    configContent = configContent.replace(
      /window\.APP_VERSION = "[^"]+"/,
      `window.APP_VERSION = "${newVersion}"`
    );
    fs.writeFileSync(CONFIG_FILE, configContent);
  }

  // 4. Update service-worker.js
  let swContent = fs.readFileSync(SERVICE_WORKER, 'utf8');
  // Update CACHE_NAME version (roster-cache-vX -> vX+1)
  const cacheMatch = swContent.match(/const CACHE_NAME = "roster-cache-v(\d+)"/);
  if (cacheMatch) {
    const currentCacheVer = parseInt(cacheMatch[1]);
    const newCacheVer = currentCacheVer + 1;
    swContent = swContent.replace(
      /const CACHE_NAME = "roster-cache-v\d+"/,
      `const CACHE_NAME = "roster-cache-v${newCacheVer}"`
    );
    console.log(`Updated CACHE_NAME to: roster-cache-v${newCacheVer}`);
  }
  // Update SW comment
  swContent = swContent.replace(/\/\/ Bumped for v[^ ]+ updates/, `// Bumped for v${newVersion} updates`);
  fs.writeFileSync(SERVICE_WORKER, swContent);

  // 5. Update HTML files (query strings & version display)
  FILES_TO_UPDATE_HTML.forEach(file => {
    if (!fs.existsSync(file)) return;
    let htmlContent = fs.readFileSync(file, 'utf8');
    
    // Update query strings: .js?v=X or .css?v=X
    htmlContent = htmlContent.replace(/(\.js\?v=|\.css\?v=)[0-9.]+/g, `$1${newVersion}`);
    
    // Update hardcoded version display: <small id="app-version-display">Version X</small>
    htmlContent = htmlContent.replace(
      /(<small id="app-version-display">Version )[0-9.]+(<\/small>)/,
      `$1${newVersion}$2`
    );

    fs.writeFileSync(file, htmlContent);
    console.log(`Updated ${file}`);
  });

  // 6. Update README.md
  if (fs.existsSync(README)) {
    let readmeContent = fs.readFileSync(README, 'utf8');
    readmeContent = readmeContent.replace(
      /\*\*Version:\*\* [0-9.]+( \(Migration-Ready\))?/,
      `**Version:** ${newVersion}`
    );
    fs.writeFileSync(README, readmeContent);
    console.log(`Updated README.md`);
  }

  console.log('✅ Version update complete!');
}

updateVersion().catch(err => {
  console.error('Error during version update:', err);
  process.exit(1);
});
