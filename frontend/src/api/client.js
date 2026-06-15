// client.js - ??:??10? + ??1???? + localStorage????
import axios from 'axios';
import { get, set, buildCacheKey, CACHE_TTL } from './cache';

// EdgeOne Pages ????:???????,API ??? /api
// ?????,Vite proxy ?? /api -> localhost:8000
const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10? - ????,??????
});

// === ????? ===
// ??????(GET/HEAD/OPTIONS)??,??POST/PUT/DELETE??
// ???????????????????
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

// === ???? ===

/**
 * ??API?????TTL
 * @param {string} endpoint - API????
 * @returns {number} TTL???
 */
function getTTLForEndpoint(endpoint) {
  // ????:15??TTL
  if (endpoint.includes('commodity-prices') || endpoint.includes('prices')) {
    return CACHE_TTL.PRICE;
  }
  // ????(????????????????):24??TTL
  return CACHE_TTL.STATIC;
}

/**
 * ????GET??
 * @param {string} endpoint - API??
 * @param {object} params - ????
 * @param {boolean} refresh - ??????
 * @param {number|null} timeoutOverride - ???????(??)
 * @returns {Promise} axios??
 */
async function cachedGet(endpoint, params = {}, refresh = false, timeoutOverride = null) {
  // refresh=true ?????
  if (!refresh) {
    const cacheKey = buildCacheKey(endpoint, params);
    const cachedData = get(cacheKey);
    if (cachedData !== null) {
      // ???axios?????????
      return { data: cachedData, __fromCache: true };
    }
  }

  const response = await api.get(endpoint, { params, ...(timeoutOverride ? { timeout: timeoutOverride } : {}) });

  // ????(?????GET??)
  const cacheKey = buildCacheKey(endpoint, params);
  const ttl = getTTLForEndpoint(endpoint);
  set(cacheKey, response.data, ttl);

  return response;
}

// === ???API?? ===

export const sellRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/sell-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {} });

export const buyRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/buy-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {} });

export const searchTerminals = (q, refresh = false) =>
  cachedGet('/terminals', { q }, refresh, 20000);

export const searchCommodities = (q, refresh = false) =>
  cachedGet('/commodities', { q }, refresh, 20000);

export const getWarbonds = (refresh = false) =>
  cachedGet('/warbonds', {}, refresh);

export const getCacheStats = () =>
  api.get('/cache/stats');

export const clearCache = () =>
  api.post('/cache/clear');

export const searchLocations = (q, refresh = false) =>
  cachedGet('/locations', { q }, refresh);

export const searchVehicles = (q, refresh = false) =>
  cachedGet('/vehicles', { q }, refresh);

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
