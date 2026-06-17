/**
 * POST /api/buy-route - Buy route planning (pass-through, NOT cached).
 */

import { passthroughToBackend } from './_shared/cache-helper.js';

export async function onRequestPost(ctx) {
  const { request } = ctx;
  const url = new URL(request.url);
  return passthroughToBackend(request, '/buy-route' + (url.search || ''), url);
}
