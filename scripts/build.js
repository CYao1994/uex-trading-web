/**
 * EdgeOne Pages ????
 * ?? GitHub ??????
 *
 * ????:
 * 1. ??????
 * 2. ????(??? ../dist/)
 * 3. ? cloud-functions ? edgeone.json ??? dist/
 * 4. ?? dist/ ?? EdgeOne ????
 */

import { execSync } from 'child_process';
import { cpSync, copyFileSync, existsSync, rmSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const FRONTEND = join(ROOT, 'frontend');
const DIST = join(ROOT, 'dist');

function run(cmd, opts = {}) {
  console.log(`[build] > ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// Step 1: ??????(? UEX API ???????)
console.log('\n=== Step 1: Updating items catalog ===');
try {
  run('node scripts/update-items-catalog.mjs', { cwd: ROOT, timeout: 180000 });
} catch (e) {
  console.warn('[build] WARNING: Items catalog update failed, using existing catalog');
  console.warn('[build] This is OK for routine builds - catalog only needs updating when game data changes');
}

// Step 2: ??????
console.log('\n=== Step 2: Installing frontend dependencies ===');
run('npm install --legacy-peer-deps', { cwd: FRONTEND });

// Step 3: ????
console.log('\n=== Step 3: Building frontend ===');
run('npm run build', { cwd: FRONTEND });

// Step 4: ??????
console.log('\n=== Step 4: Preparing deploy directory ===');

// ?? dist ??
if (!existsSync(DIST)) {
  console.error('[build] ERROR: dist/ directory not found after frontend build!');
  process.exit(1);
}

// ?? cloud-functions
const cfSource = join(ROOT, 'cloud-functions');
const cfTarget = join(DIST, 'cloud-functions');
if (existsSync(cfTarget)) rmSync(cfTarget, { recursive: true });
cpSync(cfSource, cfTarget, { recursive: true });
console.log('[build] Copied cloud-functions/');

// ?? edgeone.json
copyFileSync(join(ROOT, 'edgeone.json'), join(DIST, 'edgeone.json'));
console.log('[build] Copied edgeone.json');

// ?? root package.json (required for EdgeOne Pages Functions deployment)
copyFileSync(join(ROOT, 'package.json'), join(DIST, 'package.json'));
console.log('[build] Copied package.json');

// ??
const indexHtml = join(DIST, 'index.html');
if (!existsSync(indexHtml)) {
  console.error('[build] ERROR: index.html not found in dist/!');
  process.exit(1);
}
if (!existsSync(cfTarget)) {
  console.error('[build] ERROR: cloud-functions/ not found in dist/!');
  process.exit(1);
}

console.log('\n=== Build complete! ===');
console.log('[build] Output directory: dist/');
console.log('[build] Structure:');
run(`ls -la ${DIST}`);
