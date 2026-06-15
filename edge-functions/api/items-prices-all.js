/**
 * GET /api/items-prices-all - Batch item prices with KV caching.
 * TTL: 2 hours (7200s)
 * KV Namespace: UEX_CACHE_PRICE
 */

import { handleCachedGet, errorResponse } from './_shared/cache-helper.js';
import { TTL } from './_shared/cache-helper.js';
import { validateParams, SCHEMAS } from './_shared/validate.js';

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const params = { id_category: url.searchParams.get('id_category') || '' };

  // Validate query params
  const { valid, errors } = validateParams(params, SCHEMAS.categoryQuery);
  if (!valid) {
    return errorResponse(400, 'Validation failed', errors.join('; '));
  }

  return handleCachedGet(
    ctx,
    'items-prices-all',
    'UEX_CACHE_PRICE',
    TTL.PRICE_1H,
    '/items-prices-all',
    () => params
  );
}
