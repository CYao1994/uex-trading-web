import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const miningData = JSON.parse(readFileSync(resolve('public/data/mining-data.json'), 'utf-8'));

describe('mining-data.json', () => {
  it('has a minerals array', () => {
    expect(miningData).toHaveProperty('minerals');
    expect(Array.isArray(miningData.minerals)).toBe(true);
    expect(miningData.minerals.length).toBeGreaterThan(0);
  });

  describe('mineral entries', () => {
    it('each mineral has required string fields', () => {
      for (const mineral of miningData.minerals) {
        expect(mineral).toHaveProperty('name');
        expect(mineral).toHaveProperty('rawName');
        expect(typeof mineral.name).toBe('string');
        expect(typeof mineral.rawName).toBe('string');
        expect(mineral.name.length).toBeGreaterThan(0);
        expect(mineral.rawName.length).toBeGreaterThan(0);
      }
    });

    it('each mineral has required numeric fields', () => {
      const requiredFields = [
        'elementInstability',
        'elementResistance',
        'elementOptimalWindowMidpoint',
        'elementOptimalWindowMidpointRandomness',
        'elementOptimalWindowThinness',
        'elementExplosionMultiplier',
        'elementClusterFactor',
      ];
      for (const mineral of miningData.minerals) {
        for (const field of requiredFields) {
          expect(mineral).toHaveProperty(field);
          expect(typeof mineral[field]).toBe('number');
        }
      }
    });

    it('elementInstability is non-negative', () => {
      for (const mineral of miningData.minerals) {
        expect(mineral.elementInstability).toBeGreaterThanOrEqual(0);
      }
    });

    it('elementOptimalWindowMidpoint is between 0 and 1', () => {
      for (const mineral of miningData.minerals) {
        expect(mineral.elementOptimalWindowMidpoint).toBeGreaterThanOrEqual(0);
        expect(mineral.elementOptimalWindowMidpoint).toBeLessThanOrEqual(1);
      }
    });

    it('elementOptimalWindowMidpointRandomness is between 0 and 1', () => {
      for (const mineral of miningData.minerals) {
        expect(mineral.elementOptimalWindowMidpointRandomness).toBeGreaterThanOrEqual(0);
        expect(mineral.elementOptimalWindowMidpointRandomness).toBeLessThanOrEqual(1);
      }
    });

    it('elementClusterFactor is between 0 and 1', () => {
      for (const mineral of miningData.minerals) {
        expect(mineral.elementClusterFactor).toBeGreaterThanOrEqual(0);
        expect(mineral.elementClusterFactor).toBeLessThanOrEqual(1);
      }
    });

    it('mineral names are unique', () => {
      const names = miningData.minerals.map(m => m.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('rawName fields are unique', () => {
      const rawNames = miningData.minerals.map(m => m.rawName);
      expect(new Set(rawNames).size).toBe(rawNames.length);
    });
  });
});
