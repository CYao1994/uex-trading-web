import { passthroughToBackend } from '../_shared/cache-helper.js';

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  return passthroughToBackend(ctx.request, '/debug/terminal-fields', url);
}
