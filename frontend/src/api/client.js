import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

export default api;
