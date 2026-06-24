import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadouts = JSON.parse(readFileSync(resolve('public/data/ship-loadouts.json'), 'utf-8'));

const VALID_COMPONENT_TYPES = ['武器', '发电机', '冷却器', '护盾', '量子驱动器'];

describe('ship-loadouts.json', () => {
  const shipKeys = Object.keys(loadouts);

  it('is a non-empty object', () => {
    expect(typeof loadouts).toBe('object');
    expect(shipKeys.length).toBeGreaterThan(0);
  });

  it('each ship has manufacturer and components', () => {
    for (const [_key, ship] of Object.entries(loadouts)) {
      expect(ship).toHaveProperty('manufacturer');
      expect(ship).toHaveProperty('components');
      expect(typeof ship.manufacturer).toBe('string');
      expect(typeof ship.components).toBe('object');
    }
  });

  it('each ship has a non-empty manufacturer string', () => {
    for (const [_key, ship] of Object.entries(loadouts)) {
      expect(ship.manufacturer.length).toBeGreaterThan(0);
    }
  });

  it('each ship has at least one component _type', () => {
    for (const [_key, ship] of Object.entries(loadouts)) {
      const _types = Object.keys(ship.components);
      expect(_types.length).toBeGreaterThan(0);
    }
  });

  describe('components', () => {
    it('component _type _keys are from the valid set', () => {
      const allTypes = new Set();
      for (const [_key, ship] of Object.entries(loadouts)) {
        for (const _type of Object.keys(ship.components)) {
          allTypes.add(_type);
        }
      }
      for (const _type of allTypes) {
        expect(VALID_COMPONENT_TYPES).toContain(_type);
      }
    });

    it('each component has name (n) and Chinese name (zh)', () => {
      for (const [_key, ship] of Object.entries(loadouts)) {
        for (const [_type, comps] of Object.entries(ship.components)) {
          expect(Array.isArray(comps)).toBe(true);
          for (const comp of comps) {
            expect(comp).toHaveProperty('n');
            expect(comp).toHaveProperty('zh');
            expect(typeof comp.n).toBe('string');
            expect(typeof comp.zh).toBe('string');
          }
        }
      }
    });

    it('each component has a non-empty name', () => {
      for (const [_key, ship] of Object.entries(loadouts)) {
        for (const [_type, comps] of Object.entries(ship.components)) {
          for (const comp of comps) {
            expect(comp.n.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('Chinese translations are non-empty strings', () => {
      for (const [_key, ship] of Object.entries(loadouts)) {
        for (const [_type, comps] of Object.entries(ship.components)) {
          for (const comp of comps) {
            expect(comp.zh.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('each component entry has a consistent structure', () => {
      for (const [_key, ship] of Object.entries(loadouts)) {
        for (const [_type, comps] of Object.entries(ship.components)) {
          for (const comp of comps) {
            expect(typeof comp.s).toBe('number');
            expect(comp.s).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });
  });
});
