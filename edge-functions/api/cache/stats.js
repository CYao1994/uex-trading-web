/**
 * GET /api/cache/stats - KV cache statistics.
 * Returns key counts and sample entries for each namespace.
 */

import { jsonResponse, errorResponse, listKVKeys } from '../_shared/cache-helper.js';

const KV_NAMESPACES = ['UEX_CACHE_STATIC', 'UEX_CACHE_PRICE'];

export async function onRequestGet(ctx) {
  const { env } = ctx;

  try {
    const stats = {};

    for (const ns of KV_NAMESPACES) {
      const keys = await listKVKeys(env, ns);
      stats[ns] = {
        key_count: keys.length,
        sample_keys: keys.slice(0, 20).map(k => ({
          name: k.name,
          expiration: k.expiration || null,
        })),
      };
    }

    stats.total_keys = stats.UEX_CACHE_STATIC.key_count + stats.UEX_CACHE_PRICE.key_count;
    stats.timestamp = Date.now();

    return jsonResponse(stats);
  } catch (e) {
    return errorResponse(500, 'Failed to fetch cache stats', e.message);
  }
}
