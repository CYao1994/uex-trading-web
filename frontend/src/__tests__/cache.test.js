import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i) => Object.keys(store)[i] || null),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

// Import after mocking
const { get, set, clear, buildCacheKey, CACHE_TTL, getStats } = await import('../api/cache');

describe('cache.js', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('buildCacheKey', () => {
    it('builds deterministic key from endpoint and params', () => {
      const key = buildCacheKey('/terminals', { q: 'lorville' });
      expect(key).toBe('uex_cache:/terminals?q=lorville');
    });

    it('sorts params for deterministic output', () => {
      const keyA = buildCacheKey('/items', { q: 'mineral', id_category: '5' });
      const keyB = buildCacheKey('/items', { id_category: '5', q: 'mineral' });
      expect(keyA).toBe(keyB);
    });

    it('handles CJK characters safely via encodeURIComponent', () => {
      const key = buildCacheKey('/locations', { q: '??' });
      expect(key).toContain('uex_cache:/locations?');
      expect(key).not.toMatch(/[^\x20-\x7E]/); // All ASCII
    });

    it('handles empty params', () => {
      const key = buildCacheKey('/warbonds', {});
      expect(key).toBe('uex_cache:/warbonds?');
    });
  });

  describe('get / set', () => {
    it('stores and retrieves data', () => {
      set('uex_cache:test', { items: [1, 2, 3] }, CACHE_TTL.STATIC);
      const data = get('uex_cache:test');
      expect(data).toEqual({ items: [1, 2, 3] });
    });

    it('returns null for expired data', () => {
      // Manually insert an expired entry
      const expiredEntry = {
        data: { old: true },
        timestamp: Date.now() - CACHE_TTL.PRICE - 1000,
        ttl: CACHE_TTL.PRICE,
      };
      localStorageMock.setItem('uex_cache:expired', JSON.stringify(expiredEntry));

      const result = get('uex_cache:expired');
      expect(result).toBeNull();
    });

    it('returns null for missing data', () => {
      expect(get('uex_cache:nonexistent')).toBeNull();
    });
  });

  describe('CACHE_TTL', () => {
    it('PRICE TTL is 30 minutes', () => {
      expect(CACHE_TTL.PRICE).toBe(30 * 60 * 1000);
    });

    it('STATIC TTL is 24 hours', () => {
      expect(CACHE_TTL.STATIC).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('clear', () => {
    it('removes only UEX cache entries', () => {
      set('uex_cache:test1', { a: 1 }, CACHE_TTL.STATIC);
      localStorageMock.setItem('other_app_data', 'keep this');

      clear();

      expect(get('uex_cache:test1')).toBeNull();
      expect(localStorageMock.getItem('other_app_data')).toBe('keep this');
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      set('uex_cache:stat_test', { data: true }, CACHE_TTL.STATIC);
      const stats = getStats();
      expect(stats.count).toBeGreaterThanOrEqual(1);
    });
  });
});
