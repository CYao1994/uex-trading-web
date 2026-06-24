#!/usr/bin/env node
/**
 * audit-ammo-params.mjs - Add status field to ammo-params.json
 *
 * Rules:
 *   total_damage=0 -> "utility"
 *   Ship/NPC turret/mounted/PDC weapon -> "npc_only"
 *   Test/dummy/toy names -> "test"
 *   FPS weapon names -> "fps"
 *   Everything else -> "active"
 *
 * Usage:
 *   node scripts/audit-ammo-params.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'ammo-params.json');

const dryRun = process.argv.includes('--dry-run');

const NPC_WEAPON_RE = /_turret_|_mounted_|_pdc_|bengal_|idris|javelin/;
const TEST_WEAPON_RE = /dummy|_toy|^toy_/;
const FPS_WEAPON_RE = /_fps/;

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

const stats = { active: 0, utility: 0, npc_only: 0, test: 0, fps: 0 };

for (const ammo of data.ammo) {
  if (ammo.total_damage === 0) {
    ammo.status = 'utility';
    stats.utility++;
  } else if (NPC_WEAPON_RE.test(ammo.weapon_name)) {
    ammo.status = 'npc_only';
    stats.npc_only++;
  } else if (TEST_WEAPON_RE.test(ammo.weapon_name)) {
    ammo.status = 'test';
    stats.test++;
  } else if (FPS_WEAPON_RE.test(ammo.weapon_name)) {
    ammo.status = 'fps';
    stats.fps++;
  } else {
    ammo.status = 'active';
    stats.active++;
  }
}

const total = stats.active + stats.utility + stats.npc_only + stats.test + stats.fps;

console.log('ammo-params.json audit results:');
console.log(`  active:   ${stats.active}`);
console.log(`  utility:  ${stats.utility}`);
console.log(`  npc_only: ${stats.npc_only}`);
console.log(`  test:     ${stats.test}`);
console.log(`  fps:      ${stats.fps}`);
console.log(`  total:    ${total}`);

if (dryRun) {
  console.log('\n[dry-run] No files written.');
} else {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data), 'utf-8');
  console.log(`\nUpdated ${DATA_PATH}`);
}
