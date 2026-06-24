#!/usr/bin/env node
/**
 * sync-wiki-weapons.mjs - Sync weapon data from Star Citizen Wiki API
 *
 * Fetches WeaponGun, MissileLauncher, Turret, Bomb, Missile types.
 * Output: frontend/public/data/wiki-weapons.json
 *
 * Usage:
 *   node scripts/sync-wiki-weapons.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-weapons.json');
const DICT_PATH = path.join(__dirname, 'wiki-weapons-dictionaries.json');
const PARATRANZ_CACHE = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

const WEAPON_TYPES = ['WeaponGun', 'MissileLauncher', 'Turret', 'Bomb', 'Missile'];

let paratranzCache = {};

function loadParaTranzCache() {
  try {
    const raw = fs.readFileSync(PARATRANZ_CACHE, 'utf-8');
    paratranzCache = JSON.parse(raw);
    const count = Object.keys(paratranzCache).length;
    console.log('ParaTranz cache loaded: ' + count + ' entries');
  } catch (e) {
    console.warn('Warning: cannot load ParaTranz cache: ' + e.message);
  }
}

function matchFromParaTranz(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (paratranzCache[key]) {
    const entry = paratranzCache[key];
    const trans = entry[1];
    if (trans && /[\u4e00-\u9fff]/.test(trans) && trans !== entry[0]) {
      return trans;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractWeapon(raw, typeName) {
  const attrs = raw.attributes || raw;
  const images = attrs.images || [];
  const manufacturer = attrs.manufacturer || {};
  const shops = attrs.shops || [];
  const uexPrices = attrs.uex_prices || [];
  const vw = attrs.vehicle_weapon || {};
  const dmg = vw.damage || {};
  const ammo = vw.ammunition || {};
  const damages = vw.damages || {};

  const weapon = {
    slug: attrs.slug || '',
    name: attrs.name || '',
    type: typeName,
    size: attrs.size || null,
    grade: attrs.grade || '',
    class: attrs.class || '',
    manufacturer: {
      name: typeof manufacturer === 'string' ? manufacturer : (manufacturer.name || ''),
      code: typeof manufacturer === 'string' ? '' : (manufacturer.code || ''),
    },
    damage: {
      dps: dmg.dps || null,
      alpha: dmg.alpha_total || null,
      physical: damages.physical || null,
      energy: damages.energy || null,
      distortion: damages.distortion || null,
    },
    rpm: vw.rpm || null,
    speed: ammo.speed || null,
    range: ammo.range || null,
    image_url: (images[0] && images[0].thumbnail_url) || '',
    shops: shops,
    prices: uexPrices,
    name_zh: matchFromParaTranz(attrs.name || '') || '',
  };

  return weapon;
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  }
  return res.json();
}

async function fetchAllByType(typeName) {
  const items = [];
  const params = new URLSearchParams({
    'filter[type]': typeName,
    'page[size]': String(PAGE_SIZE),
  });
  let url = BASE_URL + '/items?' + params.toString();
  let pageNum = 0;

  while (url) {
    pageNum++;
    try {
      console.log('  [' + typeName + '] Fetching page ' + pageNum + '...');
      const res = await fetchPage(url);
      const pageData = res.data || [];
      items.push(...pageData);
      console.log('  [' + typeName + '] Page ' + pageNum + ': ' + pageData.length + ' (' + items.length + ' total)');
      url = res.links && res.links.next ? res.links.next : null;
      if (url) await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error('  [' + typeName + '] Error on page ' + pageNum + ': ' + err.message);
      url = null;
    }
  }

  return items;
}

async function main() {
  console.log('=== Star Citizen Wiki Weapon Sync ===');
  console.log('Types: ' + WEAPON_TYPES.join(', '));
  console.log('');

  loadParaTranzCache();

  const allWeapons = [];
  let totalFetched = 0;

  for (const typeName of WEAPON_TYPES) {
    console.log('\nFetching type: ' + typeName);
    const rawItems = await fetchAllByType(typeName);
    for (const raw of rawItems) {
      const weapon = extractWeapon(raw, typeName);
      if (weapon.slug) {
        allWeapons.push(weapon);
        totalFetched++;
      }
    }
    console.log('  [' + typeName + '] Done. ' + rawItems.length + ' raw, ' + totalFetched + ' total so far.');
    await sleep(RATE_LIMIT_MS);
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: 'https://api.star-citizen.wiki',
    total_weapons: allWeapons.length,
    types_synced: WEAPON_TYPES,
    weapons: allWeapons,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Output preview:');
    console.log('  Total weapons: ' + allWeapons.length);

    const typeCounts = {};
    for (const w of allWeapons) {
      typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    }
    for (const [t, c] of Object.entries(typeCounts)) {
      console.log('  ' + t + ': ' + c);
    }

    const sample = allWeapons[0];
    if (sample) {
      console.log('\n  Sample weapon (' + sample.name + '):');
      console.log('    type: ' + sample.type);
      console.log('    dps: ' + sample.damage.dps);
      console.log('    alpha: ' + sample.damage.alpha);
      console.log('    rpm: ' + sample.rpm);
      console.log('    range: ' + sample.range);
      console.log('    manufacturer: ' + sample.manufacturer.name);
    }
    console.log('\n[dry-run] No files written.');
  } else {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log('\nWritten: ' + OUTPUT_PATH);
  }

  generateDictionary(allWeapons);
}

function generateDictionary(weapons) {
  const manufacturers = {};
  const types = {};
  const grades = {};
  const classes = {};

  for (const w of weapons) {
    if (w.manufacturer.name && !manufacturers[w.manufacturer.name]) {
      manufacturers[w.manufacturer.name] = '';
    }
    if (w.type && !types[w.type]) {
      types[w.type] = '';
    }
    if (w.grade && !grades[w.grade]) {
      grades[w.grade] = '';
    }
    if (w.class && !classes[w.class]) {
      classes[w.class] = '';
    }
  }

  const dict = {
    _comment: 'Chinese translation dictionaries for wiki weapon data',
    manufacturers: manufacturers,
    types: types,
    grades: grades,
    classes: classes,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Dictionary preview:');
    console.log('  Manufacturers: ' + Object.keys(manufacturers).join(', '));
    console.log('  Types: ' + Object.keys(types).join(', '));
  } else {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
    console.log('Dictionary written: ' + DICT_PATH);
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
