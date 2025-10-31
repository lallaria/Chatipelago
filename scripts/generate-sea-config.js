import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

/**
 * Recursively collect all files in a directory
 */
function collectFiles(dir, baseDir = dir, fileMap = {}) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip tmp directory as it's runtime-only
      if (entry !== 'tmp') {
        collectFiles(fullPath, baseDir, fileMap);
      }
    } else if (stat.isFile()) {
      // Asset key is the path relative to customConfig (e.g., "config.json", "messages/bounce.json")
      const assetKey = relative(customConfigDir, fullPath).replace(/\\/g, '/');
      // Asset value is the path relative to project root (e.g., "customConfig/config.json")
      const assetPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      fileMap[assetKey] = assetPath;
    }
  }
  
  return fileMap;
}

// Collect all files from customConfig
const customConfigDir = join(rootDir, 'customConfig');
const assets = collectFiles(customConfigDir, customConfigDir);

// Generate sea-config.json
const seaConfig = {
  main: 'dist/app-bundle.js',
  output: 'sea-prep.blob',
  assets: assets
};

const configPath = join(rootDir, 'sea-config.json');
const configContent = JSON.stringify(seaConfig, null, 2);

console.log('Generated sea-config.json with', Object.keys(assets).length, 'assets');
console.log('Assets:', Object.keys(assets).join(', '));

// Write config
import { writeFileSync } from 'fs';
writeFileSync(configPath, configContent, 'utf8');

