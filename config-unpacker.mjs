/**
 * Utility to handle unpacking and locating config files
 * ESM version for bundling
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the writable config directory for the current platform
 */
export function getConfigDir() {
  const platform = process.platform;
  let configDir;

  if (platform === 'win32') {
    // Windows: %APPDATA%\Chatipelago
    configDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Chatipelago');
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/Chatipelago
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Chatipelago');
  } else {
    // Linux and others: ~/.config/chatipelago
    configDir = path.join(os.homedir(), '.config', 'chatipelago');
  }

  return configDir;
}

/**
 * Check if we're running from a nexe executable
 */
export function isNexe() {
  return process.nexe !== undefined;
}

/**
 * Check if we're running in a Single Executable Application
 */
export function isSea() {
  try {
    // In bundled CJS, require is available; in ESM use dynamic import
    let sea;
    if (typeof require !== 'undefined') {
      sea = require('node:sea');
    } else {
      // This would need to be async, but for now just check process
      return false;
    }
    return sea && sea.isSea && sea.isSea();
  } catch {
    return false;
  }
}

/**
 * Get the path to the source files
 * In SEA: uses process.execPath
 * In nexe: uses __dirname from nexe
 * In development: uses actual project root
 */
export function getSourceDir() {
  if (isSea()) {
    // In SEA, __dirname = dirname(process.execPath)
    return path.dirname(process.execPath);
  } else if (isNexe()) {
    // In nexe, __dirname points to the application directory
    return __dirname;
  } else {
    // In development, use the actual project root (parent of this file's dir)
    return path.dirname(__dirname);
  }
}

/**
 * Unpack config files from the application bundle to the writable config directory
 */
export function unpackConfig() {
  const configDir = getConfigDir();
  const destConfigPath = path.join(configDir, 'customConfig');

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created config directory: ${configDir}`);
  }

  // Only unpack if the destination doesn't exist or is empty
  const needsUnpack = !fs.existsSync(destConfigPath) || 
                     (fs.existsSync(destConfigPath) && fs.readdirSync(destConfigPath).length === 0);

  if (!needsUnpack) {
    console.log(`Config directory already exists at ${destConfigPath}, skipping unpack`);
    // Still ensure directories exist
    const messagesDir = path.join(destConfigPath, 'messages');
    const tmpDir = path.join(destConfigPath, 'tmp');
    if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    return configDir;
  }

  if (isSea()) {
    // Extract from SEA assets
    try {
      const sea = require('node:sea');
      if (sea && sea.getAssetKeys) {
        const assetKeys = sea.getAssetKeys();
        console.log(`Unpacking ${assetKeys.length} config files from SEA bundle to ${destConfigPath}`);
        
        // Create destination directory
        if (!fs.existsSync(destConfigPath)) {
          fs.mkdirSync(destConfigPath, { recursive: true });
        }

        // Extract each asset
        for (const key of assetKeys) {
          try {
            const assetData = sea.getAsset(key, 'utf8');
            const destFilePath = path.join(destConfigPath, key);
            const destDir = path.dirname(destFilePath);
            
            // Ensure parent directory exists
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            fs.writeFileSync(destFilePath, assetData, 'utf8');
          } catch (error) {
            console.warn(`Failed to extract asset ${key}:`, error.message);
          }
        }
        console.log('Config files unpacked successfully from SEA bundle');
      } else {
        console.warn('SEA API not fully available, falling back to file-based unpack');
        return unpackConfigFromFiles(configDir);
      }
    } catch (error) {
      console.warn('Failed to extract from SEA assets:', error.message);
      return unpackConfigFromFiles(configDir);
    }
  } else if (isNexe()) {
    // Extract from file system (nexe)
    return unpackConfigFromFiles(configDir);
  } else {
    // Development mode - no unpacking needed
    console.log('Running in development mode, using source config directory');
  }

  // Ensure required directories exist
  const messagesDir = path.join(destConfigPath, 'messages');
  const tmpDir = path.join(destConfigPath, 'tmp');
  if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  return configDir;
}

/**
 * Unpack config from file system (for nexe or fallback)
 */
function unpackConfigFromFiles(configDir) {
  const sourceDir = getSourceDir();
  const sourceConfigPath = path.join(sourceDir, 'customConfig');
  const destConfigPath = path.join(configDir, 'customConfig');

  if (!fs.existsSync(sourceConfigPath)) {
    console.warn(`Source config not found at ${sourceConfigPath}, skipping unpack`);
    return configDir;
  }

  // Copy customConfig directory recursively
  function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  console.log(`Unpacking config files from ${sourceConfigPath} to ${destConfigPath}`);
  copyRecursiveSync(sourceConfigPath, destConfigPath);
  console.log('Config files unpacked successfully');
  
  return configDir;
}

/**
 * Get the path to customConfig directory (unpacked or source)
 */
export function getCustomConfigPath() {
  if (isSea() || isNexe()) {
    const configDir = unpackConfig();
    return path.join(configDir, 'customConfig');
  } else {
    // In development, use the source directory
    return path.join(getSourceDir(), 'customConfig');
  }
}

