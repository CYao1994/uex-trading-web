#!/usr/bin/env node
/**
 * sync-wiki-commodities.mjs - Sync commodity data from Star Citizen Wiki API
 *
 * Fetches commodities from https://api.star-citizen.wiki/api/commodities
 * Output: frontend/public/data/wiki-commodities.json
 *
 * Usage:
 *   node scripts/sync-wiki-commodities.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-commodities.json');
const DICT_PATH = path.join(__dirname, 'wiki-commodities-dictionaries.json');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://api.star-citizen.wiki/api/commodities';
const PAGE_SIZE = 50;
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractCommodity(raw) {
  const attrs = raw.attributes || raw;
  const images = attrs.images || [];
  const prices = attrs.prices || attrs.uex_prices || [];
  const locations = attrs.locations || attrs.shops || [];

  return {
    uuid: raw.id || attrs.uuid || '',
    slug: attrs.slug || '',
    name: attrs.name || '',
    type: attrs.type || '',
    category: attrs.category || '',
    description: (attrs.description && (attrs.description.en_EN || attrs.description.en)) || '',
    description_zh: (attrs.description && (attrs.description.zh_CN || attrs.description.zh)) || '',
    prices: prices,
    locations: locations.map(function(loc) {
      if (typeof loc === 'string') return { name: loc };
      return {
        name: loc.name || '',
        station: loc.station || '',
        celestial: loc.celestial || '',
        system: loc.system || '',
      };
    }),
    image_url: (images[0] && (images[0].thumbnail_url || images[0].url)) || '',
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
  console.log('=== Star Citizen Wiki Commodity Sync ===\n');

  const allCommodities = {};
  let url = BASE_URL + '?' + new URLSearchParams({ 'page[size]': String(PAGE_SIZE) }).toString();
  let pageNum = 0;

  while (url) {
    pageNum++;
    try {
      console.log('Fetching page ' + pageNum + '...');
      const res = await fetchPage(url);
      const pageData = res.data || [];
      for (const raw of pageData) {
        const item = extractCommodity(raw);
        if (item.slug) {
          allCommodities[item.slug] = item;
        }
      }
      console.log('Page ' + pageNum + ': ' + pageData.length + ' commodities (' + Object.keys(allCommodities).length + ' total)');
      url = res.links && res.links.next ? res.links.next : null;
      if (url) await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error('Error on page ' + pageNum + ': ' + err.message);
      url = null;
    }
  }

  console.log('\nTotal commodities: ' + Object.keys(allCommodities).length);

  const output = {
    generated_at: new Date().toISOString(),
    source: 'https://api.star-citizen.wiki',
    total: Object.keys(allCommodities).length,
    commodities: allCommodities,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Output preview:');
    const slugs = Object.keys(allCommodities);
    console.log('  Total commodities: ' + slugs.length);

    const typeCounts = {};
    for (const c of Object.values(allCommodities)) {
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    }
    for (const [t, c] of Object.entries(typeCounts)) {
      console.log('  ' + t + ': ' + c);
    }

    const sample = allCommodities[slugs[0]];
    if (sample) {
      console.log('\n  Sample commodity (' + sample.name + '):');
      console.log('    type: ' + sample.type);
      console.log('    category: ' + sample.category);
      console.log('    prices: ' + sample.prices.length);
      console.log('    locations: ' + sample.locations.length);
    }
    console.log('\n[dry-run] No files written.');
  } else {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log('\nWritten: ' + OUTPUT_PATH);
  }

  generateDictionary(allCommodities);
}

function generateDictionary(commodities) {
  const types = {};
  const categories = {};

  for (const c of Object.values(commodities)) {
    if (c.type && !types[c.type]) {
      types[c.type] = '';
    }
    if (c.category && !categories[c.category]) {
      categories[c.category] = '';
    }
  }

  const dict = {
    _comment: 'Chinese translation dictionaries for wiki commodity data',
    types: types,
    categories: categories,
  };

  if (DRY_RUN) {
    console.log('\n[dry-run] Dictionary preview:');
    console.log('  Types: ' + Object.keys(types).join(', '));
    console.log('  Categories: ' + Object.keys(categories).join(', '));
  } else {
    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2), 'utf-8');
    console.log('Dictionary written: ' + DICT_PATH);
  }
}

main().catch(err => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
