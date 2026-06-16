// ShipItemsPanel.jsx — 优化版飞船物品查询面板
// 参照 FSD-item-finder 架构，采用卡片式布局 + 位置树 + 价格渐变
import { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress, Alert } from '@mui/material';
import { Search, ShoppingCart, FilterList, SortByAlpha, AttachMoney } from '@mui/icons-material';
import useShipItemsData from '../hooks/useShipItemsData';
import ItemDetailDialog from './ItemDetailDialog';
import { getPriceColor } from '../utils/format';

// 动态收集筛选选项的辅助函数
function collectUniqueValues(items, field) {
  return [...new Set(items.map(item => item[field]).filter(Boolean))].sort();
}

// 排序模式
const SORT_MODES = [
  { key: 'name', label: '名称', icon: <SortByAlpha sx={{ fontSize: 14 }} /> },
  { key: 'price', label: '价格', icon: <AttachMoney sx={{ fontSize: 14 }} /> },
  { key: 'size', label: '尺寸', icon: <FilterList sx={{ fontSize: 14 }} /> },
];

function ShipItemsPanel({ categories, itemTypeLabel, accentColor, filterConfig }) {
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
  const dialogItemIdRef = useRef(null);

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
  } = useShipItemsData(activeCategory);

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
        default: // name
          return (a.name_zh || a.name || '').localeCompare(b.name_zh || b.name || '');
      }
    });

    return result;
  }, [baseFilteredItems, buyableFilter, classFilter, gradeFilter, sortMode]);

  const handleRowClick = async (item) => {
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
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
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
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
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
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
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
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
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
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
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
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontFamily: '"Rajdhani", sans-serif' }}>
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

          {/* 卡片式布局 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}>
            {filteredItems.map((item, _index) => {
              const classColor = classColorMap[item.item_class_zh] || accentColor;
              const gradeColor = gradeColorMap[item.grade] || 'rgba(255,255,255,0.5)';
              const priceColor = item.can_buy && item.best_price_buy
                ? getPriceColor(item.best_price_buy, priceRange.min, priceRange.max)
                : 'rgba(255,255,255,0.2)';

              return (
                <Box
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(item); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`查看${item.name_zh || item.name}详情`}
                  sx={{
                    p: 1.5,
                    background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.95) 100%)',
                    border: '1px solid rgba(201, 162, 39, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.25) 50%, transparent 100%)',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
                      border: '1px solid rgba(201, 162, 39, 0.25)',
                    },
                    '&:focus': {
                      outline: '2px solid rgba(201, 162, 39, 0.4)',
                      outlineOffset: '2px',
                    },
                  }}
                >
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

                  {/* 价格信息 */}
                  {item.can_buy && item.best_price_buy ? (
                    <Box sx={{ mt: 'auto' }}>
                      <Typography sx={{
                        color: priceColor,
                        fontSize: '0.85rem',
                        fontFamily: '"Orbitron",sans-serif',
                        fontWeight: 600,
                      }}>
                        {item.best_price_buy.toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>aUEC</span>
                      </Typography>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.6rem',
                        fontFamily: '"Noto Sans SC",sans-serif',
                        lineHeight: 1.2,
                      }}>
                        {item.buy_location_zh || item.buy_location || ''}
                      </Typography>
                      <Typography sx={{
                        color: 'rgba(255,255,255,0.25)',
                        fontSize: '0.55rem',
                        fontFamily: '"Noto Sans SC",sans-serif',
                        lineHeight: 1.2,
                      }}>
                        {[item.buy_planet_zh || item.buy_planet, item.buy_system_zh || item.buy_system].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', mt: 'auto' }}>
                      不可购买
                    </Typography>
                  )}
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
          open={dialogOpen}
          onClose={handleCloseDialog}
          accentColor={accentColor}
        />
      )}
    </Box>
  );
}

export default ShipItemsPanel;
