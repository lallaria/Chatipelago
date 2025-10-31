import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

const outputExe = join(rootDir, 'chatipelago.exe');
const nodePath = process.execPath;
const blobPath = join(rootDir, 'sea-prep.blob');

if (!existsSync(blobPath)) {
  console.error(`Error: ${blobPath} not found. Run 'npm run build:sea' first.`);
  process.exit(1);
}

// Delete existing executable if it exists (may be locked if running)
if (existsSync(outputExe)) {
  try {
    unlinkSync(outputExe);
  } catch (error) {
    console.error(`Error: Cannot delete ${outputExe}. Please close any running instances and try again.`);
    process.exit(1);
  }
}

// Copy Node.js executable
console.log('Copying Node.js executable...');
copyFileSync(nodePath, outputExe);

// Remove signature (required on Windows)
try {
  console.log('Removing signature...');
  execSync(`signtool remove /s "${outputExe}"`, { stdio: 'inherit' });
} catch (error) {
  console.warn('signtool not available or signature removal failed, continuing...');
}

// Inject blob using postject
console.log('Injecting SEA blob...');
const postjectCmd = `npx postject "${outputExe}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

execSync(postjectCmd, { stdio: 'inherit', cwd: rootDir });

console.log(`\n✓ Single executable created: ${outputExe}`);

