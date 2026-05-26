import axios from 'axios';

// When deployed on Cloudflare Pages, API calls go to Railway backend
// When served by Railway (same origin), /api works as-is
// When in dev, Vite proxy handles /api -> localhost:8000
const RAILWAY_BACKEND_URL = 'https://uex-trading-web-production.up.railway.app';

// Determine API base URL based on environment
function getApiBaseURL() {
  // If running on Cloudflare Pages (different domain from Railway)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Cloudflare Pages domains: *.pages.dev or custom domain
    if (host.endsWith('.pages.dev') || (host !== 'uex-trading-web-production.up.railway.app' && !host.includes('localhost'))) {
      return RAILWAY_BACKEND_URL + '/api';
    }
  }
  // Same origin (Railway serves frontend) or local dev (Vite proxy)
  return '/api';
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 180000, // 3 min — route planning can take a while
});

export const sellRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/sell-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {} });

export const buyRoute = (origin, items, refresh = false, originId = null) =>
  api.post('/buy-route', { origin, items, ...(originId != null ? { origin_id: originId } : {}) }, { params: refresh ? { refresh: true } : {} });

export const searchTerminals = (q, refresh = false) =>
  api.get('/terminals', { params: { q, ...(refresh ? { refresh: true } : {}) } });

export const searchCommodities = (q, refresh = false) =>
  api.get('/commodities', { params: { q, ...(refresh ? { refresh: true } : {}) } });

export const getCommodityPrices = (commodityId, refresh = false) =>
  api.get(`/commodity-prices/${commodityId}`, { params: refresh ? { refresh: true } : {} });

export const getWarbonds = (refresh = false) =>
  api.get('/warbonds', { params: refresh ? { refresh: true } : {} });

export const getCacheStats = () =>
  api.get('/cache/stats');

export const clearCache = () =>
  api.post('/cache/clear');

export default api;
