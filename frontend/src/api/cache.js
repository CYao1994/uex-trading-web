// cache.js - localStorage 缓存管理
// TTL: 价格数据30分钟, 静态数据24小时

const CACHE_PREFIX = 'uex_cache:';

// 缓存TTL配置
export const CACHE_TTL = {
  // 价格数据：30分钟
  PRICE: 30 * 60 * 1000,       // 1800000ms
  // 静态数据（站点/商品/分类）：24小时
  STATIC: 24 * 60 * 60 * 1000, // 86400000ms
};

/**
 * 生成缓存key（参数排序保证一致性）
 */
function buildCacheKey(endpoint, params = {}) {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return `${CACHE_PREFIX}${endpoint}?${sorted}`;
}

/**
 * 获取缓存（未过期才返回）
 */
export function get(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const now = Date.now();

    if (now - entry.timestamp > entry.ttl) {
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * 获取缓存（即使过期也返回，用于SWR stale-while-revalidate）
 * Returns { data, expired } so caller knows if refresh is needed.
 */
export function getStale(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const now = Date.now();
    const expired = now - entry.timestamp > entry.ttl;

    return { data: entry.data, expired };
  } catch {
    return null;
  }
}

/**
 * 设置缓存
 */
export function set(key, data, ttl = CACHE_TTL.STATIC) {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // 存储空间满时，清理过期缓存后重试
    try {
      evictExpired();
      const entry = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // 仍然失败则放弃
    }
  }
}

/**
 * 清除所有UEX缓存
 */
export function clear() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // 忽略错误
  }
}

/**
 * 获取缓存统计信息
 */
export function getStats() {
  const stats = { count: 0, size: 0, entries: [] };

  try {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          stats.count += 1;
          stats.size += raw.length;
          try {
            const entry = JSON.parse(raw);
            stats.entries.push({
              key,
              age: now - entry.timestamp,
              ttl: entry.ttl,
              expired: now - entry.timestamp > entry.ttl,
            });
          } catch {
            // 解析失败
          }
        }
      }
    }
  } catch {
    // 忽略错误
  }

  return stats;
}

/**
 * 清理过期缓存
 */
function evictExpired() {
  try {
    const now = Date.now();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const entry = JSON.parse(raw);
            if (now - entry.timestamp > entry.ttl) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // 忽略错误
  }
}

export { buildCacheKey };

export default { get, getStale, set, clear, getStats, buildCacheKey, CACHE_TTL };
