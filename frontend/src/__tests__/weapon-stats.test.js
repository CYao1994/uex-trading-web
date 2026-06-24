import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const weaponStats = JSON.parse(readFileSync(resolve('public/data/weapon-type-stats.json'), 'utf-8'));

const VALID_DAMAGE_TYPES = ['physical', 'energy', 'distortion', 'emp', 'thermal', 'plasma', 'quantum'];

describe('weapon-type-stats.json', () => {
  it('has top-level structure', () => {
    expect(weaponStats).toHaveProperty('generated_at');
    expect(weaponStats).toHaveProperty('total_types');
    expect(weaponStats).toHaveProperty('stats');
    expect(Array.isArray(weaponStats.stats)).toBe(true);
  });

  it('total_types matches stats array length', () => {
    expect(weaponStats.total_types).toBe(weaponStats.stats.length);
  });

  it('has at least one weapon type', () => {
    expect(weaponStats.stats.length).toBeGreaterThan(0);
  });

  describe('weapon stat entries', () => {
    it('each stat has required fields', () => {
      for (const stat of weaponStats.stats) {
        expect(stat).toHaveProperty('type');
        expect(stat).toHaveProperty('size');
        expect(stat).toHaveProperty('count');
        expect(stat).toHaveProperty('damage_min');
        expect(stat).toHaveProperty('damage_max');
        expect(stat).toHaveProperty('rpm');
        expect(stat).toHaveProperty('dps_min');
        expect(stat).toHaveProperty('dps_max');
        expect(stat).toHaveProperty('damage_type');
      }
    });

    it('DPS values are non-negative', () => {
      for (const stat of weaponStats.stats) {
        expect(stat.dps_min).toBeGreaterThanOrEqual(0);
        expect(stat.dps_max).toBeGreaterThanOrEqual(0);
      }
    });

    it('damage_min is less than or equal to damage_max', () => {
      for (const stat of weaponStats.stats) {
        expect(stat.damage_min).toBeLessThanOrEqual(stat.damage_max);
      }
    });

    it('dps_min is less than or equal to dps_max', () => {
      for (const stat of weaponStats.stats) {
        expect(stat.dps_min).toBeLessThanOrEqual(stat.dps_max);
      }
    });

    it('RPM values are within game-accurate ranges', () => {
      for (const stat of weaponStats.stats) {
        expect(stat.rpm).toBeGreaterThan(0);
        expect(stat.rpm).toBeLessThanOrEqual(15000);
      }
    });

    it('size values are non-negative integers', () => {
      for (const stat of weaponStats.stats) {
        expect(Number.isInteger(stat.size)).toBe(true);
        expect(stat.size).toBeGreaterThanOrEqual(0);
      }
    });

    it('count is a positive integer', () => {
      for (const stat of weaponStats.stats) {
        expect(Number.isInteger(stat.count)).toBe(true);
        expect(stat.count).toBeGreaterThan(0);
      }
    });

    it('damage_type is a recognized type', () => {
      for (const stat of weaponStats.stats) {
        expect(VALID_DAMAGE_TYPES).toContain(stat.damage_type);
      }
    });

    it('no duplicate type+size combinations', () => {
      const keys = weaponStats.stats.map(s => `${s.type}_${s.size}`);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
