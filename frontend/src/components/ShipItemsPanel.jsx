// ShipItemsPanel.jsx — 优化版飞船物品查询面板
// 参照 FSD-item-finder 架构，采用卡片式布局 + 位置树 + 价格渐变
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress, Alert } from '@mui/material';
import { Search, CompareArrows, Warning } from '@mui/icons-material';
import useShipItemsData from '../hooks/useShipItemsData';
import ItemDetailDialog from './ItemDetailDialog';
import FilterBar from './FilterBar';
import ItemCard from './ItemCard';
import CompareDialog from './CompareDialog';
import CompareSuggestions from './CompareSuggestions';
import { useSfx } from '../hooks/useSfx';
import { useDataFreshness } from '../hooks/useDataFreshness';

function collectUniqueValues(items, field) {
  return [...new Set(items.map(item => item[field]).filter(Boolean))].sort();
}

function ShipItemsPanel({ categories, itemTypeLabel, accentColor, filterConfig = {}, wikiWeapons = [] }) {
  const sfx = useSfx();
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState(null);
  const [dialogPrices, setDialogPrices] = useState([]);
  const [dialogPricesLoading, setDialogPricesLoading] = useState(false);
  const [dialogAttrs, setDialogAttrs] = useState([]);
  const [buyableFilter, setBuyableFilter] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sortMode, setSortMode] = useState('name');
  const [compareMode, setCompareMode] = useState(false);
  const [compareItems, setCompareItems] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [wikiItems, setWikiItems] = useState({});
  const dialogItemIdRef = useRef(null);
  const { date: catalogDate, isStale: catalogStale } = useDataFreshness('/data/items-catalog.json');

  useEffect(() => {
    fetch('/data/wiki-items.json')
      .then(r => r.ok ? r.json() : { items: {} })
      .then(data => setWikiItems(data.items || {}))
      .catch(() => console.warn('Failed to load wiki items'));
  }, []);

  const {
    items,
    filteredItems: baseFilteredItems,
    loading,
    error,
    batchReady,
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
    shopMap,
  } = useShipItemsData(activeCategory);

  const [weaponStats, setWeaponStats] = useState(null);
  useEffect(() => {
    fetch('/data/weapon-type-stats.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWeaponStats(data); })
      .catch(() => console.warn('Failed to load weapon stats'));
  }, []);

  const getWeaponStats = useCallback((itemType, size) => {
    if (!weaponStats || !itemType || !size) return null;
    const typeName = itemType.toLowerCase().replace(/\s+/g, '_');
    const found = weaponStats.stats?.find(s => s.type === typeName && s.size === parseInt(size));
    return found || null;
  }, [weaponStats]);

  const availableSizes = useMemo(() =>
    [...new Set((items || []).map(item => item.size).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b)),
    [items]
  );

  const availableWeaponCategories = useMemo(() =>
    collectUniqueValues(baseFilteredItems, 'weapon_category'),
    [baseFilteredItems]
  );

  const availableClasses = useMemo(() =>
    collectUniqueValues(baseFilteredItems, 'item_class_zh'),
    [baseFilteredItems]
  );

  const availableGrades = useMemo(() =>
    collectUniqueValues(baseFilteredItems, 'grade'),
    [baseFilteredItems]
  );

  const hasWeaponTypes = filterConfig.enableWeaponTypeFilter && availableWeaponCategories.length > 0;
  const hasClasses = filterConfig.enableClassFilter && availableClasses.length > 0;
  const hasGrades = filterConfig.enableGradeFilter && availableGrades.length > 0;

  const priceRange = useMemo(() => {
    const prices = baseFilteredItems
      .filter(item => item.best_price_buy && item.best_price_buy > 0)
      .map(item => item.best_price_buy);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [baseFilteredItems]);

  const filteredItems = useMemo(() => {
    let result = baseFilteredItems;
    if (buyableFilter) {
      result = result.filter(item => item.can_buy);
    }
    if (classFilter) {
      result = result.filter(item => item.item_class_zh === classFilter);
    }
    if (gradeFilter) {
      result = result.filter(item => item.grade === gradeFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case 'price': {
          const pa = a.best_price_buy || Infinity;
          const pb = b.best_price_buy || Infinity;
          return pa - pb;
        }
        case 'size': {
          const sa = parseInt(a.size) || 0;
          const sb = parseInt(b.size) || 0;
          if (sa !== sb) return sa - sb;
          return (a.name || '').localeCompare(b.name || '');
        }
        case 'dps': {
          const wsA = getWeaponStats(a.item_type, a.size);
          const wsB = getWeaponStats(b.item_type, b.size);
          const dpsA = wsA?.dps_max || 0;
          const dpsB = wsB?.dps_max || 0;
          return dpsB - dpsA;
        }
        default:
          return (a.name_zh || a.name || '').localeCompare(b.name_zh || b.name || '');
      }
    });

    return result;
  }, [baseFilteredItems, buyableFilter, classFilter, gradeFilter, sortMode, getWeaponStats]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
    setCompareItems([]);
  }, []);

  const suggestedItems = useMemo(() => {
    if (!compareMode || compareItems.length === 0) return [];
    const first = compareItems[0];
    if (!first) return [];
    return baseFilteredItems.filter(item =>
      item.id !== first.id &&
      item.category_zh === first.category_zh &&
      item.size === first.size &&
      !compareItems.some(ci => ci.id === item.id)
    ).slice(0, 6);
  }, [compareMode, compareItems, baseFilteredItems]);

  const handleCompareItemClick = useCallback((item) => {
    setCompareItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  }, []);

  const handleRowClick = async (item) => {
    sfx('item_select');
    if (compareMode) {
      handleCompareItemClick(item);
      return;
    }
    setDialogItem(item);
    setDialogOpen(true);
    dialogItemIdRef.current = item.id;
    const attrs = getItemAttrs(item.id);
    setDialogAttrs(attrs);
    if (batchReady) {
      const prices = await getItemPrices(item.id);
      setDialogPrices(prices);
    } else {
      setDialogPrices([]);
    }
    setDialogPricesLoading(false);
  };

  useEffect(() => {
    if (!batchReady || !dialogOpen || dialogItemIdRef.current == null) return;
    getItemPrices(dialogItemIdRef.current).then(prices => {
      setDialogPrices(prices);
      setDialogPricesLoading(false);
    });
  }, [batchReady, dialogOpen, getItemPrices]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogItem(null);
    dialogItemIdRef.current = null;
    setDialogPricesLoading(false);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearchQuery('');
    setSizeFilter('');
    setWeaponTypeFilter('');
    setBuyableFilter(false);
    setClassFilter('');
    setGradeFilter('');
    setSortMode('name');
  };

  const classColorMap = {
    '军用': '#ff4444',
    '民用': '#44aaff',
    '工业': '#ffaa00',
    '竞赛': '#aa66ff',
    '隐身': '#66ddaa',
  };

  const gradeColorMap = {
    'A': '#00ddaa',
    'B': '#44aaff',
    'C': '#ffaa00',
    'D': '#ff6644',
  };

  return (
    <Box sx={{
      p: { xs: 1.5, md: 2.5 },
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
      border: '1px solid rgba(201, 162, 39, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.35) 30%, rgba(201, 162, 39, 0.35) 70%, transparent 100%)',
      },
    }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
          border: '1px solid rgba(201, 162, 39, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          <Search sx={{ color: '#c9a227', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '0.95rem',
            color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            飞船{itemTypeLabel}查询
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            搜索{itemTypeLabel}名称、规格、价格
          </Typography>
        </Box>
      </Box>

      {/* 分类标签 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {categories.map(cat => (
          <Chip
            key={cat.id}
            label={cat.label}
            onClick={() => handleCategoryChange(cat)}
            sx={{
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontWeight: activeCategory.id === cat.id ? 700 : 500,
              fontSize: '0.8rem',
              background: activeCategory.id === cat.id
                ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeCategory.id === cat.id ? 'rgba(201, 162, 39, 0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: activeCategory.id === cat.id ? '#c9a227' : 'rgba(255,255,255,0.5)',
              clipPath: activeCategory.id === cat.id ? 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' : 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(154, 122, 26, 0.15))',
                borderColor: 'rgba(201, 162, 39, 0.4)',
              },
            }}
          />
        ))}
      </Box>

      {/* 搜索框 */}
      <TextField
        size="small"
        placeholder={`搜索${itemTypeLabel}名称、厂商、中文...`}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        sx={{
          mb: 1.5, width: '100%',
          '& .MuiOutlinedInput-root': {
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(0, 10, 20, 0.5)',
            '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.35)' },
            '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
          },
        }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'rgba(201, 162, 39, 0.5)' }} /></InputAdornment>,
        }}
      />

      {/* 筛选栏 */}
      <FilterBar
        buyableFilter={buyableFilter}
        onToggleBuyable={() => setBuyableFilter(!buyableFilter)}
        filterConfig={filterConfig}
        availableSizes={availableSizes}
        sizeFilter={sizeFilter}
        onSizeFilterChange={setSizeFilter}
        hasWeaponTypes={hasWeaponTypes}
        availableWeaponCategories={availableWeaponCategories}
        weaponTypeFilter={weaponTypeFilter}
        onWeaponTypeFilterChange={setWeaponTypeFilter}
        hasClasses={hasClasses}
        availableClasses={availableClasses}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
        hasGrades={hasGrades}
        availableGrades={availableGrades}
        gradeFilter={gradeFilter}
        onGradeFilterChange={setGradeFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        compareMode={compareMode}
        onToggleCompare={toggleCompareMode}
        classColorMap={classColorMap}
        gradeColorMap={gradeColorMap}
        accentColor={accentColor}
      />

      {/* 物品列表 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: accentColor }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ background: 'rgba(255,50,50,0.1)', color: '#ff6666' }}>{error}</Alert>
      ) : (
        <Box>
          {/* 统计信息 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontFamily: '"Rajdhani", sans-serif' }}>
              共 {filteredItems.length} 个{itemTypeLabel}
              {buyableFilter && <span style={{ color: '#00ddaa88', marginLeft: 8 }}>● 仅可购买</span>}
              {batchReady && <span style={{ color: `${accentColor}55`, marginLeft: 8 }}>● 价格数据已就绪</span>}
            </Typography>
            {lastUpdated && (
              <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', fontFamily: '"Rajdhani", sans-serif' }}>
                更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Typography>
            )}
          </Box>

          {/* 对比模式：同 Category 同 Size 推荐 */}
          {compareMode && compareItems.length >= 1 && suggestedItems.length > 0 && (
            <CompareSuggestions
              suggestedItems={suggestedItems}
              compareItems={compareItems}
              onCompareItemClick={handleCompareItemClick}
            />
          )}

          {/* 卡片式布局 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
            overflow: 'hidden',
            alignItems: 'stretch',
          }}>
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                compareMode={compareMode}
                isSelected={compareMode && compareItems.some(i => i.id === item.id)}
                priceRange={priceRange}
                activeCategory={activeCategory}
                classColorMap={classColorMap}
                gradeColorMap={gradeColorMap}
                shopMap={shopMap}
                accentColor={accentColor}
                onClick={() => handleRowClick(item)}
                getWeaponStats={getWeaponStats}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* 详情弹窗 */}
      {dialogItem && (
        <ItemDetailDialog
          item={dialogItem}
          prices={dialogPrices}
          pricesLoading={dialogPricesLoading}
          attrs={dialogAttrs}
          attributeDefs={attributeDefs}
          shopData={dialogItem?.uuid ? shopMap[dialogItem.uuid.toLowerCase()] : null}
          open={dialogOpen}
          onClose={handleCloseDialog}
          accentColor={accentColor}
          wikiItems={wikiItems}
          wikiWeapons={wikiWeapons}
        />
      )}

      {/* Data freshness */}
      {catalogDate && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', pt: 1, opacity: 0.5 }}>
          {catalogStale && <Warning sx={{ fontSize: 12, color: '#ffaa00' }} />}
          <Typography sx={{ fontSize: '0.6rem', color: catalogStale ? '#ffaa00' : 'rgba(255,255,255,0.3)', fontFamily: '"Rajdhani",sans-serif' }}>
            数据更新于 {catalogDate.toISOString().slice(0, 10)}
          </Typography>
        </Box>
      )}

      {/* 对比浮动按钮 */}
      {compareMode && compareItems.length >= 2 && (
        <Box sx={{
          position: 'sticky',
          bottom: 16,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <Chip
            icon={<CompareArrows sx={{ fontSize: 16 }} />}
            label={`对比 (${compareItems.length})`}
            onClick={() => setCompareDialogOpen(true)}
            sx={{
              pointerEvents: 'auto',
              fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              height: 36,
              background: 'linear-gradient(135deg, rgba(0, 221, 170, 0.2), rgba(0, 180, 140, 0.15))',
              border: '1px solid rgba(0, 221, 170, 0.5)',
              color: '#00ddaa',
              clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
              boxShadow: '0 4px 20px rgba(0, 221, 170, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(0, 221, 170, 0.3), rgba(0, 180, 140, 0.2))',
                boxShadow: '0 4px 25px rgba(0, 221, 170, 0.4)',
              },
              '& .MuiChip-icon': { color: '#00ddaa' },
            }}
          />
        </Box>
      )}

      {/* 对比表格弹窗 */}
      <CompareDialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        compareItems={compareItems}
        getWeaponStats={getWeaponStats}
        priceRange={priceRange}
      />
    </Box>
  );
}

export default ShipItemsPanel;
