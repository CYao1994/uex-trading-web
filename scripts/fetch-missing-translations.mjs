#!/usr/bin/env node
/**
 * fetch-missing-translations.mjs
 * 为未匹配到翻译的物品从 ParaTranz 搜索翻译
 * 输出: frontend/public/data/paratranz-cache.json (追加)
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARATRANZ_TOKEN = process.env.PARATRANZ_TOKEN || '84147631b3b588cdcc23ecf36c8a8c8d';
const PROJECT_ID = 8340;
const API_BASE = `https://paratranz.cn/api/projects/${PROJECT_ID}/strings`;
const CACHE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');
const CATALOG_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'items-catalog.json');

function searchParaTranz(query) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}?text=${encodeURIComponent(query)}&page=1`;
    const req = https.get(url, {
      headers: { 'Authorization': `Bearer ${PARATRANZ_TOKEN}` },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.results || []);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

async function main() {
  // Load current cache and catalog
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  
  // Find items without Chinese names
  const missingItems = [];
  for (const catId of Object.keys(catalog.items)) {
    for (const item of catalog.items[catId]) {
      if (!item.name_zh) {
        missingItems.push(item.name);
      }
    }
  }
  
  console.log(`Found ${missingItems.length} items without Chinese names`);
  console.log('Searching ParaTranz for translations...\n');
  
  let found = 0;
  let notFound = 0;
  
  for (const name of missingItems) {
    if (cache[name]) {
      found++;
      continue;
    }
    
    try {
      const results = await searchParaTranz(name);
      
      // Find best match by original field
      // Prefer entries where translation differs from original (real translation)
      // Also prefer _Name key entries (item names, not descriptions)
      let match = results.find(r => r.original && r.original.toLowerCase() === name.toLowerCase() && r.translation && r.translation.trim() !== r.original.trim());
      if (!match) {
        match = results.find(r => r.original && r.original.toLowerCase() === name.toLowerCase());
      }
      
      if (match && match.translation && /[\u4e00-\u9fff]/.test(match.translation) && match.translation.trim() !== match.original.trim()) {
        cache[name.toLowerCase()] = [match.original, match.translation];
        found++;
        console.log(`✓ ${name} -> ${match.translation}`);
      } else {
        notFound++;
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      notFound++;
    }
  }
  
  console.log(`\nResults: ${found} found, ${notFound} not found`);
  
  // Save updated cache
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  console.log(`Cache saved with ${Object.keys(cache).length} entries`);
}

main().catch(console.error);
