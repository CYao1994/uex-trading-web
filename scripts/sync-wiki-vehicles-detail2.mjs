#!/usr/bin/env node
/**
 * sync-wiki-vehicles-detail2.mjs - Enrich wiki-vehicles.json with Wiki API detail loadout data
 *
 * Fetches detail endpoint for each vehicle and extracts:
 * - weaponry: pilot_dps, turret_dps, weapon mounts with equipped weapons
 * - components: equipped components by slot (cooler, power plant, shield, quantum drive, radar, etc.)
 * - quantum: quantum_speed, quantum_fuel_capacity, quantum_range, quantum_spool_time
 * - speed: scm, max, boost_forward
 * - shield: hp, regeneration, face_type
 * - health, mass (hull/loadout/total), sizes (length, beam, height)
 * - crew: min, max
 * - production_status (with zh_CN)
 * - images: all image URLs
 *
 * Usage:
 *   node scripts/sync-wiki-vehicles-detail2.mjs [--dry-run] [--skip-existing]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VEHICLES_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-vehicles.json');
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

const WEAPON_PORT_TYPES = new Set(['WeaponGun', 'WeaponLauncher', 'MissileLauncher', 'Weapon']);
const COMPONENT_PORT_TYPES = new Set([
  'PowerPlant', 'Cooler', 'ShieldGenerator', 'QuantumDrive', 'Radar',
  'LifeSupportGenerator', 'Computers', 'FuelIntake', 'FuelTank',
  'Communication', 'Computers'
]);

function extractLoadout(data) {
  const v = data.data || data;

  const ports = v.ports || [];
  const weaponry = v.weaponry || {};
  const shield = v.shield || {};
  const quantum = v.quantum || {};
  const speed = v.speed || {};
  const productionStatus = v.production_status || {};
  const images = v.images || [];

  const weaponMounts = [];
  const components = [];
  const missileRacks = [];
  const turretsList = [];

  function processPort(port, depth = 0) {
    if (depth > 5) return;

    const portType = port.type || '';
    const equipped = port.equipped_item;
    const sizes = port.sizes || {};
    const categoryLabel = port.category_label || '';

    if (WEAPON_PORT_TYPES.has(portType) || portType.includes('Weapon')) {
      const weaponInfo = equipped ? {
        name: equipped.name,
        type: equipped.type,
        class_name: equipped.class_name,
        class: equipped.class,
        grade: equipped.grade,
        size: equipped.size,
        manufacturer: equipped.manufacturer?.name || null,
        manufacturer_code: equipped.manufacturer?.code || null,
      } : null;

      weaponMounts.push({
        port_name: port.name,
        port_type: portType,
        port_label: categoryLabel || portType,
        mount_size: sizes.max || null,
        equipped: weaponInfo,
      });
    } else if (portType === 'MissileLauncher' || portType === 'MissileRack' || portType === 'CounterMeasureLauncher') {
      missileRacks.push({
        port_name: port.name,
        port_type: portType,
        port_label: categoryLabel || portType,
        mount_size: sizes.max || null,
        equipped: equipped ? {
          name: equipped.name,
          type: equipped.type,
          size: equipped.size,
        } : null,
      });
    } else if (COMPONENT_PORT_TYPES.has(portType) || COMPONENT_PORT_TYPES.has(categoryLabel)) {
      components.push({
        port_name: port.name,
        port_type: portType,
        port_label: categoryLabel || portType,
        mount_size: sizes.max || null,
        equipped: equipped ? {
          name: equipped.name,
          type: equipped.type,
          class_name: equipped.class_name,
          class: equipped.class,
          grade: equipped.grade,
          size: equipped.size,
          manufacturer: equipped.manufacturer?.name || null,
          manufacturer_code: equipped.manufacturer?.code || null,
        } : null,
      });
    }

    const turrets = v.turrets || {};
    if (turrets.manned?.length || turrets.remote?.length || turrets.pdc?.length) {
      for (const t of [...(turrets.manned || []), ...(turrets.remote || []), ...(turrets.pdc || [])]) {
        turretsList.push({
          name: t.name,
          type: t.type,
          size: t.size,
          weapons: (t.weapons || []).map(w => ({
            name: w.name,
            size: w.size,
            dps: w.dps,
          })),
        });
      }
    }

    if (port.ports && Array.isArray(port.ports)) {
      for (const sub of port.ports) {
        processPort(sub, depth + 1);
      }
    }
  }

  for (const port of ports) {
    processPort(port);
  }

  const weaponStats = {};
  const fw = weaponry.fixed_weapons?.weapons || [];
  for (const w of fw) {
    if (!weaponStats[w.name]) {
      weaponStats[w.name] = { dps: w.dps, sustained_dps: w.sustained_dps, alpha: w.alpha };
    }
  }
  const tw = weaponry.turret_weapons?.weapons || [];
  for (const w of tw) {
    if (!weaponStats[w.name]) {
      weaponStats[w.name] = { dps: w.dps, sustained_dps: w.sustained_dps, alpha: w.alpha };
    }
  }

  for (const wm of weaponMounts) {
    if (wm.equipped && weaponStats[wm.equipped.name]) {
      wm.equipped.dps = weaponStats[wm.equipped.name].dps;
      wm.equipped.sustained_dps = weaponStats[wm.equipped.name].sustained_dps;
      wm.equipped.alpha = weaponStats[wm.equipped.name].alpha;
    }
  }

  return {
    weaponry_enriched: {
      pilot_dps: weaponry.pilot_dps || null,
      pilot_alpha: weaponry.pilot_alpha || null,
      pilot_sustained_dps: weaponry.pilot_sustained_dps || null,
      turret_dps: weaponry.turret_dps || null,
    },
    loadout: {
      weapons: weaponMounts,
      components,
      missile_racks: missileRacks,
      turrets: turretsList,
    },
    quantum: {
      quantum_speed: quantum.quantum_speed || null,
      quantum_fuel_capacity: quantum.quantum_fuel_capacity || null,
      quantum_range: quantum.quantum_range || null,
      quantum_spool_time: quantum.quantum_spool_time || null,
    },
    speed_enriched: {
      scm: speed.scm || null,
      max: speed.max || null,
      boost_forward: speed.boost_forward || null,
      boost_backward: speed.boost_backward || null,
    },
    shield_enriched: {
      hp: shield.hp || v.shield_hp || null,
      regeneration: shield.regeneration || null,
      regeneration_time: shield.regeneration_time || null,
      face_type: shield.face_type || v.shield_face_type || null,
    },
    health: v.health || null,
    mass: {
      hull: v.mass_hull || v.mass || null,
      loadout: v.mass_loadout || null,
      total: v.mass_total || null,
    },
    sizes: v.sizes || null,
    crew: {
      min: v.crew?.min || null,
      max: v.crew?.max || null,
    },
    production_status_enriched: {
      en: productionStatus.en_EN || null,
      zh: productionStatus.zh_CN || null,
    },
    images_all: images.map(img => ({
      thumbnail: img.thumbnail_url || null,
      original: img.original_url || null,
      width: img.original_width || null,
      height: img.original_height || null,
    })),
  };
}

async function main() {
  console.log('=== Wiki Vehicle Detail2 Sync (Loadout Enrichment) ===\n');

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
  console.log(`Loaded ${slugs.length} vehicles from split files\n`);

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const v = vehicles[slug];

    if (SKIP_EXISTING && v.loadout) {
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${slugs.length}] Fetching: ${slug}...`);

    try {
      const detail = await fetchVehicleDetail(slug);
      const enriched = extractLoadout(detail);

      vehicles[slug] = {
        ...vehicles[slug],
        weaponry_enriched: enriched.weaponry_enriched,
        loadout: enriched.loadout,
        quantum_enriched: enriched.quantum,
        speed_enriched: enriched.speed_enriched,
        shield_enriched: enriched.shield_enriched,
        health_enriched: enriched.health,
        mass_enriched: enriched.mass,
        sizes_enriched: enriched.sizes,
        crew_enriched: enriched.crew,
        production_status_enriched: enriched.production_status_enriched,
        images_all: enriched.images_all,
      };

      const wCount = enriched.loadout.weapons.length;
      const cCount = enriched.loadout.components.length;
      const mCount = enriched.loadout.missile_racks.length;
      console.log(`  -> weapons: ${wCount}, components: ${cCount}, missile_racks: ${mCount}, images: ${enriched.images_all.length}`);
      updated++;
    } catch (err) {
      errors++;
      console.error(`  -> ERROR: ${err.message}`);
    }

    if (i < slugs.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\nEnrichment complete: ${updated} updated, ${skipped} skipped, ${errors} errors`);

  if (DRY_RUN) {
    console.log('\n[dry-run] Preview of first enriched vehicle:');
    const firstSlug = slugs[0];
    const fv = vehicles[firstSlug];
    console.log(JSON.stringify({
      name: fv.name,
      weaponry_enriched: fv.weaponry_enriched,
      loadout_weapons: fv.loadout?.weapons?.length || 0,
      loadout_components: fv.loadout?.components?.length || 0,
      quantum_enriched: fv.quantum_enriched,
      shield_enriched: fv.shield_enriched,
      mass_enriched: fv.mass_enriched,
      images_count: fv.images_all?.length || 0,
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
        generated_at: new Date().toISOString(),
        source: wikiData.source || '',
        total: wikiData.total || vehicleKeys.length,
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
