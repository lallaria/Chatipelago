import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import rcedit from 'rcedit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

// Use .exe extension only on Windows
const outputExe = join(rootDir, process.platform === 'win32' ? 'chatipelago.exe' : 'chatipelago');
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

// Remove signature (required on Windows and macOS)
if (process.platform === 'win32') {
  // Try to find signtool.exe
  let signtoolPath = null;
  try {
    execSync('signtool /?', { stdio: 'pipe' });
    signtoolPath = 'signtool';
  } catch (error) {
    // Check common Windows SDK locations
    const kitPaths = [
      'C:\\Program Files (x86)\\Windows Kits\\10\\bin',
      'C:\\Program Files\\Windows Kits\\10\\bin'
    ];
    for (const kitPath of kitPaths) {
      if (existsSync(kitPath)) {
        try {
          const versions = readdirSync(kitPath).filter(v => /^\d/.test(v)).sort().reverse();
          for (const version of versions) {
            const archPaths = [
              join(kitPath, version, 'x64', 'signtool.exe'),
              join(kitPath, version, 'x86', 'signtool.exe')
            ];
            for (const archPath of archPaths) {
              if (existsSync(archPath)) {
                signtoolPath = archPath;
                break;
              }
            }
            if (signtoolPath) break;
          }
          if (signtoolPath) break;
        } catch (error) {
          // Continue searching
        }
      }
    }
  }

  if (signtoolPath) {
    try {
      execSync(`"${signtoolPath}" remove /s "${outputExe}"`, { stdio: 'pipe' });
    } catch (error) {
      // Signature removal failed, continue anyway
    }
  }
  // If signtool not found, silently continue - postject may still work
} else if (process.platform === 'darwin') {
  try {
    execSync(`codesign --remove-signature "${outputExe}"`, { stdio: 'pipe' });
  } catch (error) {
    // codesign not available, continue anyway
  }
}

// Inject blob using postject
console.log('Injecting SEA blob...');
let postjectCmd = `npx postject "${outputExe}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

// macOS requires additional flag
if (process.platform === 'darwin') {
  postjectCmd += ' --macho-segment-name NODE_SEA';
}

execSync(postjectCmd, { stdio: 'inherit', cwd: rootDir });

// Set icon on Windows
(async () => {
  if (process.platform === 'win32') {
    const iconPath = join(rootDir, 'chati.ico');
    if (existsSync(iconPath)) {
      console.log('Setting executable icon...');
      try {
        // Add timeout to prevent infinite hangs (30 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Icon setting timed out after 30 seconds')), 30000)
        );
        await Promise.race([
          rcedit(outputExe, { icon: iconPath }),
          timeoutPromise
        ]);
        console.log('Icon set successfully');
      } catch (error) {
        console.warn(`Warning: Failed to set icon: ${error.message}`);
      }
    } else {
      console.warn(`Warning: Icon file not found at ${iconPath}`);
    }
  }
  console.log(`\n✓ Single executable created: ${outputExe}`);
})();

