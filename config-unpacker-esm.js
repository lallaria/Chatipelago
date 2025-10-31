/**
 * ES Module wrapper for config-unpacker
 * Allows ES modules to use the CommonJS unpacker
 */

import { createRequire } from 'module';

// In bundled CommonJS, require is available directly
// In normal ESM, use createRequire
let unpacker;
if (typeof require !== 'undefined' && typeof require.resolve === 'function') {
  // Bundled CommonJS environment
  unpacker = require('./config-unpacker.cjs');
} else {
  // Normal ESM environment
  const requireFn = createRequire(import.meta.url);
  unpacker = requireFn('./config-unpacker.cjs');
}

export const getConfigDir = unpacker.getConfigDir;
export const getCustomConfigPath = unpacker.getCustomConfigPath;
export const unpackConfig = unpacker.unpackConfig;
export const isNexe = unpacker.isNexe;
export const getSourceDir = unpacker.getSourceDir;

