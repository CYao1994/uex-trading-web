/**
 * GET /api/items - Item search with KV caching.
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
    id_category: url.searchParams.get('id_category') || '',
    limit: url.searchParams.get('limit') || '100',
  };

  // Validate query params
  const { valid, errors } = validateParams(params, SCHEMAS.itemsQuery);
  if (!valid) {
    return errorResponse(400, 'Validation failed', errors.join('; '));
  }

  return handleCachedGet(
    ctx,
    'items',
    'UEX_CACHE_STATIC',
    TTL.STATIC_6H,
    '/items',
    () => params
  );
}
