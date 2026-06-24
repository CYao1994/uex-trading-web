#!/usr/bin/env node
/**
 * fetch-paratranz-cache.mjs
 * 从 ParaTranz 拉取所有翻译并缓存到本地
 * 运行方式: node scripts/fetch-paratranz-cache.mjs
 * 输出: frontend/public/data/paratranz-cache.json
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARATRANZ_TOKEN = process.env.PARATRANZ_TOKEN || '84147631b3b588cdcc23ecf36c8a8c8d';
const PROJECT_ID = 8340;
const API_BASE = `https://paratranz.cn/api/projects/${PROJECT_ID}/strings`;
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');

function fetchPage(page, retries = 3) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}?text=&page=${page}`;
    const req = https.get(url, {
      headers: { 'Authorization': `Bearer ${PARATRANZ_TOKEN}` },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          if (retries > 0) {
            setTimeout(() => fetchPage(page, retries - 1).then(resolve, reject), 1000);
          } else {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        }
      });
    });
    req.on('error', (err) => {
      if (retries > 0) {
        setTimeout(() => fetchPage(page, retries - 1).then(resolve, reject), 2000);
      } else {
        reject(err);
      }
    });
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function buildCache(allStrings) {
  const cache = {};
  const terminalCache = {};
  let skipped = 0;
  for (const item of allStrings) {
    const { key, original, translation } = item;
    if (!original || !translation) { skipped++; continue; }
    // Only keep entries with Chinese characters in translation
    if (!/[\u4e00-\u9fff]/.test(translation)) { skipped++; continue; }
    // Skip entries where translation equals original (no real translation)
    if (translation.trim() === original.trim()) { skipped++; continue; }
    // Normalize English name (lowercase, trimmed)
    const normalized = original.toLowerCase().trim();
    if (!normalized) { skipped++; continue; }
    
    // Use original (English name) as cache key, NOT key
    // All entries go to item cache (original English name → Chinese translation)
    if (!cache[normalized]) {
      cache[normalized] = [original, translation];
    }
  }
  return { cache, skipped };
}

async function main() {
  console.log('从 ParaTranz 拉取翻译数据...');
  
  // Fetch first 500 pages (25000 items) - enough for most matches
  const MAX_PAGES = 500;
  const BATCH_SIZE = 10;
  const allStrings = [];
  let page = 1;
  
  while (page <= MAX_PAGES) {
    const endPage = Math.min(page + BATCH_SIZE - 1, MAX_PAGES);
    const batch = [];
    for (let i = page; i <= endPage; i++) {
      batch.push(fetchPage(i));
    }
    const results = await Promise.all(batch);
    let batchCount = 0;
    for (const data of results) {
      const items = data.results || [];
      allStrings.push(...items);
      batchCount += items.length;
    }
    console.log(`  Pages ${page}-${endPage}: ${batchCount} items (total: ${allStrings.length})`);
    page = endPage + 1;
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`共获取 ${allStrings.length} 条记录`);
  
  const { cache, skipped } = buildCache(allStrings);
  console.log(`构建物品缓存: ${Object.keys(cache).length} 条有效翻译`);
  console.log(`Cache type: ${typeof cache}, keys: ${Object.keys(cache).slice(0, 3)}`);
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(cache));
  console.log(`已保存到 ${OUTPUT_PATH}`);
}

main().catch(console.error);
