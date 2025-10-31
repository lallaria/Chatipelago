import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

// Use .exe extension only on Windows
const outputExe = join(rootDir, process.platform === 'win32' ? 'chatipelago.exe' : 'chatipelago');
const nodePath = process.execPath;
const blobPath = join(rootDir, 'sea-prep.blob');

if (!fs.existsSync(blobPath)) {
  console.error(`Error: ${blobPath} not found. Run 'npm run build:sea' first.`);
  process.exit(1);
}

// Delete existing executable if it exists (may be locked if running)
if (fs.existsSync(outputExe)) {
  try {
    fs.unlinkSync(outputExe);
  } catch (error) {
    console.error(`Error: Cannot delete ${outputExe}. Please close any running instances and try again.`);
    process.exit(1);
  }
}

// Copy Node.js executable to temp file
console.log('Copying Node.js executable...');
fs.copyFileSync(nodePath, outputExe);

// Inject blob using postject
console.log('Injecting SEA blob...');
let postjectCmd = `npx postject "${outputExe}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

// macOS requires additional flag
if (process.platform === 'darwin') {
  postjectCmd += ' --macho-segment-name NODE_SEA';
}

execSync(postjectCmd, { stdio: 'inherit', cwd: rootDir });

console.log(`\n✓ Single executable created: ${outputExe}`);

// Explicitly exit to ensure process doesn't hang
process.exit(0);

