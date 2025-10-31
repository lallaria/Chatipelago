import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

// Polyfill for import.meta.url that works in CommonJS bundle
// In SEA: __filename = process.execPath, __dirname = dirname(process.execPath)
const polyfill = `
var import_meta_url = (function() {
  try {
    const { pathToFileURL } = require('url');
    const path = require('path');
    let sea;
    try { sea = require('node:sea'); } catch {}
    const filename = (sea && sea.isSea && sea.isSea()) ? process.execPath : __filename;
    return pathToFileURL(filename).href;
  } catch (e) {
    return 'file:///';
  }
})();
`;

build({
  entryPoints: [join(rootDir, 'app.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: join(rootDir, 'dist', 'app-bundle.js'),
  banner: { js: polyfill },
  define: {
    'import.meta.url': 'import_meta_url'
  }
}).catch(() => process.exit(1));

