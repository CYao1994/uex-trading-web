#!/usr/bin/env node
/**
 * cross-validate-wiki.mjs - Cross-validate synced data against Wiki API
 *
 * Compares wiki-weapons.json and wiki-items.json against Wiki API
 * to find discrepancies.
 *
 * Usage:
 *   node scripts/cross-validate-wiki.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEAPONS_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-weapons.json');
const ITEMS_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-items.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

const WEAPON_TYPES = ['WeaponGun', 'MissileLauncher', 'Turret', 'Bomb', 'Missile'];
const ITEM_TYPES = ['Cooler', 'PowerPlant', 'Shield', 'QuantumDrive', 'Radar', 'WeaponMining', 'SalvageModifier', 'FlightController', 'ShieldController'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      const res = await fetchPage(url);
      const pageData = res.data || [];
      items.push(...pageData);
      url = res.links && res.links.next ? res.links.next : null;
      if (url) await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error('  [' + typeName + '] Error on page ' + pageNum + ': ' + err.message);
      url = null;
    }
  }

  return items;
}

function loadSyncedData(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading ' + filePath + ': ' + e.message);
    return null;
  }
}

async function crossValidateWeapons() {
  console.log('\n=== Cross-validating weapons ===\n');
  
  const synced = loadSyncedData(WEAPONS_PATH);
  if (!synced) return { inWikiOnly: [], inDataOnly: [], total: 0 };
  
  const syncedSlugs = new Set(synced.weapons.map(w => w.slug));
  const wikiSlugs = new Set();
  
  for (const typeName of WEAPON_TYPES) {
    console.log('Fetching wiki data for: ' + typeName);
    const wikiItems = await fetchAllByType(typeName);
    for (const item of wikiItems) {
      const attrs = item.attributes || item;
      if (attrs.slug) {
        wikiSlugs.add(attrs.slug);
      }
    }
    await sleep(RATE_LIMIT_MS);
  }
  
  const inWikiOnly = [];
  const inDataOnly = [];
  
  for (const slug of wikiSlugs) {
    if (!syncedSlugs.has(slug)) {
      inWikiOnly.push(slug);
    }
  }
  
  for (const slug of syncedSlugs) {
    if (!wikiSlugs.has(slug)) {
      inDataOnly.push(slug);
    }
  }
  
  console.log('\nWeapons summary:');
  console.log('  Synced in local data: ' + syncedSlugs.size);
  console.log('  In Wiki API: ' + wikiSlugs.size);
  console.log('  In Wiki but not in our data: ' + inWikiOnly.length);
  console.log('  In our data but not in Wiki: ' + inDataOnly.length);
  
  if (inWikiOnly.length > 0) {
    console.log('\nItems in Wiki but NOT in our data:');
    for (const slug of inWikiOnly.slice(0, 20)) {
      console.log('  - ' + slug);
    }
    if (inWikiOnly.length > 20) {
      console.log('  ... and ' + (inWikiOnly.length - 20) + ' more');
    }
  }
  
  if (inDataOnly.length > 0) {
    console.log('\nItems in our data but NOT in Wiki (possible removals):');
    for (const slug of inDataOnly.slice(0, 20)) {
      console.log('  - ' + slug);
    }
    if (inDataOnly.length > 20) {
      console.log('  ... and ' + (inDataOnly.length - 20) + ' more');
    }
  }
  
  return { inWikiOnly, inDataOnly, total: syncedSlugs.size };
}

async function crossValidateItems() {
  console.log('\n=== Cross-validating items ===\n');
  
  const synced = loadSyncedData(ITEMS_PATH);
  if (!synced) return { inWikiOnly: [], inDataOnly: [], total: 0 };
  
  const syncedSlugs = new Set(Object.keys(synced.items));
  const wikiSlugs = new Set();
  
  for (const typeName of ITEM_TYPES) {
    console.log('Fetching wiki data for: ' + typeName);
    const wikiItems = await fetchAllByType(typeName);
    for (const item of wikiItems) {
      const attrs = item.attributes || item;
      if (attrs.slug) {
        wikiSlugs.add(attrs.slug);
      }
    }
    await sleep(RATE_LIMIT_MS);
  }
  
  const inWikiOnly = [];
  const inDataOnly = [];
  
  for (const slug of wikiSlugs) {
    if (!syncedSlugs.has(slug)) {
      inWikiOnly.push(slug);
    }
  }
  
  for (const slug of syncedSlugs) {
    if (!wikiSlugs.has(slug)) {
      inDataOnly.push(slug);
    }
  }
  
  console.log('\nItems summary:');
  console.log('  Synced in local data: ' + syncedSlugs.size);
  console.log('  In Wiki API: ' + wikiSlugs.size);
  console.log('  In Wiki but not in our data: ' + inWikiOnly.length);
  console.log('  In our data but not in Wiki: ' + inDataOnly.length);
  
  if (inWikiOnly.length > 0) {
    console.log('\nItems in Wiki but NOT in our data:');
    for (const slug of inWikiOnly.slice(0, 20)) {
      console.log('  - ' + slug);
    }
    if (inWikiOnly.length > 20) {
      console.log('  ... and ' + (inWikiOnly.length - 20) + ' more');
    }
  }
  
  if (inDataOnly.length > 0) {
    console.log('\nItems in our data but NOT in Wiki (possible removals):');
    for (const slug of inDataOnly.slice(0, 20)) {
      console.log('  - ' + slug);
    }
    if (inDataOnly.length > 20) {
      console.log('  ... and ' + (inDataOnly.length - 20) + ' more');
    }
  }
  
  return { inWikiOnly, inDataOnly, total: syncedSlugs.size };
}

async function main() {
  console.log('=== Star Citizen Wiki Cross-Validation ===');
  console.log('Mode: ' + (DRY_RUN ? 'dry-run (fetch only, no changes)' : 'live'));
  
  const weaponResults = await crossValidateWeapons();
  const itemResults = await crossValidateItems();
  
  console.log('\n=== Overall Summary ===');
  console.log('Weapons: ' + weaponResults.total + ' synced, ' + weaponResults.inWikiOnly.length + ' missing from Wiki, ' + weaponResults.inDataOnly.length + ' stale in data');
  console.log('Items: ' + itemResults.total + ' synced, ' + itemResults.inWikiOnly.length + ' missing from Wiki, ' + itemResults.inDataOnly.length + ' stale in data');
  
  const hasIssues = weaponResults.inWikiOnly.length > 0 || weaponResults.inDataOnly.length > 0 ||
                    itemResults.inWikiOnly.length > 0 || itemResults.inDataOnly.length > 0;
  
  if (hasIssues) {
    console.log('\nDiscrepancies found. Run sync scripts again if needed.');
  } else {
    console.log('\nAll data is in sync!');
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
