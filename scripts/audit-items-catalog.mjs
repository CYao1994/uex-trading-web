#!/usr/bin/env node
/**
 * audit-items-catalog.mjs - Add status field to items-catalog.json
 *
 * Rules:
 *   Category's is_game_related === 0 -> "non_game"
 *   can_buy=false AND best_price_buy=0 -> "unavailable"
 *   Everything else -> "active"
 *
 * Usage:
 *   node scripts/audit-items-catalog.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'items-catalog.json');

const dryRun = process.argv.includes('--dry-run');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

const catMap = {};
for (const c of data.categories) {
  catMap[c.id] = c;
}

const stats = { active: 0, unavailable: 0, non_game: 0 };

for (const catId of Object.keys(data.items)) {
  const cat = catMap[catId];
  const isGameRelated = cat ? cat.is_game_related === 1 : true;
  for (const item of data.items[catId]) {
    if (!isGameRelated) {
      item.status = 'non_game';
      stats.non_game++;
    } else if (item.can_buy === false && item.best_price_buy === 0) {
      item.status = 'unavailable';
      stats.unavailable++;
    } else {
      item.status = 'active';
      stats.active++;
    }
  }
}

const total = stats.active + stats.unavailable + stats.non_game;

console.log('items-catalog.json audit results:');
console.log(`  active:     ${stats.active}`);
console.log(`  unavailable: ${stats.unavailable}`);
console.log(`  non_game:   ${stats.non_game}`);
console.log(`  total:      ${total}`);

if (dryRun) {
  console.log('\n[dry-run] No files written.');
} else {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data), 'utf-8');
  console.log(`\nUpdated ${DATA_PATH}`);
}
