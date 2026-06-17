/**
 * GET /api/commodity-prices/:id - Commodity prices with KV caching (dynamic route).
 * TTL: 1 hour (3600s)
 * KV Namespace: UEX_CACHE_PRICE
 */

import { handleCachedDynamicGet, errorResponse } from '../_shared/cache-helper.js';
import { TTL } from '../_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  return handleCachedDynamicGet(
    ctx,
    'commodity-prices',
    'UEX_CACHE_PRICE',
    TTL.PRICE_1H,
    '/commodity-prices/:id',
    (params) => {
      if (!params.id || !/^\d+$/.test(params.id)) {
        return errorResponse(400, 'Invalid commodity ID', 'ID must be a positive integer');
      }
      return null;
    }
  );
}
