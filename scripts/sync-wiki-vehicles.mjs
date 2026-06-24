#!/usr/bin/env node
/**
 * sync-wiki-vehicles.mjs - Sync vehicle data from Star Citizen Wiki API
 *
 * Fetches spaceship data from https://api.star-citizen.wiki/api/vehicles
 * Extracts key fields and outputs to frontend/public/data/wiki-vehicles.json
 *
 * Usage:
 *   node scripts/sync-wiki-vehicles.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-vehicles.json');
const DICT_PATH = path.join(__dirname, 'wiki-sync-dictionaries.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api/vehicles';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(pageNumber) {
  const params = new URLSearchParams({
    'filter[is_spaceship]': 'true',
    'page[size]': String(PAGE_SIZE),
    'page[number]': String(pageNumber),
  });
  const url = BASE_URL + '?' + params.toString();
  console.log('Fetching: ' + url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  }
  return res.json();
}

function extractVehicle(v) {
  const sizes = v.sizes || v.dimension || {};
  const crew = v.crew || {};
  const quantum = v.quantum || {};
  const agility = v.agility || {};
  const weaponry = v.weaponry || {};
  const images = v.images || {};

  const wikiUrl = v.web_url || v.link || '';

  let manufacturerName = '';
  if (v.manufacturer) {
    if (typeof v.manufacturer === 'string') {
      manufacturerName = v.manufacturer;
    } else if (v.manufacturer.name) {
      manufacturerName = v.manufacturer.name;
    } else if (v.manufacturer.code) {
      manufacturerName = v.manufacturer.code;
    }
  }

  return {
    name: v.name || '',
    slug: v.slug || '',
    manufacturer: manufacturerName,
    sizes: {
      length: sizes.length || null,
      beam: sizes.beam || sizes.width || null,
      height: sizes.height || null,
    },
    mass: v.mass || null,
    cargo_capacity: v.cargo_capacity || 0,
    crew: {
      min: crew.min || null,
      max: crew.max || null,
    },
    speed: v.speed || null,
    shield_hp: v.shield_hp || null,
    health: v.health || null,
    weaponry: {
      pilot_weapons: weaponry.pilot_weapons || [],
      pilot_dps: weaponry.pilot_dps || null,
      turrets: weaponry.turrets || [],
      turret_dps: weaponry.turret_dps || null,
      missiles: weaponry.missiles || [],
    },
    agility: {
      pitch: agility.pitch || null,
      yaw: agility.yaw || null,
      roll: agility.roll || null,
    },
    quantum_speed: quantum.quantum_speed || null,
    quantum_fuel: quantum.quantum_fuel_capacity || null,
    image_url: (Array.isArray(images) && images[0]?.thumbnail_url) || (Array.isArray(images) && images[0]?.original_url) || '',
    wiki_url: wikiUrl,
    role: v.role || '',
    size_class: v.size_class || '',
  };
}

async function main() {
  console.log('=== Star Citizen Wiki Vehicle Sync ===\n');

  let allVehicles = [];
  let page = 1;
  let lastPage = 1;

  try {
    const firstRes = await fetchPage(1);
    allVehicles = firstRes.data || [];
    lastPage = firstRes.meta?.last_page || 1;
    console.log('Page 1/' + lastPage + ': ' + allVehicles.length + ' vehicles');

    for (let p = 2; p <= lastPage; p++) {
      await sleep(RATE_LIMIT_MS);
      const res = await fetchPage(p);
      const vehicles = res.data || [];
      allVehicles = allVehicles.concat(vehicles);
      console.log('Page ' + p + '/' + lastPage + ': ' + vehicles.length + ' vehicles (total: ' + allVehicles.length + ')');
    }
  } catch (err) {
    console.error('Error fetching vehicles: ' + err.message);
    process.exit(1);
  }

  console.log('\nTotal vehicles fetched: ' + allVehicles.length);

  const vehiclesMap = {};
  for (const v of allVehicles) {
    const extracted = extractVehicle(v);
    vehiclesMap[extracted.slug] = extracted;
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: 'https://api.star-citizen.wiki',
    license: 'CC BY-NC-SA 4.0',
    total_vehicles: Object.keys(vehiclesMap).length,
    vehicles: vehiclesMap,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Output preview:');
    const slugs = Object.keys(vehiclesMap);
    console.log('  Total vehicles: ' + slugs.length);
    console.log('  Sample slugs: ' + slugs.slice(0, 10).join(', '));
    const sample = vehiclesMap[slugs[0]];
    if (sample) {
      console.log('\n  Sample vehicle (' + sample.name + '):');
      console.log('    manufacturer: ' + sample.manufacturer);
      console.log('    mass: ' + sample.mass);
      console.log('    cargo: ' + sample.cargo_capacity);
      console.log('    crew: ' + JSON.stringify(sample.crew));
      console.log('    shield_hp: ' + sample.shield_hp);
      console.log('    health: ' + sample.health);
      console.log('    role: ' + sample.role);
      console.log('    size_class: ' + sample.size_class);
    }
    console.log('\n[dry-run] No files written.');
  } else {
    // Write split files to stay under 25MB per-file limit
    const vehicles = output.vehicles;
    const vehicleKeys = Object.keys(vehicles);
    const CHUNK_SIZE = 60;
    const chunks = [];
    for (let i = 0; i < vehicleKeys.length; i += CHUNK_SIZE) {
      chunks.push(vehicleKeys.slice(i, i + CHUNK_SIZE));
    }
    const dir = path.dirname(OUTPUT_PATH);
    // Remove old single file
    if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
    for (let i = 0; i < chunks.length; i++) {
      const chunkData = {
        generated_at: output.generated_at,
        source: output.source,
        total: output.total,
        chunk: i + 1,
        chunk_total: chunks.length,
        vehicles: Object.fromEntries(chunks[i].map(k => [k, vehicles[k]]))
      };
      const chunkPath = path.join(dir, `wiki-vehicles-${i + 1}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunkData), 'utf-8');
      const sizeMB = (fs.statSync(chunkPath).size / 1024 / 1024).toFixed(1);
      console.log(`  wiki-vehicles-${i + 1}.json: ${chunks[i].length} vehicles, ${sizeMB} MB`);
    }
    console.log(`\nWritten: ${chunks.length} split files to ${dir}`);
  }

  generateDictionary(vehiclesMap);
}

function generateDictionary(vehiclesMap) {
  const manufacturers = {};
  const roles = {};
  const sizeClasses = {};

  for (const v of Object.values(vehiclesMap)) {
    if (v.manufacturer && !manufacturers[v.manufacturer]) {
      manufacturers[v.manufacturer] = '';
    }
    if (v.role && !roles[v.role]) {
      roles[v.role] = '';
    }
    if (v.size_class && !sizeClasses[v.size_class]) {
      sizeClasses[v.size_class] = '';
    }
  }

  const dict = {
    _comment: 'Chinese translation dictionaries for wiki vehicle data',
    manufacturers: manufacturers,
    roles: roles,
    size_classes: sizeClasses,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Dictionary preview:');
    console.log('  Manufacturers: ' + Object.keys(manufacturers).join(', '));
    console.log('  Roles: ' + Object.keys(roles).join(', '));
    console.log('  Size classes: ' + Object.keys(sizeClasses).join(', '));
  } else {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
    console.log('Dictionary written: ' + DICT_PATH);
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
