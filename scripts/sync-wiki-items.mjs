#!/usr/bin/env node
/**
 * sync-wiki-items.mjs - Sync vehicle component data from Star Citizen Wiki API
 *
 * Fetches components by type (Cooler, PowerPlant, Shield, etc.)
 * from https://api.star-citizen.wiki/api/items
 *
 * Output: frontend/public/data/wiki-items.json
 *
 * Usage:
 *   node scripts/sync-wiki-items.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-items.json');
const DICT_PATH = path.join(__dirname, 'wiki-items-dictionaries.json');
const PARATRANZ_CACHE = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

const ITEM_TYPES = [
  'Cooler',
  'PowerPlant',
  'Shield',
  'QuantumDrive',
  'Radar',
  'WeaponMining',
  'SalvageModifier',
  'FlightController',
  'ShieldController',
];

const WEAPON_TYPES = new Set(['WeaponGun', 'MissileLauncher', 'Turret', 'Bomb', 'Missile']);
const RESOURCE_TYPES = new Set(['Cooler', 'PowerPlant', 'Shield']);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function extractItem(item, typeName) {
  const attrs = item.attributes || item;
  const desc = attrs.description || {};
  const images = attrs.images || [];
  const manufacturer = attrs.manufacturer || {};
  const dim = attrs.dimension || {};
  const health = attrs.durability?.health || null;
  const shops = attrs.shops || [];
  const uexPrices = attrs.uex_prices || [];

  const result = {
    uuid: item.id || attrs.uuid || '',
    slug: attrs.slug || '',
    name: attrs.name || '',
    classification: attrs.classification || '',
    size: attrs.size || null,
    grade: attrs.grade || '',
    class: attrs.class || '',
    manufacturer: {
      name: typeof manufacturer === 'string' ? manufacturer : (manufacturer.name || ''),
      code: typeof manufacturer === 'string' ? '' : (manufacturer.code || ''),
    },
    description: desc.en_EN || desc.en || '',
    description_zh: desc.zh_CN || desc.zh || '',
    image_url: (images[0] && images[0].thumbnail_url) || '',
    type: typeName,
    sub_type: attrs.sub_type || '',
    dimension: dim,
    mass: attrs.mass || null,
    durability: { health: health },
    shops: shops,
    uex_prices: uexPrices,
    name_zh: matchFromParaTranz(attrs.name || '') || '',
  };

  if (WEAPON_TYPES.has(typeName)) {
    const vw = attrs.vehicle_weapon || {};
    const dmg = vw.damage || {};
    const ammo = vw.ammunition || {};
    result.weapon_stats = {
      dps: dmg.dps || null,
      alpha_total: dmg.alpha_total || null,
      rpm: vw.rpm || null,
      speed: ammo.speed || null,
      range: ammo.range || null,
      weapon_class: vw.class || '',
      damages: vw.damages || {},
    };
  }

  if (RESOURCE_TYPES.has(typeName)) {
    result.resource_network = attrs.resource_network || {};
  }

  return result;
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
      console.log('  [' + typeName + '] Page ' + pageNum + ': ' + pageData.length + ' items (' + items.length + ' total)');
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
  console.log('=== Star Citizen Wiki Item Sync ===');
  console.log('Types: ' + ITEM_TYPES.join(', '));
  console.log('');

  loadParaTranzCache();

  const allItems = {};
  let totalFetched = 0;

  for (const typeName of ITEM_TYPES) {
    console.log('\nFetching type: ' + typeName);
    const rawItems = await fetchAllByType(typeName);
    for (const raw of rawItems) {
      const item = extractItem(raw, typeName);
      if (item.slug) {
        allItems[item.slug] = item;
        totalFetched++;
      }
    }
    console.log('  [' + typeName + '] Done. ' + rawItems.length + ' raw, ' + totalFetched + ' total so far.');
    await sleep(RATE_LIMIT_MS);
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: 'https://api.star-citizen.wiki',
    version: '1.0',
    total_items: Object.keys(allItems).length,
    types_synced: ITEM_TYPES,
    items: allItems,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Output preview:');
    const slugs = Object.keys(allItems);
    console.log('  Total items: ' + slugs.length);

    const typeCounts = {};
    for (const item of Object.values(allItems)) {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }
    for (const [t, c] of Object.entries(typeCounts)) {
      console.log('  ' + t + ': ' + c);
    }

    const sample = allItems[slugs[0]];
    if (sample) {
      console.log('\n  Sample item (' + sample.name + '):');
      console.log('    type: ' + sample.type);
      console.log('    size: ' + sample.size);
      console.log('    manufacturer: ' + sample.manufacturer.name);
      console.log('    shops: ' + sample.shops.length);
    }
    console.log('\n[dry-run] No files written.');
  } else {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log('\nWritten: ' + OUTPUT_PATH);
  }

  generateDictionary(allItems);
}

function generateDictionary(allItems) {
  const manufacturers = {};
  const types = {};
  const classifications = {};
  const grades = {};
  const classes = {};

  for (const item of Object.values(allItems)) {
    if (item.manufacturer.name && !manufacturers[item.manufacturer.name]) {
      manufacturers[item.manufacturer.name] = '';
    }
    if (item.type && !types[item.type]) {
      types[item.type] = '';
    }
    if (item.classification && !classifications[item.classification]) {
      classifications[item.classification] = '';
    }
    if (item.grade && !grades[item.grade]) {
      grades[item.grade] = '';
    }
    if (item.class && !classes[item.class]) {
      classes[item.class] = '';
    }
  }

  const dict = {
    _comment: 'Chinese translation dictionaries for wiki item data',
    manufacturers: manufacturers,
    types: types,
    classifications: classifications,
    grades: grades,
    classes: classes,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Dictionary preview:');
    console.log('  Manufacturers: ' + Object.keys(manufacturers).join(', '));
    console.log('  Types: ' + Object.keys(types).join(', '));
    console.log('  Classifications: ' + Object.keys(classifications).join(', '));
  } else {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
    console.log('Dictionary written: ' + DICT_PATH);
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
