#!/usr/bin/env node
/**
 * sync-wiki-vehicles-detail.mjs - Enrich wiki-vehicles.json with detail endpoint data
 *
 * Reads existing wiki-vehicles.json, fetches detail endpoint for each vehicle,
 * and merges: msrp, uex_prices, production_status, pledge_url
 *
 * Usage:
 *   node scripts/sync-wiki-vehicles-detail.mjs [--dry-run] [--skip-existing]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VEHICLES_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-vehicles.json');
const SHIP_PRICES_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'ship-prices.json');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const BASE_URL = 'https://api.star-citizen.wiki/api/vehicles';
const RATE_LIMIT_MS = 1100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchVehicleDetail(slug) {
  const url = `${BASE_URL}/${slug}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${slug}`);
  }
  return res.json();
}

function extractDetailFields(data) {
  const v = data.data || data;

  const msrp = v.msrp || null;
  const pledge_url = v.pledge_url || null;

  const production_status = v.production_status?.en_EN || null;

  const uex_prices = v.uex_prices || null;
  let purchase_prices = [];
  let rental_prices = [];

  if (uex_prices?.purchase) {
    purchase_prices = uex_prices.purchase.map(p => ({
      price_buy: p.price_buy,
      price_sell: p.price_sell,
      terminal_name: p.terminal_name,
      terminal_code: p.terminal_code,
      star_system: p.starmap_location?.star_system_name || null,
      location: p.starmap_location?.name || null,
    }));
  }

  if (uex_prices?.rental) {
    rental_prices = uex_prices.rental.map(r => ({
      price_rent: r.price_rent,
      terminal_name: r.terminal_name,
      terminal_code: r.terminal_code,
      star_system: r.starmap_location?.star_system_name || null,
      location: r.starmap_location?.name || null,
    }));
  }

  return {
    msrp,
    pledge_url,
    production_status,
    uex_prices: {
      purchase: purchase_prices,
      rental: rental_prices,
    },
  };
}

function loadShipPrices() {
  try {
    const raw = fs.readFileSync(SHIP_PRICES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return data.ships || {};
  } catch {
    return {};
  }
}

function matchShipPrice(wikiName, shipPrices) {
  const lowerName = wikiName.toLowerCase();
  for (const [uuid, sp] of Object.entries(shipPrices)) {
    if (sp.name?.toLowerCase() === lowerName) {
      return sp;
    }
  }
  return null;
}

async function main() {
  console.log('=== Wiki Vehicle Detail Sync + Ship-Prices Merge ===\n');

  // Load from split files
  const vehicles = {};
  for (let i = 1; i <= 4; i++) {
    const chunkPath = path.join(path.dirname(VEHICLES_PATH), `wiki-vehicles-${i}.json`);
    if (fs.existsSync(chunkPath)) {
      const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
      Object.assign(vehicles, chunk.vehicles || {});
    }
  }
  const slugs = Object.keys(vehicles);
  console.log(`Loaded ${slugs.length} vehicles from split files`);

  const shipPrices = loadShipPrices();
  console.log(`Loaded ${Object.keys(shipPrices).length} ships from ship-prices.json\n`);

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const v = vehicles[slug];

    if (SKIP_EXISTING && v.msrp !== undefined && v.uex_prices !== undefined) {
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${slugs.length}] Fetching detail: ${slug}...`);

    try {
      const detail = await fetchVehicleDetail(slug);
      const fields = extractDetailFields(detail);

      vehicles[slug] = {
        ...vehicles[slug],
        msrp: fields.msrp,
        pledge_url: fields.pledge_url,
        production_status: fields.production_status,
        uex_prices: fields.uex_prices,
      };

      updated++;
      console.log(`  -> msrp: $${fields.msrp || 'N/A'}, production: ${fields.production_status || 'N/A'}, purchase: ${fields.uex_prices.purchase.length}, rental: ${fields.uex_prices.rental.length}`);
    } catch (err) {
      errors++;
      console.error(`  -> ERROR: ${err.message}`);
    }

    if (i < slugs.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\nDetail fetch complete: ${updated} updated, ${skipped} skipped, ${errors} errors`);

  // Merge ship-prices.json AUEC data
  console.log('\n=== Merging ship-prices.json AUEC data ===\n');

  let merged = 0;
  let wikiOnly = 0;

  for (const slug of slugs) {
    const v = vehicles[slug];
    const sp = matchShipPrice(v.name, shipPrices);

    if (sp) {
      vehicles[slug] = {
        ...vehicles[slug],
        auec_price: sp.auec_price,
        auec_price_max: sp.auec_price_max,
        purchase_locations: sp.purchase_locations,
        purchase_shops: sp.purchase_shops,
        rental_locations: sp.rental_locations,
        has_rental: sp.has_rental,
      };
      merged++;
    } else {
      wikiOnly++;
    }
  }

  console.log(`Merge complete: ${merged} matched from ship-prices.json, ${wikiOnly} wiki-only`);

  // Write output
  wikiData.vehicles = vehicles;
  wikiData.generated_at = new Date().toISOString();
  wikiData.total = slugs.length;

  if (DRY_RUN) {
    console.log('\n[dry-run] Preview of first vehicle with new fields:');
    const firstSlug = slugs[0];
    const fv = vehicles[firstSlug];
    console.log(JSON.stringify({
      name: fv.name,
      msrp: fv.msrp,
      production_status: fv.production_status,
      pledge_url: fv.pledge_url,
      auec_price: fv.auec_price,
      purchase_locations: fv.purchase_locations,
      uex_purchase_count: fv.uex_prices?.purchase?.length || 0,
      uex_rental_count: fv.uex_prices?.rental?.length || 0,
    }, null, 2));
    console.log('\n[dry-run] No files written.');
  } else {
    // Write split files
    const vehicleKeys = Object.keys(vehicles);
    const CHUNK_SIZE = 60;
    const dir = path.dirname(VEHICLES_PATH);
    if (fs.existsSync(VEHICLES_PATH)) fs.unlinkSync(VEHICLES_PATH);
    for (let i = 0; i < vehicleKeys.length; i += CHUNK_SIZE) {
      const chunkKeys = vehicleKeys.slice(i, i + CHUNK_SIZE);
      const chunkData = {
        generated_at: wikiData.generated_at,
        source: wikiData.source,
        total: wikiData.total,
        chunk: Math.floor(i / CHUNK_SIZE) + 1,
        chunk_total: Math.ceil(vehicleKeys.length / CHUNK_SIZE),
        vehicles: Object.fromEntries(chunkKeys.map(k => [k, vehicles[k]]))
      };
      const chunkPath = path.join(dir, `wiki-vehicles-${Math.floor(i / CHUNK_SIZE) + 1}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunkData), 'utf-8');
      console.log(`  Written: ${path.basename(chunkPath)}`);
    }
    console.log(`\nWritten: split files to ${dir}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
