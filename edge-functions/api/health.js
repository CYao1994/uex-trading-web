/**
 * GET /api/health - Health check (forwarded, NOT cached).
 * Must return real-time status; caching would mask backend issues.
 */

import { forwardToBackend, jsonResponse } from './_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  const { request } = ctx;
  const url = new URL(request.url);

  const backendResp = await forwardToBackend(request, '/health', url);
  if (!backendResp) {
    return jsonResponse(
      { status: 'degraded', message: 'Backend unreachable via Edge Function' },
      502,
      { 'X-Cache': 'BYPASS' }
    );
  }

  return new Response(backendResp.body, {
    status: backendResp.status,
    statusText: backendResp.statusText,
    headers: {
      ...Object.fromEntries(backendResp.headers.entries()),
      'X-Cache': 'BYPASS',
    },
  });
}
