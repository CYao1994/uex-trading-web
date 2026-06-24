/**
 * EdgeOne KV Cache Helper
 * Shared utilities for Edge Functions KV caching layer.
 *
 * KV Key constraints: alphanumeric + underscore only, ? 512 bytes.
 * All KV operations wrapped in try/catch for graceful degradation.
 */

// ??? TTL Constants (seconds) ????????????????????????????????????????????????

export const TTL = {
  STATIC_6H: 21600,      // 6 hours - terminals, commodities, vehicles, locations, items, item-attrs
  STATIC_4H: 14400,      // 4 hours - warbonds
  STATIC_24H: 86400,     // 24 hours - categories-attrs
  PRICE_1H: 3600,        // 1 hour - prices (was 2h, reduced for fresher data)
};

// ??? KV Key Sanitization ????????????????????????????????????????????????????

/**
 * Sanitize an arbitrary string to a KV-safe key.
 * KV only allows [a-zA-Z0-9_], so we base64url-encode the UTF-8 bytes.
 *
 * @param {string} str - Input string (may contain any characters including CJK)
 * @returns {string} KV-safe alphanumeric key
 */
export function sanitizeKVKey(str) {
  if (!str && str !== 0) return 'empty';
  const s = String(str);
  // Fast path: already alphanumeric + underscore
  if (/^[a-zA-Z0-9_]+$/.test(s) && s.length <= 200) return s;
  // Encode UTF-8 bytes ? base64url
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '_')
    .replace(/\//g, '-')
    .replace(/=/g, '');
}

// ??? Cache Key Builder ??????????????????????????????????????????????????????

/**
 * Build a deterministic, namespace-isolated cache key from endpoint name and query params.
 * The namespace prefix ensures keys from different KV namespaces cannot collide
 * even if endpoint names and params happen to overlap.
 *
 * Format: {namespace}::{endpoint}:{sorted_params}
 * Example: UEX_CACHE_PRICE::items-prices-all:id_category_19
 *
 * @param {string} endpoint - e.g. "terminals", "commodities"
 * @param {object} params - key-value pairs of query parameters
 * @param {string} [namespace=''] - KV namespace name for isolation
 * @returns {string} KV-safe cache key
 */
export function buildCacheKey(endpoint, params, namespace = '') {
  const parts = [];
  // Add namespace prefix for cross-namespace isolation
  if (namespace) {
    parts.push(sanitizeKVKey(namespace));
  }
  parts.push(endpoint);
  const sortedKeys = Object.keys(params || {}).sort();
  for (const key of sortedKeys) {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      parts.push(key + '_' + sanitizeKVKey(String(val)));
    }
  }
  // If no params (beyond namespace+endpoint), use "all" to distinguish from empty
  if (parts.length === (namespace ? 2 : 1)) parts.push('all');
  return parts.join(':');
}

// ??? KV Read/Write ??????????????????????????????????????????????????????????

/**
 * Read from KV cache. Returns parsed JSON value or null on miss/error.
 *
 * @param {object} env - Edge Function environment (contains KV bindings)
 * @param {string} namespace - KV namespace name (e.g. "UEX_CACHE_STATIC")
 * @param {string} key - Cache key
 * @returns {Promise<object|null>} Parsed cache entry or null
 */
export async function getFromKV(env, namespace, key) {
  if (!env || !env[namespace]) return null;
  try {
    const raw = await env[namespace].get(key, { type: 'json' });
    return raw;
  } catch (e) {
    console.warn(`[KV] Read failed for ${namespace}:${key}:`, e.message);
    return null;
  }
}

/**
 * Write to KV cache.
 * By default fire-and-forget (does NOT await) - suitable for non-critical writes.
 * Pass { await: true } in options for critical paths where write must succeed.
 *
 * @param {object} env - Edge Function environment
 * @param {string} namespace - KV namespace name
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (will be wrapped with metadata)
 * @param {number} ttlSeconds - Expiration TTL in seconds
 * @param {object} [options] - { await: boolean } - if true, await the write and throw on failure
 */
export function putToKV(env, namespace, key, data, ttlSeconds, options = {}) {
  if (!env || !env[namespace]) {
    console.warn(`[KV] Write skipped: namespace "${namespace}" not available`);
    return;
  }
  const cacheData = {
    data,
    cached_at: Date.now(),
    ttl: ttlSeconds,
  };
  const writePromise = env[namespace].put(key, JSON.stringify(cacheData), { expirationTtl: ttlSeconds });

  if (options.await) {
    // Critical path: await and log errors prominently
    return writePromise.catch(e => {
      console.error(`[KV] Write FAILED for ${namespace}:${key}:`, e.message);
      throw e;
    });
  }

  // Fire-and-forget: log warnings but don't block
  writePromise.catch(e => {
    console.warn(`[KV] Write failed for ${namespace}:${key}:`, e.message);
  });
}

/**
 * List KV keys with an optional prefix filter.
 *
 * @param {object} env - Edge Function environment
 * @param {string} namespace - KV namespace name
 * @param {string} prefix - Optional key prefix filter
 * @returns {Promise<Array>} Array of { name, expiration, metadata } objects
 */
export async function listKVKeys(env, namespace, prefix) {
  if (!env || !env[namespace]) return [];
  try {
    const result = await env[namespace].list(prefix ? { prefix } : {});
    return result.keys || [];
  } catch (e) {
    console.warn(`[KV] List failed for ${namespace}:`, e.message);
    return [];
  }
}

/**
 * Delete a single KV key (fire-and-forget).
 *
 * @param {object} env - Edge Function environment
 * @param {string} namespace - KV namespace name
 * @param {string} key - Cache key to delete
 */
export function deleteKVKey(env, namespace, key) {
  if (!env || !env[namespace]) return;
  env[namespace].delete(key)
    .catch(e => console.warn(`[KV] Delete failed for ${namespace}:${key}:`, e.message));
}

// ??? Response Helpers ???????????????????????????????????????????????????????

/**
 * Create a JSON response with standard headers.
 *
 * @param {*} data - Data to serialize as JSON
 * @param {number} status - HTTP status code
 * @param {object} extraHeaders - Additional headers
 * @returns {Response}
 */
export function jsonResponse(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  });
}

/**
 * Create an error JSON response.
 *
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} detail - Optional error detail
 * @returns {Response}
 */
export function errorResponse(status, message, detail) {
  return jsonResponse(
    { error: message, detail: detail || '' },
    status
  );
}

// ??? Backend Forwarding ?????????????????????????????????????????????????????

/**
 * Forward request to Python backend at /backend/* path.
 * Returns the backend response or null on network error.
 *
 * @param {Request} request - Original request
 * @param {string} backendPath - Backend path (e.g. "/terminals")
 * @param {URL} url - Parsed request URL (for origin)
 * @returns {Promise<Response|null>}
 */
export async function forwardToBackend(request, backendPath, url) {
  const backendUrl = new URL('/backend' + backendPath + (url.search || ''), url.origin);
  const method = request.method;
  const fetchOpts = {
    method,
    headers: { 'Accept': 'application/json' },
  };
  // Pass Content-Type header if present
  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    fetchOpts.headers['Content-Type'] = contentType;
  }
  // Include body for methods that support it
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    fetchOpts.body = request.body;
  }
  try {
    return await fetch(backendUrl.toString(), fetchOpts);
  } catch (e) {
    console.error(`[Backend] Fetch failed for ${backendPath}:`, e.message);
    return null;
  }
}

/**
 * Passthrough: forward request to backend and return response as-is.
 * Used for POST endpoints that should not be cached.
 *
 * @param {Request} request - Original request
 * @param {string} backendPath - Backend path
 * @param {URL} url - Parsed request URL
 * @returns {Promise<Response>}
 */
export async function passthroughToBackend(request, backendPath, url) {
  const backendResp = await forwardToBackend(request, backendPath, url);
  if (!backendResp) {
    return errorResponse(503, 'Backend unavailable', 'Failed to reach Python backend');
  }
  // Stream the response body through
  return new Response(backendResp.body, {
    status: backendResp.status,
    statusText: backendResp.statusText,
    headers: backendResp.headers,
  });
}

// ??? Generic Cached GET Handler ????????????????????????????????????????????

/**
 * Generic handler for cached GET endpoints.
 *
 * @param {object} ctx - { request, env, params } from onRequestGet
 * @param {string} endpointName - Cache key prefix (e.g. "terminals")
 * @param {string} kvNamespace - KV namespace name (e.g. "UEX_CACHE_STATIC")
 * @param {number} ttl - Cache TTL in seconds
 * @param {string} backendPath - Backend path (e.g. "/terminals")
 * @param {function} buildParams - (url) => query-params object for cache key
 * @returns {Promise<Response>}
 */
export async function handleCachedGet(ctx, endpointName, kvNamespace, ttl, backendPath, buildParams) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === 'true';
  const params = buildParams ? buildParams(url) : Object.fromEntries(url.searchParams.entries());
  const cacheKey = buildCacheKey(endpointName, params, kvNamespace);

  // ?? Check KV cache ??
  if (!refresh) {
    const cached = await getFromKV(env, kvNamespace, cacheKey);
    if (cached && cached.data !== undefined) {
      return jsonResponse(cached.data, 200, {
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey,
        'Cache-Control': 'public, max-age=300',
      });
    }
  }

  // ?? Forward to Python backend ??
  const backendResp = await forwardToBackend(request, backendPath, url);
  if (!backendResp) {
    return errorResponse(503, 'Backend unavailable', 'Failed to reach Python backend');
  }
  if (!backendResp.ok) {
    // Pass through backend errors as-is
    try {
      const errData = await backendResp.json();
      return jsonResponse(errData, backendResp.status);
    } catch {
      return errorResponse(backendResp.status, 'Backend error');
    }
  }

  let data;
  try {
    data = await backendResp.json();
  } catch {
    return errorResponse(502, 'Invalid backend response');
  }

  // ?? Write KV cache (fire-and-forget) — skip empty/error results ??
  const hasData1 = Array.isArray(data) ? data.length > 0 : (data && typeof data === 'object' && Object.keys(data).length > 0);
  if (hasData1) {
    putToKV(env, kvNamespace, cacheKey, data, ttl);
  }

  return jsonResponse(data, 200, {
    'X-Cache': 'MISS',
    'X-Cache-Key': cacheKey,
    'Cache-Control': 'public, max-age=300',
  });
}

/**
 * Generic handler for cached GET with dynamic route params.
 *
 * @param {object} ctx - { request, env, params } from onRequestGet
 * @param {string} endpointName - Cache key prefix
 * @param {string} kvNamespace - KV namespace name
 * @param {number} ttl - Cache TTL in seconds
 * @param {string} backendPath - Backend path with :param placeholder
 * @param {function} validate - (params) => errorResponse or null if valid
 * @returns {Promise<Response>}
 */
export async function handleCachedDynamicGet(ctx, endpointName, kvNamespace, ttl, backendPath, validate) {
  const { request, env, params } = ctx;
  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === 'true';

  // Validate params
  if (validate) {
    const validationError = validate(params);
    if (validationError) return validationError;
  }

  const cacheKey = buildCacheKey(endpointName, params, kvNamespace);

  // ?? Check KV cache ??
  if (!refresh) {
    const cached = await getFromKV(env, kvNamespace, cacheKey);
    if (cached && cached.data !== undefined) {
      return jsonResponse(cached.data, 200, {
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey,
        'Cache-Control': 'public, max-age=300',
      });
    }
  }

  // ?? Forward to Python backend ??
  // Interpolate path params into backendPath (e.g. "/commodity-prices/:id" ? "/commodity-prices/123")
  let resolvedPath = backendPath;
  for (const [key, value] of Object.entries(params || {})) {
    resolvedPath = resolvedPath.replace(':' + key, encodeURIComponent(value));
  }

  const backendUrl = new URL('/backend' + resolvedPath + (url.search || ''), url.origin);
  let backendResp;
  try {
    backendResp = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  } catch (e) {
    return errorResponse(503, 'Backend unavailable', e.message);
  }
  if (!backendResp.ok) {
    try {
      const errData = await backendResp.json();
      return jsonResponse(errData, backendResp.status);
    } catch {
      return errorResponse(backendResp.status, 'Backend error');
    }
  }

  let data;
  try {
    data = await backendResp.json();
  } catch {
    return errorResponse(502, 'Invalid backend response');
  }

  // ?? Write KV cache (fire-and-forget) — skip empty/error results ??
  const hasData2 = Array.isArray(data) ? data.length > 0 : (data && typeof data === 'object' && Object.keys(data).length > 0);
  if (hasData2) {
    putToKV(env, kvNamespace, cacheKey, data, ttl);
  }

  return jsonResponse(data, 200, {
    'X-Cache': 'MISS',
    'X-Cache-Key': cacheKey,
    'Cache-Control': 'public, max-age=300',
  });
}
