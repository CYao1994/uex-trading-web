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

export const sellRoute = (origin, items) =>
  api.post('/sell-route', { origin, items });

export const searchTerminals = (q) =>
  api.get('/terminals', { params: { q } });

export const searchCommodities = (q) =>
  api.get('/commodities', { params: { q } });

export const getCommodityPrices = (commodityId) =>
  api.get(`/commodity-prices/${commodityId}`);

export const getWarbonds = () =>
  api.get('/warbonds');

export default api;
