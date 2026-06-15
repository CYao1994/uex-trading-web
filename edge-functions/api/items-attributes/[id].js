/**
 * GET /api/items-attributes/:id - Single item attributes with KV caching (dynamic route).
 * TTL: 6 hours (21600s)
 * KV Namespace: UEX_CACHE_STATIC
 */

import { handleCachedDynamicGet, errorResponse } from '../_shared/cache-helper.js';
import { TTL } from '../_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  return handleCachedDynamicGet(
    ctx,
    'items-attributes',
    'UEX_CACHE_STATIC',
    TTL.STATIC_6H,
    '/items-attributes/:id',
    (params) => {
      if (!params.id || !/^\d+$/.test(params.id)) {
        return errorResponse(400, 'Invalid item ID', 'ID must be a positive integer');
      }
      return null;
    }
  );
}
