#!/usr/bin/env node
/**
 * update-blueprints-translations.mjs
 * Fix Chinese translations in blueprints-catalog.json
 *
 * Strategy:
 * 1. Load ParaTranz cache (full translation dictionary)
 * 2. Load blueprint translation dictionaries from blueprint-dictionaries.json
 * 3. Parse SC naming convention, translate word by word
 * 4. Translate acquisition paths
 * 5. Write back updated catalog
 *
 * Usage: node scripts/update-blueprints-translations.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARATRANZ_CACHE = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');
const CATALOG_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'blueprints-catalog.json');
const DICT_PATH = path.join(__dirname, 'blueprint-dictionaries.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// Load dictionaries from JSON (avoids encoding issues on Windows)
// ============================================================

const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
const MFR_ZH = dict.MFR_ZH;
const WEAPON_TYPE_ZH = dict.WEAPON_TYPE_ZH;
const VARIANT_ZH = dict.VARIANT_ZH;
const PART_ZH = dict.PART_ZH;
const GRADE_ZH = dict.GRADE_ZH;
const SLOT_ZH = dict.SLOT_ZH;
const CATEGORY_ZH = dict.CATEGORY_ZH;
const ACQUISITION_PATH_ZH = dict.ACQUISITION_PATH_ZH;
const SC_WORD_ZH = dict.SC_WORD_ZH;

// ============================================================
// Translation engine
// ============================================================

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

/** Try ParaTranz full-name lookup */
function tryParaTranz(name) {
  const key = name.toLowerCase().trim();
  if (paratranzCache[key]) {
    const entry = paratranzCache[key];
    const orig = entry[0];
    const trans = entry[1];
    if (trans && /[\u4e00-\u9fff]/.test(trans) && trans !== orig) {
      return trans;
    }
  }
  return null;
}

/** Translate a blueprint name by decomposing SC naming convention */
function translateBlueprintName(nameEn) {
  if (!nameEn) return '';

  // 1. Try ParaTranz full match first
  const fullMatch = tryParaTranz(nameEn);
  if (fullMatch) return fullMatch;

  // 2. Decompose: "behr rifle ballistic 01 mag" -> ["behr", "rifle", "ballistic", "01", "mag"]
  const words = nameEn.toLowerCase().replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean);

  const translated = words.map(function(word, idx) {
    // Numbers stay as-is
    if (/^\d+$/.test(word)) return word;

    // Try ParaTranz single-word match
    const ptMatch = tryParaTranz(word);
    if (ptMatch) return ptMatch;

    // Manufacturer (usually first position)
    if (idx === 0 && MFR_ZH[word]) return MFR_ZH[word];

    // Weapon type
    if (WEAPON_TYPE_ZH[word]) return WEAPON_TYPE_ZH[word];

    // Variant/series
    if (VARIANT_ZH[word]) return VARIANT_ZH[word];

    // Part/component
    if (PART_ZH[word]) return PART_ZH[word];

    // Grade/tier
    if (GRADE_ZH[word]) return GRADE_ZH[word];

    // SC common vocabulary
    if (SC_WORD_ZH[word]) return SC_WORD_ZH[word];

    // Fallback: uppercase
    return word.toUpperCase();
  });

  return translated.join(' ');
}

/** Translate material slot name */
function translateSlot(slot) {
  if (!slot) return '';
  return SLOT_ZH[slot.toUpperCase()] || slot;
}

/** Translate acquisition source path */
function translateAcquisitionSource(sourceName) {
  if (!sourceName) return '';

  // Try ParaTranz
  const ptMatch = tryParaTranz(sourceName);
  if (ptMatch) return ptMatch;

  // Decompose path: "blueprintmissionpools/bountyhuntersguild_paf_eliminatespecific"
  const parts = sourceName.split('/');
  const translated = parts.map(function(part) {
    // Try full match for this part
    const partMatch = tryParaTranz(part);
    if (partMatch) return partMatch;

    // Decompose underscore-connected words
    const words = part.split('_');
    const translatedWords = words.map(function(w) {
      const wLower = w.toLowerCase();
      if (ACQUISITION_PATH_ZH[wLower]) return ACQUISITION_PATH_ZH[wLower];
      if (SC_WORD_ZH[wLower]) return SC_WORD_ZH[wLower];
      if (MFR_ZH[wLower]) return MFR_ZH[wLower];
      // Try ParaTranz
      const wt = tryParaTranz(wLower);
      if (wt) return wt;
      return w;
    });
    return translatedWords.join('');
  });

  return translated.join(' / ');
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('=== Blueprint Translation Fix Tool ===\n');

  loadParaTranzCache();

  var catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log('Total blueprints: ' + catalog.total_blueprints);
  console.log('Categories: ' + Object.keys(catalog.categories).length + '\n');

  var translatedNames = 0;
  var improvedNames = 0;
  var translatedSlots = 0;
  var translatedAcq = 0;

  // Fix category names
  for (var key in catalog.categories) {
    var cat = catalog.categories[key];
    if (!cat.name_zh && CATEGORY_ZH[key]) {
      cat.name_zh = CATEGORY_ZH[key];
    }
  }

  // Fix blueprint names
  for (var i = 0; i < catalog.blueprints.length; i++) {
    var bp = catalog.blueprints[i];
    var oldZh = bp.name_zh || '';
    var newZh = translateBlueprintName(bp.name_en);

    if (newZh && newZh !== oldZh) {
      // Only replace when new translation has more Chinese characters
      var oldCnMatch = oldZh.match(/[\u4e00-\u9fff]/g);
      var newCnMatch = newZh.match(/[\u4e00-\u9fff]/g);
      var oldCnCount = oldCnMatch ? oldCnMatch.length : 0;
      var newCnCount = newCnMatch ? newCnMatch.length : 0;

      if (newCnCount > oldCnCount || oldCnCount === 0) {
        bp.name_zh = newZh;
        if (oldCnCount > 0) improvedNames++;
        else translatedNames++;
      }
    }

    // Fix material slots
    if (bp.materials) {
      for (var j = 0; j < bp.materials.length; j++) {
        var mat = bp.materials[j];
        if (!mat.slot_zh && mat.slot) {
          mat.slot_zh = translateSlot(mat.slot);
          translatedSlots++;
        }
      }
    }

    // Fix acquisition paths
    if (bp.acquisition) {
      for (var k = 0; k < bp.acquisition.length; k++) {
        var acq = bp.acquisition[k];
        var oldSource = acq.source_name_zh || '';
        var newSource = translateAcquisitionSource(acq.source_name);
        if (newSource && newSource !== oldSource) {
          acq.source_name_zh = newSource;
          translatedAcq++;
        }
      }
    }
  }

  console.log('=== Results ===');
  console.log('New translated names: ' + translatedNames);
  console.log('Improved names: ' + improvedNames);
  console.log('New translated slots: ' + translatedSlots);
  console.log('New translated acquisitions: ' + translatedAcq);

  if (DRY_RUN) {
    console.log('\n(--dry-run mode, file NOT written)');
    // Show some examples
    console.log('\n=== Examples ===');
    var examples = catalog.blueprints.filter(function(b) { return b.name_zh; }).slice(0, 15);
    for (var e = 0; e < examples.length; e++) {
      console.log('  ' + examples[e].name_en + ' -> ' + examples[e].name_zh);
    }
    return;
  }

  // Write back
  catalog.generated_at = new Date().toISOString();
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log('\nWritten: ' + CATALOG_PATH);
}

main();
