/**
 * EdgeOne Pages 构建脚本
 * 从 GitHub 仓库构建并准备部署文件
 *
 * 构建流程：
 * 1. 更新物品目录
 * 2. 安装依赖
 * 3. 构建前端（输出到 ../dist/）
 * 4. 复制 cloud-functions 和 edgeone.json 到 dist/
 * 5. 将 dist/ 目录提交给 EdgeOne 部署
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

// Step 1: 更新物品目录（从 UEX API 拉取最新数据）
console.log('\n=== Step 1: Updating items catalog ===');
try {
  run('node scripts/update-items-catalog.mjs', { cwd: ROOT, timeout: 180000 });
} catch (e) {
  console.warn('[build] WARNING: Items catalog update failed, using existing catalog');
  console.warn('[build] This is OK for routine builds - catalog only needs updating when game data changes');
}

// Step 2: 安装依赖
console.log('\n=== Step 2: Installing frontend dependencies ===');
run('npm install --legacy-peer-deps', { cwd: FRONTEND });

// Step 3: 构建前端
console.log('\n=== Step 3: Building frontend ===');
run('npm run build', { cwd: FRONTEND });

// Step 4: 准备部署目录
console.log('\n=== Step 4: Preparing deploy directory ===');

// 确认 dist 目录存在
if (!existsSync(DIST)) {
  console.error('[build] ERROR: dist/ directory not found after frontend build!');
  process.exit(1);
}

// 复制 cloud-functions
const cfSource = join(ROOT, 'cloud-functions');
const cfTarget = join(DIST, 'cloud-functions');
if (existsSync(cfTarget)) rmSync(cfTarget, { recursive: true });
cpSync(cfSource, cfTarget, { recursive: true });
console.log('[build] Copied cloud-functions/');

// 复制 edge-functions（不复制到 dist - EdgeOne 从项目根目录的 edge-functions/ 目录单独构建）
// 注意：不要把 edge-functions/ 复制到 dist/，会导致 "meta file missing" 错误

// 复制 edgeone.json
copyFileSync(join(ROOT, 'edgeone.json'), join(DIST, 'edgeone.json'));
console.log('[build] Copied edgeone.json');

// 复制 root package.json（EdgeOne Pages Functions 部署需要）
copyFileSync(join(ROOT, 'package.json'), join(DIST, 'package.json'));
console.log('[build] Copied package.json');

// 验证
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
