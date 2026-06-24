import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const itemShopMap = JSON.parse(readFileSync(resolve('public/data/item-shop-map.json'), 'utf-8'));

describe('item-shop-map.json', () => {
  it('has top-level structure', () => {
    expect(itemShopMap).toHaveProperty('generated_at');
    expect(itemShopMap).toHaveProperty('total_items');
    expect(itemShopMap).toHaveProperty('item_shops');
    expect(typeof itemShopMap.item_shops).toBe('object');
  });

  it('total_items matches actual item count', () => {
    expect(itemShopMap.total_items).toBe(Object.keys(itemShopMap.item_shops).length);
  });

  it('has at least one item', () => {
    expect(Object.keys(itemShopMap.item_shops).length).toBeGreaterThan(0);
  });

  describe('shop entries', () => {
    it('each item has at least one shop listing', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        expect(Array.isArray(shops)).toBe(true);
        expect(shops.length).toBeGreaterThan(0);
      }
    });

    it('each shop entry has required fields', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        for (const shop of shops) {
          expect(shop).toHaveProperty('shop');
          expect(shop).toHaveProperty('location');
          expect(shop).toHaveProperty('buy_price');
        }
      }
    });

    it('shop field is a non-empty string', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        for (const shop of shops) {
          expect(typeof shop.shop).toBe('string');
          expect(shop.shop.length).toBeGreaterThan(0);
        }
      }
    });

    it('location is a non-empty string', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        for (const shop of shops) {
          expect(typeof shop.location).toBe('string');
          expect(shop.location.length).toBeGreaterThan(0);
        }
      }
    });

    it('no negative buy prices', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        for (const shop of shops) {
          expect(shop.buy_price).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('buy prices are integers', () => {
      for (const [_itemId, shops] of Object.entries(itemShopMap.item_shops)) {
        for (const shop of shops) {
          expect(Number.isInteger(shop.buy_price)).toBe(true);
        }
      }
    });
  });
});
