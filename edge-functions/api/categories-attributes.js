/**
 * GET /api/categories-attributes - Category attribute definitions with KV caching.
 * TTL: 24 hours (86400s)
 * KV Namespace: UEX_CACHE_STATIC
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
    'categories-attributes',
    'UEX_CACHE_STATIC',
    TTL.STATIC_24H,
    '/categories-attributes',
    () => params
  );
}
