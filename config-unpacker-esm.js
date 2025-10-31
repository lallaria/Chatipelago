/**
 * ES Module wrapper for config-unpacker
 * Re-exports from the ESM version for bundling compatibility
 */

export {
  getConfigDir,
  getCustomConfigPath,
  unpackConfig,
  isNexe,
  getSourceDir
} from './config-unpacker.mjs';

