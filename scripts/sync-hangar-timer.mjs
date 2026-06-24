#!/usr/bin/env node
/**
 * sync-hangar-timer.mjs
 * Fetches the latest INITIAL_OPEN_TIME (and other cycle params) from
 * https://exec.xyxyll.com/app.js and patches frontend/src/components/HangarTimer.jsx.
 *
 * Usage: node scripts/sync-hangar-timer.mjs [--commit]
 *   --commit  stage + commit if anything changed
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const HANGAR_FILE = resolve(PROJECT_ROOT, 'frontend/src/components/HangarTimer.jsx');
const REFERENCE_URL = 'https://exec.xyxyll.com/app.js';
const DO_COMMIT = process.argv.includes('--commit');

async function fetchReferenceJS() {
  const res = await fetch(REFERENCE_URL, {
    headers: { 'User-Agent': 'UEX-Trade-Navigator/1.0' },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${REFERENCE_URL}: ${res.status}`);
  return res.text();
}

function extractParam(js, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*(.+?);`);
  const m = js.match(re);
  return m ? m[1].trim() : null;
}

function extractInitialOpenTime(js) {
  const m = js.match(/const\s+INITIAL_OPEN_TIME\s*=\s*new\s+Date\('([^']+)'\)/);
  return m ? m[1] : null;
}

function patchHangarFile(source, params) {
  let changed = false;
  let result = source;

  for (const [name, value] of Object.entries(params)) {
    if (value === null) continue;

    let pattern;
    if (name === 'INITIAL_OPEN_TIME') {
      pattern = new RegExp(`(const\\s+INITIAL_OPEN_TIME\\s*=\\s*new\\s+Date\\(')[^']+('\\))`);
    } else {
      pattern = new RegExp(`(const\\s+${name}\\s*=\\s*)\\S+(;)`);
    }

    const current = result.match(pattern);
    if (!current) continue;

    let newValue = value;
    if (name !== 'INITIAL_OPEN_TIME') {
      newValue = String(value);
    }

    if (current[0].includes(newValue) && name !== 'INITIAL_OPEN_TIME') continue;
    if (name === 'INITIAL_OPEN_TIME' && current[1] + newValue + current[2] === current[0]) continue;

    const replacement = name === 'INITIAL_OPEN_TIME'
      ? `${current[1]}${newValue}${current[2]}`
      : `${current[1]}${newValue}${current[2]}`;

    result = result.replace(pattern, replacement);
    changed = true;
    console.log(`  Updated ${name}: ${current[0].slice(0, 60)} → ${replacement.slice(0, 60)}`);
  }

  return { result, changed };
}

async function main() {
  console.log('Fetching reference app.js from', REFERENCE_URL);
  const js = await fetchReferenceJS();

  const initialValues = {
    INITIAL_OPEN_TIME: extractInitialOpenTime(js),
    CYCLE_DRIFT_MS: extractParam(js, 'CYCLE_DRIFT_MS'),
    DESIGN_ONLINE_MIN: extractParam(js, 'DESIGN_ONLINE_MIN'),
    DESIGN_OFFLINE_MIN: extractParam(js, 'DESIGN_OFFLINE_MIN'),
  };

  console.log('Remote values:');
  for (const [k, v] of Object.entries(initialValues)) {
    console.log(`  ${k} = ${v}`);
  }

  const localSource = readFileSync(HANGAR_FILE, 'utf-8');
  const { result, changed } = patchHangarFile(localSource, initialValues);

  if (!changed) {
    console.log('\nHangarTimer.jsx is already in sync.');
    return;
  }

  writeFileSync(HANGAR_FILE, result, 'utf-8');
  console.log('\nHangarTimer.jsx updated.');

  if (DO_COMMIT) {
    try {
      execSync('git add frontend/src/components/HangarTimer.jsx', { cwd: PROJECT_ROOT });
      execSync('git commit -m "chore: sync hangar timer with xyxyll reference"', { cwd: PROJECT_ROOT });
      console.log('Committed.');
    } catch (e) {
      console.error('Commit failed:', e.message);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
