// ShipItemsPanel.jsx — 优化版飞船物品查询面板
// 参照 FSD-item-finder 架构，采用卡片式布局 + 位置树 + 价格渐变
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress, Alert, Dialog, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Search, ShoppingCart, FilterList, SortByAlpha, AttachMoney, CompareArrows, CheckCircle, Close, Warning } from '@mui/icons-material';
import useShipItemsData from '../hooks/useShipItemsData';
import ItemDetailDialog from './ItemDetailDialog';
import { getPriceColor } from '../utils/format';
import { useSfx } from '../hooks/useSfx';
import { useDataFreshness } from '../hooks/useDataFreshness';

// 动态收集筛选选项的辅助函数
function collectUniqueValues(items, field) {
  return [...new Set(items.map(item => item[field]).filter(Boolean))].sort();
}

// 排序模式
const SORT_MODES = [
  { key: 'name', label: '名称', icon: <SortByAlpha sx={{ fontSize: 14 }} /> },
  { key: 'price', label: '价格', icon: <AttachMoney sx={{ fontSize: 14 }} /> },
  { key: 'size', label: '尺寸', icon: <FilterList sx={{ fontSize: 14 }} /> },
  { key: 'dps', label: 'DPS', icon: <SortByAlpha sx={{ fontSize: 14 }} /> },
];

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
      .catch(() => {});
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

  // Load weapon type stats for damage/speed display
  const [weaponStats, setWeaponStats] = useState(null);
  useEffect(() => {
    fetch('/data/weapon-type-stats.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWeaponStats(data); })
      .catch(() => {});
  }, []);

  const getWeaponStats = useCallback((itemType, size) => {
    if (!weaponStats || !itemType || !size) return null;
    const typeName = itemType.toLowerCase().replace(/\s+/g, '_');
    const found = weaponStats.stats?.find(s => s.type === typeName && s.size === parseInt(size));
    return found || null;
  }, [weaponStats]);

  // 从原始物品列表中收集筛选选项（不受筛选影响）
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

  // 计算价格范围
  const priceRange = useMemo(() => {
    const prices = baseFilteredItems
      .filter(item => item.best_price_buy && item.best_price_buy > 0)
      .map(item => item.best_price_buy);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [baseFilteredItems]);

  // 额外筛选 + 排序
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

    // 排序
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
        default: // name
          return (a.name_zh || a.name || '').localeCompare(b.name_zh || b.name || '');
      }
    });

    return result;
  }, [baseFilteredItems, buyableFilter, classFilter, gradeFilter, sortMode, getWeaponStats]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
    setCompareItems([]);
  }, []);

  // Auto-suggest: same Category + same Size items for comparison
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

  // 分类标签颜色
  const classColorMap = {
    '军用': '#ff4444',
    '民用': '#44aaff',
    '工业': '#ffaa00',
    '竞赛': '#aa66ff',
    '隐身': '#66ddaa',
  };

  // 品级颜色
  const gradeColorMap = {
    'A': '#00ddaa',
    'B': '#44aaff',
    'C': '#ffaa00',
    'D': '#ff6644',
  };

  // 筛选 chip 样式
  const filterChipSx = (active, _color) => ({
    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
    fontSize: '0.7rem',
    height: 24,
    background: active ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))' : 'rgba(0, 10, 20, 0.5)',
    border: `1px solid ${active ? 'rgba(201, 162, 39, 0.35)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#c9a227' : 'rgba(255,255,255,0.4)',
    clipPath: active ? 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' : 'none',
  });

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5, alignItems: 'center' }}>
        {/* 可购买筛选 */}
        <Chip
          icon={<ShoppingCart sx={{ fontSize: 14 }} />}
          label="可购买"
          size="small"
          onClick={() => setBuyableFilter(!buyableFilter)}
          sx={{
            ...filterChipSx(buyableFilter, '#00ddaa'),
            '& .MuiChip-icon': { color: buyableFilter ? '#00ddaa' : 'rgba(255,255,255,0.3)' },
          }}
        />

        {/* 尺寸筛选 */}
        {filterConfig.enableSizeFilter && availableSizes.length > 1 && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
              尺寸:
            </Typography>
            <Chip label="全部" size="small" onClick={() => setSizeFilter('')} sx={filterChipSx(sizeFilter === '')} />
            {availableSizes.map(s => (
              <Chip key={s} label={`S${s}`} size="small" onClick={() => setSizeFilter(sizeFilter === s ? '' : s)}
                sx={{ ...filterChipSx(sizeFilter === s), fontFamily: '"Orbitron",sans-serif', fontSize: '0.65rem' }} />
            ))}
          </Box>
        )}

        {/* 武器类型筛选 */}
        {hasWeaponTypes && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
              种类:
            </Typography>
            {availableWeaponCategories.map(type => (
              <Chip key={type} label={type} size="small" onClick={() => setWeaponTypeFilter(weaponTypeFilter === type ? '' : type)}
                sx={filterChipSx(weaponTypeFilter === type)} />
            ))}
          </Box>
        )}

        {/* 分类筛选 */}
        {hasClasses && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
              分类:
            </Typography>
            {availableClasses.map(cls => (
              <Chip key={cls} label={cls} size="small" onClick={() => setClassFilter(classFilter === cls ? '' : cls)}
                sx={filterChipSx(classFilter === cls, classColorMap[cls])} />
            ))}
          </Box>
        )}

        {/* 品级筛选 */}
        {hasGrades && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
              品级:
            </Typography>
            {availableGrades.map(g => (
              <Chip key={g} label={`${g}级`} size="small" onClick={() => setGradeFilter(gradeFilter === g ? '' : g)}
                sx={{ ...filterChipSx(gradeFilter === g, gradeColorMap[g]), fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontSize: '0.65rem' }} />
            ))}
          </Box>
        )}

        {/* 排序模式 */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
            排序:
          </Typography>
          {SORT_MODES.map(mode => (
            <Chip
              key={mode.key}
              icon={mode.icon}
              label={mode.label}
              size="small"
              onClick={() => setSortMode(mode.key)}
              sx={{
                ...filterChipSx(sortMode === mode.key),
                '& .MuiChip-icon': { fontSize: 14, color: sortMode === mode.key ? accentColor : 'rgba(255,255,255,0.3)' },
              }}
            />
          ))}
          <Chip
            icon={<CompareArrows sx={{ fontSize: 14 }} />}
            label="对比"
            size="small"
            onClick={toggleCompareMode}
            sx={{
              ...filterChipSx(compareMode, '#00ddaa'),
              '& .MuiChip-icon': { fontSize: 14, color: compareMode ? '#00ddaa' : 'rgba(255,255,255,0.3)' },
            }}
          />
        </Box>
      </Box>

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
            <Box sx={{ mb: 1.5, p: 1, background: 'rgba(0,221,170,0.04)', border: '1px solid rgba(0,221,170,0.12)', borderRadius: '4px' }}>
              <Typography sx={{ fontSize: '0.65rem', color: '#00ddaa', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 0.5 }}>
                同类推荐 ({suggestedItems.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {suggestedItems.map(item => {
                  const isSel = compareItems.some(i => i.id === item.id);
                  return (
                    <Chip key={item.id} size="small"
                      label={item.name_zh || item.name}
                      onClick={() => handleCompareItemClick(item)}
                      sx={{
                        background: isSel ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isSel ? 'rgba(0,221,170,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: isSel ? '#00ddaa' : 'rgba(255,255,255,0.6)',
                        fontSize: '0.6rem', cursor: 'pointer',
                      }} />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* 卡片式布局 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
            overflow: 'hidden',
            alignItems: 'stretch',
          }}>
            {filteredItems.map((item, _index) => {
              const classColor = classColorMap[item.item_class_zh] || accentColor;
              const gradeColor = gradeColorMap[item.grade] || 'rgba(255,255,255,0.5)';
              const priceColor = item.can_buy && item.best_price_buy
                ? getPriceColor(item.best_price_buy, priceRange.min, priceRange.max)
                : 'rgba(255,255,255,0.2)';
              const isSelected = compareMode && compareItems.some(i => i.id === item.id);

              return (
                <Box
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(item); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={compareMode ? `${isSelected ? '取消选择' : '选择'}${item.name_zh || item.name}进行对比` : `查看${item.name_zh || item.name}详情`}
                  sx={{
                    p: 1.5,
                    minHeight: 160,
                    boxSizing: 'border-box',
                    background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.95) 100%)',
                    border: isSelected
                      ? '1px solid rgba(0, 221, 170, 0.5)'
                      : '1px solid rgba(201, 162, 39, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: isSelected
                        ? 'linear-gradient(90deg, transparent 0%, rgba(0, 221, 170, 0.4) 50%, transparent 100%)'
                        : 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.25) 50%, transparent 100%)',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
                      border: isSelected
                        ? '1px solid rgba(0, 221, 170, 0.6)'
                        : '1px solid rgba(201, 162, 39, 0.25)',
                    },
                    '&:focus': {
                      outline: isSelected
                        ? '2px solid rgba(0, 221, 170, 0.5)'
                        : '2px solid rgba(201, 162, 39, 0.4)',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {/* 对比选中标记 */}
                  {compareMode && (
                    <Box sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1,
                    }}>
                      <CheckCircle
                        sx={{
                          fontSize: 18,
                          color: isSelected ? '#00ddaa' : 'rgba(255,255,255,0.2)',
                          filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,221,170,0.5))' : 'none',
                        }}
                      />
                    </Box>
                  )}

                  {/* 物品名称 */}
                  <Typography sx={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.85rem',
                    fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                    lineHeight: 1.2,
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name_zh || item.name}
                  </Typography>
                  {item.name_zh && (
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: '0.65rem',
                      fontFamily: '"Rajdhani",sans-serif',
                      lineHeight: 1.2,
                      mb: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </Typography>
                  )}

                  {/* 属性标签 */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                    {/* 尺寸 */}
                    {item.size && (
                      <Chip
                        label={`S${item.size}`}
                        size="small"
                        sx={{
                          fontFamily: '"Orbitron",sans-serif',
                          fontSize: '0.6rem',
                          height: 18,
                          background: `${activeCategory.color}15`,
                          border: `1px solid ${activeCategory.color}33`,
                          color: activeCategory.color,
                        }}
                      />
                    )}
                    {/* 分类 */}
                    {item.item_class_zh && (
                      <Chip
                        label={item.item_class_zh}
                        size="small"
                        sx={{
                          fontFamily: '"Noto Sans SC",sans-serif',
                          fontSize: '0.6rem',
                          height: 18,
                          background: `${classColor}15`,
                          border: `1px solid ${classColor}33`,
                          color: classColor,
                        }}
                      />
                    )}
                    {/* 品级 */}
                    {item.grade && (
                      <Chip
                        label={`${item.grade}级`}
                        size="small"
                        sx={{
                          fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
                          fontSize: '0.55rem',
                          height: 18,
                          background: `${gradeColor}15`,
                          border: `1px solid ${gradeColor}33`,
                          color: gradeColor,
                        }}
                      />
                    )}
                  </Box>

                  {/* 厂商 */}
                  <Typography sx={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.65rem',
                    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.company_name_zh || item.company_name}
                  </Typography>

                  {/* 武器伤害/DPS数据 */}
                  {(() => {
                    const ws = getWeaponStats(item.item_type, item.size);
                    if (!ws || ws.dps_max === 0) return null;
                    const dpsDisplay = ws.dps_min === ws.dps_max
                      ? ws.dps_max.toLocaleString()
                      : ws.dps_min.toLocaleString() + '~' + ws.dps_max.toLocaleString();
                    const dmgDisplay = ws.damage_min === ws.damage_max
                      ? ws.damage_max.toLocaleString()
                      : ws.damage_min.toLocaleString() + '~' + ws.damage_max.toLocaleString();
                    return (
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '0.6rem', fontFamily: '"Orbitron",sans-serif', color: '#ff6644', fontWeight: 700 }}>
                          DPS {dpsDisplay}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', fontFamily: '"Orbitron",sans-serif', color: 'rgba(255,102,68,0.5)' }}>
                          {dmgDisplay} DMG
                        </Typography>
                        {ws.rpm > 0 && (
                          <Typography sx={{ fontSize: '0.55rem', fontFamily: '"Orbitron",sans-serif', color: 'rgba(0,221,170,0.5)' }}>
                            {ws.rpm} RPM
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}

                  {/* 价格信息 */}
                  {(() => {
                    const uuid = item.uuid?.toLowerCase();
                    const shopData = uuid && shopMap[uuid];
                    const hasUexPrice = item.can_buy && item.best_price_buy;
                    const hasShopData = shopData && shopData.length > 0;
                    
                    if (hasUexPrice || hasShopData) {
                      // Deduplicate shop locations
                      const shopLocations = hasShopData
                        ? [...new Set(shopData.map(s => s.location))].join(' / ')
                        : '';
                      const shopPrice = hasShopData ? Math.min(...shopData.map(s => s.buy_price).filter(p => p > 0)) : 0;
                      const displayPrice = hasUexPrice ? item.best_price_buy : shopPrice;
                      
                      return (
                        <Box sx={{ mt: 'auto' }}>
                          {displayPrice > 0 && (
                            <Typography sx={{
                              color: priceColor,
                              fontSize: '0.85rem',
                              fontFamily: '"Orbitron",sans-serif',
                              fontWeight: 600,
                            }}>
                              {displayPrice.toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>aUEC</span>
                            </Typography>
                          )}
                          {(item.buy_location_zh || item.buy_location || shopLocations) && (
                            <Typography sx={{
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.6rem',
                              fontFamily: '"Noto Sans SC",sans-serif',
                              lineHeight: 1.2,
                            }}>
                              {item.buy_location_zh || item.buy_location || shopLocations}
                            </Typography>
                          )}
                          {hasShopData && !hasUexPrice && (
                            <Typography sx={{
                              color: 'rgba(0,221,170,0.3)',
                              fontSize: '0.5rem',
                              fontFamily: '"Rajdhani",sans-serif',
                            }}>
                              解包数据
                            </Typography>
                          )}
                        </Box>
                      );
                    }
                    return (
                      <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', mt: 'auto' }}>
                        不可购买
                      </Typography>
                    );
                  })()}
                </Box>
              );
            })}
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
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.98) 0%, rgba(2, 8, 18, 0.99) 100%)',
            border: '1px solid rgba(0, 221, 170, 0.3)',
            borderRadius: '8px',
            maxHeight: '80vh',
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 221, 170, 0.15)' }}>
          <Typography sx={{ fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#00ddaa' }}>
            物品对比
          </Typography>
          <IconButton onClick={() => setCompareDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <Close />
          </IconButton>
        </Box>
        <TableContainer sx={{ maxHeight: 'calc(80vh - 64px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  background: 'rgba(0, 221, 170, 0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                  fontSize: '0.75rem',
                  borderBottom: '1px solid rgba(0, 221, 170, 0.2)',
                  minWidth: 100,
                }}>
                  属性
                </TableCell>
                {compareItems.map(item => (
                  <TableCell key={item.id} sx={{
                    background: 'rgba(0, 221, 170, 0.08)',
                    color: '#00ddaa',
                    fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(0, 221, 170, 0.2)',
                    textAlign: 'center',
                    minWidth: 150,
                  }}>
                    {item.name_zh || item.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { label: '尺寸', key: 'size', format: v => v ? `S${v}` : '-' },
                { label: '分类', key: 'item_class_zh', format: v => v || '-' },
                { label: '品级', key: 'grade', format: v => v ? `${v}级` : '-' },
                { label: '物品类型', key: 'item_type', format: v => v || '-' },
                { label: '质量', key: 'mass', format: v => v ? `${v} kg` : '-' },
                { label: '体积', key: 'volume', format: v => v ? `${v} m³` : '-' },
                { label: '厂商', key: 'company_name_zh', fallback: 'company_name', format: v => v || '-' },
              ].map(row => {
                const values = compareItems.map(item => {
                  const val = item[row.key] ?? item[row.fallback];
                  return row.format(val);
                });
                const numericValues = compareItems.map(item => {
                  const val = item[row.key] ?? item[row.fallback];
                  return parseFloat(val) || 0;
                });
                const maxVal = Math.max(...numericValues);
                return (
                  <TableRow key={row.key}>
                    <TableCell sx={{
                      color: 'rgba(255,255,255,0.6)',
                      fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                      fontSize: '0.75rem',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {row.label}
                    </TableCell>
                    {compareItems.map((item, i) => (
                      <TableCell key={item.id} sx={{
                        color: maxVal > 0 && numericValues[i] === maxVal && numericValues.filter(v => v === maxVal).length === 1
                          ? '#00ddaa'
                          : 'rgba(255,255,255,0.8)',
                        fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontWeight: maxVal > 0 && numericValues[i] === maxVal && numericValues.filter(v => v === maxVal).length === 1 ? 700 : 400,
                      }}>
                        {values[i]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {/* 武器专属属性 */}
              {compareItems.some(item => {
                const ws = getWeaponStats(item.item_type, item.size);
                return ws && ws.dps_max > 0;
              }) && (
                <>
                  <TableRow>
                    <TableCell colSpan={compareItems.length + 1} sx={{
                      color: '#ff6644',
                      fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(255, 102, 68, 0.08)',
                      borderBottom: '1px solid rgba(255, 102, 68, 0.15)',
                      letterSpacing: '0.1em',
                    }}>
                      武器数据
                    </TableCell>
                  </TableRow>
                  {[
                    {
                      label: 'DPS',
                      getValue: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.dps_max || 0;
                      },
                      format: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        if (!ws || ws.dps_max === 0) return '-';
                        return ws.dps_min === ws.dps_max
                          ? ws.dps_max.toLocaleString()
                          : `${ws.dps_min.toLocaleString()}~${ws.dps_max.toLocaleString()}`;
                      },
                    },
                    {
                      label: '伤害',
                      getValue: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.damage_max || 0;
                      },
                      format: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        if (!ws || ws.damage_max === 0) return '-';
                        return ws.damage_min === ws.damage_max
                          ? ws.damage_max.toLocaleString()
                          : `${ws.damage_min.toLocaleString()}~${ws.damage_max.toLocaleString()}`;
                      },
                    },
                    {
                      label: '射速 (RPM)',
                      getValue: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.rpm || 0;
                      },
                      format: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.rpm ? ws.rpm.toLocaleString() : '-';
                      },
                    },
                    {
                      label: '弹速',
                      getValue: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.speed || 0;
                      },
                      format: (item) => {
                        const ws = getWeaponStats(item.item_type, item.size);
                        return ws?.speed ? `${ws.speed.toLocaleString()} m/s` : '-';
                      },
                    },
                  ].map(row => {
                    const values = compareItems.map(item => row.getValue(item));
                    const formatted = compareItems.map(item => row.format(item));
                    const maxVal = Math.max(...values);
                    return (
                      <TableRow key={row.label}>
                        <TableCell sx={{
                          color: 'rgba(255,255,255,0.6)',
                          fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                          fontSize: '0.75rem',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          {row.label}
                        </TableCell>
                        {compareItems.map((item, i) => (
                          <TableCell key={item.id} sx={{
                            color: maxVal > 0 && values[i] === maxVal && values.filter(v => v === maxVal).length === 1
                              ? '#00ddaa'
                              : 'rgba(255,255,255,0.8)',
                            fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            fontWeight: maxVal > 0 && values[i] === maxVal && values.filter(v => v === maxVal).length === 1 ? 700 : 400,
                          }}>
                            {formatted[i]}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </>
              )}
              {/* 价格 */}
              {compareItems.some(item => item.can_buy && item.best_price_buy > 0) && (
                <TableRow>
                  <TableCell sx={{
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                    fontSize: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    价格
                  </TableCell>
                  {compareItems.map(item => {
                    const price = item.can_buy ? item.best_price_buy : 0;
                    return (
                      <TableCell key={item.id} sx={{
                        color: price > 0 ? getPriceColor(price, priceRange.min, priceRange.max) : 'rgba(255,255,255,0.3)',
                        fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {price > 0 ? `${price.toLocaleString()} aUEC` : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
              {/* 购买地点 */}
              {compareItems.some(item => item.buy_location_zh || item.buy_location) && (
                <TableRow>
                  <TableCell sx={{
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                    fontSize: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    购买地点
                  </TableCell>
                  {compareItems.map(item => (
                    <TableCell key={item.id} sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: '"Noto Sans SC",sans-serif',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {item.buy_location_zh || item.buy_location || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Dialog>
    </Box>
  );
}

export default ShipItemsPanel;
