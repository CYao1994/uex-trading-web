import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = JSON.parse(readFileSync(resolve('public/data/blueprints-catalog.json'), 'utf-8'));

describe('blueprints-catalog.json', () => {
  it('has top-level structure', () => {
    expect(catalog).toHaveProperty('generated_at');
    expect(catalog).toHaveProperty('total_blueprints');
    expect(catalog).toHaveProperty('categories');
    expect(catalog).toHaveProperty('blueprints');
    expect(typeof catalog.categories).toBe('object');
    expect(Array.isArray(catalog.blueprints)).toBe(true);
  });

  it('total_blueprints matches actual blueprint count', () => {
    expect(catalog.total_blueprints).toBe(catalog.blueprints.length);
  });

  it('category counts add up to total_blueprints', () => {
    const sum = Object.values(catalog.categories)
      .reduce((acc, cat) => acc + cat.count, 0);
    expect(sum).toBe(catalog.total_blueprints);
  });

  describe('categories', () => {
    it('each category has name_en, name_zh, and count', () => {
      for (const [_key, cat] of Object.entries(catalog.categories)) {
        expect(cat).toHaveProperty('name_en');
        expect(cat).toHaveProperty('name_zh');
        expect(typeof cat.name_en).toBe('string');
        expect(typeof cat.name_zh).toBe('string');
        expect(typeof cat.count).toBe('number');
        expect(cat.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('Chinese translations exist for all categories', () => {
      for (const [_key, cat] of Object.entries(catalog.categories)) {
        expect(cat.name_zh.length).toBeGreaterThan(0);
      }
    });

    it('has at least one category', () => {
      const _keys = Object.keys(catalog.categories);
      expect(_keys.length).toBeGreaterThan(0);
    });
  });

  describe('blueprints', () => {
    it('each blueprint has required fields', () => {
      for (const bp of catalog.blueprints) {
        expect(bp).toHaveProperty('id');
        expect(bp).toHaveProperty('name_en');
        expect(bp).toHaveProperty('category');
        expect(bp).toHaveProperty('craft_time_seconds');
        expect(bp).toHaveProperty('materials');
        expect(Array.isArray(bp.materials)).toBe(true);
      }
    });

    it('each blueprint has a non-empty id', () => {
      for (const bp of catalog.blueprints) {
        expect(typeof bp.id).toBe('string');
        expect(bp.id.length).toBeGreaterThan(0);
      }
    });

    it('craft_time_seconds is a non-negative number', () => {
      for (const bp of catalog.blueprints) {
        expect(typeof bp.craft_time_seconds).toBe('number');
        expect(bp.craft_time_seconds).toBeGreaterThanOrEqual(0);
      }
    });

    it('each blueprint category matches a known category _key', () => {
      const validCategories = new Set(Object.keys(catalog.categories));
      for (const bp of catalog.blueprints) {
        expect(validCategories.has(bp.category)).toBe(true);
      }
    });

    it('each blueprint has at least one material', () => {
      for (const bp of catalog.blueprints) {
        expect(bp.materials.length).toBeGreaterThan(0);
      }
    });

    it('each material has required fields', () => {
      for (const bp of catalog.blueprints) {
        for (const mat of bp.materials) {
          expect(mat).toHaveProperty('slot');
          expect(mat).toHaveProperty('resource_id');
          expect(mat).toHaveProperty('quantity_scu');
          expect(typeof mat.slot).toBe('string');
          expect(typeof mat.resource_id).toBe('string');
          expect(typeof mat.quantity_scu).toBe('number');
        }
      }
    });

    it('material quantity_scu is a positive number', () => {
      for (const bp of catalog.blueprints) {
        for (const mat of bp.materials) {
          expect(mat.quantity_scu).toBeGreaterThan(0);
        }
      }
    });

    it('blueprint ids are unique', () => {
      const ids = catalog.blueprints.map(bp => bp.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
