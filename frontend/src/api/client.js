// client.js - API调用
import axios from 'axios';
import { getStale, set, buildCacheKey, CACHE_TTL } from './cache';

// 后端地址（前后端分离部署）
const API_BASE = import.meta.env.VITE_API_BASE || 'https://astrallance.com';

const api = axios.create({
  baseURL: API_BASE + '/api',
  timeout: 10000,
});

// === 自动重试拦截器 ===
// 仅对幂等方法(GET/HEAD/OPTIONS)重试，POST/PUT/DELETE不重试
// 仅在网络错误或5xx响应时重试，最多重试1次
const IDEMPOTENT_METHODS = ['get', 'head', 'options'];

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  // Skip retry for non-idempotent methods
  if (!IDEMPOTENT_METHODS.includes(config.method?.toLowerCase())) {
    return Promise.reject(error);
  }

  config.__retryCount = config.__retryCount || 0;

  // Only retry on network errors, timeouts, or 5xx
  const isRetryable = !error.response || error.response.status >= 500;
  if (!isRetryable || config.__retryCount >= 1) {
    return Promise.reject(error);
  }

  config.__retryCount += 1;
  await new Promise(resolve => setTimeout(resolve, 1000));
  return api(config);
});

// === Health signal interceptor ===
// Whenever ANY API call succeeds, the backend is clearly alive.
// Dispatch a custom event so BackendStatus can reset its fail counter.
api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('backend:alive'));
    return response;
  },
  undefined // error interceptor is above
);

// === 缓存策略 ===

/**
 * 根据API端点返回对应的TTL
 * @param {string} endpoint - API端点路径
 * @returns {number} TTL秒数
 */
function getTTLForEndpoint(endpoint) {
  // 价格数据：15分钟TTL
  if (endpoint.includes('commodity-prices') || endpoint.includes('prices')) {
    return CACHE_TTL.PRICE;
  }
  // 静态数据(终端/商品/飞船等不常变化的数据)：24小时TTL
  return CACHE_TTL.STATIC;
}

/**
 * SWR pattern GET request: return cached data immediately, refresh in background.
 * @param {string} endpoint - API endpoint path
 * @param {object} params - query params
 * @param {boolean} refresh - force bypass cache and revalidate
 * @param {number|null} timeoutOverride - request timeout (ms)
 */
async function cachedGet(endpoint, params = {}, refresh = false, timeoutOverride = null) {
  const cacheKey = buildCacheKey(endpoint, params);

  if (!refresh) {
    const stale = getStale(cacheKey);
    if (stale !== null) {
      // Return stale/valid cache immediately
      if (!stale.expired) {
        // Cache is fresh — fire background refresh (fire-and-forget)
        _bgRefresh(endpoint, params, cacheKey, timeoutOverride);
        return { data: stale.data, __fromCache: true };
      }
      // Cache exists but is stale — return stale data + fetch fresh in background
      _bgRefresh(endpoint, params, cacheKey, timeoutOverride);
      return { data: stale.data, __fromCache: true, __stale: true };
    }
  }

  // No cache or forced refresh — fetch synchronously
  const requestParams = refresh ? { ...params, refresh: 'true' } : params;
  const response = await api.get(endpoint, { params: requestParams, ...(timeoutOverride ? { timeout: timeoutOverride } : {}) });
  const ttl = getTTLForEndpoint(endpoint);
  set(cacheKey, response.data, ttl);
  return response;
}

/**
 * Background refresh: fetch data and update cache silently.
 * Errors are swallowed — user already has stale data.
 */
async function _bgRefresh(endpoint, params, cacheKey, timeoutOverride) {
  try {
    const response = await api.get(endpoint, { params, ...(timeoutOverride ? { timeout: timeoutOverride } : {}) });
    const ttl = getTTLForEndpoint(endpoint);
    set(cacheKey, response.data, ttl);
  } catch {
    // Background refresh failed — stale data still served, silent fail
  }
}

// === 业务API接口 ===

export const sellRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/sell-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {}, timeout: 30000 });

export const buyRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/buy-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {}, timeout: 30000 });

export const searchTerminals = (q, refresh = false) =>
  cachedGet('/terminals', { q }, refresh, 30000);

export const searchCommodities = (q, refresh = false) =>
  cachedGet('/commodities', { q }, refresh, 30000);

// Load all commodities once, then filter locally
let _allCommoditiesCache = null;
let _allCommoditiesPromise = null;

export async function loadAllCommodities() {
  if (_allCommoditiesCache) return _allCommoditiesCache;
  if (_allCommoditiesPromise) return _allCommoditiesPromise;

  _allCommoditiesPromise = cachedGet('/commodities', { q: '' }, false, 30000)
    .then(res => {
      _allCommoditiesCache = res.data || [];
      _allCommoditiesPromise = null;
      return _allCommoditiesCache;
    })
    .catch(() => {
      _allCommoditiesPromise = null;
      return [];
    });

  return _allCommoditiesPromise;
}

export const getWarbonds = (refresh = false) =>
  cachedGet('/warbonds', {}, refresh, 60000);

export const getCacheStats = () =>
  api.get('/cache/stats');

export const clearCache = () =>
  api.post('/cache/clear');

export const searchLocations = (q, refresh = false) =>
  cachedGet('/locations', { q }, refresh);

// Load all terminals once, then filter locally (avoids per-keystroke API calls)
let _allTerminalsCache = null;
let _allTerminalsPromise = null;

export async function loadAllTerminals() {
  if (_allTerminalsCache) return _allTerminalsCache;
  if (_allTerminalsPromise) return _allTerminalsPromise;

  _allTerminalsPromise = cachedGet('/terminals', { q: '' }, false, 30000)
    .then(res => {
      _allTerminalsCache = res.data || [];
      _allTerminalsPromise = null;
      return _allTerminalsCache;
    })
    .catch(() => {
      _allTerminalsPromise = null;
      return [];
    });

  return _allTerminalsPromise;
}

export const searchVehicles = (q, refresh = false) =>
  cachedGet('/vehicles', { q }, refresh);

// Load all vehicles in a single request (backend returns all when q is empty)
let _allVehiclesCache = null;
let _allVehiclesPromise = null;

export async function loadAllVehicles() {
  if (_allVehiclesCache) return _allVehiclesCache;
  if (_allVehiclesPromise) return _allVehiclesPromise;

  _allVehiclesPromise = cachedGet('/vehicles', { q: '' }, false, 30000)
    .then(res => {
      _allVehiclesCache = (res.data || []).filter(v => (v.scu || 0) > 0);
      _allVehiclesPromise = null;
      return _allVehiclesCache;
    })
    .catch(() => {
      _allVehiclesPromise = null;
      return [];
    });

  return _allVehiclesPromise;
}

export const tradeChain = (params, refresh = false) =>
  api.post('/trade-chain', params, {
    params: refresh ? { refresh: true } : {},
    timeout: 120000,
  });

export const submitFeedback = (data) =>
  api.post('/feedback', data);

// === Ship Items API ===
export const searchItems = (params, refresh = false) =>
  cachedGet('/items', params, refresh);

export const getItemPrices = (itemId, refresh = false) =>
  cachedGet(`/items-prices/${itemId}`, {}, refresh);

export const getItemAttributes = (itemId, refresh = false) =>
  cachedGet(`/items-attributes/${itemId}`, {}, refresh);

// === Ship Items Batch API ===
export const getItemsPricesAll = (idCategory, refresh = false) =>
  cachedGet('/items-prices-all', { id_category: idCategory }, refresh);

export const getItemsAttributesByCategory = (idCategory, refresh = false) =>
  cachedGet('/items-attributes', { id_category: idCategory }, refresh);

export const getCategoriesAttributes = (idCategory, refresh = false) =>
  cachedGet('/categories-attributes', { id_category: idCategory }, refresh);

export default api;
