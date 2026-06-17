/**
 * POST /api/feedback - User feedback submission (pass-through, NOT cached).
 * Feedback data is unique and user-specific.
 */

import { passthroughToBackend, errorResponse } from './_shared/cache-helper.js';
import { validateParams, SCHEMAS } from './_shared/validate.js';

export async function onRequestPost(ctx) {
  const { request } = ctx;
  const url = new URL(request.url);

  // Validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }
  const { valid, errors } = validateParams(body, SCHEMAS.feedback);
  if (!valid) {
    return errorResponse(400, 'Validation failed', errors.join('; '));
  }

  // Re-create request with body because request.json() consumed the stream
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return passthroughToBackend(newRequest, '/feedback' + (url.search || ''), url);
}
