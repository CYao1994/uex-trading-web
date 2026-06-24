#!/usr/bin/env node
/**
 * sync-wiki-blueprints.mjs - Sync blueprint data from Star Citizen Wiki API
 *
 * Fetches all blueprints from https://api.star-citizen.wiki/api/blueprints
 * Output: frontend/public/data/wiki-blueprints.json
 *
 * Usage:
 *   node scripts/sync-wiki-blueprints.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-blueprints.json');
const DICT_PATH = path.join(__dirname, 'wiki-blueprints-dictionaries.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api/blueprints';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractBlueprint(raw) {
  const ingredients = raw.ingredients || [];
  const output = raw.output || {};
  const dismantleReturns = raw.dismantle_returns || [];

  return {
    uuid: raw.uuid || '',
    slug: output.class || raw.output_class || '',
    name: raw.output_name || output.name || '',
    type: output.type || raw.type || '',
    sub_type: output.sub_type || '',
    grade: output.grade || '',
    craft_time_seconds: raw.craft_time_seconds || 0,
    craft_time_label: raw.craft_time_label || '',
    ingredients: ingredients.map(function(m) {
      return {
        name: m.name || '',
        kind: m.kind || '',
        quantity_scu: m.quantity_scu || null,
        quantity: m.quantity || null,
      };
    }),
    yield: {
      name: output.name || raw.output_name || '',
      quantity: 1,
      type: output.type || '',
      grade: output.grade || '',
      item_web_url: raw.output_item_web_url || '',
    },
    dismantle_returns: dismantleReturns.map(function(r) {
      return { name: r.name || '', quantity_scu: r.quantity_scu || 0 };
    }),
    web_url: raw.web_url || '',
    item_web_url: raw.output_item_web_url || '',
  };
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  }
  return res.json();
}

async function main() {
  console.log('=== Star Citizen Wiki Blueprint Sync ===\n');

  const allBlueprints = {};
  let url = BASE_URL + '?' + new URLSearchParams({ 'page[size]': String(PAGE_SIZE) }).toString();
  let pageNum = 0;

  while (url) {
    pageNum++;
    try {
      console.log('Fetching page ' + pageNum + '...');
      const res = await fetchPage(url);
      const pageData = res.data || [];
      for (const raw of pageData) {
        const bp = extractBlueprint(raw);
        const key = bp.uuid || bp.slug;
        if (key) {
          allBlueprints[key] = bp;
        }
      }
      console.log('Page ' + pageNum + ': ' + pageData.length + ' blueprints (' + Object.keys(allBlueprints).length + ' total)');
      url = res.links && res.links.next ? res.links.next : null;
      if (url) await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error('Error on page ' + pageNum + ': ' + err.message);
      url = null;
    }
  }

  console.log('\nTotal blueprints: ' + Object.keys(allBlueprints).length);

  const output = {
    generated_at: new Date().toISOString(),
    source: 'https://api.star-citizen.wiki',
    total: Object.keys(allBlueprints).length,
    blueprints: allBlueprints,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Output preview:');
    const slugs = Object.keys(allBlueprints);
    console.log('  Total blueprints: ' + slugs.length);

    const typeCounts = {};
    for (const bp of Object.values(allBlueprints)) {
      typeCounts[bp.type] = (typeCounts[bp.type] || 0) + 1;
    }
    for (const [t, c] of Object.entries(typeCounts)) {
      console.log('  ' + t + ': ' + c);
    }

    const sample = allBlueprints[slugs[0]];
    if (sample) {
      console.log('\n  Sample blueprint (' + sample.name + '):');
      console.log('    type: ' + sample.type);
      console.log('    materials: ' + sample.materials.length);
      console.log('    yield: ' + sample.yield.name + ' x' + sample.yield.quantity);
      console.log('    stations: ' + sample.stations.length);
    }
    console.log('\n[dry-run] No files written.');
  } else {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log('\nWritten: ' + OUTPUT_PATH);
  }

  generateDictionary(allBlueprints);
}

function generateDictionary(blueprints) {
  const types = {};
  const materialNames = {};
  const yieldNames = {};
  const stationNames = {};

  for (const bp of Object.values(blueprints)) {
    if (bp.type && !types[bp.type]) {
      types[bp.type] = '';
    }
    for (const m of bp.materials) {
      if (m.name && !materialNames[m.name]) {
        materialNames[m.name] = '';
      }
    }
    if (bp.yield.name && !yieldNames[bp.yield.name]) {
      yieldNames[bp.yield.name] = '';
    }
    for (const s of bp.stations) {
      const name = typeof s === 'string' ? s : (s.name || '');
      if (name && !stationNames[name]) {
        stationNames[name] = '';
      }
    }
  }

  const dict = {
    _comment: 'Chinese translation dictionaries for wiki blueprint data',
    types: types,
    material_names: materialNames,
    yield_names: yieldNames,
    station_names: stationNames,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Dictionary preview:');
    console.log('  Types: ' + Object.keys(types).join(', '));
    console.log('  Material names: ' + Object.keys(materialNames).length);
    console.log('  Yield names: ' + Object.keys(yieldNames).length);
    console.log('  Station names: ' + Object.keys(stationNames).length);
  } else {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
    console.log('Dictionary written: ' + DICT_PATH);
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
