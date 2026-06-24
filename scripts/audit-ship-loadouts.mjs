#!/usr/bin/env node
/**
 * audit-ship-loadouts.mjs - Add status field to ship-loadouts.json
 *
 * Cross-references ship-loadouts.json with ship-prices.json.
 * Rules:
 *   Ship slug not in ship-prices -> "legacy"
 *   Ship auec_price=0 -> "pledge_only"
 *   Everything else -> "active"
 *
 * Usage:
 *   node scripts/audit-ship-loadouts.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOADOUTS_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'ship-loadouts.json');
const PRICES_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'ship-prices.json');

const dryRun = process.argv.includes('--dry-run');

const loadouts = JSON.parse(fs.readFileSync(LOADOUTS_PATH, 'utf-8'));
const prices = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf-8'));

const slugToPrice = {};
for (const ship of Object.values(prices.ships)) {
  slugToPrice[ship.slug] = ship.auec_price;
}

const stats = { active: 0, legacy: 0, pledge_only: 0 };

for (const slug of Object.keys(loadouts)) {
  if (!(slug in slugToPrice)) {
    loadouts[slug].status = 'legacy';
    stats.legacy++;
  } else if (slugToPrice[slug] === 0) {
    loadouts[slug].status = 'pledge_only';
    stats.pledge_only++;
  } else {
    loadouts[slug].status = 'active';
    stats.active++;
  }
}

const total = stats.active + stats.legacy + stats.pledge_only;

console.log('ship-loadouts.json audit results:');
console.log(`  active:      ${stats.active}`);
console.log(`  legacy:      ${stats.legacy}`);
console.log(`  pledge_only: ${stats.pledge_only}`);
console.log(`  total:       ${total}`);

if (dryRun) {
  console.log('\n[dry-run] No files written.');
} else {
  fs.writeFileSync(LOADOUTS_PATH, JSON.stringify(loadouts), 'utf-8');
  console.log(`\nUpdated ${LOADOUTS_PATH}`);
}
