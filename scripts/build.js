/**
 * EdgeOne Pages 构建脚本
 * 用于 GitHub 自动构建部署
 *
 * 构建流程：
 * 1. 安装前端依赖
 * 2. 构建前端（输出到 ../dist/）
 * 3. 将 cloud-functions 和 edgeone.json 复制到 dist/
 * 4. 最终 dist/ 即为 EdgeOne 部署产物
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

// Step 1: 安装前端依赖
console.log('\n=== Step 1: Installing frontend dependencies ===');
run('npm install --legacy-peer-deps', { cwd: FRONTEND });

// Step 2: 构建前端
console.log('\n=== Step 2: Building frontend ===');
run('npm run build', { cwd: FRONTEND });

// Step 3: 准备部署目录
console.log('\n=== Step 3: Preparing deploy directory ===');

// 确保 dist 存在
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

// 复制 edgeone.json
copyFileSync(join(ROOT, 'edgeone.json'), join(DIST, 'edgeone.json'));
console.log('[build] Copied edgeone.json');

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
