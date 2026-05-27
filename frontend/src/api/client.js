import axios from 'axios';

// EdgeOne Pages 全栈部署：前端和后端同源，API 直接用 /api
// 本地开发时，Vite proxy 处理 /api -> localhost:8000
const api = axios.create({
  baseURL: '/api',
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

export const searchLocations = (q, refresh = false) =>
  api.get('/locations', { params: { q, ...(refresh ? { refresh: true } : {}) } });

export const searchVehicles = (q, refresh = false) =>
  api.get('/vehicles', { params: { q, ...(refresh ? { refresh: true } : {}) } });

export const tradeChain = (params, refresh = false) =>
  api.post('/trade-chain', params, { params: refresh ? { refresh: true } : {} });

export default api;
