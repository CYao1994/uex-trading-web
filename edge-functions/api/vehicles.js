/**
 * GET /api/vehicles - Vehicle search with KV caching.
 * TTL: 6 hours (21600s)
 * KV Namespace: UEX_CACHE_STATIC
 */

import { handleCachedGet, errorResponse } from './_shared/cache-helper.js';
import { TTL } from './_shared/cache-helper.js';
import { validateParams, SCHEMAS } from './_shared/validate.js';

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const params = { q: url.searchParams.get('q') || '' };

  // Validate query params
  const { valid, errors } = validateParams(params, SCHEMAS.searchQuery);
  if (!valid) {
    return errorResponse(400, 'Validation failed', errors.join('; '));
  }

  return handleCachedGet(
    ctx,
    'vehicles',
    'UEX_CACHE_STATIC',
    TTL.STATIC_6H,
    '/vehicles',
    () => params
  );
}
