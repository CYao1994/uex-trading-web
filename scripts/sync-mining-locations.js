#!/usr/bin/env node
/**
 * sync-mining-locations.js - Sync mining location data from Wiki API + UEX API
 *
 * Fetches mineral locations from https://api.star-citizen.wiki/api/locations
 * Fetches mineral prices from https://api.uexcorp.uk/2.0/commodities
 * Output: frontend/public/data/mining-locations.json
 *
 * Usage:
 *   node scripts/sync-mining-locations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'mining-locations.json');
const MINING_DATA_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'mining-data.json');
const PARATRANZ_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');

const WIKI_BASE = 'https://api.star-citizen.wiki/api';
const UEX_BASE = 'https://api.uexcorp.uk/2.0';
const RATE_LIMIT_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const LOCATION_ZH_CN = {
  'daymar': '\u6234\u9a6c\u5c14',
  'yela': '\u53f6\u62c9',
  'cellin': '\u8d5b\u6797',
  'aberdeen': '\u963f\u4f2f\u4e01',
  'magda': '\u739b\u683c\u8fbe',
  'ita': '\u4f0a\u5854',
  'arial': '\u827e\u745e\u5c14',
  'lyria': '\u83b1\u5229\u4e9a',
  'wala': '\u74e6\u62c9',
  'microtech': '\u5fae\u79d1',
  'calliope': '\u5361\u5229\u4fc4\u914d',
  'clio': '\u514b\u5229\u4fc4',
  'euterpe': '\u6b27\u5feb\u8033\u4f69',
  'delamar': '\u5fb7\u62c9\u9a6c\u5c14',
};

const MINING_TYPE_ZH = {
  'Ship Mining': '\u8239\u91c7',
  'Vehicle Mining': '\u8f7d\u5177\u91c7\u77ff',
  'FPS Mining': '\u624b\u91c7',
  'Harvestables': '\u91c7\u96c6',
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + res.statusText + ' for ' + url);
  }
  return res.json();
}

async function fetchUEXPrices() {
  console.log('Fetching UEX mineral prices...');
  const data = await fetchJSON(UEX_BASE + '/commodities?category=mining');
  const priceMap = {};
  const items = data.data || data || [];
  for (const item of items) {
    if (item.is_mineral === 1 && item.is_raw === 0 && item.price_sell > 0) {
      const code = item.code || '';
      priceMap[code] = {
        price_sell: item.price_sell,
        uex_id: item.id,
        name: item.name || code,
      };
    }
  }
  console.log('  Found ' + Object.keys(priceMap).length + ' refined minerals with prices');
  return priceMap;
}

function buildNameZHCMap() {
  try {
    const cache = JSON.parse(fs.readFileSync(PARATRANZ_PATH, 'utf-8'));
    const map = {};
    const mineralKeys = Object.keys(cache);
    for (const key of mineralKeys) {
      const val = cache[key];
      if (Array.isArray(val) && val.length >= 3) {
        map[key.toLowerCase()] = val[2];
      }
    }
    return map;
  } catch (e) {
    console.log('  Warning: Could not load paratranz-cache.json:', e.message);
    return {};
  }
}

async function fetchAllLocations() {
  console.log('Fetching Stanton locations...');
  let allLocations = [];
  let url = WIKI_BASE + '/locations?' + new URLSearchParams({
    'filter[system]': 'Stanton System',
    'filter[type]': 'Planet,Moon,Asteroid',
    'filter[has_resources]': 'true',
    'page[size]': '50',
  }).toString();

  let pageNum = 0;
  while (url) {
    pageNum++;
    console.log('  Page ' + pageNum + '...');
    const res = await fetchJSON(url);
    const pageData = res.data || [];
    allLocations = allLocations.concat(pageData);
    url = res.links?.next || null;
    if (url) await sleep(RATE_LIMIT_MS);
  }
  console.log('  Total locations: ' + allLocations.length);
  return allLocations;
}

async function fetchLocationDetail(slug) {
  const url = WIKI_BASE + '/locations/' + encodeURIComponent(slug) + '?include=resources';
  return fetchJSON(url);
}

function parseLocationResources(locationData, nameZHMap) {
  const attrs = locationData.data || {};
  const name = attrs.name || attrs.slug || '';
  const slug = attrs.slug || '';
  const parent = attrs.parent?.name || '';
  const bodyType = attrs.type?.name || attrs.type || '';

  const resourceGroups = attrs.resources || [];
  const results = [];

  for (const group of resourceGroups) {
    const miningType = group.mining_type || '';
    const groupProb = group.group_probability_min_percent || group.group_probability_percent || 0;

    const resourceItems = group.resources || [];
    for (const res of resourceItems) {
      const resName = res.label || res.name || '';
      const tier = res.tier || '';
      const sig = res.signature || 0;
      const relProbMin = res.relative_probability_min_percent || 0;
      const relProbMax = res.relative_probability_max_percent || relProbMin;
      const relProb = (relProbMin + relProbMax) / 2;

      const materials = res.materials || [];
      for (const mat of materials) {
        const mName = mat.name || resName;
        const cleanName = mName.replace(/\s*\(.*\)\s*$/, '');
        const minPct = mat.min_percentage || 0;
        const maxPct = mat.max_percentage || 100;
        const inst = mat.instability || 0;
        const res_val = mat.resistance || 0;
        const matGrpProb = mat.group_probability_percent || groupProb;
        const matRelProb = mat.relative_probability_percent || relProb;
        const qualMin = mat.quality_min || res.quality_min || 0;
        const qualMax = mat.quality_max || res.quality_max || 1000;

        const mNameZH = nameZHMap[cleanName.toLowerCase()] || '';

        results.push({
          mineral_name: cleanName,
          mineral_name_zh: mNameZH,
          location: name,
          location_zh: LOCATION_ZH_CN[slug.toLowerCase()] || name,
          parent: parent,
          type: bodyType,
          mining_type: miningType,
          mining_type_zh: MINING_TYPE_ZH[miningType] || miningType,
          tier: tier,
          probability: matRelProb,
          group_probability: matGrpProb,
          signature: sig,
          quality_range: [qualMin, qualMax],
          resistance: res_val,
          instability: inst,
        });
      }
    }
  }

  return results;
}

function buildReverseIndex(allMineralData, priceMap, miningDataMinerals) {
  const index = {};

  const rawToMineral = {};
  for (const m of miningDataMinerals) {
    rawToMineral[m.rawName] = m;
  }

  for (const entry of allMineralData) {
    const mName = entry.mineral_name;
    const rawName = Object.keys(rawToMineral).find(function(k) {
      const normalizedK = k.toLowerCase().replace(/_/g, ' ');
      return normalizedK.includes(mName.toLowerCase()) ||
             mName.toLowerCase().includes(normalizedK);
    }) || mName;

    if (!index[rawName]) {
      const mineralData = rawToMineral[rawName] || {};
      let priceSell = 0;
      for (const pk of Object.keys(priceMap)) {
        if (pk.toLowerCase().includes(mName.toLowerCase()) ||
            mName.toLowerCase().includes(pk.toLowerCase())) {
          priceSell = priceMap[pk].price_sell;
          break;
        }
      }

      index[rawName] = {
        name: mName,
        name_zh: entry.mineral_name_zh || mineralData.name_zh || mName,
        price_sell: priceSell,
        locations: [],
      };
    }

    index[rawName].locations.push({
      location: entry.location,
      location_zh: entry.location_zh,
      parent: entry.parent,
      type: entry.type,
      mining_type: entry.mining_type,
      mining_type_zh: entry.mining_type_zh,
      tier: entry.tier,
      probability: entry.probability,
      group_probability: entry.group_probability,
      signature: entry.signature,
      quality_range: entry.quality_range,
      resistance: entry.resistance,
      instability: entry.instability,
    });
  }

  for (const key of Object.keys(index)) {
    index[key].locations.sort(function(a, b) {
      return (b.probability || 0) - (a.probability || 0);
    });
  }

  return index;
}

async function main() {
  console.log('=== Mining Location Sync ===\n');

  const miningDataRaw = JSON.parse(fs.readFileSync(MINING_DATA_PATH, 'utf-8'));
  const minerals = miningDataRaw.minerals || [];
  console.log('Loaded ' + minerals.length + ' minerals from mining-data.json');

  const nameZHMap = buildNameZHCMap();

  const priceMap = await fetchUEXPrices();
  await sleep(RATE_LIMIT_MS);

  const locations = await fetchAllLocations();

  const allMineralData = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const slug = loc.slug || '';
    const locName = loc.name || slug;
    console.log('[' + (i + 1) + '/' + locations.length + '] ' + locName + '...');

    try {
      const detail = await fetchLocationDetail(slug);
      const entries = parseLocationResources(detail, nameZHMap);
      allMineralData.push.apply(allMineralData, entries);
      console.log('  -> ' + entries.length + ' mineral entries');
    } catch (e) {
      console.log('  ERROR: ' + e.message);
    }

    if (i < locations.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log('\nTotal mineral entries: ' + allMineralData.length);

  const reverseIndex = buildReverseIndex(allMineralData, priceMap, minerals);
  const mineralCount = Object.keys(reverseIndex).length;
  console.log('Minerals with locations: ' + mineralCount);

  const output = {
    generated_at: new Date().toISOString(),
    source: 'Star Citizen Wiki API + UEX API',
    mineral_count: mineralCount,
    minerals: reverseIndex,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log('\nWritten to ' + OUTPUT_PATH);

  const fileSize = fs.statSync(OUTPUT_PATH).size;
  console.log('File size: ' + (fileSize / 1024).toFixed(1) + ' KB');
}

main().catch(function(e) {
  console.error('Fatal error:', e);
  process.exit(1);
});
