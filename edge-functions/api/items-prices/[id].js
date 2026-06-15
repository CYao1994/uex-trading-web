/**
 * GET /api/items-prices/:id - Single item prices with KV caching (dynamic route).
 * TTL: 1 hour (3600s)
 * KV Namespace: UEX_CACHE_PRICE
 */

import { handleCachedDynamicGet, errorResponse } from '../_shared/cache-helper.js';
import { TTL } from '../_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  return handleCachedDynamicGet(
    ctx,
    'items-prices',
    'UEX_CACHE_PRICE',
    TTL.PRICE_1H,
    '/items-prices/:id',
    (params) => {
      if (!params.id || !/^\d+$/.test(params.id)) {
        return errorResponse(400, 'Invalid item ID', 'ID must be a positive integer');
      }
      return null;
    }
  );
}
