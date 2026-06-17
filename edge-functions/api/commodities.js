/**
 * GET /api/commodities - Commodity search with KV caching.
 * TTL: 6 hours (21600s)
 * KV Namespace: UEX_CACHE_STATIC
 */

import { handleCachedGet, errorResponse } from './_shared/cache-helper.js';
import { TTL } from './_shared/cache-helper.js';
import { validateParams, SCHEMAS } from './_shared/validate.js';

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const params = {
    q: url.searchParams.get('q') || '',
    limit: url.searchParams.get('limit') || '50',
  };

  // Validate query params
  const { valid, errors } = validateParams(params, SCHEMAS.commoditiesQuery);
  if (!valid) {
    return errorResponse(400, 'Validation failed', errors.join('; '));
  }

  return handleCachedGet(
    ctx,
    'commodities',
    'UEX_CACHE_STATIC',
    TTL.STATIC_6H,
    '/commodities',
    () => params
  );
}
