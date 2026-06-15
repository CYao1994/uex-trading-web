/**
 * GET /api/warbonds - Warbond data with KV caching.
 * TTL: 4 hours (14400s)
 * KV Namespace: UEX_CACHE_STATIC
 */

import { handleCachedGet } from './_shared/cache-helper.js';
import { TTL } from './_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  return handleCachedGet(
    ctx,
    'warbonds',
    'UEX_CACHE_STATIC',
    TTL.STATIC_4H,
    '/warbonds',
    () => ({})
  );
}
