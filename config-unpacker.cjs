/**
 * Utility to handle unpacking and locating config files for nexe executables
 * Can be imported by ES modules
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Get the writable config directory for the current platform
 */
function getConfigDir() {
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
function isNexe() {
  return process.nexe !== undefined;
}

/**
 * Get the path to the source files (app directory in nexe)
 */
function getSourceDir() {
  if (isNexe()) {
    // In nexe, __dirname points to the application directory
    return __dirname;
  } else {
    // In development, use the actual project root
    return path.join(__dirname);
  }
}

/**
 * Unpack config files from the application bundle to the writable config directory
 */
function unpackConfig() {
  const configDir = getConfigDir();
  const sourceDir = getSourceDir();
  const sourceConfigPath = path.join(sourceDir, 'customConfig');

  // Check if source config exists
  if (!fs.existsSync(sourceConfigPath)) {
    console.warn(`Source config not found at ${sourceConfigPath}, skipping unpack`);
    return configDir;
  }

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created config directory: ${configDir}`);
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

  const destConfigPath = path.join(configDir, 'customConfig');
  
  // Only unpack if the destination doesn't exist or is empty
  if (!fs.existsSync(destConfigPath) || fs.readdirSync(destConfigPath).length === 0) {
    console.log(`Unpacking config files from ${sourceConfigPath} to ${destConfigPath}`);
    copyRecursiveSync(sourceConfigPath, destConfigPath);
    console.log('Config files unpacked successfully');
  } else {
    console.log(`Config directory already exists at ${destConfigPath}, skipping unpack`);
  }

  // Ensure messages directory exists
  const messagesDir = path.join(destConfigPath, 'messages');
  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
  }

  // Ensure tmp directory exists
  const tmpDir = path.join(destConfigPath, 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  return configDir;
}

/**
 * Get the path to customConfig directory (unpacked or source)
 */
function getCustomConfigPath() {
  if (isNexe()) {
    const configDir = unpackConfig();
    return path.join(configDir, 'customConfig');
  } else {
    // In development, use the source directory
    return path.join(getSourceDir(), 'customConfig');
  }
}

module.exports = {
  getConfigDir,
  getCustomConfigPath,
  unpackConfig,
  isNexe,
  getSourceDir
};

