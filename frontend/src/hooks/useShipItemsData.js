// useShipItemsData.js - 飞船物品数据 Hook
// 说明：从本地预构建 catalog JSON 加载（FSD-item-finder 架构），价格从 API 实时获取
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getItemsPricesAll } from '../api/client';

// Singleton: 缓存 catalog 数据避免重复加载
let _catalogPromise = null;
let _catalogData = null;

function loadCatalog() {
  if (_catalogData) return Promise.resolve(_catalogData);
  if (_catalogPromise) return _catalogPromise;

  _catalogPromise = fetch('/data/items-catalog.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      _catalogData = data;
      return data;
    })
    .catch(err => {
      _catalogPromise = null; // 允许重试
      throw err;
    });

  return _catalogPromise;
}

/**
 * 飞船物品数据 Hook：管理物品列表、属性、价格的加载和筛选
 * 采用 FSD-item-finder 架构：静态 catalog + 实时价格 API
 * @param {object} activeCategory - 当前选中的分类 {id, label, color}
 */
export default function useShipItemsData(activeCategory) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pricesMap, setPricesMap] = useState(new Map());    // itemId -> ItemPriceEntry[]
  const [attrsMap, setAttrsMap] = useState(new Map());      // itemId -> ItemAttributeEntry[]
  const [attributeDefs, setAttributeDefs] = useState([]);   // CategoryAttributeDef[]
  const [batchReady, setBatchReady] = useState(false);
  const [sizeFilter, setSizeFilter] = useState('');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cancelledRef = useRef(false);

  // 加载 catalog + 物品属性数据
  useEffect(() => {
    if (!activeCategory) return;
    cancelledRef.current = false;
    let cancelled = false;

    async function loadItemsFromCatalog() {
      setLoading(true);
      setError(null);
      setBatchReady(false);
      setPricesMap(new Map());
      setAttrsMap(new Map());
      setAttributeDefs([]);
      setSizeFilter('');
      setWeaponTypeFilter('');

      try {
        const catalog = await loadCatalog();
        if (cancelled) return;

        setCatalogReady(true);

        // 从 catalog 提取物品列表
        const categoryItems = catalog.items[activeCategory.id] || [];
        categoryItems.sort((a, b) => {
          const sizeA = parseInt(a.size) || 0;
          const sizeB = parseInt(b.size) || 0;
          if (sizeA !== sizeB) return sizeA - sizeB;
          return (a.name || '').localeCompare(b.name || '');
        });
        if (!cancelled) setItems(categoryItems);

        // 从 catalog 提取属性数据
        const catAttrs = catalog.attributes[activeCategory.id] || {};
        const aMap = new Map();
        for (const [itemId, attrs] of Object.entries(catAttrs)) {
          aMap.set(Number(itemId), attrs);
        }
        if (!cancelled) setAttrsMap(aMap);

        // 从 catalog 提取属性定义（含 is_lower_better）
        const catDefs = catalog.category_attribute_defs[activeCategory.id] || [];
        if (!cancelled) setAttributeDefs(catDefs);
      } catch {
        if (!cancelled) setError('数据加载失败，请刷新重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadItemsFromCatalog();
    return () => { cancelled = true; cancelledRef.current = true; };
  }, [activeCategory]);

  // 批量加载价格（分类切换后异步获取）
  useEffect(() => {
    if (!activeCategory || items.length === 0) return;
    let cancelled = false;

    async function fetchPrices() {
      try {
        const pricesRes = await getItemsPricesAll(activeCategory.id);
        if (cancelled) return;

        // 构建 pricesMap: itemId -> [priceEntries]
        const pMap = new Map();
        const pricesData = pricesRes.data?.prices || [];
        for (const p of pricesData) {
          const itemId = p.id_item || p.item_id;
          if (!itemId) continue;
          if (!pMap.has(itemId)) pMap.set(itemId, []);
          pMap.get(itemId).push(p);
        }
        setPricesMap(pMap);
        setBatchReady(true);
        setLastUpdated(new Date());
      } catch {
        // 价格加载失败不阻塞列表，只是没有价格数据
        setBatchReady(false);
      }
    }
    fetchPrices();
    return () => { cancelled = true; };
  }, [activeCategory, items.length]);

  // 筛选物品列表
  const filteredItems = useMemo(() => {
    let result = items;

    // 搜索筛选
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.name_zh || '').includes(q) ||
        (item.category_zh || '').includes(q) ||
        (item.item_type_zh || '').includes(q) ||
        (item.company_name || '').toLowerCase().includes(q) ||
        (item.company_name_zh || '').includes(q) ||
        (item.item_class_zh || '').includes(q) ||
        (item.buy_location || '').toLowerCase().includes(q) ||
        (item.buy_location_zh || '').includes(q)
      );
    }

    // 尺寸筛选
    if (sizeFilter) {
      result = result.filter(item => item.size === sizeFilter);
    }

    // 武器类型筛选（仅武器分类使用 weapon_category 字段）
    if (weaponTypeFilter) {
      result = result.filter(item => item.weapon_category === weaponTypeFilter);
    }

    return result;
  }, [items, searchQuery, sizeFilter, weaponTypeFilter]);

  // 获取物品价格（从 pricesMap 中）
  const getItemPrices = useCallback(async (itemId) => {
    if (pricesMap.has(itemId)) {
      return pricesMap.get(itemId);
    }
    return [];
  }, [pricesMap]);

  // 获取物品属性
  const getItemAttrs = useCallback((itemId) => {
    return attrsMap.get(itemId) || [];
  }, [attrsMap]);

  return {
    items,
    filteredItems,
    loading,
    error,
    batchReady,
    catalogReady,
    lastUpdated,
    attributeDefs,
    sizeFilter,
    setSizeFilter,
    weaponTypeFilter,
    setWeaponTypeFilter,
    searchQuery,
    setSearchQuery,
    getItemPrices,
    getItemAttrs,
  };
}
