#!/usr/bin/env node
/**
 * apply-blueprint-translations.mjs
 * Apply Chinese translations to wiki-blueprints.json using dictionaries
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BP_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'wiki-blueprints.json');
const DICT_PATH = path.join(__dirname, 'blueprint-dictionaries.json');
const PARATRANZ_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'paratranz-cache.json');

const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
const MFR_ZH = dict.MFR_ZH;
const WEAPON_TYPE_ZH = dict.WEAPON_TYPE_ZH;
const VARIANT_ZH = dict.VARIANT_ZH;
const GRADE_ZH = dict.GRADE_ZH;

let paratranz = {};
try {
  paratranz = JSON.parse(fs.readFileSync(PARATRANZ_PATH, 'utf-8'));
} catch {}

const bpData = JSON.parse(fs.readFileSync(BP_PATH, 'utf-8'));
const blueprints = bpData.blueprints;

let translated = 0;
let already = 0;

for (const [key, bp] of Object.entries(blueprints)) {
  if (bp.name_zh) { already++; continue; }

  const name = bp.name || '';
  const nameLower = name.toLowerCase();

  // Try ParaTranz first
  const ptEntry = paratranz[nameLower] || paratranz[name];
  if (ptEntry && ptEntry[1]) {
    bp.name_zh = ptEntry[1];
    translated++;
    continue;
  }

  // Try word-by-word translation
  const parts = name.split(/[\s\-_"']+|(?=[A-Z])/);
  const zhParts = [];
  let matched = false;

  for (const p of parts) {
    const pl = p.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!pl) continue;
    if (MFR_ZH[pl]) { zhParts.push(MFR_ZH[pl]); matched = true; }
    else if (WEAPON_TYPE_ZH[pl]) { zhParts.push(WEAPON_TYPE_ZH[pl]); matched = true; }
    else if (VARIANT_ZH[pl]) { zhParts.push(VARIANT_ZH[pl]); matched = true; }
    else if (GRADE_ZH[pl]) { zhParts.push(GRADE_ZH[pl]); matched = true; }
    else { zhParts.push(p); }
  }

  if (matched && zhParts.length > 0) {
    bp.name_zh = zhParts.join('');
    translated++;
  }
}

bpData.blueprints = blueprints;
fs.writeFileSync(BP_PATH, JSON.stringify(bpData, null, 2), 'utf-8');
console.log(`Done: ${translated} newly translated, ${already} already had zh, total ${Object.keys(blueprints).length}`);
