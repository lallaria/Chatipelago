/**
 * ES Module wrapper for config-unpacker
 * Allows ES modules to use the CommonJS unpacker
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const unpacker = require('./config-unpacker.js');

export const getConfigDir = unpacker.getConfigDir;
export const getCustomConfigPath = unpacker.getCustomConfigPath;
export const unpackConfig = unpacker.unpackConfig;
export const isPkg = unpacker.isPkg;
export const getSourceDir = unpacker.getSourceDir;

