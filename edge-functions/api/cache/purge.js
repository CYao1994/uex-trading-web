/**
 * POST /api/cache/purge - Purge KV cache entries.
 *
 * Body:
 *   { "pattern": "terminals:*" }  - delete keys matching prefix pattern
 *   { "all": true }               - delete ALL keys in both namespaces
 *
 * Returns: { success: true, deleted: N }
 */

import { jsonResponse, errorResponse, listKVKeys, deleteKVKey } from '../_shared/cache-helper.js';

const KV_NAMESPACES = ['UEX_CACHE_STATIC', 'UEX_CACHE_PRICE'];

export async function onRequestPost(ctx) {
  const { request, env } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { pattern, all } = body;
  if (!pattern && !all) {
    return errorResponse(400, 'Missing parameter', 'Provide "pattern" or "all": true');
  }

  let deletedCount = 0;

  try {
    if (all) {
      // Purge all keys in both namespaces
      for (const ns of KV_NAMESPACES) {
        const keys = await listKVKeys(env, ns);
        for (const key of keys) {
          deleteKVKey(env, ns, key.name);
          deletedCount++;
        }
      }
    } else if (pattern) {
      // Parse pattern: "terminals:*" ? prefix="terminals:", suffix="*"
      const colonIdx = pattern.indexOf(':');
      let prefix = '';
      let suffix = '';

      if (colonIdx >= 0) {
        prefix = pattern.substring(0, colonIdx + 1); // include the colon
        suffix = pattern.substring(colonIdx + 1);
      } else {
        prefix = pattern;
      }

      const matchAll = suffix === '*';

      for (const ns of KV_NAMESPACES) {
        const keys = await listKVKeys(env, ns, prefix);
        for (const key of keys) {
          if (matchAll || key.name.endsWith(suffix) || key.name === pattern) {
            deleteKVKey(env, ns, key.name);
            deletedCount++;
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      deleted: deletedCount,
      pattern: pattern || null,
      all: all || false,
    });
  } catch (e) {
    return errorResponse(500, 'Purge failed', e.message);
  }
}
